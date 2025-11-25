import { NextResponse } from 'next/server';

const PINOT_BROKER = process.env.PINOT_BROKER_URL || 'http://localhost:8099';

interface DailyMetrics {
  date: string;
  totalTransactions: number;
  fraudCount: number;
  fraudRate: number;
  totalAmount: number;
  avgAmount: number;
  maxAmount: number;
  uniqueUsers: number;
  avgTransactionsPerUser: number;
  peakHour: number;
  suspiciousPatterns: string[];
  riskScore: number;
  advice: string[];
}

interface HourlyDistribution {
  hour: number;
  count: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    // Query 1: Daily aggregated metrics
    const dailyMetricsQuery = `
      SELECT 
        DATETIMECONVERT(create_dt, '1:MILLISECONDS:EPOCH', '1:MILLISECONDS:EPOCH', '1:DAYS') as day_ms,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as fraud_count,
        SUM(transaction_amount_24hour) as total_amount,
        AVG(transaction_amount_24hour) as avg_amount,
        MAX(transaction_amount_24hour) as max_amount,
        COUNT(DISTINCT user_seq) as unique_users
      FROM transactions
      WHERE create_dt >= ago('P${days}D')
      GROUP BY day_ms
      ORDER BY day_ms DESC
      LIMIT ${days}
    `;

    const dailyResponse = await fetch(`${PINOT_BROKER}/query/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: dailyMetricsQuery }),
    });

    if (!dailyResponse.ok) {
      throw new Error('Failed to fetch daily metrics');
    }

    const dailyData = await dailyResponse.json();
    const dailyRows = dailyData.resultTable?.rows || [];

    // Query 2: Hourly distribution for each day
    const hourlyQuery = `
      SELECT 
        DATETIMECONVERT(create_dt, '1:MILLISECONDS:EPOCH', '1:MILLISECONDS:EPOCH', '1:DAYS') as day_ms,
        DATETRUNC('HOUR', create_dt, 'MILLISECONDS') as hour_ms,
        COUNT(*) as hourly_count
      FROM transactions
      WHERE create_dt >= ago('P${days}D')
      GROUP BY day_ms, hour_ms
      ORDER BY day_ms DESC, hour_ms
    `;

    const hourlyResponse = await fetch(`${PINOT_BROKER}/query/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: hourlyQuery }),
    });

    const hourlyData = await hourlyResponse.json();
    const hourlyRows = hourlyData.resultTable?.rows || [];

    // Query 3: Payment method distribution per day
    const paymentMethodQuery = `
      SELECT 
        DATETIMECONVERT(create_dt, '1:MILLISECONDS:EPOCH', '1:MILLISECONDS:EPOCH', '1:DAYS') as day_ms,
        payment_method,
        COUNT(*) as count,
        SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as fraud_count
      FROM transactions
      WHERE create_dt >= ago('P${days}D')
      GROUP BY day_ms, payment_method
      ORDER BY day_ms DESC
    `;

    const paymentResponse = await fetch(`${PINOT_BROKER}/query/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: paymentMethodQuery }),
    });

    const paymentData = await paymentResponse.json();
    const paymentRows = paymentData.resultTable?.rows || [];

    // Query 4: Country distribution per day
    const countryQuery = `
      SELECT 
        DATETIMECONVERT(create_dt, '1:MILLISECONDS:EPOCH', '1:MILLISECONDS:EPOCH', '1:DAYS') as day_ms,
        receiving_country_code,
        COUNT(*) as count,
        SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as fraud_count
      FROM transactions
      WHERE create_dt >= ago('P${days}D')
      GROUP BY day_ms, receiving_country_code
      ORDER BY day_ms DESC
    `;

    const countryResponse = await fetch(`${PINOT_BROKER}/query/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: countryQuery }),
    });

    const countryData = await countryResponse.json();
    const countryRows = countryData.resultTable?.rows || [];

    // Process data and generate insights
    const dailyPatterns: DailyMetrics[] = dailyRows.map((row: any) => {
      const dayMs = parseInt(row[0]);
      const totalTransactions = parseInt(row[1]);
      const fraudCount = parseInt(row[2]);
      const totalAmount = parseFloat(row[3]);
      const avgAmount = parseFloat(row[4]);
      const maxAmount = parseFloat(row[5]);
      const uniqueUsers = parseInt(row[6]);

      const fraudRate = totalTransactions > 0 ? (fraudCount / totalTransactions) * 100 : 0;
      const avgTransactionsPerUser = uniqueUsers > 0 ? totalTransactions / uniqueUsers : 0;

      // Get hourly distribution for this day
      const dayHourlyData = hourlyRows
        .filter((h: any) => parseInt(h[0]) === dayMs)
        .map((h: any) => ({
          hour: new Date(parseInt(h[1])).getHours(),
          count: parseInt(h[2]),
        }));

      const peakHour = dayHourlyData.length > 0
        ? dayHourlyData.reduce((max: any, curr: any) => 
            curr.count > max.count ? curr : max
          ).hour
        : 0;

      // Get payment method distribution for this day
      const dayPaymentData = paymentRows
        .filter((p: any) => parseInt(p[0]) === dayMs)
        .map((p: any) => ({
          method: p[1],
          count: parseInt(p[2]),
          fraudCount: parseInt(p[3]),
        }));

      // Get country distribution for this day
      const dayCountryData = countryRows
        .filter((c: any) => parseInt(c[0]) === dayMs)
        .map((c: any) => ({
          country: c[1],
          count: parseInt(c[2]),
          fraudCount: parseInt(c[3]),
        }));

      // Analyze patterns and generate advice
      const { patterns, riskScore, advice } = analyzePatterns({
        totalTransactions,
        fraudCount,
        fraudRate,
        avgAmount,
        maxAmount,
        avgTransactionsPerUser,
        peakHour,
        paymentMethods: dayPaymentData,
        countries: dayCountryData,
        hourlyDistribution: dayHourlyData,
      });

      return {
        date: new Date(dayMs).toISOString().split('T')[0],
        totalTransactions,
        fraudCount,
        fraudRate: Math.round(fraudRate * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        avgAmount: Math.round(avgAmount * 100) / 100,
        maxAmount: Math.round(maxAmount * 100) / 100,
        uniqueUsers,
        avgTransactionsPerUser: Math.round(avgTransactionsPerUser * 100) / 100,
        peakHour,
        suspiciousPatterns: patterns,
        riskScore,
        advice,
      };
    });

    // Calculate trends (comparing to previous period)
    const trends = calculateTrends(dailyPatterns);

    return NextResponse.json({
      dailyPatterns,
      trends,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in daily patterns analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze daily patterns' },
      { status: 500 }
    );
  }
}

