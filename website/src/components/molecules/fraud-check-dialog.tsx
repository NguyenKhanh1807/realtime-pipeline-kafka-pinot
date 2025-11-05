'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/src/components/atoms/button';
import { Typography } from '@/src/components/atoms/typography';
import { cn } from '@/src/lib/utils';
import { AlertTriangle, CheckCircle, XCircle, X, Shield, TrendingUp, Clock } from 'lucide-react';

export interface FraudResult {
  score: number; // 0-100, higher = more fraudulent
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  factors: string[];
  processingTime: number; // milliseconds
  transactionId: string;
}

interface FraudCheckDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  result?: FraudResult;
  transactionData?: any;
}

export function FraudCheckDialog({
  isOpen,
  onClose,
  isLoading = false,
  result,
  transactionData
}: FraudCheckDialogProps) {
  const [animationProgress, setAnimationProgress] = useState(0);

  // Animate progress bar when loading
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setAnimationProgress(prev => (prev + 2) % 100);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setAnimationProgress(0);
    }
  }, [isLoading]);

  if (!isOpen) return null;

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return CheckCircle;
      case 'medium': return AlertTriangle;
      case 'high':
      case 'critical': return XCircle;
      default: return Shield;
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <Typography variant="h2" size="xl" weight="semibold" className="text-foreground">
            Fraud Detection Results
          </Typography>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            /* Loading State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-blue-primary border-t-transparent rounded-full animate-spin" />
              <Typography variant="h3" size="lg" weight="medium" className="text-foreground">
                Analyzing Transaction...
              </Typography>
              <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
                Running fraud detection algorithms on Apache Pinot
              </Typography>

              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-blue-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${animationProgress}%` }}
                />
              </div>
            </div>
          ) : result ? (
            /* Results State */
            <div className="space-y-6">
              {/* Score Overview */}
              <div className="text-center space-y-4">
                <div className={cn(
                  'inline-flex items-center justify-center w-20 h-20 rounded-full',
                  getRiskColor(result.riskLevel)
                )}>
                  {(() => {
                    const RiskIcon = getRiskIcon(result.riskLevel);
                    return <RiskIcon className="w-10 h-10" />;
                  })()}
                </div>

                <div>
                  <Typography variant="h1" size="4xl" weight="bold" className={cn('mb-2', getScoreColor(result.score))}>
                    {result.score}
                  </Typography>
                  <Typography variant="h3" size="lg" weight="medium" className="text-foreground capitalize">
                    {result.riskLevel} Risk
                  </Typography>
                  <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
                    Confidence: {result.confidence}%
                  </Typography>
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <Typography variant="h4" size="lg" weight="semibold" className="text-foreground mb-3">
                  Transaction Summary
                </Typography>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Typography variant="span" color="muted" className="text-muted-foreground">
                      Amount:
                    </Typography>
                    <Typography variant="span" weight="medium" className="text-foreground ml-2">
                      ${transactionData?.amount || 'N/A'}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="span" color="muted" className="text-muted-foreground">
                      Merchant:
                    </Typography>
                    <Typography variant="span" weight="medium" className="text-foreground ml-2">
                      {transactionData?.merchant || 'N/A'}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="span" color="muted" className="text-muted-foreground">
                      Location:
                    </Typography>
                    <Typography variant="span" weight="medium" className="text-foreground ml-2">
                      {transactionData?.location || 'N/A'}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="span" color="muted" className="text-muted-foreground">
                      Processing Time:
                    </Typography>
                    <Typography variant="span" weight="medium" className="text-foreground ml-2">
                      {result.processingTime}ms
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Risk Factors */}
              {result.factors && result.factors.length > 0 && (
                <div className="space-y-3">
                  <Typography variant="h4" size="lg" weight="semibold" className="text-foreground">
                    Risk Factors Detected
                  </Typography>
                  <div className="space-y-2">
                    {result.factors.map((factor, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <Typography variant="p" size="sm" className="text-foreground">
                          {factor}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction ID */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                    Transaction ID:
                  </Typography>
                </div>
                <Typography variant="span" size="sm" weight="medium" className="text-foreground font-mono">
                  {result.transactionId}
                </Typography>
              </div>

              {/* Recommendation */}
              <div className={cn(
                'p-4 rounded-lg border',
                result.riskLevel === 'low' ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                result.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' :
                'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              )}>
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    'flex-shrink-0',
                    result.riskLevel === 'low' ? 'text-green-600' :
                    result.riskLevel === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  )}>
                    {result.riskLevel === 'low' ? <CheckCircle className="w-5 h-5" /> :
                     result.riskLevel === 'medium' ? <AlertTriangle className="w-5 h-5" /> :
                     <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <Typography variant="h4" size="sm" weight="semibold" className="text-foreground mb-1">
                      Recommendation
                    </Typography>
                    <Typography variant="p" size="sm" className="text-foreground">
                      {result.riskLevel === 'low'
                        ? 'This transaction appears safe. Proceed with normal processing.'
                        : result.riskLevel === 'medium'
                        ? 'Exercise caution. Consider additional verification before approval.'
                        : 'High risk detected. Recommend denying this transaction or requiring additional verification.'}
                    </Typography>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Error State */
            <div className="text-center space-y-4">
              <XCircle className="w-16 h-16 mx-auto text-destructive" />
              <Typography variant="h3" size="lg" weight="medium" className="text-foreground">
                Analysis Failed
              </Typography>
              <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
                Unable to complete fraud analysis. Please try again.
              </Typography>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {result && result.riskLevel !== 'low' && (
            <Button className="bg-blue-primary hover:bg-blue-primary/90">
              Review Transaction
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
