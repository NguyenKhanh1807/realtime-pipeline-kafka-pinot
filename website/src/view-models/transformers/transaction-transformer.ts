/**
 * Transaction Transformer
 * Transforms domain models and raw data to ViewModel formats for UI components
 */

import type { TransactionHistoryRowProps } from '@/src/components/molecules';
import type { TransactionTableRowProps } from '@/src/components/molecules';
import type { TransactionStatus } from '@/src/components/atoms/badges/status-badge';

export interface RawTransactionData {
  id: string;
  timestamp: string | number | Date;
  amount: number;
  merchant: string;
  score: number;
  status: TransactionStatus;
  cardNumber?: string;
  location?: string;
  customerName?: string;
  customerEmail?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  // Extended fields from Pinot
  createDt?: number;
  fraudLabel?: number;
  transactionCount24h?: number;
  transactionAmount24h?: number;
}

export class TransactionTransformer {
  /**
   * Transform raw transaction data to TransactionHistoryRowProps format
   */
  static toHistoryRowProps(transaction: RawTransactionData): TransactionHistoryRowProps {
    return {
      id: transaction.id,
      cardNumber: this.formatCardNumber(transaction.cardNumber),
      amount: transaction.amount,
      merchant: transaction.merchant,
      score: transaction.score,
      status: transaction.status,
      timestamp: this.formatTimestamp(transaction.timestamp),
      location: transaction.location,
      customerName: transaction.customerName,
      customerEmail: transaction.customerEmail,
      riskLevel: transaction.riskLevel || this.determineRiskLevel(transaction.score),
    };
  }

  /**
   * Transform raw transaction data to TransactionTableRowProps format
   */
  static toTableRowProps(transaction: RawTransactionData): TransactionTableRowProps {
    return {
      time: this.formatTimestamp(transaction.timestamp),
      amount: `$${transaction.amount.toFixed(2)}`,
      merchant: transaction.merchant,
      score: transaction.score,
      status: transaction.status,
      transactionId: transaction.id,
      cardLast4: this.extractLast4Digits(transaction.cardNumber),
      location: transaction.location,
      customerName: transaction.customerName,
      customerEmail: transaction.customerEmail,
    };
  }

  /**
   * Transform array of transactions to TransactionHistoryRowProps[]
   */
  static toHistoryRowPropsArray(transactions: RawTransactionData[]): TransactionHistoryRowProps[] {
    return transactions.map(tx => this.toHistoryRowProps(tx));
  }

  /**
   * Transform array of transactions to TransactionTableRowProps[]
   */
  static toTableRowPropsArray(transactions: RawTransactionData[]): TransactionTableRowProps[] {
    return transactions.map(tx => this.toTableRowProps(tx));
  }

  /**
   * Format timestamp to readable string
   */
  private static formatTimestamp(timestamp: string | number | Date): string {
    try {
      const date = timestamp instanceof Date 
        ? timestamp 
        : typeof timestamp === 'number' 
          ? new Date(timestamp) 
          : new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }

      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Format card number (masked)
   */
  private static formatCardNumber(cardNumber?: string): string {
    if (!cardNumber) return '****';
    
    // If already masked (contains asterisks), return as is
    if (cardNumber.includes('*')) {
      return cardNumber;
    }
    
    // Extract last 4 digits
    const last4 = this.extractLast4Digits(cardNumber);
    return `****-****-****-${last4}`;
  }

  /**
   * Extract last 4 digits from card number
   */
  private static extractLast4Digits(cardNumber?: string): string {
    if (!cardNumber) return '';
    
    // Remove all non-digit characters
    const digits = cardNumber.replace(/\D/g, '');
    
    // Return last 4 digits
    return digits.slice(-4);
  }

  /**
   * Determine risk level from score
   */
  private static determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    if (score < 90) return 'high';
    return 'critical';
  }

  /**
   * Transform transactions for recent display (limited count)
   */
  static toRecentTransactions(
    transactions: RawTransactionData[],
    limit: number = 20
  ): TransactionTableRowProps[] {
    return this.toTableRowPropsArray(transactions.slice(0, limit));
  }
}

