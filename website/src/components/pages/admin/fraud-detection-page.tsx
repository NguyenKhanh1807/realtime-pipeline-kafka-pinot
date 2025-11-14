'use client';

import { useState, useMemo } from 'react';
import {
  FraudCheckDialog,
  FraudDetectionStats,
  TransactionFormSection,
  type FraudResult,
  type FraudDetectionStatProps,
} from '@/src/components/molecules';
import { RecentTransactionsTable } from '@/src/components/organisms/transaction';
import type { TransactionData } from '@/src/components/organisms';
import type { TransactionTableRowProps } from '@/src/components/molecules';
import { DashboardTemplate } from '@/src/components/templates';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { useCorrelation } from '@/src/contexts/correlation-context';
import { log as logger } from '@/src/lib';
import { useRealtimeTransactions } from '@/src/hooks/use-realtime-transactions';
import { FraudDetectionCommands, TransactionTransformer } from '@/src/view-models';
import { isExtendedTransaction, getCreateDt, getFraudLabel } from '@/src/models/types/transaction-extended';

export default function FraudDetectionPage() {
  const { correlationId } = useCorrelation();
  const [isCheckingFraud, setIsCheckingFraud] = useState(false);
  const [fraudResult, setFraudResult] = useState<FraudResult | undefined>();
  const [showResults, setShowResults] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionData | undefined>();

  // Fraud detection using ViewModel command
  const checkFraud = async (transactionData: TransactionData): Promise<FraudResult> => {
    return FraudDetectionCommands.analyzeTransaction({
      cardNumber: transactionData.cardNumber,
      amount: parseFloat(transactionData.amount),
      merchant: transactionData.merchant,
      location: transactionData.location,
      customerEmail: transactionData.customerEmail,
    });
  };

  const handleTransactionSubmit = async (data: TransactionData) => {
    setCurrentTransaction(data);
    setIsCheckingFraud(true);
    setFraudResult(undefined);

    const startTime = Date.now();
    const amount = parseFloat(data.amount);

    try {
      const result = await checkFraud(data);
      const duration = Date.now() - startTime;

      // Log successful fraud check
      logger.info('Fraud check completed successfully', {
        correlationId,
        userId: 'current-user-id', // In real app, get from auth context
        metadata: {
          transactionId: result.transactionId,
          fraudScore: result.score,
          riskLevel: result.riskLevel,
          duration,
          amount,
          merchant: data.merchant,
          location: data.location,
          customerEmail: data.customerEmail,
          confidence: result.confidence,
          factors: result.factors,
          processingTime: result.processingTime,
        },
      });

      setFraudResult(result);
      setShowResults(true);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed fraud check
      logger.error('Fraud check failed', error instanceof Error ? error : new Error(String(error)), {
        correlationId,
        userId: 'current-user-id',
        metadata: {
          transactionId: `failed-${Date.now()}`,
          duration,
          amount,
          merchant: data.merchant,
          error: error instanceof Error ? error.message : 'Fraud check failed'
        }
      });

      // Error already logged above with structured format
      // In a real app, show error dialog
    } finally {
      setIsCheckingFraud(false);
    }
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setFraudResult(undefined);
    setCurrentTransaction(undefined);
  };

  // Use real-time transactions hook
  const {
    allTransactions,
  } = useRealtimeTransactions({
    autoStart: true,
    pollInterval: 3000,
  });

  // Calculate stats from real-time transactions
  const stats: FraudDetectionStatProps[] = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Filter transactions from today using type guards
    const transactionsToday = allTransactions.filter((tx) => {
      const createDt = getCreateDt(tx);
      
      if (createDt && createDt > 0) {
        const txDate = new Date(createDt);
        return !isNaN(txDate.getTime()) && txDate >= startOfToday;
      }
      return false;
    });

    // Calculate detection accuracy
    // True Positives: Fraudulent transactions (fraudLabel === 1) that were flagged or blocked
    // False Negatives: Fraudulent transactions that were approved
    const fraudulentTransactions = allTransactions.filter((tx) => {
      if (!isExtendedTransaction(tx)) {
        return false;
      }
      const fraudLabel = tx.fraudLabel ?? 0;
      return fraudLabel === 1;
    });
    
    const truePositives = fraudulentTransactions.filter((tx) => {
      return tx.status === 'Flagged' || tx.status === 'Blocked';
    }).length;
    
    // Detection accuracy: True Positives / Total Fraudulent Transactions
    // This represents how well the system detects actual fraud
    const detectionAccuracy = fraudulentTransactions.length > 0
      ? ((truePositives / fraudulentTransactions.length) * 100).toFixed(1)
      : '0.0';

    // Transactions today count
    const transactionsTodayCount = transactionsToday.length;

    // Flagged today (Flagged or Blocked status)
    const flaggedToday = transactionsToday.filter((tx) => {
      return tx.status === 'Flagged' || tx.status === 'Blocked';
    }).length;

    return [
      {
        value: `${detectionAccuracy}%`,
        label: 'Detection Accuracy',
        icon: Shield,
      },
      {
        value: transactionsTodayCount.toLocaleString(),
        label: 'Transactions Today',
        icon: TrendingUp,
      },
      {
        value: flaggedToday.toLocaleString(),
        label: 'Flagged Today',
        icon: AlertTriangle,
      },
    ];
  }, [allTransactions]);

  // Transform transactions using ViewModel transformer
  const recentTransactions: TransactionTableRowProps[] = useMemo(() => {
    return TransactionTransformer.toRecentTransactions(
      allTransactions.map(tx => ({
        id: tx.id,
        timestamp: tx.timestamp,
        amount: tx.amount,
        merchant: tx.merchant,
        score: tx.score,
        status: tx.status,
        cardNumber: tx.cardNumber,
        location: tx.location,
        customerEmail: tx.customerEmail,
        riskLevel: tx.riskLevel,
      })),
      20
    );
  }, [allTransactions]);

  return (
    <DashboardTemplate>
      <div className="space-y-6">
        {/* Stats Cards */}
        <FraudDetectionStats stats={stats} />

        {/* Transaction Form */}
        <TransactionFormSection
          onSubmit={handleTransactionSubmit}
          isLoading={isCheckingFraud}
        />

        {/* Recent Transactions Table */}
        <RecentTransactionsTable transactions={recentTransactions} />
      </div>

      {/* Fraud Check Results Dialog */}
      <FraudCheckDialog
        isOpen={showResults}
        onClose={handleCloseResults}
        isLoading={isCheckingFraud}
        result={fraudResult}
        transactionData={currentTransaction}
      />
    </DashboardTemplate>
  );
}
