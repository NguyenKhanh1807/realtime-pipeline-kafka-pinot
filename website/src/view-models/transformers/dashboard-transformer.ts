/**
 * Dashboard Transformer
 * Transforms transaction data to dashboard analytics and metrics
 */

import type { TransactionHistoryRowProps } from '@/src/components/molecules';
import type { StatCardProps } from '@/src/components/atoms';
import type { TransactionAnalysisCardProps, FraudRiskCardProps, ActivityItemProps } from '@/src/components/atoms';
import { CreditCard, Target, AlertTriangle, CheckCircle, Building2, Truck } from 'lucide-react';

export interface FraudMetrics {
  hourlyTrends: Array<{ hour: string; transactions: number; frauds: number }>;
  totalTransactions: number;
  fraudulentTransactions: number;
  fraudRate: number;
}

export interface GeographicData {
  country: string;
  fraudRate: number;
  totalTransactions: number;
  fraudCount: number;
  rank: number;
}

export class DashboardTransformer {
  /**
   * Calculate fraud metrics from transactions
   */
  static calculateFraudMetrics(
    transactions: TransactionHistoryRowProps[]
  ): FraudMetrics {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Initialize 24 hour buckets
    const hourlyMap = new Map<number, { transactions: number; frauds: number; hourLabel: string }>();
    const hourBuckets: Array<{ hourEpoch: number; hourLabel: string }> = [];

    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEpoch = Math.floor(hourStart.getTime() / (60 * 60 * 1000));
      const hourLabel = hourStart.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true,
      });
      hourBuckets.push({ hourEpoch, hourLabel });
      hourlyMap.set(hourEpoch, { transactions: 0, frauds: 0, hourLabel });
    }

    let totalTransactions = 0;
    let fraudulentTransactions = 0;

    transactions.forEach((tx) => {
      const txExtended = tx as any;
      const createDt = txExtended.createDt;
      const transactionCount = txExtended.transactionCount24h ?? 1;
      const fraudLabel = txExtended.fraudLabel ?? 0;
      const isFraud = fraudLabel === 1;

      totalTransactions += transactionCount;
      if (isFraud) {
        fraudulentTransactions += transactionCount;
      }

      if (createDt && typeof createDt === 'number' && createDt > 0) {
        const txDate = new Date(createDt);
        
        if (!isNaN(txDate.getTime()) && txDate >= oneDayAgo) {
          const txHour = new Date(txDate);
          txHour.setMinutes(0, 0, 0);
          const hourEpoch = Math.floor(txHour.getTime() / (60 * 60 * 1000));
          
          const hourData = hourlyMap.get(hourEpoch);
          if (hourData) {
            hourData.transactions += transactionCount;
            if (isFraud) {
              hourData.frauds += transactionCount;
            }
          }
        }
      }
    });

    const fraudRate = totalTransactions > 0 
      ? (fraudulentTransactions / totalTransactions) * 100 
      : 0;

    const hourlyTrends = hourBuckets.map(({ hourEpoch }) => {
      const data = hourlyMap.get(hourEpoch) || { transactions: 0, frauds: 0, hourLabel: '' };
      return {
        hour: data.hourLabel,
        transactions: data.transactions,
        frauds: data.frauds,
      };
    });

    return {
      hourlyTrends,
      totalTransactions,
      fraudulentTransactions,
      fraudRate,
    };
  }

  /**
   * Transform transactions to stats cards
   */
  static toStatsCards(transactions: TransactionHistoryRowProps[]): StatCardProps[] {
    let totalTransactions24h = 0;
    let totalAmount24h = 0;
    let fraudulentTransactions24h = 0;
    let fraudulentAmount24h = 0;

    transactions.forEach((tx) => {
      const txExtended = tx as any;
      const transactionCount24h = txExtended.transactionCount24h ?? 1;
      const transactionAmount24h = txExtended.transactionAmount24h ?? tx.amount ?? 0;
      const fraudLabel = txExtended.fraudLabel ?? 0;

      totalTransactions24h += transactionCount24h;
      totalAmount24h += transactionAmount24h;

      if (fraudLabel === 1) {
        fraudulentTransactions24h += transactionCount24h;
        fraudulentAmount24h += transactionAmount24h;
      }
    });

    const fraudRate = totalTransactions24h > 0 
      ? (fraudulentTransactions24h / totalTransactions24h) * 100 
      : 0;
    const cleanTransactions24h = totalTransactions24h - fraudulentTransactions24h;

    return [
      {
        title: 'Transactions (24h)',
        value: totalTransactions24h > 0 ? totalTransactions24h.toLocaleString() : '0',
        icon: CreditCard,
      },
      {
        title: 'Total Volume (24h)',
        value: totalAmount24h > 0 
          ? `$${(totalAmount24h / 1000).toFixed(1)}K` 
          : '$0',
        icon: Target,
      },
      {
        title: 'Fraud Rate',
        value: fraudRate > 0 ? `${fraudRate.toFixed(2)}%` : '0.00%',
        icon: AlertTriangle,
      },
      {
        title: 'Clean Transactions',
        value: cleanTransactions24h > 0 ? cleanTransactions24h.toLocaleString() : '0',
        icon: CheckCircle,
      },
    ];
  }

  /**
   * Transform transactions to transaction analysis items
   */
  static toTransactionAnalysisItems(
    transactions: TransactionHistoryRowProps[]
  ): TransactionAnalysisCardProps[] {
    if (transactions.length === 0) {
      return [
        {
          label: 'Credit Card Transactions',
          count: 0,
          amount: '$0',
          percentage: 0,
          icon: CreditCard,
        },
        {
          label: 'Digital Wallet Payments',
          count: 0,
          amount: '$0',
          percentage: 0,
          icon: Target,
        },
        {
          label: 'Bank Transfers',
          count: 0,
          amount: '$0',
          percentage: 0,
          icon: Building2,
        },
        {
          label: 'Other',
          count: 0,
          amount: '$0',
          percentage: 0,
          icon: Truck,
        }
      ];
    }

    const paymentMethodCounts: Record<string, number> = {};
    const paymentMethodAmounts: Record<string, number> = {};

    transactions.forEach((tx) => {
      const txExtended = tx as any;
      const paymentMethod = (tx.merchant || '').toLowerCase();
      let category = 'Other';

      if (paymentMethod.includes('card') || paymentMethod.includes('credit') || paymentMethod.includes('debit')) {
        category = 'Credit Card Transactions';
      } else if (paymentMethod.includes('wallet') || paymentMethod.includes('digital') || paymentMethod.includes('paypal')) {
        category = 'Digital Wallet Payments';
      } else if (paymentMethod.includes('bank') || paymentMethod.includes('transfer') || paymentMethod.includes('wire')) {
        category = 'Bank Transfers';
      }

      const amount = txExtended.transactionAmount24h ?? tx.amount ?? 0;
      paymentMethodCounts[category] = (paymentMethodCounts[category] || 0) + 1;
      paymentMethodAmounts[category] = (paymentMethodAmounts[category] || 0) + amount;
    });

    const totalAmount = Object.values(paymentMethodAmounts).reduce((sum, amt) => sum + amt, 0);
    const items: TransactionAnalysisCardProps[] = [];

    const creditCardCount = paymentMethodCounts['Credit Card Transactions'] || 0;
    const creditCardAmount = paymentMethodAmounts['Credit Card Transactions'] || 0;
    const creditCardPercentage = totalAmount > 0 ? Math.round((creditCardAmount / totalAmount) * 100) : 0;
    items.push({
      label: 'Credit Card Transactions',
      count: creditCardCount,
      amount: totalAmount > 0 ? `$${(creditCardAmount / 1000).toFixed(1)}K` : '$0',
      percentage: creditCardPercentage,
      icon: CreditCard,
    });

    const walletCount = paymentMethodCounts['Digital Wallet Payments'] || 0;
    const walletAmount = paymentMethodAmounts['Digital Wallet Payments'] || 0;
    const walletPercentage = totalAmount > 0 ? Math.round((walletAmount / totalAmount) * 100) : 0;
    items.push({
      label: 'Digital Wallet Payments',
      count: walletCount,
      amount: totalAmount > 0 ? `$${(walletAmount / 1000).toFixed(1)}K` : '$0',
      percentage: walletPercentage,
      icon: Target,
    });

    const bankCount = paymentMethodCounts['Bank Transfers'] || 0;
    const bankAmount = paymentMethodAmounts['Bank Transfers'] || 0;
    const bankPercentage = totalAmount > 0 ? Math.round((bankAmount / totalAmount) * 100) : 0;
    items.push({
      label: 'Bank Transfers',
      count: bankCount,
      amount: totalAmount > 0 ? `$${(bankAmount / 1000).toFixed(1)}K` : '$0',
      percentage: bankPercentage,
      icon: Building2,
    });

    const otherCount = paymentMethodCounts['Other'] || 0;
    const otherAmount = paymentMethodAmounts['Other'] || 0;
    const otherPercentage = totalAmount > 0 ? Math.round((otherAmount / totalAmount) * 100) : 0;
    items.push({
      label: 'Other',
      count: otherCount,
      amount: totalAmount > 0 ? `$${(otherAmount / 1000).toFixed(1)}K` : '$0',
      percentage: otherPercentage,
      icon: Truck,
    });

    return items;
  }

  /**
   * Transform transactions to fraud risk analysis items
   */
  static toFraudRiskAnalysisItems(
    transactions: TransactionHistoryRowProps[]
  ): FraudRiskCardProps[] {
    if (transactions.length === 0) {
      return [
        {
          label: 'Low Risk',
          count: 0,
          percentage: 0,
          icon: CheckCircle,
        },
        {
          label: 'Medium Risk',
          count: 0,
          percentage: 0,
          icon: AlertTriangle,
        },
        {
          label: 'Critical Risk',
          count: 0,
          percentage: 0,
          icon: AlertTriangle,
        },
      ];
    }

    let lowRisk = 0;
    let mediumRisk = 0;
    let criticalRisk = 0;

    transactions.forEach((tx) => {
      const txExtended = tx as any;
      const fraudLabel = txExtended.fraudLabel ?? 0;
      const score = tx.score || 0;

      if (fraudLabel === 1) {
        criticalRisk++;
      } else if (score >= 40) {
        mediumRisk++;
      } else {
        lowRisk++;
      }
    });

    const total = transactions.length;

    return [
      {
        label: 'Low Risk',
        count: lowRisk,
        percentage: total > 0 ? (lowRisk / total) * 100 : 0,
        icon: CheckCircle,
      },
      {
        label: 'Medium Risk',
        count: mediumRisk,
        percentage: total > 0 ? (mediumRisk / total) * 100 : 0,
        icon: AlertTriangle,
      },
      {
        label: 'Critical Risk',
        count: criticalRisk,
        percentage: total > 0 ? (criticalRisk / total) * 100 : 0,
        icon: AlertTriangle,
      },
    ];
  }

  /**
   * Calculate risk factors data
   */
  static calculateRiskFactors(
    transactions: TransactionHistoryRowProps[]
  ): Array<{ factor: string; count: number }> {
    if (transactions.length === 0) {
      return [];
    }

    const riskCounts: Record<string, number> = {
      'Critical Risk': 0,
      'Medium Risk': 0,
      'Low Risk': 0,
    };

    transactions.forEach((tx) => {
      const txExtended = tx as any;
      const fraudLabel = txExtended.fraudLabel ?? 0;
      const score = tx.score || 0;
      
      if (fraudLabel === 1) {
        riskCounts['Critical Risk']++;
      } else if (score >= 40) {
        riskCounts['Medium Risk']++;
      } else {
        riskCounts['Low Risk']++;
      }
    });

    return Object.entries(riskCounts)
      .filter(([_, count]) => count > 0)
      .map(([factor, count]) => ({
        factor,
        count,
      }));
  }

  /**
   * Transform transactions to recent activities
   */
  static toRecentActivities(
    transactions: TransactionHistoryRowProps[],
    limit: number = 5
  ): ActivityItemProps[] {
    if (transactions.length === 0) {
      return [];
    }

    const recent = [...transactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return recent.map((tx) => {
      const score = tx.score || 0;
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let type: 'fraud' | 'clean' = 'clean';
      let action = '';

      if (score < 30) {
        riskLevel = 'low';
        type = 'clean';
        action = `approved - low risk (${score}% score)`;
      } else if (score < 70) {
        riskLevel = 'medium';
        type = tx.status === 'Blocked' || tx.status === 'Flagged' ? 'fraud' : 'clean';
        action = tx.status === 'Blocked' || tx.status === 'Flagged'
          ? `flagged for review (${score}% score)`
          : `approved - medium risk (${score}% score)`;
      } else if (score < 90) {
        riskLevel = 'high';
        type = 'fraud';
        action = `flagged as high-risk (${score}% score)`;
      } else {
        riskLevel = 'critical';
        type = 'fraud';
        action = `flagged as critical risk (${score}% score)`;
      }

      const timestamp = new Date(tx.timestamp);
      const formattedTime = timestamp.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return {
        id: tx.id,
        user: tx.id,
        action,
        time: formattedTime,
        type,
        riskLevel,
      };
    });
  }

  /**
   * Transform geographic data
   */
  static transformGeographicData(
    analytics: { geographicData: Array<{ country: string; fraudRate: number; totalTransactions: number; fraudCount: number }> }
  ): GeographicData[] {
    if (!analytics?.geographicData) return [];

    const sorted = [...analytics.geographicData].sort((a, b) => b.fraudRate - a.fraudRate);

    return sorted.slice(0, 10).map((country, index) => ({
      country: country.country,
      fraudRate: country.fraudRate,
      totalTransactions: country.totalTransactions,
      fraudCount: country.fraudCount,
      rank: index + 1,
    }));
  }
}

