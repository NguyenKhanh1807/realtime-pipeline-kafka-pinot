/**
 * Real-time Transaction Service
 * Polls Pinot for new transactions and provides real-time updates
 */

import { pinotClient } from './pinot-client';
import type { TransactionHistoryRowProps } from '@/src/components/molecules';

export interface TransactionUpdate {
  id: string;
  timestamp: number;
  amount: number;
  merchant: string;
  location?: string;
  customerEmail?: string;
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'Approved' | 'Flagged' | 'Blocked';
  cardNumber: string;
}

export type TransactionUpdateCallback = (update: TransactionUpdate) => void;
export type TransactionsUpdateCallback = (transactions: TransactionHistoryRowProps[]) => void;

class RealtimeTransactionService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private lastTransactionTimestamp: string | null = null;
  private lastTransactionIds: Set<string> = new Set();
  private updateCallbacks: TransactionUpdateCallback[] = [];
  private transactionsUpdateCallbacks: TransactionsUpdateCallback[] = [];
  private pollIntervalMs = 3000; // Poll every 3 seconds

  /**
   * Start polling for new transactions
   */
  startPolling(intervalMs: number = 3000): void {
    if (this.isPolling) {
      return;
    }

    this.pollIntervalMs = intervalMs;
    this.isPolling = true;
    
    // Immediately fetch and notify all callbacks with current data
    this.pollForNewTransactions();

    this.pollingInterval = setInterval(() => {
      this.pollForNewTransactions();
    }, this.pollIntervalMs);
  }

  /**
   * Stop polling for new transactions
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Poll Pinot for new transactions
   */
  private async pollForNewTransactions(): Promise<void> {
    try {
      const result = await pinotClient.getTransactions({
        limit: 50,
        offset: 0,
        orderBy: 'create_dt',
        orderDirection: 'DESC',
      });

      if (!result || result.transactions.length === 0) {
        return;
      }

      // Find new transactions (those we haven't seen before)
      const newTransactions = result.transactions.filter(
        (tx) => !this.lastTransactionIds.has(tx.id)
      );

      // Update our tracking
      result.transactions.forEach((tx) => {
        this.lastTransactionIds.add(tx.id);
      });

      // Keep only the last 1000 transaction IDs to prevent memory issues
      if (this.lastTransactionIds.size > 1000) {
        const idsArray = Array.from(this.lastTransactionIds);
        this.lastTransactionIds = new Set(idsArray.slice(-500));
      }

      // Notify callbacks of new transactions
      newTransactions.forEach((tx) => {
        const update: TransactionUpdate = {
          id: tx.id,
          timestamp: tx.createDt || Date.now(),
          amount: tx.amount,
          merchant: tx.paymentMethod, // Using paymentMethod as merchant
          location: tx.country,
          customerEmail: undefined, // Not available in schema
          fraudScore: tx.score,
          riskLevel: tx.riskLevel,
          status: tx.status as 'Approved' | 'Flagged' | 'Blocked',
          cardNumber: `****${tx.userSeq.toString().slice(-4)}`, // Masked user seq as card number
        };

        this.updateCallbacks.forEach((callback) => {
          try {
            callback(update);
          } catch (error) {
            console.error('Error in transaction update callback:', error);
          }
        });
      });

      // Notify callbacks of all transactions update (always, not just new ones)
      // Map to TransactionHistoryRowProps but preserve schema fields for analytics
      const allTransactions: TransactionHistoryRowProps[] = result.transactions.map((tx) => ({
        id: tx.id,
        cardNumber: `****${tx.userSeq.toString().slice(-4)}`,
        amount: tx.amount,
        merchant: tx.paymentMethod,
        score: tx.score,
        status: tx.status as TransactionHistoryRowProps['status'],
        timestamp: tx.timestamp,
        location: tx.country,
        customerEmail: undefined,
        riskLevel: tx.riskLevel,
        // Include schema fields for analytics (extended props)
        fraudLabel: tx.fraudLabel,
        transactionCount24h: tx.transactionCount24h,
        transactionAmount24h: tx.transactionAmount24h,
        transactionCount1week: tx.transactionCount1week,
        transactionAmount1week: tx.transactionAmount1week,
        transactionCount1month: tx.transactionCount1month,
        transactionAmount1month: tx.transactionAmount1month,
        countryCode: tx.countryCode,
        createDt: tx.createDt,
      } as TransactionHistoryRowProps & {
        fraudLabel: number;
        transactionCount24h: number;
        transactionAmount24h: number;
        transactionCount1week: number;
        transactionAmount1week: number;
        transactionCount1month: number;
        transactionAmount1month: number;
        countryCode: string;
        createDt: number;
      }));

      // Always notify callbacks with all transactions (for initial load and updates)
      this.transactionsUpdateCallbacks.forEach((callback) => {
        try {
          callback(allTransactions);
        } catch (error) {
          console.error('Error in transactions update callback:', error);
        }
      });
    } catch (error) {
      console.error('Failed to poll for new transactions:', error);
    }
  }

  /**
   * Subscribe to individual transaction updates
   */
  onTransactionUpdate(callback: TransactionUpdateCallback): () => void {
    this.updateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to full transactions list updates
   */
  onTransactionsUpdate(callback: TransactionsUpdateCallback): () => void {
    this.transactionsUpdateCallbacks.push(callback);

    // If polling is active, immediately fetch and send current data to the new callback
    if (this.isPolling) {
      this.pollForNewTransactions().catch((error) => {
        console.error('Failed to fetch initial transactions for new callback:', error);
      });
    }

    // Return unsubscribe function
    return () => {
      const index = this.transactionsUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.transactionsUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current polling status
   */
  getPollingStatus(): boolean {
    return this.isPolling;
  }

  /**
   * Reset tracking (useful for testing or manual refresh)
   */
  resetTracking(): void {
    this.lastTransactionIds.clear();
    this.lastTransactionTimestamp = null;
  }
}

// Export singleton instance
export const realtimeTransactionService = new RealtimeTransactionService();

