'use client';

import { useState } from 'react';
import {
  FraudCheckDialog,
  FraudDetectionStats,
  RecentTransactionsTable,
  TransactionFormSection,
  type FraudResult,
  type FraudDetectionStatProps,
} from '@/src/components/molecules';
import type { TransactionData } from '@/src/components/organisms';
import type { TransactionTableRowProps } from '@/src/components/molecules';
import { DashboardTemplate } from '@/src/components/templates';
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { useCorrelation } from '@/src/contexts/correlation-context';
import { log as logger } from '@/src/lib';

export default function FraudDetectionPage() {
  const { correlationId } = useCorrelation();
  const [isCheckingFraud, setIsCheckingFraud] = useState(false);
  const [fraudResult, setFraudResult] = useState<FraudResult | undefined>();
  const [showResults, setShowResults] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionData | undefined>();

  // Fraud detection using Pinot API
  const checkFraud = async (transactionData: TransactionData): Promise<FraudResult> => {
    const { pinotClient } = await import('@/src/services/pinot-client');

    // Transform transaction data for Pinot analysis
    const pinotData = {
      cardNumber: transactionData.cardNumber.replace(/\s/g, ''),
      amount: transactionData.amount,
      merchant: transactionData.merchant,
      location: transactionData.location,
      customerEmail: transactionData.customerEmail,
    };

    try {
      const result = await pinotClient.analyzeTransaction(pinotData);
      return result;
    } catch (error) {
      console.error('Pinot fraud analysis failed:', error);
      // Fallback to mock result if Pinot is unavailable
      return {
        score: Math.floor(Math.random() * 40) + 30, // 30-70 range for fallback
        riskLevel: 'medium' as const,
        confidence: 75,
        factors: ['Analysis temporarily unavailable - using fallback scoring'],
        processingTime: 150,
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    }
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

  // Stats data
  const stats: FraudDetectionStatProps[] = [
    {
      value: '98.7%',
      label: 'Detection Accuracy',
      icon: Shield,
      iconBgColor: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      value: '1,247',
      label: 'Transactions Today',
      icon: TrendingUp,
      iconBgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      value: '23',
      label: 'Flagged Today',
      icon: AlertTriangle,
      iconBgColor: 'bg-orange-100 dark:bg-orange-900',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  // Recent transactions data
  const recentTransactions: TransactionTableRowProps[] = [
    {
      time: '2 min ago',
      amount: '$49.99',
      merchant: 'Amazon',
      score: 15,
      status: 'Approved',
      transactionId: 'TXN-2024-001234',
      cardLast4: '4532',
      location: 'Seattle, WA',
      customerName: 'John Doe',
      customerEmail: 'john.doe@email.com',
      riskLevel: 'low',
    },
    {
      time: '5 min ago',
      amount: '$1,299.00',
      merchant: 'Best Buy',
      score: 78,
      status: 'Flagged',
      transactionId: 'TXN-2024-001233',
      cardLast4: '7890',
      location: 'New York, NY',
      customerName: 'Jane Smith',
      customerEmail: 'jane.smith@email.com',
      riskLevel: 'high',
    },
    {
      time: '8 min ago',
      amount: '$12.50',
      merchant: 'Starbucks',
      score: 8,
      status: 'Approved',
      transactionId: 'TXN-2024-001232',
      cardLast4: '1234',
      location: 'San Francisco, CA',
      customerName: 'Bob Johnson',
      customerEmail: 'bob.j@email.com',
      riskLevel: 'low',
    },
    {
      time: '12 min ago',
      amount: '$5,000.00',
      merchant: 'Unknown Vendor',
      score: 95,
      status: 'Blocked',
      transactionId: 'TXN-2024-001231',
      cardLast4: '5678',
      location: 'Unknown',
      customerName: 'Unknown',
      customerEmail: 'suspicious@email.com',
      riskLevel: 'critical',
    },
    {
      time: '15 min ago',
      amount: '$89.99',
      merchant: 'Apple Store',
      score: 22,
      status: 'Approved',
      transactionId: 'TXN-2024-001230',
      cardLast4: '9012',
      location: 'Cupertino, CA',
      customerName: 'Alice Williams',
      customerEmail: 'alice.w@email.com',
      riskLevel: 'low',
    },
    {
      time: '18 min ago',
      amount: '$250.00',
      merchant: 'Target',
      score: 45,
      status: 'Approved',
      transactionId: 'TXN-2024-001229',
      cardLast4: '3456',
      location: 'Minneapolis, MN',
      customerName: 'Charlie Brown',
      customerEmail: 'charlie.b@email.com',
      riskLevel: 'medium',
    },
    {
      time: '20 min ago',
      amount: '$1,500.00',
      merchant: 'Electronics Store',
      score: 82,
      status: 'Flagged',
      transactionId: 'TXN-2024-001228',
      cardLast4: '6789',
      location: 'Los Angeles, CA',
      customerName: 'Diana Prince',
      customerEmail: 'diana.p@email.com',
      riskLevel: 'high',
    },
    {
      time: '25 min ago',
      amount: '$35.00',
      merchant: 'Coffee Shop',
      score: 12,
      status: 'Approved',
      transactionId: 'TXN-2024-001227',
      cardLast4: '0123',
      location: 'Portland, OR',
      customerName: 'Edward Norton',
      customerEmail: 'edward.n@email.com',
      riskLevel: 'low',
    },
    {
      time: '30 min ago',
      amount: '$299.99',
      merchant: 'Nike',
      score: 35,
      status: 'Approved',
      transactionId: 'TXN-2024-001226',
      cardLast4: '4567',
      location: 'Beaverton, OR',
      customerName: 'Fiona Apple',
      customerEmail: 'fiona.a@email.com',
      riskLevel: 'low',
    },
    {
      time: '35 min ago',
      amount: '$750.00',
      merchant: 'Home Depot',
      score: 65,
      status: 'Approved',
      transactionId: 'TXN-2024-001225',
      cardLast4: '8901',
      location: 'Atlanta, GA',
      customerName: 'George Lucas',
      customerEmail: 'george.l@email.com',
      riskLevel: 'medium',
    },
    {
      time: '40 min ago',
      amount: '$125.50',
      merchant: 'Walmart',
      score: 18,
      status: 'Approved',
      transactionId: 'TXN-2024-001224',
      cardLast4: '2345',
      location: 'Bentonville, AR',
      customerName: 'Helen Keller',
      customerEmail: 'helen.k@email.com',
      riskLevel: 'low',
    },
    {
      time: '45 min ago',
      amount: '$3,200.00',
      merchant: 'Luxury Store',
      score: 88,
      status: 'Flagged',
      transactionId: 'TXN-2024-001223',
      cardLast4: '6789',
      location: 'Beverly Hills, CA',
      customerName: 'Isaac Newton',
      customerEmail: 'isaac.n@email.com',
      riskLevel: 'high',
    },
    {
      time: '50 min ago',
      amount: '$45.99',
      merchant: 'CVS Pharmacy',
      score: 12,
      status: 'Approved',
      transactionId: 'TXN-2024-001222',
      cardLast4: '3456',
      location: 'Boston, MA',
      customerName: 'Julia Roberts',
      customerEmail: 'julia.r@email.com',
      riskLevel: 'low',
    },
    {
      time: '55 min ago',
      amount: '$890.00',
      merchant: 'Best Buy',
      score: 55,
      status: 'Approved',
      transactionId: 'TXN-2024-001221',
      cardLast4: '7890',
      location: 'Richfield, MN',
      customerName: 'Kevin Hart',
      customerEmail: 'kevin.h@email.com',
      riskLevel: 'medium',
    },
    {
      time: '1 hour ago',
      amount: '$25.00',
      merchant: 'McDonald\'s',
      score: 5,
      status: 'Approved',
      transactionId: 'TXN-2024-001220',
      cardLast4: '1234',
      location: 'Chicago, IL',
      customerName: 'Lisa Simpson',
      customerEmail: 'lisa.s@email.com',
      riskLevel: 'low',
    },
  ];

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