function analyzePatterns(data: any): {
  patterns: string[];
  riskScore: number;
  advice: string[];
} {
  const patterns: string[] = [];
  const advice: string[] = [];
  let riskScore = 0;

  // 1. Fraud Rate Analysis
  if (data.fraudRate > 10) {
    patterns.push('Critical fraud rate detected');
    riskScore += 40;
    advice.push('🚨 URGENT: Fraud rate exceeds 10%. Implement immediate enhanced verification for all transactions.');
    advice.push('Consider temporarily reducing transaction limits or adding multi-factor authentication.');
  } else if (data.fraudRate > 5) {
    patterns.push('High fraud rate');
    riskScore += 25;
    advice.push('⚠️ Elevated fraud rate (>5%). Review fraud detection rules and increase monitoring frequency.');
  } else if (data.fraudRate > 2) {
    patterns.push('Moderate fraud rate');
    riskScore += 10;
    advice.push('📊 Moderate fraud activity. Continue monitoring and review suspicious patterns.');
  }

  // 2. Transaction Volume Analysis
  if (data.avgTransactionsPerUser > 10) {
    patterns.push('High velocity detected');
    riskScore += 15;
    advice.push('🔄 High transaction velocity per user. Implement rate limiting to prevent automated attacks.');
  }

  // 3. Amount Analysis
  if (data.maxAmount > 5000) {
    patterns.push('Large transaction detected');
    riskScore += 10;
    advice.push('💰 Large transactions present. Ensure additional verification for amounts exceeding $5,000.');
  }

  if (data.avgAmount > 1000) {
    patterns.push('High average transaction amount');
    riskScore += 5;
    advice.push('📈 Above-average transaction amounts. Monitor for unusual spending patterns.');
  }

  // 4. Temporal Analysis
  if (data.peakHour >= 0 && data.peakHour <= 5) {
    patterns.push('Unusual activity hours (late night)');
    riskScore += 15;
    advice.push('🌙 Peak activity during late night hours (12 AM - 5 AM). This is unusual and may indicate automated/fraudulent activity.');
  } else if (data.peakHour >= 22) {
    patterns.push('Late evening peak activity');
    riskScore += 5;
    advice.push('🌆 Late evening peak detected. Normal but monitor for anomalies.');
  }

  // 5. Payment Method Analysis
  if (data.paymentMethods && data.paymentMethods.length > 0) {
    const cryptoTransactions = data.paymentMethods.find((pm: any) => pm.method === 'CRYPTO');
    if (cryptoTransactions) {
      const cryptoFraudRate = cryptoTransactions.count > 0 
        ? (cryptoTransactions.fraudCount / cryptoTransactions.count) * 100 
        : 0;
      
      if (cryptoFraudRate > 15) {
        patterns.push('High fraud in crypto payments');
        riskScore += 20;
        advice.push('₿ Critical: Crypto payment fraud rate exceeds 15%. Consider enhanced KYC for crypto transactions.');
      }
    }

    // Check for payment method diversity
    const totalMethods = data.paymentMethods.length;
    if (totalMethods === 1) {
      patterns.push('Limited payment method diversity');
      advice.push('💳 Only one payment method used. This may indicate coordinated activity - investigate further.');
    }
  }

  // 6. Geographic Analysis
  if (data.countries && data.countries.length > 0) {
    const highRiskCountries = data.countries.filter((c: any) => {
      const countryFraudRate = c.count > 0 ? (c.fraudCount / c.count) * 100 : 0;
      return countryFraudRate > 20;
    });

    if (highRiskCountries.length > 0) {
      patterns.push(`High fraud in ${highRiskCountries.length} countries`);
      riskScore += 15;
      advice.push(`🌍 High fraud rates detected in ${highRiskCountries.length} countries: ${highRiskCountries.map((c: any) => c.country).join(', ')}`);
      advice.push('Consider implementing country-specific fraud rules or enhanced verification.');
    }

    // Check for cross-border concentration
    if (data.countries.length > 5) {
      patterns.push('High cross-border activity');
      advice.push('🌐 Significant cross-border transactions. Ensure compliance with international regulations.');
    }
  }

  // 7. Hourly Distribution Analysis
  if (data.hourlyDistribution && data.hourlyDistribution.length > 0) {
    const hourCounts = data.hourlyDistribution.map((h: any) => h.count);
    const maxHourCount = Math.max(...hourCounts);
    const minHourCount = Math.min(...hourCounts);
    const variance = maxHourCount - minHourCount;

    if (variance > maxHourCount * 0.8) {
      patterns.push('Highly irregular hourly distribution');
      riskScore += 10;
      advice.push('📊 Irregular transaction distribution throughout the day. May indicate bot activity or coordinated attacks.');
    }
  }

  // Cap risk score at 100
  riskScore = Math.min(riskScore, 100);

  // Add general advice based on overall risk score
  if (riskScore >= 70) {
    advice.unshift('🔴 CRITICAL RISK LEVEL: Immediate action required. Consider pausing high-risk transactions pending review.');
  } else if (riskScore >= 40) {
    advice.unshift('🟡 HIGH RISK LEVEL: Enhanced monitoring recommended. Review all flagged transactions manually.');
  } else if (riskScore >= 20) {
    advice.unshift('🟢 MODERATE RISK LEVEL: Continue standard monitoring procedures.');
  } else {
    advice.unshift('✅ LOW RISK LEVEL: Normal operations. Maintain regular monitoring schedule.');
  }

  // Add positive advice if risk is low
  if (patterns.length === 0 || riskScore < 20) {
    advice.push('✨ System performing well. Continue current fraud prevention strategies.');
  }

  return { patterns, riskScore, advice };
}

