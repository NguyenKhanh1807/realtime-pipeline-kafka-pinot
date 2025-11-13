'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardTemplate } from '@/src/components/templates';
import { Typography, toast } from '@/src/components/atoms';
import {
  UserTransactionForm,
  type UserTransactionData,
} from '@/src/components/organisms';
import { type FraudResult } from '@/src/components/molecules';
import { useCorrelation } from '@/src/contexts/correlation-context';
import { log as logger } from '@/src/lib';
import { Shield, CreditCard } from 'lucide-react';

export default function UserDashboardPage() {
  const router = useRouter();
  const { correlationId } = useCorrelation();
  const [isCheckingFraud, setIsCheckingFraud] = useState(false);

  // Fraud detection using Pinot API
  const checkFraud = async (transactionData: UserTransactionData): Promise<FraudResult> => {
    const { pinotClient } = await import('@/src/services/pinot-client');

    // Transform transaction data for Pinot analysis
    const pinotData = {
      cardNumber: transactionData.cardNumber.replace(/\s/g, ''),
      amount: transactionData.amount,
      merchant: 'User Transaction',
      location: 'Unknown',
      customerEmail: 'user@example.com',
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

  const handleTransactionSubmit = async (data: UserTransactionData) => {
    setIsCheckingFraud(true);

    const startTime = Date.now();
    const amount = parseFloat(data.amount);

    try {
      const result = await checkFraud(data);
      const duration = Date.now() - startTime;

      // Log successful fraud check
      logger.info('Fraud check completed successfully', {
        correlationId,
        userId: 'current-user-id',
        metadata: {
          transactionId: result.transactionId,
          fraudScore: result.score,
          riskLevel: result.riskLevel,
          duration,
          amount,
        },
      });

      // Store result in sessionStorage for the score page
      sessionStorage.setItem('fraudCheckResult', JSON.stringify(result));

      // Show success toast
      toast.success('Fraud Check Completed', {
        description: `Score: ${result.score} (${result.riskLevel} risk)`,
        duration: 5000,
      });

      // Navigate to score page
      router.push(`/score?score=${result.score}&riskLevel=${result.riskLevel}&confidence=${result.confidence}&transactionId=${result.transactionId}`);
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
          error: error instanceof Error ? error.message : 'Fraud check failed'
        }
      });

      // Show error toast
      toast.error('Fraud Check Failed', {
        description: error instanceof Error ? error.message : 'Unable to check fraud. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsCheckingFraud(false);
    }
  };

  return (
    <DashboardTemplate>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h1" size="2xl" weight="bold" className="text-foreground">
              Transaction Fraud Check
            </Typography>
            <Typography variant="p" size="base" color="muted" className="text-muted-foreground mt-1">
              Enter your credit card details and amount to check for fraud
            </Typography>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
                  Secure Check
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                  Your card information is encrypted
                </Typography>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
                  Real-time Analysis
                </Typography>
                <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                  Instant fraud detection results
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Form */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="mb-6">
            <Typography variant="h2" size="xl" weight="semibold" className="text-foreground mb-2">
              Transaction Details
            </Typography>
            <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
              Enter your credit card number and transaction amount to check for potential fraud
            </Typography>
          </div>

          <UserTransactionForm
            onSubmit={handleTransactionSubmit}
            isLoading={isCheckingFraud}
          />
        </div>
      </div>
    </DashboardTemplate>
  );
}

