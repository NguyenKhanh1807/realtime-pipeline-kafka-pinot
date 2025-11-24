'use client';

import { useMemo } from 'react';
import { Typography } from '@/src/components/atoms/';
import { cn } from '@/src/lib';

// Simplified world map data - major countries/regions
const WORLD_MAP_DATA = {
  // North America
  'United States': { x: 120, y: 160, width: 80, height: 60 },
  'Canada': { x: 120, y: 100, width: 80, height: 40 },
  'Mexico': { x: 120, y: 200, width: 40, height: 30 },

  // Europe
  'United Kingdom': { x: 380, y: 130, width: 25, height: 20 },
  'Germany': { x: 400, y: 140, width: 30, height: 15 },
  'France': { x: 385, y: 150, width: 25, height: 20 },
  'Italy': { x: 405, y: 160, width: 20, height: 25 },
  'Spain': { x: 375, y: 170, width: 20, height: 20 },
  'Netherlands': { x: 395, y: 135, width: 15, height: 10 },

  // Asia
  'China': { x: 580, y: 160, width: 60, height: 40 },
  'Japan': { x: 650, y: 150, width: 20, height: 30 },
  'India': { x: 530, y: 190, width: 35, height: 35 },
  'South Korea': { x: 635, y: 155, width: 15, height: 15 },

  // Oceania
  'Australia': { x: 620, y: 280, width: 40, height: 25 },

  // Middle East
  'Saudi Arabia': { x: 450, y: 180, width: 25, height: 20 },
  'UAE': { x: 465, y: 185, width: 15, height: 10 },

  // Africa
  'South Africa': { x: 420, y: 260, width: 25, height: 20 },
  'Nigeria': { x: 395, y: 210, width: 20, height: 15 },

  // South America
  'Brazil': { x: 220, y: 240, width: 35, height: 40 },
  'Argentina': { x: 200, y: 280, width: 25, height: 20 },
};

interface FraudMapData {
  country: string;
  fraudCount: number;
  totalTransactions: number;
  fraudRate: number;
  coordinates?: { lat: number; lng: number };
}

interface FraudMapProps {
  data: FraudMapData[];
  className?: string;
  width?: number;
  height?: number;
}

export function FraudMap({ data, className, width = 700, height = 400 }: FraudMapProps) {
  const processedData = useMemo(() => {
    const countryData: Record<string, FraudMapData> = {};

    // Aggregate data by country
    data.forEach(item => {
      const country = item.country;
      if (!countryData[country]) {
        countryData[country] = {
          country,
          fraudCount: 0,
          totalTransactions: 0,
          fraudRate: 0,
        };
      }
      countryData[country].fraudCount += item.fraudCount;
      countryData[country].totalTransactions += item.totalTransactions;
    });

    // Calculate fraud rates
    Object.values(countryData).forEach(item => {
      item.fraudRate = item.totalTransactions > 0
        ? (item.fraudCount / item.totalTransactions) * 100
        : 0;
    });

    return Object.values(countryData);
  }, [data]);

  const getColorForFraudRate = (rate: number): string => {
    if (rate >= 10) return '#dc2626'; // red-600 - Very High
    if (rate >= 5) return '#ea580c';  // orange-600 - High
    if (rate >= 2) return '#ca8a04';  // yellow-600 - Medium
    if (rate >= 0.5) return '#16a34a'; // green-600 - Low
    return '#6b7280'; // gray-500 - Very Low/No Data
  };


  return (
    <div className={cn('w-full', className)}>
      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-sm">
        <span className="font-medium text-foreground">Fraud Rate:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-500 rounded"></div>
          <span>Very Low (&lt;0.5%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span>Low (0.5-2%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-600 rounded"></div>
          <span>Medium (2-5%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-600 rounded"></div>
          <span>High (5-10%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded"></div>
          <span>Very High (≥10%)</span>
        </div>
      </div>

      {/* Map */}
      <div className="relative flex justify-center">
        <svg
          width={width}
          height={height}
          viewBox="0 0 700 400"
          className="border border-border rounded-lg bg-slate-50 dark:bg-slate-900"
        >
          {/* Ocean background */}
          <rect width="100%" height="100%" fill="#e0f2fe" className="dark:fill-slate-800" />

          {/* Country shapes */}
          {Object.entries(WORLD_MAP_DATA).map(([country, coords]) => {
            const countryData = processedData.find(d => d.country === country);
            const fraudRate = countryData?.fraudRate || 0;

            return (
              <g key={country}>
                <rect
                  x={coords.x}
                  y={coords.y}
                  width={coords.width}
                  height={coords.height}
                  fill={getColorForFraudRate(fraudRate)}
                  stroke="#ffffff"
                  strokeWidth="1"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
                {countryData && (
                  <text
                    x={coords.x + coords.width / 2}
                    y={coords.y + coords.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="white"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {fraudRate.toFixed(1)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Country tooltips on hover */}
        {processedData.map((countryData) => {
          const coords = WORLD_MAP_DATA[countryData.country as keyof typeof WORLD_MAP_DATA];
          if (!coords) return null;

          return (
            <div
              key={countryData.country}
              className="absolute bg-card border border-border rounded-lg p-3 shadow-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                left: coords.x + coords.width / 2,
                top: coords.y - 10,
                transform: 'translateX(-50%)',
              }}
            >
              <Typography variant="span" size="sm" weight="medium" className="text-foreground block">
                {countryData.country}
              </Typography>
              <Typography variant="span" size="xs" color="muted" className="text-muted-foreground block">
                Fraud Rate: {countryData.fraudRate.toFixed(2)}%
              </Typography>
              <Typography variant="span" size="xs" color="muted" className="text-muted-foreground block">
                Total: {countryData.totalTransactions} transactions
              </Typography>
              <Typography variant="span" size="xs" color="muted" className="text-muted-foreground block">
                Fraudulent: {countryData.fraudCount}
              </Typography>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <Typography variant="h3" size="lg" weight="bold" className="text-foreground">
            {processedData.length}
          </Typography>
          <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
            Countries Tracked
          </Typography>
        </div>
        <div className="text-center">
          <Typography variant="h3" size="lg" weight="bold" className="text-red-600">
            {(() => {
              const total = processedData.reduce((sum, d) => sum + (isNaN(d.fraudCount) ? 0 : d.fraudCount), 0);
              return isNaN(total) ? '0' : total.toLocaleString();
            })()}
          </Typography>
          <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
            Total Fraud Cases
          </Typography>
        </div>
        <div className="text-center">
          <Typography variant="h3" size="lg" weight="bold" className="text-orange-600">
            {(() => {
              const total = processedData.reduce((sum, d) => sum + (isNaN(d.totalTransactions) ? 0 : d.totalTransactions), 0);
              return isNaN(total) ? '0' : total.toLocaleString();
            })()}
          </Typography>
          <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
            Total Transactions
          </Typography>
        </div>
        <div className="text-center">
          <Typography variant="h3" size="lg" weight="bold" className="text-blue-600">
            {processedData.length > 0
              ? (() => {
                  const total = processedData.reduce((sum, d) => sum + (isNaN(d.fraudRate) ? 0 : d.fraudRate), 0);
                  const average = total / processedData.length;
                  return isNaN(average) ? '0.00' : average.toFixed(2);
                })()
              : '0.00'
            }%
          </Typography>
          <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
            Average Fraud Rate
          </Typography>
        </div>
      </div>
    </div>
  );
}
