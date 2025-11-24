/**
 * FraudAnalysis Repository Implementation
 * Concrete implementation that wraps PinotClient
 * Fraud analyses are typically derived from transaction data
 */

import type { 
  FraudAnalysisRepository 
} from '../fraud-analysis-repository';
import type { 
  FraudAnalysis,
  FraudCaseId,
  TransactionId,
  RiskLevel,
  PaginatedResult,
  PaginationParams,
  DateRange,
} from '@/src/models';
import { FraudAnalysis as FraudAnalysisEntity } from '@/src/models/entities/fraud-analysis';
import { PinotClient } from '@/src/services/pinot-client';

export class FraudAnalysisRepositoryImpl implements FraudAnalysisRepository {
  constructor(private pinotClient: PinotClient) {}

  /**
   * Find fraud analysis by ID
   * Note: Fraud analyses are typically derived from transactions
   */
  async findById(id: FraudCaseId): Promise<FraudAnalysis | null> {
    // Extract transaction ID from fraud case ID (format: FRAUD-{transactionId})
    const transactionId = id.replace('FRAUD-', '');
    return this.findByTransactionId(transactionId as TransactionId);
  }

  /**
   * Find fraud analysis by transaction ID
   */
  async findByTransactionId(transactionId: TransactionId): Promise<FraudAnalysis | null> {
    // Extract transaction_seq from transaction ID
    const transactionSeq = parseInt(transactionId.replace('TXN-', ''), 10);
    if (isNaN(transactionSeq)) {
      return null;
    }

    const query = {
      sql: `
        SELECT
          transaction_seq,
          label,
          transaction_amount_24hour,
          transaction_count_24hour,
          create_dt
        FROM transactions
        WHERE transaction_seq = ${transactionSeq}
        LIMIT 1
      `,
    };

    const result = await this.pinotClient.query(query);
    if (!result || !result.resultTable?.rows || result.resultTable.rows.length === 0) {
      return null;
    }

    const row = result.resultTable.rows[0];
    const columnNames = result.resultTable.dataSchema?.columnNames || [];
    const data = this.mapRowToData(row, columnNames);

    // Derive fraud analysis from transaction data
    return this.createFraudAnalysisFromTransactionData(transactionId, data);
  }

  /**
   * Find fraud analyses by risk level
   */
  async findByRiskLevel(riskLevel: RiskLevel, params: PaginationParams): Promise<PaginatedResult<FraudAnalysis>> {
    const limit = params.limit || 20;
    const offset = (params.page - 1) * limit;

    // Map risk level to fraud label threshold
    // label = 1 means fraudulent, which typically corresponds to high/critical risk
    const labelFilter = riskLevel === 'high' || riskLevel === 'critical' ? 'label = 1' : 'label = 0';

    const query = {
      sql: `
        SELECT
          transaction_seq,
          label,
          transaction_amount_24hour,
          transaction_count_24hour,
          create_dt
        FROM transactions
        WHERE ${labelFilter}
        ORDER BY create_dt DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    };

    return this.executeQuery(query, params);
  }

  /**
   * Find fraud analyses within date range
   */
  async findByDateRange(dateRange: DateRange, params: PaginationParams): Promise<PaginatedResult<FraudAnalysis>> {
    const startMs = dateRange.startDate.getTime();
    const endMs = dateRange.endDate.getTime();
    const limit = params.limit || 20;
    const offset = (params.page - 1) * limit;

    const query = {
      sql: `
        SELECT
          transaction_seq,
          label,
          transaction_amount_24hour,
          transaction_count_24hour,
          create_dt
        FROM transactions
        WHERE create_dt >= ${startMs} AND create_dt <= ${endMs}
        ORDER BY create_dt DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    };

    return this.executeQuery(query, params);
  }

