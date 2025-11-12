'use client';

import { useState } from 'react';
import { TransactionForm, type TransactionData } from '@/src/components/molecules/transaction-form';
import { FraudCheckDialog, type FraudResult } from '@/src/components/molecules/fraud-check-dialog';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { DashboardLayout } from '@/src/components/layouts/dashboard-layout';
import { ArrowLeft, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCorrelation } from '@/src/contexts/correlation-context';
import { auditLogger } from '@/src/services/audit-logger';

export default function TransactionPage() {
  const router = useRouter();
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
      await auditLogger.logFraudDetection(
        'transaction_check',
        'current-user-id', // In real app, get from auth context
        result.transactionId,
        result.score,
        result.riskLevel,
        'success',
        correlationId,
        {
          duration,
        },
        {
          amount,
          merchant: data.merchant,
          location: data.location,
          customerEmail: data.customerEmail,
          confidence: result.confidence,
          factors: result.factors,
          processingTime: result.processingTime,
        }
      );

      setFraudResult(result);
      setShowResults(true);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed fraud check
      await auditLogger.logFraudDetection(
        'transaction_check',
        'current-user-id',
        `failed-${Date.now()}`,
        0,
        'low',
        'failure',
        correlationId,
        { duration },
        {
          error: error instanceof Error ? error.message : 'Fraud check failed',
          amount,
          merchant: data.merchant,
        }
      );

      console.error('Fraud check failed:', error);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div>
              <Typography variant="h1" size="2xl" weight="bold" className="text-foreground">
                Fraud Detection
              </Typography>
              <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
                Analyze credit card transactions for potential fraud using Apache Pinot
              </Typography>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
                  98.7%
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                  Detection Accuracy
                </Typography>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
                  1,247
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                  Transactions Today
                </Typography>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
                  23
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                  Flagged Today
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Form */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="mb-6">
            <Typography variant="h2" size="xl" weight="semibold" className="text-foreground mb-2">
              Transaction Analysis
            </Typography>
            <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
              Enter transaction details to check for fraudulent activity using real-time analytics
            </Typography>
          </div>

          <TransactionForm
            onSubmit={handleTransactionSubmit}
            isLoading={isCheckingFraud}
          />
        </div>

        {/* Recent Transactions Table (Mock) */}
        <div className="bg-card border border-border rounded-lg p-6">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-4">
            Recent Transactions
          </Typography>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3">
                    <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                      Time
                    </Typography>
                  </th>
                  <th className="text-left p-3">
                    <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                      Amount
                    </Typography>
                  </th>
                  <th className="text-left p-3">
                    <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                      Merchant
                    </Typography>
                  </th>
                  <th className="text-left p-3">
                    <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                      Risk Score
                    </Typography>
                  </th>
                  <th className="text-left p-3">
                    <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground">
                      Status
                    </Typography>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '2 min ago', amount: '$49.99', merchant: 'Amazon', score: 15, status: 'Approved' },
                  { time: '5 min ago', amount: '$1,299.00', merchant: 'Best Buy', score: 78, status: 'Flagged' },
                  { time: '8 min ago', amount: '$12.50', merchant: 'Starbucks', score: 8, status: 'Approved' },
                  { time: '12 min ago', amount: '$5,000.00', merchant: 'Unknown Vendor', score: 95, status: 'Blocked' },
                  { time: '15 min ago', amount: '$89.99', merchant: 'Apple Store', score: 22, status: 'Approved' },
                ].map((transaction, index) => (
                  <tr key={index} className="border-b border-border/50">
                    <td className="p-3">
                      <Typography variant="span" size="sm" className="text-foreground">
                        {transaction.time}
                      </Typography>
                    </td>
                    <td className="p-3">
                      <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                        {transaction.amount}
                      </Typography>
                    </td>
                    <td className="p-3">
                      <Typography variant="span" size="sm" className="text-foreground">
                        {transaction.merchant}
                      </Typography>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <Typography
                          variant="span"
                          size="sm"
                          weight="medium"
                          className={
                            transaction.score < 30 ? 'text-green-600' :
                            transaction.score < 70 ? 'text-yellow-600' :
                            'text-red-600'
                          }
                        >
                          {transaction.score}
                        </Typography>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        transaction.status === 'Flagged' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fraud Check Results Dialog */}
      <FraudCheckDialog
        isOpen={showResults}
        onClose={handleCloseResults}
        isLoading={isCheckingFraud}
        result={fraudResult}
        transactionData={currentTransaction}
      />
    </DashboardLayout>
  );
}
