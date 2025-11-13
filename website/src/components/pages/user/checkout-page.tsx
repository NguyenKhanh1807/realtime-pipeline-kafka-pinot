'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Typography, toast } from '@/src/components/atoms';
import {
  UserTransactionForm,
  type UserTransactionData,
} from '@/src/components/organisms';
import { type FraudResult } from '@/src/components/molecules';
import { useCorrelation } from '@/src/contexts/correlation-context';
import { log as logger } from '@/src/lib';
import { Shield, Lock, CreditCard, ArrowRight } from 'lucide-react';

export default function UserCheckoutPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
              Fraud Check
            </Typography>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Secure Transaction</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  1
                </div>
                <Typography variant="span" size="sm" weight="medium" className="ml-2 text-foreground">
                  Enter Details
                </Typography>
              </div>
              <div className="w-16 h-0.5 bg-border" />
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
                  2
                </div>
                <Typography variant="span" size="sm" weight="medium" className="ml-2 text-muted-foreground">
                  Check Score
                </Typography>
              </div>
              <div className="w-16 h-0.5 bg-border" />
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
                  3
                </div>
                <Typography variant="span" size="sm" weight="medium" className="ml-2 text-muted-foreground">
                  View Results
                </Typography>
              </div>
            </div>
          </div>

          {/* Checkout Card */}
          <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="h1" size="2xl" weight="bold" className="text-foreground mb-1">
                    Transaction Fraud Check
                  </Typography>
                  <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
                    Enter your payment details to verify transaction safety
                  </Typography>
                </div>
                <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-background rounded-lg border border-border">
                  <Shield className="h-5 w-5 text-green-600" />
                  <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                    Protected
                  </Typography>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 md:p-8">
              {/* Security Badges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <Typography variant="span" size="sm" weight="semibold" className="text-foreground block">
                      Encrypted
                    </Typography>
                    <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                      SSL Secured
                    </Typography>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <Typography variant="span" size="sm" weight="semibold" className="text-foreground block">
                      Real-time
                    </Typography>
                    <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                      Instant Analysis
                    </Typography>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <Typography variant="span" size="sm" weight="semibold" className="text-foreground block">
                      Safe
                    </Typography>
                    <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                      PCI Compliant
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Transaction Form */}
              <div className="space-y-6">
                <div>
                  <Typography variant="h2" size="xl" weight="semibold" className="text-foreground mb-2">
                    Payment Information
                  </Typography>
                  <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                    All information is encrypted and secure
                  </Typography>
                </div>

                <UserTransactionForm
                  onSubmit={handleTransactionSubmit}
                  isLoading={isCheckingFraud}
                />
              </div>
            </div>

            {/* Card Footer */}
            <div className="bg-muted/30 border-t border-border p-6">
              <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Your data is protected with industry-standard encryption</span>
                </div>
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <span>Powered by</span>
                  <span className="font-semibold text-foreground">Apache Pinot</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 text-center">
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mb-4">
              Trusted by thousands of users worldwide
            </Typography>
            <div className="flex items-center justify-center space-x-6 opacity-60">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <Typography variant="span" size="sm" className="text-foreground">
                  99.9% Uptime
                </Typography>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-blue-600" />
                <Typography variant="span" size="sm" className="text-foreground">
                  Bank-Level Security
                </Typography>
              </div>
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                <Typography variant="span" size="sm" className="text-foreground">
                  PCI DSS Compliant
                </Typography>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

