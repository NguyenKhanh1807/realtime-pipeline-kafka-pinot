/**
 * FraudAnalysis Repository Interface
 * Defines the contract for fraud analysis data access operations
 */

import type {
  FraudCaseId,
  TransactionId,
  RiskLevel,
  PaginatedResult,
  PaginationParams,
  DateRange,
  FraudAnalysis
} from '@/src/models';

export interface FraudAnalysisRepository {
  /**
   * Find fraud analysis by ID
   */
  findById(id: FraudCaseId): Promise<FraudAnalysis | null>;

  /**
   * Find fraud analysis by transaction ID
   */
  findByTransactionId(transactionId: TransactionId): Promise<FraudAnalysis | null>;

  /**
   * Find fraud analyses by risk level
   */
  findByRiskLevel(riskLevel: RiskLevel, params: PaginationParams): Promise<PaginatedResult<FraudAnalysis>>;

  /**
   * Find fraud analyses within date range
   */
  findByDateRange(dateRange: DateRange, params: PaginationParams): Promise<PaginatedResult<FraudAnalysis>>;

  /**
   * Find fraud analyses by score range
   */
  findByScoreRange(minScore: number, maxScore: number, params: PaginationParams): Promise<PaginatedResult<FraudAnalysis>>;

  /**
   * Find fraudulent transactions (score >= threshold)
   */
  findFraudulent(threshold: number, params: PaginationParams): Promise<PaginatedResult<FraudAnalysis>>;

  /**
   * Create a new fraud analysis
   */
  create(analysis: FraudAnalysis): Promise<FraudAnalysis>;

  /**
   * Update an existing fraud analysis
   */
  update(analysis: FraudAnalysis): Promise<FraudAnalysis>;

  /**
   * Delete a fraud analysis
   */
  delete(id: FraudCaseId): Promise<void>;

  /**
   * Get fraud statistics
   */
  getStatistics(dateRange?: DateRange): Promise<{
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
  }>;
}
