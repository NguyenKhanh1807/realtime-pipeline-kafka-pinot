'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/src/hooks/use-websocket';
import { Typography, Button } from '@/src/components/atoms';
import { cn } from '@/src/lib';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Play,
  Pause,
  X
} from 'lucide-react';

interface RealtimeTransactionFeedProps {
  className?: string;
  maxItems?: number;
  showControls?: boolean;
}

export function RealtimeTransactionFeed({
  className,
  maxItems = 10,
  showControls = true
}: RealtimeTransactionFeedProps) {
  const {
    connectionStatus,
    transactionUpdates,
    connect,
    disconnect,
    clearTransactionUpdates,
    isConnected
  } = useWebSocket();

  const [isPaused, setIsPaused] = useState(false);
  const [displayedUpdates, setDisplayedUpdates] = useState(transactionUpdates.slice(0, maxItems));

  // Update displayed updates when transaction updates change
  useEffect(() => {
    if (!isPaused) {
      setDisplayedUpdates(transactionUpdates.slice(0, maxItems));
    }
  }, [transactionUpdates, isPaused, maxItems]);

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      // Resume - show latest updates
      setDisplayedUpdates(transactionUpdates.slice(0, maxItems));
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-950 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-950 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-950 border-green-200';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'flagged': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'blocked': return <X className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className={cn('bg-card border border-border rounded-lg', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium',
              connectionStatus.connected
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            )}>
              {connectionStatus.connected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>
                {connectionStatus.connected ? 'Live' : 'Offline'}
              </span>
            </div>
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
              Live Transactions
            </Typography>
          </div>

          {showControls && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={connectionStatus.connected ? disconnect : connect}
                className="h-8"
              >
                {connectionStatus.connected ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Disconnect
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Connect
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={togglePause}
                disabled={!connectionStatus.connected}
                className="h-8"
              >
                {isPaused ? (
                  <Play className="h-3 w-3 mr-1" />
                ) : (
                  <Pause className="h-3 w-3 mr-1" />
                )}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={clearTransactionUpdates}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>

        <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
          Real-time transaction processing and fraud analysis
        </Typography>
      </div>

      {/* Connection Status Banner */}
      {!connectionStatus.connected && (
        <div className="px-4 py-2 bg-orange-50 dark:bg-orange-950 border-b border-orange-200 dark:border-orange-800">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-orange-600" />
            <Typography variant="span" size="sm" className="text-orange-800 dark:text-orange-200">
              {connectionStatus.reconnecting
                ? 'Reconnecting to live feed...'
                : 'Disconnected from live feed. Click Connect to resume.'
              }
            </Typography>
          </div>
        </div>
      )}

      {/* Transaction Feed */}
      <div className="max-h-96 overflow-y-auto">
        {displayedUpdates.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <Typography variant="h3" size="lg" color="muted" className="text-muted-foreground mb-2">
              {connectionStatus.connected ? 'Waiting for transactions...' : 'No live data'}
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
              {connectionStatus.connected
                ? 'Transactions will appear here as they are processed'
                : 'Connect to the live feed to see real-time transactions'
              }
            </Typography>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedUpdates.map((update) => (
              <div
                key={update.id}
                className={cn(
                  'p-4 hover:bg-muted/50 transition-colors',
                  getRiskColor(update.riskLevel)
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(update.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                          {formatAmount(update.amount)}
                        </Typography>
                        <Typography variant="span" size="xs" className="text-muted-foreground">
                          •
                        </Typography>
                        <Typography variant="span" size="xs" className="text-muted-foreground">
                          {update.merchant}
                        </Typography>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                          {update.location}
                        </Typography>
                        <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                          •
                        </Typography>
                        <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                          Risk: {update.fraudScore}/100
                        </Typography>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium capitalize',
                      update.riskLevel === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      update.riskLevel === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      update.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    )}>
                      {update.riskLevel}
                    </span>
                    <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                      {formatTime(update.timestamp)}
                    </Typography>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {displayedUpdates.length > 0 && (
        <div className="px-4 py-3 bg-muted/30 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <Typography variant="span" color="muted" className="text-muted-foreground">
              Showing {displayedUpdates.length} of {transactionUpdates.length} recent transactions
            </Typography>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-muted-foreground">
                  {displayedUpdates.filter(u => u.status === 'approved').length} Approved
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 text-orange-600" />
                <span className="text-muted-foreground">
                  {displayedUpdates.filter(u => u.status === 'flagged').length} Flagged
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
