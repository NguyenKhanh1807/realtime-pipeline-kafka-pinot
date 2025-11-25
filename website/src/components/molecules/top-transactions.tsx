'use client';

import { useState, useEffect } from 'react';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { cn } from '@/src/lib/utils';
import {
  TrendingUp,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Crown,
  Globe,
} from 'lucide-react';

interface TopFraudCountry {
  country: string;
  fraudCount: number;
  totalTransactions: number;
  fraudRate: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

interface TopTransactionsProps {
  producerActive: boolean;
  className?: string;
}

export function TopTransactions({
  producerActive,
  className,
}: TopTransactionsProps) {
  const [topCountries, setTopCountries] = useState<TopFraudCountry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTopCountries = async () => {
    try {
      setIsLoading(true);
      const { pinotClient } = await import('@/src/services/pinot-client');
      console.log('Loading top 5 fraud countries from Pinot...');
      const countries = await pinotClient.getTopFraudCountries(5);
      setTopCountries(countries);
    } catch (error) {
      console.error('Failed to load top fraud countries:', error);
      setTopCountries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    loadTopCountries();
    
    // Auto-refresh every 3 seconds
    const interval = setInterval(loadTopCountries, 3000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High':
        return 'border-red-500 bg-red-50 dark:bg-red-200';
      case 'Medium':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-200';
      case 'Low':
        return 'border-green-500 bg-green-50 dark:bg-green-200';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-200';
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-500'; // Gold
      case 1:
        return 'text-gray-400'; // Silver
      case 2:
        return 'text-orange-600'; // Bronze
      default:
        return 'text-blue-500';
    }
  };

  return (
    <div className={cn('bg-card border border-border rounded-lg p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
              Top 5 Fraud Countries
            </Typography>
          </div>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
            {producerActive
              ? 'Live updates every 3 seconds'
              : 'Producer offline - showing last known data'}
          </Typography>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTopCountries}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {topCountries.length === 0 ? (
          <div className="col-span-5 text-center py-12">
            <div className="text-4xl mb-3 opacity-50">🌍</div>
            <Typography variant="p" size="base" color="muted" className="text-muted-foreground">
              {producerActive
                ? 'Loading fraud data...'
                : 'No data available. Start the producer to see live data.'}
            </Typography>
          </div>
        ) : (
          topCountries.map((country, index) => (
            <div
              key={country.country}
              className={cn(
                'relative p-4 rounded-lg border-2 transition-all hover:shadow-lg',
                getRiskColor(country.riskLevel)
              )}
            >
              {/* Rank Badge */}
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-card border-2 border-current rounded-full flex items-center justify-center">
                {index < 3 ? (
                  <Crown className={cn('h-4 w-4', getRankColor(index))} />
                ) : (
                  <span className={cn('text-sm font-bold', getRankColor(index))}>
                    #{index + 1}
                  </span>
                )}
              </div>

              {/* Country - Main Focus */}
              <div className="text-center mb-3 mt-2">
                <MapPin className="h-5 w-5 mx-auto mb-1 text-foreground" />
                <Typography
                  variant="h3"
                  size="xl"
                  weight="bold"
                  className="text-foreground"
                >
                  {country.country}
                </Typography>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fraud Cases:</span>
                  <span className="font-medium text-foreground">
                    {country.fraudCount.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Txns:</span>
                  <span className="font-medium text-foreground">
                    {country.totalTransactions.toLocaleString()}
                  </span>
                </div>

                {/* Fraud Rate */}
                <div className="pt-2 border-t border-current/20">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fraud Rate:</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold',
                        country.riskLevel === 'High'
                          ? 'bg-red-200 text-red-900'
                          : country.riskLevel === 'Medium'
                          ? 'bg-orange-200 text-orange-900'
                          : 'bg-green-200 text-green-900'
                      )}
                    >
                      {country.fraudRate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Indicator */}
              {country.riskLevel === 'High' ? (
                <div className="absolute -top-2 -right-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
