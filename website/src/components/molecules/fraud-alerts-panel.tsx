'use client';

import { useState, useEffect } from 'react';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { cn } from '@/src/lib/utils';
import {
  AlertTriangle,
  X,
  Bell,
  BellOff,
  ExternalLink,
  Clock,
  DollarSign,
  MapPin,
  User,
  Shield,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface FraudAlert {
  id: string;
  timestamp: number;
  amount: number;
  merchant: string;
  location: string;
  customerEmail: string;
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendedAction: 'approve' | 'review' | 'block';
}

interface FraudAlertsPanelProps {
  className?: string;
  maxAlerts?: number;
  autoHide?: boolean;
  hideDelay?: number;
}

export function FraudAlertsPanel({
  className,
  maxAlerts = 5,
  autoHide = true,
  hideDelay = 30000
}: FraudAlertsPanelProps) {
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [visibleAlerts, setVisibleAlerts] = useState<FraudAlert[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load fraud alerts from Pinot database
  const loadFraudAlerts = async () => {
    try {
      setIsLoading(true);
      const { pinotClient } = await import('@/src/services/pinot-client');
      console.log('Loading recent fraud transactions from Pinot...');
      const alerts = await pinotClient.getRecentFraudTransactions(60); // Last 60 minutes
      setFraudAlerts(alerts);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load fraud alerts:', error);
      setFraudAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    loadFraudAlerts();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadFraudAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update visible alerts when fraud alerts change
  useEffect(() => {
    const newAlerts = fraudAlerts
      .filter(alert => !dismissedAlerts.has(alert.id))
      .slice(0, maxAlerts);
    setVisibleAlerts(newAlerts);
  }, [fraudAlerts, maxAlerts, dismissedAlerts]);

  // Auto-hide alerts after delay
  useEffect(() => {
    if (!autoHide) return;

    const timers = visibleAlerts.map(alert => {
      return setTimeout(() => {
        dismissAlert(alert.id);
      }, hideDelay);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [visibleAlerts, autoHide, hideDelay]);

  // Show browser notifications for new alerts
  useEffect(() => {
    if (notificationsEnabled && visibleAlerts.length > 0 && 'Notification' in window) {
      visibleAlerts.slice(0, 1).forEach(alert => {
        if (Notification.permission === 'granted') {
          new Notification(`Fraud Alert: ${alert.riskLevel.toUpperCase()} Risk`, {
            body: `$${alert.amount.toLocaleString()} transaction flagged at ${alert.merchant}`,
            icon: '/favicon.ico',
            tag: alert.id,
          });
        }
      });
    }
  }, [visibleAlerts, notificationsEnabled]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const clearAllAlerts = () => {
    setVisibleAlerts([]);
    setDismissedAlerts(new Set(fraudAlerts.map(a => a.id)));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-200';
      case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-200';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-200';
      case 'low': return 'border-green-500 bg-green-50 dark:bg-green-200';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-300';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      case 'high':
      case 'medium': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'low': return <CheckCircle className="h-5 w-5 text-green-600" />;
      default: return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (visibleAlerts.length === 0 && !isLoading) {
    return (
      <div className={cn('fixed top-4 right-4 z-50 max-w-sm', className)}>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <Typography variant="span" size="sm" weight="medium" className="text-green-800">
              No Recent Fraud Detected
            </Typography>
          </div>
          <Typography variant="p" size="xs" className="text-green-700 mb-3">
            Last checked: {lastRefresh.toLocaleTimeString()}
          </Typography>
          <Button
            variant="outline"
            size="sm"
            onClick={loadFraudAlerts}
            className="h-7 text-xs bg-white"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('fixed top-4 right-4 z-50 max-w-sm', className)}>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <Typography variant="span" size="sm" className="text-blue-800">
              Checking for fraud alerts...
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('fixed top-4 right-4 z-50 space-y-3 max-w-sm', className)}>
      {/* Notification Settings */}
      <div className="flex items-center justify-end space-x-2 mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={requestNotificationPermission}
          disabled={notificationsEnabled}
          className="h-8 text-xs"
        >
          {notificationsEnabled ? (
            <>
              <Bell className="h-3 w-3 mr-1" />
              Enabled
            </>
          ) : (
            <>
              <BellOff className="h-3 w-3 mr-1" />
              Enable Alerts
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={clearAllAlerts}
          className="h-8 text-xs"
        >
          Clear All
        </Button>
      </div>

      {/* Fraud Alerts */}
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            'border-l-4 rounded-lg shadow-lg bg-card p-4 animate-in slide-in-from-right-2 duration-300',
            getRiskColor(alert.riskLevel)
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getRiskIcon(alert.riskLevel)}
              <div>
                <Typography variant="h4" size="sm" weight="semibold" className="text-foreground">
                  Fraud Alert - {alert.riskLevel.toUpperCase()}
                </Typography>
                <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                  {formatTime(alert.timestamp)}
                </Typography>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissAlert(alert.id)}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Transaction Details */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                {formatAmount(alert.amount)}
              </Typography>
            </div>

            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Typography variant="span" size="sm" className="text-foreground">
                {alert.merchant}
              </Typography>
            </div>

            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Typography variant="span" size="sm" className="text-foreground">
                {alert.location}
              </Typography>
            </div>
          </div>

          {/* Risk Score */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                Fraud Score
              </Typography>
              <Typography variant="span" size="xs" weight="medium" className="text-foreground">
                {alert.fraudScore}/100
              </Typography>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  alert.fraudScore > 70 ? 'bg-red-500' :
                  alert.fraudScore > 40 ? 'bg-orange-500' : 'bg-green-500'
                )}
                style={{ width: `${alert.fraudScore}%` }}
              />
            </div>
          </div>

          {/* Risk Factors */}
          {alert.factors.length > 0 && (
            <div className="mb-3">
              <Typography variant="span" size="xs" weight="medium" className="text-foreground mb-1 block">
                Risk Factors:
              </Typography>
              <ul className="text-xs text-muted-foreground space-y-1">
                {alert.factors.slice(0, 2).map((factor, index) => (
                  <li key={index} className="flex items-start space-x-1">
                    <span>•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
              Recommended: {alert.recommendedAction}
            </Typography>

            <Button variant="outline" size="sm" className="h-7 text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              Review
            </Button>
          </div>
        </div>
      ))}

      {/* Connection Status Indicator */}
      <div className="fixed bottom-4 right-4">
        <div className={cn(
          'flex items-center space-x-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg',
          fraudAlerts.length > 0
            ? 'bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-200 dark:text-yellow-900'
        )}>
          <div className={cn(
            'w-2 h-2 rounded-full',
            fraudAlerts.length > 0 ? 'bg-green-500' : 'bg-yellow-500'
          )} />
          <span>{fraudAlerts.length > 0 ? 'Pinot Connected' : 'Pinot Monitoring'}</span>
        </div>
      </div>
    </div>
  );
}