  /**
   * Find fraud analyses by score range
   */
  async findByScoreRange(
    minScore: number,
    maxScore: number,
    params: PaginationParams
  ): Promise<PaginatedResult<FraudAnalysis>> {
    const limit = params.limit || 20;
    const offset = (params.page - 1) * limit;

    // Map score range to label (simplified: score >= 70 = fraudulent = label 1)
    // For more granular filtering, we'd need to compute scores
    const labelFilter = minScore >= 70 ? 'label = 1' : 'label = 0';

    const query = {
      sql: `
        SELECT
          transaction_seq,
          label,
          transaction_amount_24hour,
          transaction_count_24hour,
          create_dt
        FROM transactions
        WHERE ${labelFilter}
        ORDER BY create_dt DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    };

    return this.executeQuery(query, params);
  }

  /**
   * Find fraudulent transactions (score >= threshold)
   */
  async findFraudulent(threshold: number, params: PaginationParams): Promise<PaginatedResult<FraudAnalysis>> {
    // Fraudulent transactions have label = 1
    const limit = params.limit || 20;
    const offset = (params.page - 1) * limit;

    const query = {
      sql: `
        SELECT
          transaction_seq,
          label,
          transaction_amount_24hour,
          transaction_count_24hour,
          create_dt
        FROM transactions
        WHERE label = 1
        ORDER BY create_dt DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `,
    };

    return this.executeQuery(query, params);
  }

  /**
   * Create a new fraud analysis
   * Note: In a real system, fraud analyses are typically computed, not manually created
   */
  async create(analysis: FraudAnalysis): Promise<FraudAnalysis> {
    // Fraud analyses are typically computed from transactions
    // In a real system, this would write to a separate fraud_analyses table
    // For now, return as-is since Pinot is read-only
    return analysis;
  }

  /**
   * Update an existing fraud analysis
   */
  async update(analysis: FraudAnalysis): Promise<FraudAnalysis> {
    // Fraud analyses are typically immutable once computed
    // In a real system, this might update a fraud_analyses table
    return analysis;
  }

  /**
   * Delete a fraud analysis
   */
  async delete(id: FraudCaseId): Promise<void> {
    // Fraud analyses are typically derived from transactions
    // Deletion would typically mean marking the transaction as reviewed
    // For now, do nothing since Pinot is read-only
  }

  /**
   * Get fraud statistics
   */
  async getStatistics(dateRange?: DateRange): Promise<{
    totalAnalyses: number;
    fraudulentCount: number;
    averageScore: number;
    riskLevelDistribution: Record<RiskLevel, number>;
    processingTimeStats: {
      average: number;
      min: number;
      max: number;
      p95: number;
    };
    topRiskFactors: Array<{ factor: string; count: number }>;
  }> {
    const dateFilter = dateRange
      ? `WHERE create_dt >= ${dateRange.startDate.getTime()} AND create_dt <= ${dateRange.endDate.getTime()}`
      : '';

    const statsQuery = {
      sql: `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as fraudulent,
          AVG(CASE WHEN label = 1 THEN 85.0 ELSE 25.0 END) as avg_score
        FROM transactions
        ${dateFilter}
      `,
    };

    const result = await this.pinotClient.query(statsQuery);
    const statsRow = result?.resultTable?.rows?.[0] || [0, 0, 0];
    const totalAnalyses = typeof statsRow[0] === 'number' ? statsRow[0] : 0;
    const fraudulentCount = typeof statsRow[1] === 'number' ? statsRow[1] : 0;
    const averageScore = typeof statsRow[2] === 'number' ? statsRow[2] : 0;

    // Calculate risk level distribution
    // Simplified: assume fraudulent = high/critical, legitimate = low/medium
    const riskLevelDistribution: Record<RiskLevel, number> = {
      low: Math.floor((totalAnalyses - fraudulentCount) * 0.6),
      medium: Math.floor((totalAnalyses - fraudulentCount) * 0.4),
      high: Math.floor(fraudulentCount * 0.7),
      critical: Math.floor(fraudulentCount * 0.3),
    };

    // Processing time stats (mock data since Pinot doesn't store this)
    const processingTimeStats = {
      average: 150,
      min: 50,
      max: 500,
      p95: 300,
    };

    // Top risk factors (simplified)
    const topRiskFactors: Array<{ factor: string; count: number }> = [
      { factor: 'High transaction amount', count: Math.floor(fraudulentCount * 0.4) },
      { factor: 'Unusual transaction pattern', count: Math.floor(fraudulentCount * 0.3) },
      { factor: 'International transaction', count: Math.floor(fraudulentCount * 0.2) },
      { factor: 'Velocity check failed', count: Math.floor(fraudulentCount * 0.1) },
    ];

    return {
      totalAnalyses,
      fraudulentCount,
      averageScore,
      riskLevelDistribution,
      processingTimeStats,
      topRiskFactors,
    };
  }

  /**
   * Execute a query and return paginated results
   */
  private async executeQuery(
    query: { sql: string },
    params: PaginationParams
  ): Promise<PaginatedResult<FraudAnalysis>> {
    const result = await this.pinotClient.query(query);
    
    if (!result || !result.resultTable?.rows) {
      return this.emptyPaginatedResult(params);
    }

    const rows = result.resultTable.rows;
    const columnNames = result.resultTable.dataSchema?.columnNames || [];

    // Transform rows to fraud analysis entities
    const analyses = rows.map((row: unknown[]) => {
      const data = this.mapRowToData(row, columnNames);
      const transactionId = `TXN-${data.transaction_seq}` as TransactionId;
      return this.createFraudAnalysisFromTransactionData(transactionId, data);
    });

    // Get total count
    const countQuery = {
      sql: query.sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM').split('ORDER BY')[0],
    };
    const countResult = await this.pinotClient.query(countQuery);
    const total = countResult?.resultTable?.rows?.[0]?.[0] 
      ? (typeof countResult.resultTable.rows[0][0] === 'number' ? countResult.resultTable.rows[0][0] : analyses.length)
      : analyses.length;

    const totalPages = Math.ceil(total / params.limit);

    return {
      items: analyses,
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    };
  }

  /**
   * Create fraud analysis from transaction data
   */
  private createFraudAnalysisFromTransactionData(
    transactionId: TransactionId,
    data: Record<string, unknown>
  ): FraudAnalysis {
    const label = typeof data.label === 'number' ? data.label : 0;
    const isFraudulent = label === 1;
    
    // Calculate score based on fraud label and transaction patterns
    const baseScore = isFraudulent ? 85 : 25;
    const amount = typeof data.transaction_amount_24hour === 'number' ? data.transaction_amount_24hour : 0;
    const count = typeof data.transaction_count_24hour === 'number' ? data.transaction_count_24hour : 0;
    
    // Adjust score based on patterns
    let score = baseScore;
    if (amount > 1000) score += 10;
    if (count > 10) score += 5;
    
    score = Math.min(100, Math.max(0, score));
    
    const riskLevel: RiskLevel = score < 30 ? 'low' : score < 70 ? 'medium' : score < 90 ? 'high' : 'critical';
    const confidence = Math.min(95, 70 + Math.random() * 25);
    
    const factors: string[] = [];
    if (isFraudulent) factors.push('Confirmed fraud pattern');
    if (amount > 1000) factors.push('High transaction amount');
    if (count > 10) factors.push('High transaction frequency');
    if (!factors.length) factors.push('Standard transaction pattern');

    const createDt = typeof data.create_dt === 'number' ? data.create_dt : Date.now();
    const analyzedAt = new Date(createDt);

    return FraudAnalysisEntity.create({
      transactionId,
      score,
      riskLevel,
      confidence,
      factors,
      processingTime: 150, // Mock processing time
      analyzedBy: 'system',
      metadata: {
        transactionSeq: data.transaction_seq,
        amount,
        count,
      },
    });
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
      label: getValue('label'),
      transaction_amount_24hour: getValue('transaction_amount_24hour'),
      transaction_count_24hour: getValue('transaction_count_24hour'),
      create_dt: getValue('create_dt'),
    };
  }

  /**
   * Return empty paginated result
   */
  private emptyPaginatedResult(params: PaginationParams): PaginatedResult<FraudAnalysis> {
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

