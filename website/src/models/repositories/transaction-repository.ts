/**
 * Transaction Repository Interface
 * Defines the contract for transaction data access operations
 */

import type {
  TransactionId,
  UserId,
  PaginatedResult,
  PaginationParams,
  DateRange,
  Money
} from '../types';
import type { Transaction } from '../entities/transaction';

export interface TransactionRepository {
  /**
   * Find transaction by ID
   */
  findById(id: TransactionId): Promise<Transaction | null>;

  /**
   * Find transactions by user ID
   */
  findByUserId(userId: UserId, params: PaginationParams): Promise<PaginatedResult<Transaction>>;

  /**
   * Find transactions within date range
   */
  findByDateRange(dateRange: DateRange, params: PaginationParams): Promise<PaginatedResult<Transaction>>;

  /**
   * Find transactions by amount range
   */
  findByAmountRange(minAmount: Money, maxAmount: Money, params: PaginationParams): Promise<PaginatedResult<Transaction>>;

  /**
   * Find transactions by merchant
   */
  findByMerchant(merchant: string, params: PaginationParams): Promise<PaginatedResult<Transaction>>;

  /**
   * Search transactions
   */
  search(query: string, params: PaginationParams): Promise<PaginatedResult<Transaction>>;

  /**
   * Create a new transaction
   */
  create(transaction: Transaction): Promise<Transaction>;

  /**
   * Update an existing transaction
   */
  update(transaction: Transaction): Promise<Transaction>;

  /**
   * Delete a transaction
   */
  delete(id: TransactionId): Promise<void>;

  /**
   * Get transaction statistics
   */
  getStatistics(dateRange?: DateRange): Promise<{
    totalCount: number;
    totalAmount: Money;
    averageAmount: Money;
    topMerchants: Array<{ merchant: string; count: number; totalAmount: Money }>;
    transactionsByType: Record<string, number>;
  }>;
}
