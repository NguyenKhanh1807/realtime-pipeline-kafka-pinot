'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardTemplate } from '@/src/components/templates';
import { Typography, Button } from '@/src/components/atoms';
import { useIsAdmin } from '@/src/contexts/app-context';
import { cn } from '@/src/lib';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { type FraudResult } from '@/src/components/molecules';

export default function ScorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = useIsAdmin();
  const [scoreData, setScoreData] = useState<FraudResult | null>(null);

  useEffect(() => {
    // Get score data from URL params or sessionStorage
    const scoreParam = searchParams.get('score');
    const riskLevel = searchParams.get('riskLevel');
    const confidence = searchParams.get('confidence');
    const transactionId = searchParams.get('transactionId');

    if (scoreParam && riskLevel) {
      setScoreData({
        score: parseInt(scoreParam),
        riskLevel: riskLevel as 'low' | 'medium' | 'high' | 'critical',
        confidence: confidence ? parseInt(confidence) : 75,
        factors: [],
        processingTime: 150,
        transactionId: transactionId || `TXN-${Date.now()}`,
      });
    } else {
      // Try to get from sessionStorage
      const stored = sessionStorage.getItem('fraudCheckResult');
      if (stored) {
        try {
          setScoreData(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored score data:', e);
        }
      }
    }
  }, [searchParams]);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-400';
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-400';
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

  if (!scoreData) {
    const NoDataContent = (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <Typography variant="h2" size="xl" weight="semibold" className="text-foreground">
          No Score Data Found
        </Typography>
        <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
          Please check a transaction first to view its fraud score.
        </Typography>
        <Button onClick={() => router.push('/dashboard')}>
          Go Back
        </Button>
      </div>
    );

    if (isAdmin) {
      return <DashboardTemplate>{NoDataContent}</DashboardTemplate>;
    }
    return NoDataContent;
  }

  const RiskIcon = getRiskIcon(scoreData.riskLevel);

  const ScoreContent = (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Score Display Card */}
          <div className="bg-card border border-border rounded-2xl shadow-xl p-8 md:p-12">
            <div className="text-center space-y-6">
              {/* Risk Icon */}
              <div className={cn(
                'inline-flex items-center justify-center w-24 h-24 rounded-full',
                getRiskColor(scoreData.riskLevel)
              )}>
                <RiskIcon className="w-12 h-12" />
              </div>

              {/* Score */}
              <div>
                <Typography variant="h1" size="5xl" weight="bold" className={cn('mb-2', getScoreColor(scoreData.score))}>
                  {scoreData.score}
                </Typography>
                <Typography variant="h3" size="xl" weight="medium" className="text-foreground capitalize mb-2">
                  {scoreData.riskLevel} Risk
                </Typography>
                <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
                  Confidence: {scoreData.confidence}%
                </Typography>
              </div>

              {/* Transaction ID */}
              <div className="flex items-center justify-center space-x-2 p-4 bg-muted/50 rounded-lg">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  Transaction ID:
                </Typography>
                <Typography variant="span" size="sm" weight="medium" className="text-foreground font-mono">
                  {scoreData.transactionId}
                </Typography>
              </div>

              {/* Recommendation */}
              <div className={cn(
                'p-6 rounded-lg border text-left',
                scoreData.riskLevel === 'low' ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' :
                scoreData.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800' :
                'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
              )}>
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    'flex-shrink-0',
                    scoreData.riskLevel === 'low' ? 'text-green-600' :
                    scoreData.riskLevel === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  )}>
                    <RiskIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <Typography variant="h4" size="sm" weight="semibold" className="text-foreground mb-1">
                      Recommendation
                    </Typography>
                    <Typography variant="p" size="sm" className="text-foreground">
                      {scoreData.riskLevel === 'low'
                        ? 'This transaction appears safe. Proceed with normal processing.'
                        : scoreData.riskLevel === 'medium'
                        ? 'Exercise caution. Consider additional verification before approval.'
                        : 'High risk detected. Recommend denying this transaction or requiring additional verification.'}
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1"
                >
                  Check Another Transaction
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Return with layout for admins, standalone for regular users
  if (isAdmin) {
    return (
      <DashboardTemplate>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h1" size="2xl" weight="bold" className="text-foreground">
                Fraud Score Results
                </Typography>
                <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
                  Transaction fraud analysis results
                </Typography>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-8">
            <div className="text-center space-y-6">
              <div className={cn(
                'inline-flex items-center justify-center w-24 h-24 rounded-full',
                getRiskColor(scoreData.riskLevel)
              )}>
                <RiskIcon className="w-12 h-12" />
              </div>
              <div>
                <Typography variant="h1" size="5xl" weight="bold" className={cn('mb-2', getScoreColor(scoreData.score))}>
                  {scoreData.score}
                </Typography>
                <Typography variant="h3" size="xl" weight="medium" className="text-foreground capitalize mb-2">
                  {scoreData.riskLevel} Risk
                </Typography>
                <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
                  Confidence: {scoreData.confidence}%
                </Typography>
              </div>
              <div className="flex items-center justify-center space-x-2 p-4 bg-muted/50 rounded-lg">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                  Transaction ID:
                </Typography>
                <Typography variant="span" size="sm" weight="medium" className="text-foreground font-mono">
                  {scoreData.transactionId}
                </Typography>
              </div>
            </div>
          </div>
      </DashboardTemplate>
    );
  }

  return ScoreContent;
}