function calculateTrends(dailyPatterns: DailyMetrics[]): any {
  if (dailyPatterns.length < 2) {
    return null;
  }

  const recent = dailyPatterns[0];
  const previous = dailyPatterns[1];

  const transactionTrend = ((recent.totalTransactions - previous.totalTransactions) / previous.totalTransactions) * 100;
  const fraudRateTrend = recent.fraudRate - previous.fraudRate;
  const avgAmountTrend = ((recent.avgAmount - previous.avgAmount) / previous.avgAmount) * 100;
  const uniqueUsersTrend = ((recent.uniqueUsers - previous.uniqueUsers) / previous.uniqueUsers) * 100;

  return {
    transactionVolume: {
      change: Math.round(transactionTrend * 100) / 100,
      direction: transactionTrend > 0 ? 'up' : transactionTrend < 0 ? 'down' : 'stable',
      interpretation: transactionTrend > 20 ? 'Significant increase' : 
                     transactionTrend < -20 ? 'Significant decrease' : 'Normal variation',
    },
    fraudRate: {
      change: Math.round(fraudRateTrend * 100) / 100,
      direction: fraudRateTrend > 0 ? 'up' : fraudRateTrend < 0 ? 'down' : 'stable',
      interpretation: fraudRateTrend > 2 ? '⚠️ Fraud rate increasing' : 
                     fraudRateTrend < -2 ? '✅ Fraud rate improving' : 'Stable',
    },
    avgAmount: {
      change: Math.round(avgAmountTrend * 100) / 100,
      direction: avgAmountTrend > 0 ? 'up' : avgAmountTrend < 0 ? 'down' : 'stable',
    },
    uniqueUsers: {
      change: Math.round(uniqueUsersTrend * 100) / 100,
      direction: uniqueUsersTrend > 0 ? 'up' : uniqueUsersTrend < 0 ? 'down' : 'stable',
    },
  };
}
