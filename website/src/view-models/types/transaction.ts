/**
 * Transaction ViewModel Types
 * Transformed data for UI components
 */

import type { Transaction } from '@/src/models/types/transaction';

/**
 * Transaction display model for UI
 */
export interface TransactionViewModel {
  id: string;
  transactionSeq: number;
  userSeq: number;
  userName: string;
  amount: number;
  country: string;
  countryCode: string;
  paymentMethod: string;
  fraudScore: number;
  fraudLabel: number; // 0 or 1
  status: 'Approved' | 'Flagged' | 'Blocked';
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Transaction metrics
  transactionCount24h: number;
  transactionAmount24h: number;
  transactionCount1Week: number;
  transactionAmount1Week: number;
  transactionCount1Month: number;
  transactionAmount1Month: number;
  
  // Additional metadata
  createDt: number;
  registerDate?: string;
  firstTransactionDate?: string;
}

/**
 * Transaction analytics view model
 */
export interface TransactionAnalyticsViewModel {
  totalTransactions: number;
  fraudulentTransactions: number;
  fraudRate: number;
  topRiskFactors: Array<{ factor: string; count: number }>;
  hourlyTrends: Array<{ hour: string; transactions: number; frauds: number }>;
  geographicData: Array<{
    country: string;
    fraudCount: number;
    totalTransactions: number;
    fraudRate: number;
  }>;
}

/**
 * Transform Pinot transaction to ViewModel
 */
export function transformTransactionToViewModel(tx: Transaction): TransactionViewModel {
  const fraudLabel = tx.label ?? 0;
  const fraudScore = fraudLabel === 1 ? 85 : Math.floor(Math.random() * 40) + 10;
  
  let status: 'Approved' | 'Flagged' | 'Blocked' = 'Approved';
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  if (fraudLabel === 1 || fraudScore > 70) {
    status = fraudScore > 90 ? 'Blocked' : 'Flagged';
    riskLevel = fraudScore > 90 ? 'critical' : fraudScore > 70 ? 'high' : 'medium';
  } else if (fraudScore > 40) {
    riskLevel = 'medium';
  }

  // Format timestamp
  const timestamp = tx.create_dt 
    ? formatTimestamp(tx.create_dt)
    : 'Unknown';

  return {
    id: `TXN-${tx.transaction_seq}`,
    transactionSeq: tx.transaction_seq,
    userSeq: tx.user_seq ?? 0,
    userName: tx.user_name ?? 'Unknown User',
    amount: tx.transaction_amount_24hour ?? 0,
    country: tx.receiving_country ?? 'Unknown',
    countryCode: tx.country_code ?? '',
    paymentMethod: tx.payment_method ?? 'Unknown',
    fraudScore,
    fraudLabel,
    status,
    timestamp,
    riskLevel,
    transactionCount24h: tx.transaction_count_24hour ?? 0,
    transactionAmount24h: tx.transaction_amount_24hour ?? 0,
    transactionCount1Week: tx.transaction_count_1week ?? 0,
    transactionAmount1Week: tx.transaction_amount_1week ?? 0,
    transactionCount1Month: tx.transaction_count_1month ?? 0,
    transactionAmount1Month: tx.transaction_amount_1month ?? 0,
    createDt: tx.create_dt,
    registerDate: tx.register_date ?? undefined,
    firstTransactionDate: tx.first_transaction_date ?? undefined,
  };
}

/**
 * Format timestamp to date string
 */
function formatTimestamp(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Unknown';
  }
}

