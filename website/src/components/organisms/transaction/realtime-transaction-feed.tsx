'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRealtimeTransactions } from '@/src/hooks/use-realtime-transactions';
import { Typography, Button } from '@/src/components/atoms';
import { Pagination } from '@/src/components/molecules';
import { cn } from '@/src/lib';
import {
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Play,
  Pause,
  X,
  Activity,
  Shield,
  XCircle
} from 'lucide-react';

interface RealtimeTransactionFeedProps {
  className?: string;
  maxItems?: number;
  showControls?: boolean;
  itemsPerPage?: number;
}

export function RealtimeTransactionFeed({
  className,
  maxItems = 5,
  showControls = true,
  itemsPerPage = 5,
}: RealtimeTransactionFeedProps) {
  const {
    transactionUpdates,
    isPolling,
    startPolling,
    stopPolling,
    clearUpdates,
    refreshTransactions,
  } = useRealtimeTransactions({
    autoStart: true,
    pollInterval: 3000,
    maxUpdates: 100,
  });

  const [isPaused, setIsPaused] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Deduplicate transactions and calculate pagination
  const { uniqueUpdates, totalItems, totalPages, paginatedTransactions } = useMemo(() => {
    // Deduplicate by transaction ID (in case duplicates slip through)
    const unique = Array.from(
      new Map(transactionUpdates.map(update => [update.id, update])).values()
    );
    
    const total = unique.length;
    const totalPages = Math.ceil(total / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = unique.slice(startIndex, endIndex);
    
    return {
      uniqueUpdates: unique,
      totalItems: total,
      totalPages,
      paginatedTransactions: paginated,
    };
  }, [transactionUpdates, currentPage, itemsPerPage]);

  // Reset to page 1 when new transactions arrive (if on first page or paused)
  useEffect(() => {
    if (!isPaused && currentPage === 1 && transactionUpdates.length > 0) {
      // New transactions arrive, stay on page 1
    } else if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [transactionUpdates.length, isPaused, currentPage, totalPages]);

  const togglePause = () => {
    if (isPaused) {
      startPolling();
      setIsPaused(false);
    } else {
      stopPolling();
      setIsPaused(true);
    }
  };

  const handleConnect = () => {
    if (isPolling) {
      stopPolling();
    } else {
      startPolling();
      setIsPaused(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Flagged': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'Blocked': return <X className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-blue-600" />;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className={cn('bg-card border border-border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium',
              isPolling && !isPaused
                ? 'bg-green-100 text-green-700 dark:bg-green-400/20 dark:text-green-300'
                : isPaused
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300'
                : 'bg-muted text-muted-foreground'
            )}>
              {isPolling && !isPaused ? (
                <>
                  <Activity className="h-3 w-3 animate-pulse" />
                  <span className="mb-0.5 text-xs">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span className="mb-0.5 text-xs">{isPaused ? 'Paused' : 'Offline'}</span>
                </>
              )}
            </div>
            <div>
              <Typography variant="h2" size="lg" weight="semibold" className="text-foreground">
              Live Transactions
              </Typography>
              <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
                Latest transaction activity and fraud detection results
              </Typography>
            </div>
          </div>

          {showControls && (
            <div className="flex items-center gap-1.5">
              <Button
                variant={isPolling && !isPaused ? "default" : "outline"}
                size="sm"
                onClick={handleConnect}
                className="h-8 px-3"
              >
                {isPolling && !isPaused ? (
                  <>
                    <Pause className="h-3.5 w-3.5 mr-1.5" />
                    <span className="mb-0.5 text-xs">Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    <span className="mb-0.5 text-xs">Start</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={togglePause}
                disabled={!isPolling}
                className="h-8 px-2"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTransactions}
                disabled={!isPolling}
                className="h-8 px-2"
                title="Refresh"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isPolling && "animate-spin")} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearUpdates}
                disabled={transactionUpdates.length === 0}
                className="h-8 px-2"
                title="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Transaction Feed */}
      <div className="divide-y divide-border">
        {paginatedTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
              {isPolling && !isPaused ? 'Waiting for transactions...' : 'No live data'}
            </Typography>
          </div>
        ) : (
          paginatedTransactions.map((update, index) => (
            <div
              key={`${update.id}-${update.timestamp}`}
              className={cn(
                'px-6 py-4 hover:bg-muted/30 transition-colors',
                index === 0 && 'animate-in fade-in slide-in-from-top-2 duration-300'
              )}
            >
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 ">
                    {getStatusIcon(update.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Typography variant="span" size="base" weight="bold" className="text-foreground">
                        {formatAmount(update.amount)}
                      </Typography>
                      <span className="text-muted-foreground">•</span>
                      <Typography variant="span" size="xs" weight="medium" className="text-foreground truncate">
                        {update.merchant}
                      </Typography>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {update.location && (
                        <>
                          <span>{update.location}</span>
                          <span>•</span>
                        </>
                      )}
                      <div className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded font-medium',
                        update.fraudScore < 30
                          ? 'bg-green-100 text-green-700 dark:bg-green-400/30 dark:text-green-200'
                          : update.fraudScore < 70
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-400/30 dark:text-red-200'
                      )}>
                        <Shield className={cn(
                          'h-3 w-3',
                          update.fraudScore < 30
                            ? 'text-green-600 dark:text-green-300'
                            : update.fraudScore < 70
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-300'
                        )} />
                        <span>{update.fraudScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className={cn(
                    'px-3 py-1.5 rounded text-xs font-medium capitalize',
                    getRiskBadgeColor(update.riskLevel)
                  )}>
                    {update.riskLevel}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap pb-0.5">
                    {formatTime(update.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
