'use client';

import { Typography, ScrollArea } from '@/src/components/atoms';
import { FraudMap } from './fraud-map';
import { AlertTriangle, CreditCard } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import { getCountryCode } from '@/src/lib';

export interface CountryData {
  country: string;
  fraudRate: number;
  totalTransactions: number;
  fraudCount: number;
  flag?: string; // Optional, kept for backward compatibility
  rank: number;
}

export interface GeographicAnalysisProps {
  mapData: Array<{
    country: string;
    fraudCount: number;
    totalTransactions: number;
    fraudRate: number;
  }>;
  topCountries: CountryData[];
  globalAverageFraudRate?: number;
  className?: string;
}

export function GeographicAnalysis({
  mapData,
  topCountries,
  globalAverageFraudRate = 3.45,
  className,
}: GeographicAnalysisProps) {
  return (
    <div className={`grid grid-cols-1 xl:grid-cols-3 gap-8 ${className || ''}`}>
      {/* World Map */}
      <div className="xl:col-span-2 bg-card border border-border rounded-lg p-6 flex flex-col">
        <div className="mb-6">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-2">
            Global Fraud Distribution
          </Typography>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
            Geographic view of fraud rates across major countries and regions
          </Typography>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[400px]">
          <div className="w-full flex justify-center">
            <FraudMap data={mapData} height={350} />
          </div>
        </div>
      </div>

      {/* Top 10 Countries */}
      <div className="bg-card border border-border rounded-lg p-6 flex flex-col shadow-sm">
        <div className="mb-6">
          <Typography variant="h3" size="lg" weight="semibold" className="text-foreground mb-2">
            Top 10 Risk Countries
          </Typography>
          <Typography variant="p" size="sm" color="muted" className="text-muted-foreground">
            Highest fraud rates by country with detailed metrics
          </Typography>
        </div>
        <ScrollArea className="max-h-[320px]">
          <div className="space-y-2.5 pr-4">
            {topCountries.map((country) => {
              const countryCode = getCountryCode(country.country);
              return (
                <div
                  key={country.country}
                  className="flex items-center space-x-3 p-4 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30 border border-border/60 hover:border-border hover:bg-muted/70 hover:shadow-md transition-all duration-200 group"
                >
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 transition-all duration-200 shadow-sm ${
                      country.rank <= 3
                        ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                        : country.rank <= 5
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
                        : 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground'
                    }`}
                  >
                    <span className="text-xs font-bold mb-0.5">{country.rank}</span>
                  </div>
                  <div className="shrink-0 transition-transform duration-200">
                    {countryCode ? (
                      <ReactCountryFlag
                        countryCode={countryCode}
                        svg
                        style={{
                          width: '4em',
                          height: '4em',
                        }}
                        title={country.country}
                        className="rounded-md shadow-sm border border-border/20"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-lg">
                        {country.flag || '🏳️'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Typography
                        variant="span"
                        size="sm"
                        weight="semibold"
                        className="text-foreground truncate group-hover:text-primary transition-colors"
                      >
                        {country.country}
                      </Typography>
                      <Typography
                        variant="span"
                        size="xs"
                        weight="bold"
                        className={`shrink-0 ml-2 px-2.5 py-1 rounded-md ${
                          country.fraudRate >= 4
                            ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                            : country.fraudRate >= 3.5
                            ? 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800'
                            : country.fraudRate >= 3
                            ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
                            : 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
                        }`}
                      >
                        {country.fraudRate}%
                      </Typography>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-1">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                        <Typography variant="span" size="xs" color="muted" className="text-muted-foreground font-medium5">
                          {country.fraudCount} frauds
                        </Typography>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <Typography variant="span" size="xs" color="muted" className="text-muted-foreground font-medium mb-0.5">
                          {country.totalTransactions.toLocaleString()} total
                        </Typography>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Summary stats */}
        <div className="mt-6 pt-5 border-t border-border">
          <div className="text-center bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-lg p-4 border border-red-200/50 dark:border-red-800/30">
            <Typography variant="h4" size="lg" weight="bold" className="text-red-600 dark:text-red-400 mb-1">
              {globalAverageFraudRate}%
            </Typography>
            <Typography variant="span" size="xs" color="muted" className="text-muted-foreground font-medium">
              Global Average Fraud Rate
            </Typography>
          </div>
        </div>
      </div>
    </div>
  );
}

