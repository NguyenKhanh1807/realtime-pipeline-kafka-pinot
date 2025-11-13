/**
 * Transaction Repository Implementation
 * Concrete implementation that wraps PinotClient
 * Transforms Pinot responses to domain entities
 */

import type { 
  TransactionRepository 
} from '../transaction-repository';
import type { 
  Transaction,
  TransactionId,
  UserId,
  PaginatedResult,
  PaginationParams,
  DateRange,
  Money,
} from '@/src/models';
import { Transaction as TransactionEntity } from '@/src/models/entities/transaction';
import { PinotClient } from '@/src/services/pinot-client';
import { ExternalServiceError, NotFoundError } from '@/src/models/errors';

export class TransactionRepositoryImpl implements TransactionRepository {
  constructor(private pinotClient: PinotClient) {}

  /**
   * Find transaction by ID
   */
  async findById(id: TransactionId): Promise<Transaction | null> {
    // Extract transaction_seq from ID (format: TXN-{seq})
    const transactionSeq = parseInt(id.replace('TXN-', ''), 10);
    if (isNaN(transactionSeq)) {
      return null;
    }

    const query = {
      sql: `
        SELECT
          transaction_seq,
          user_seq,
          user_name,
          receiving_country,
          country_code,
          payment_method,
          transaction_amount_24hour,
          transaction_count_24hour,
          transaction_amount_1week,
          transaction_count_1week,
          transaction_amount_1month,
          transaction_count_1month,
          label,
          create_dt
        FROM transactions
        WHERE transaction_seq = ${transactionSeq}
        LIMIT 1
      `,
    };

    try {
      const result = await this.pinotClient.query(query);
      if (!result || !result.resultTable?.rows || result.resultTable.rows.length === 0) {
        return null; // Not found is valid, return null
      }

      const row = result.resultTable.rows[0];
      const columnNames = result.resultTable.dataSchema?.columnNames || [];
      const data = this.mapRowToData(row, columnNames);

      return TransactionEntity.fromPinotData(data);
    } catch (error) {
      // Transform Pinot errors to domain errors
      throw new ExternalServiceError(
        'Pinot',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Find transactions by user ID
   */
  async findByUserId(userId: UserId, params: PaginationParams): Promise<PaginatedResult<Transaction>> {
    const userSeq = parseInt(userId, 10);
    if (isNaN(userSeq)) {
      return this.emptyPaginatedResult(params);
    }

    const limit = params.limit || 20;
    const offset = (params.page - 1) * limit;
    const orderBy = params.sortBy || 'create_dt';
    const orderDirection = params.sortOrder?.toUpperCase() || 'DESC';

    const query = {
      sql: `
        SELECT
          transaction_seq,
          user_seq,
          user_name,
          receiving_country,
          country_code,
          payment_method,
          transaction_amount_24hour,
          transaction_count_24hour,
          transaction_amount_1week,
          transaction_count_1week,
          transaction_amount_1month,
          transaction_count_1month,
          label,
          create_dt
        FROM transactions
        WHERE user_seq = ${userSeq}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    };

    return this.executeQuery(query, params);
  }

  /**
   * Find transactions within date range
   */
  async findByDateRange(dateRange: DateRange, params: PaginationParams): Promise<PaginatedResult<Transaction>> {
    const startMs = dateRange.startDate.getTime();
    const endMs = dateRange.endDate.getTime();
    const limit = params.limit || 20;
    const offset = (params.page - 1) * limit;
    const orderBy = params.sortBy || 'create_dt';
    const orderDirection = params.sortOrder?.toUpperCase() || 'DESC';

    const query = {
      sql: `
        SELECT
          transaction_seq,
          user_seq,
          user_name,
          receiving_country,
          country_code,
          payment_method,
          transaction_amount_24hour,
          transaction_count_24hour,
          transaction_amount_1week,
          transaction_count_1week,
          transaction_amount_1month,
          transaction_count_1month,
          label,
          create_dt
        FROM transactions
        WHERE create_dt >= ${startMs} AND create_dt <= ${endMs}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    };

    return this.executeQuery(query, params);
  }

  /**
   * Find transactions by amount range
   */
  async findByAmountRange(
    minAmount: Money,
    maxAmount: Money,
    params: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const limit = params.limit || 20;
    const offset = (params.page - 1) * limit;
    const orderBy = params.sortBy || 'create_dt';
    const orderDirection = params.sortOrder?.toUpperCase() || 'DESC';

    // Convert to USD if needed (simplified - assumes same currency)
    const min = minAmount.currency === 'USD' ? minAmount.amount : minAmount.amount;
    const max = maxAmount.currency === 'USD' ? maxAmount.amount : maxAmount.amount;

    const query = {
      sql: `
        SELECT
          transaction_seq,
          user_seq,
          user_name,
          receiving_country,
          country_code,
          payment_method,
          transaction_amount_24hour,
          transaction_count_24hour,
          transaction_amount_1week,
          transaction_count_1week,
          transaction_amount_1month,
          transaction_count_1month,
          label,
          create_dt
        FROM transactions
        WHERE transaction_amount_24hour >= ${min} AND transaction_amount_24hour <= ${max}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    };

    return this.executeQuery(query, params);
  }

  /**
   * Find transactions by merchant
   */
  async findByMerchant(merchant: string, params: PaginationParams): Promise<PaginatedResult<Transaction>> {
    const limit = params.limit || 20;
    const offset = (params.page - 1) * limit;
    const orderBy = params.sortBy || 'create_dt';
    const orderDirection = params.sortOrder?.toUpperCase() || 'DESC';

    // Escape single quotes in merchant name
    const escapedMerchant = merchant.replace(/'/g, "''");

    const query = {
      sql: `
        SELECT
          transaction_seq,
          user_seq,
          user_name,
          receiving_country,
          country_code,
          payment_method,
          transaction_amount_24hour,
          transaction_count_24hour,
          transaction_amount_1week,
          transaction_count_1week,
          transaction_amount_1month,
          transaction_count_1month,
          label,
          create_dt
        FROM transactions
        WHERE user_name = '${escapedMerchant}'
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    };

    return this.executeQuery(query, params);
  }

  /**
   * Search transactions
   */
  async search(query: string, params: PaginationParams): Promise<PaginatedResult<Transaction>> {
    const limit = params.limit || 20;
    const offset = (params.page - 1) * limit;
    const orderBy = params.sortBy || 'create_dt';
    const orderDirection = params.sortOrder?.toUpperCase() || 'DESC';

    // Escape single quotes
    const escapedQuery = query.replace(/'/g, "''");

    const sqlQuery = {
      sql: `
        SELECT
          transaction_seq,
          user_seq,
          user_name,
          receiving_country,
          country_code,
          payment_method,
          transaction_amount_24hour,
          transaction_count_24hour,
          transaction_amount_1week,
          transaction_count_1week,
          transaction_amount_1month,
          transaction_count_1month,
          label,
          create_dt
        FROM transactions
        WHERE 
          user_name LIKE '%${escapedQuery}%' OR
          receiving_country LIKE '%${escapedQuery}%' OR
          payment_method LIKE '%${escapedQuery}%'
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    };

    return this.executeQuery(sqlQuery, params);
  }

  /**
   * Create a new transaction
   * Note: Pinot is typically read-only for OLAP, so this might not be supported
   */
  async create(transaction: Transaction): Promise<Transaction> {
    // Pinot is typically read-only, so creation would go through a different system
    // For now, return the transaction as-is
    // In a real system, this would write to Kafka or another ingestion system
    throw new Error('Transaction creation not supported through Pinot repository. Use ingestion pipeline.');
  }

  /**
   * Update an existing transaction
   * Note: Pinot is typically read-only
   */
  async update(transaction: Transaction): Promise<Transaction> {
    throw new Error('Transaction updates not supported through Pinot repository. Use ingestion pipeline.');
  }

  /**
   * Delete a transaction
   * Note: Pinot is typically read-only
   */
  async delete(id: TransactionId): Promise<void> {
    throw new Error('Transaction deletion not supported through Pinot repository.');
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(dateRange?: DateRange): Promise<{
    totalCount: number;
    totalAmount: Money;
    averageAmount: Money;
    topMerchants: Array<{ merchant: string; count: number; totalAmount: Money }>;
    transactionsByType: Record<string, number>;
  }> {
    const dateFilter = dateRange
      ? `WHERE create_dt >= ${dateRange.startDate.getTime()} AND create_dt <= ${dateRange.endDate.getTime()}`
      : '';

    // Get total count and amounts
    const statsQuery = {
      sql: `
        SELECT
          COUNT(*) as total_count,
          SUM(transaction_amount_24hour) as total_amount,
          AVG(transaction_amount_24hour) as avg_amount
        FROM transactions
        ${dateFilter}
      `,
    };

    // Get top merchants
    const merchantsQuery = {
      sql: `
        SELECT
          user_name as merchant,
          COUNT(*) as count,
          SUM(transaction_amount_24hour) as total_amount
        FROM transactions
        ${dateFilter}
        GROUP BY user_name
        ORDER BY total_amount DESC
        LIMIT 10
      `,
    };

    // Get transactions by payment method (type)
    const typesQuery = {
      sql: `
        SELECT
          payment_method,
          COUNT(*) as count
        FROM transactions
        ${dateFilter}
        GROUP BY payment_method
      `,
    };

    const [statsResult, merchantsResult, typesResult] = await Promise.all([
      this.pinotClient.query(statsQuery),
      this.pinotClient.query(merchantsQuery),
      this.pinotClient.query(typesQuery),
    ]);

    // Extract statistics
    const statsRow = statsResult?.resultTable?.rows?.[0] || [0, 0, 0];
    const totalCount = typeof statsRow[0] === 'number' ? statsRow[0] : 0;
    const totalAmountValue = typeof statsRow[1] === 'number' ? statsRow[1] : 0;
    const avgAmountValue = typeof statsRow[2] === 'number' ? statsRow[2] : 0;

    // Extract top merchants
    const merchantsRows = merchantsResult?.resultTable?.rows || [];
    const columnNames = merchantsResult?.resultTable?.dataSchema?.columnNames || [];
    const topMerchants = merchantsRows.map((row: unknown[]) => {
      const data = this.mapRowToData(row, columnNames);
      return {
        merchant: (data.user_name as string) || 'Unknown',
        count: typeof data.transaction_count_24hour === 'number' ? data.transaction_count_24hour : 0,
        totalAmount: {
          amount: typeof data.transaction_amount_24hour === 'number' ? data.transaction_amount_24hour : 0,
          currency: 'USD' as const,
        },
      };
    });

    // Extract transaction types
    const typesRows = typesResult?.resultTable?.rows || [];
    const typesColumnNames = typesResult?.resultTable?.dataSchema?.columnNames || [];
    const transactionsByType: Record<string, number> = {};
    typesRows.forEach((row: unknown[]) => {
      const data = this.mapRowToData(row, typesColumnNames);
      const paymentMethod = (data.payment_method as string) || 'unknown';
      const count = typeof data.transaction_count_24hour === 'number' ? data.transaction_count_24hour : 0;
      transactionsByType[paymentMethod] = count;
    });

    return {
      totalCount,
      totalAmount: {
        amount: totalAmountValue,
        currency: 'USD' as const,
      },
      averageAmount: {
        amount: avgAmountValue,
        currency: 'USD' as const,
      },
      topMerchants,
      transactionsByType,
    };
  }

  /**
   * Execute a query and return paginated results
   */
  private async executeQuery(
    query: { sql: string },
    params: PaginationParams
  ): Promise<PaginatedResult<Transaction>> {
    const result = await this.pinotClient.query(query);
    
    if (!result || !result.resultTable?.rows) {
      return this.emptyPaginatedResult(params);
    }

    const rows = result.resultTable.rows;
    const columnNames = result.resultTable.dataSchema?.columnNames || [];

    // Transform rows to domain entities
    const transactions = rows.map((row: unknown[]) => {
      const data = this.mapRowToData(row, columnNames);
      return TransactionEntity.fromPinotData(data);
    });

    // Get total count
    const countQuery = {
      sql: query.sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM').split('ORDER BY')[0],
    };
    const countResult = await this.pinotClient.query(countQuery);
    const total = countResult?.resultTable?.rows?.[0]?.[0] 
      ? (typeof countResult.resultTable.rows[0][0] === 'number' ? countResult.resultTable.rows[0][0] : transactions.length)
      : transactions.length;

    const totalPages = Math.ceil(total / params.limit);

    return {
      items: transactions,
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    };
  }

  /**
   * Map Pinot row to data object
   */
  private mapRowToData(row: unknown[], columnNames: string[]): Record<string, unknown> {
    const columnMap: Record<string, number> = {};
    columnNames.forEach((name: string, index: number) => {
      columnMap[name.toLowerCase()] = index;
    });

    const getValue = (colName: string): unknown => {
      const index = columnMap[colName.toLowerCase()];
      return index !== undefined ? row[index] : null;
    };

    return {
      transaction_seq: getValue('transaction_seq'),
      user_seq: getValue('user_seq'),
      user_name: getValue('user_name'),
      receiving_country: getValue('receiving_country'),
      country_code: getValue('country_code'),
      payment_method: getValue('payment_method'),
      transaction_amount_24hour: getValue('transaction_amount_24hour'),
      transaction_count_24hour: getValue('transaction_count_24hour'),
      transaction_amount_1week: getValue('transaction_amount_1week'),
      transaction_count_1week: getValue('transaction_count_1week'),
      transaction_amount_1month: getValue('transaction_amount_1month'),
      transaction_count_1month: getValue('transaction_count_1month'),
      label: getValue('label'),
      create_dt: getValue('create_dt'),
    };
  }

  /**
   * Return empty paginated result
   */
  private emptyPaginatedResult(params: PaginationParams): PaginatedResult<Transaction> {
    return {
      items: [],
      total: 0,
      page: params.page,
      limit: params.limit,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    };
  }
}

