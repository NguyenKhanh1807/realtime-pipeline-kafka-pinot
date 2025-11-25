'use client';

import { useState, useEffect, useCallback } from 'react';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { cn } from '@/src/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  DollarSign,
  MapPin,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react';

interface Transaction {
  id: string;
  timestamp: number;
  amount: number;
  merchant: string;
  location: string;
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'approved' | 'flagged' | 'blocked';
  userSeq: string;
  userName: string;
}

interface RealtimeTransactionFeedProps {
  producerActive: boolean;
  className?: string;
  maxTransactions?: number;
}

export function RealtimeTransactionFeed({
  producerActive,
  className,
  maxTransactions = 10,
}: RealtimeTransactionFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [pinotError, setPinotError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setPinotError(null);
      
      // Call Next.js API route instead of direct Pinot access
      const response = await fetch(`/api/pinot/query?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          sql: `
            SELECT
              transaction_seq,
              user_seq,
              user_name,
              create_dt,
              deposit_amount,
              receiving_country,
              label,
              fraud_score
            FROM transactions
            ORDER BY create_dt DESC
            LIMIT ${maxTransactions}
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RealtimeTransactionFeed] HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      console.log('[RealtimeTransactionFeed] API Response:', {
        hasResult: !!result,
        hasResultTable: !!result?.resultTable,
        hasRows: !!result?.resultTable?.rows,
        rowCount: result?.resultTable?.rows?.length || 0
      });
      
      if (!result || !result.resultTable || !result.resultTable.rows) {
        console.warn('[RealtimeTransactionFeed] No data returned from Pinot', result);
        setTransactions([]);
        setPinotError('No real-time data available from Pinot');
        return;
      }

      const recentTransactions = result.resultTable.rows.map((row: unknown[]): Transaction => {
        const transactionSeq = String(row[0] || '');
        const userSeq = String(row[1] || '');
        const userName = String(row[2] || 'Unknown User');
        
        // Handle timestamp - could be number (epoch ms), string (ISO date), or null
        let createDt: number;
        if (typeof row[3] === 'number') {
          createDt = row[3];
        } else if (typeof row[3] === 'string') {
          // Parse string timestamp like "2025-11-24 03:18:09.0"
          const parsed = new Date(row[3]).getTime();
          createDt = isNaN(parsed) ? Date.now() : parsed;
        } else {
          createDt = Date.now();
        }
        
        const amount = typeof row[4] === 'number' ? row[4] : 0;
        const country = String(row[5] || 'Unknown');
        const label = typeof row[6] === 'number' ? row[6] : 0;
        const fraudScoreRaw = typeof row[7] === 'number' ? row[7] : 0;

        const fraudScore = fraudScoreRaw;
        
        // Use label field to determine status:
        // 2 = BANNED (score > 90)
        // 1 = WARNING (score 60-90)
        // 0 = NORMAL (score < 60)
        const status: 'approved' | 'flagged' | 'blocked' = 
          label === 2 ? 'blocked' : 
          label === 1 ? 'flagged' : 'approved';
        
        // Determine risk level based on fraud score for visual indication
        const riskLevel: 'low' | 'medium' | 'high' | 'critical' = 
          fraudScore > 0.9 ? 'critical' : 
          fraudScore >= 0.6 ? 'high' : 
          fraudScore >= 0.4 ? 'medium' : 'low';

        return {
          id: `TXN-${transactionSeq}`,
          timestamp: createDt,
          amount,
          merchant: `Merchant ${userSeq.substring(0, 6)}`,
          location: country,
          fraudScore,
          riskLevel,
          status,
          userSeq,
          userName,
        };
      });

      console.log('[RealtimeTransactionFeed] Loaded:', recentTransactions.length, 'transactions at', new Date().toLocaleTimeString());
      setTransactions(recentTransactions);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
      setPinotError('Error loading data from Pinot: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [maxTransactions]);

  // Initial load on mount
  useEffect(() => {
    console.log('[RealtimeTransactionFeed] Initial mount');
    loadTransactions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh when producer is active
  useEffect(() => {
    console.log('[RealtimeTransactionFeed] Producer active state changed:', producerActive);
    
    let interval: NodeJS.Timeout | null = null;
    
    if (producerActive) {
      console.log('[RealtimeTransactionFeed] Starting 2-second auto-refresh');
      interval = setInterval(() => {
        loadTransactions();
      }, 2000);
    }
    
    // Cleanup
    return () => {
      if (interval) {
        console.log('[RealtimeTransactionFeed] Cleaning up interval');
        clearInterval(interval);
      }
    };
  }, [producerActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-200';
      case 'high':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-200';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-200';
      default:
        return 'border-green-500 bg-green-50 dark:bg-green-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'blocked':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'flagged':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  // Show all transactions
  const filteredTransactions = transactions;

  return (
    <div className={cn('bg-card border border-border rounded-lg p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Real-time Transaction Feed
          </Typography>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
            {producerActive
              ? `Showing all recent transactions - Live updates every 2 seconds`
              : 'Producer offline - showing last known transactions'}
          </Typography>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs">
            <Clock className="h-3 w-3" />
            {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactions}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {pinotError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <strong className="font-bold">Pinot Error:</strong>
          <span className="block sm:inline ml-2">{pinotError}</span>
        </div>
      )}

      <div className="space-y-3">
        {filteredTransactions.length === 0 && !pinotError ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 opacity-50">📊</div>
            <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
              {producerActive
                ? 'No transactions detected. System is monitoring...'
                : 'No transactions found. Start the producer to see live data.'}
            </Typography>
          </div>
        ) : (
          filteredTransactions.map((tx, index) => (
            <div
              key={`${tx.id}-${tx.timestamp}-${index}`}
              className={cn(
                'flex items-start p-4 rounded-lg border-l-4 transition-all hover:shadow-md',
                getRiskColor(tx.riskLevel)
              )}
            >
              <div className="flex items-start space-x-4 flex-1">
                {/* Status Icon */}
                <div className="mt-1">{getStatusIcon(tx.status)}</div>

                {/* User Info */}
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Typography
                        variant="span"
                        size="sm"
                        weight="semibold"
                        className="text-foreground"
                      >
                        {tx.userName}
                      </Typography>
                      <Typography
                        variant="span"
                        size="xs"
                        className={cn(
                          'px-2 py-0.5 rounded-full font-medium',
                          tx.riskLevel === 'critical'
                            ? 'bg-red-200 text-red-900'
                            : tx.riskLevel === 'high'
                            ? 'bg-orange-200 text-orange-900'
                            : 'bg-yellow-200 text-yellow-900'
                        )}
                      >
                        {tx.riskLevel.toUpperCase()}
                      </Typography>
                    </div>
                    <Typography variant="span" size="xs" color="muted" className="text-muted-foreground block mb-2">
                      User ID: {tx.userSeq}
                    </Typography>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{tx.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-medium">${tx.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fraud Score */}
              <div className="text-right ml-4 flex-shrink-0">
                <Typography variant="span" size="xs" color="muted" className="text-muted-foreground block mb-1">
                  Fraud Score
                </Typography>
                <Typography
                  variant="span"
                  size="xl"
                  weight="bold"
                  className={cn(
                    tx.fraudScore >= 0.7 ? 'text-red-600' :
                    tx.fraudScore >= 0.5 ? 'text-orange-600' :
                    'text-yellow-600'
                  )}
                >
                  {(tx.fraudScore * 100).toFixed(0)}%
                </Typography>
                <div className="mt-2">
                  <div className="w-16 bg-muted rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        tx.fraudScore >= 0.7 ? 'bg-red-500' :
                        tx.fraudScore >= 0.5 ? 'bg-orange-500' :
                        'bg-yellow-500'
                      )}
                      style={{ width: `${tx.fraudScore * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Footer */}
      {filteredTransactions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
            Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </Typography>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Critical ({filteredTransactions.filter(t => t.riskLevel === 'critical').length})</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">High ({filteredTransactions.filter(t => t.riskLevel === 'high').length})</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Medium ({filteredTransactions.filter(t => t.riskLevel === 'medium').length})</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Low ({filteredTransactions.filter(t => t.riskLevel === 'low').length})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}