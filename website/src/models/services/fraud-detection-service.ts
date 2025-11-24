/**
 * FraudDetectionService Domain Service
 * Contains the core business logic for fraud detection
 */

import { TransactionId, RiskLevel, Transaction, FraudAnalysis, TransactionRepository, FraudAnalysisRepository } from '@/src/models';

export interface FraudDetectionResult {
  transactionId: TransactionId;
  score: number;
  riskLevel: RiskLevel;
  confidence: number;
  factors: string[];
  processingTime: number;
}

export class FraudDetectionService {
  constructor(
    private transactionRepository: TransactionRepository,
    private fraudAnalysisRepository: FraudAnalysisRepository
  ) {}

  /**
   * Analyze a transaction for fraud
   */
  async analyzeTransaction(transaction: Transaction, analyzerId: string): Promise<FraudDetectionResult> {
    const startTime = Date.now();

    // Run fraud detection rules
    const factors = await this.evaluateFraudRules(transaction);
    const score = this.calculateFraudScore(factors);
    const riskLevel = this.determineRiskLevel(score);
    const confidence = this.calculateConfidence(factors);

    const processingTime = Date.now() - startTime;

    // Create fraud analysis entity
    const analysis = FraudAnalysis.createFromTransaction(
      transaction.id,
      score,
      factors.map(f => f.description),
      processingTime,
      analyzerId
    );

    // Save the analysis
    await this.fraudAnalysisRepository.create(analysis);

    return {
      transactionId: transaction.id,
      score,
      riskLevel,
      confidence,
      factors: factors.map(f => f.description),
      processingTime,
    };
  }

  /**
   * Evaluate fraud detection rules
   */
  private async evaluateFraudRules(transaction: Transaction): Promise<Array<{ description: string; weight: number; severity: number }>> {
    const factors: Array<{ description: string; weight: number; severity: number }> = [];

    // Rule 1: High value transaction
    if (transaction.isHighValue()) {
      factors.push({
        description: 'High value transaction detected',
        weight: 0.3,
        severity: 0.8,
      });
    }

    // Rule 2: International transaction
    if (transaction.isInternational()) {
      factors.push({
        description: 'International transaction',
        weight: 0.2,
        severity: 0.6,
      });
    }

    // Rule 3: Unusual time (e.g., late night)
    const hour = transaction.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      factors.push({
        description: 'Transaction at unusual time',
        weight: 0.1,
        severity: 0.4,
      });
    }

    // Rule 4: Check user's transaction history patterns
    if (transaction.userId) {
      const userHistory = await this.analyzeUserHistory(transaction);
      if (userHistory.isUnusual) {
        factors.push({
          description: userHistory.reason,
          weight: userHistory.weight,
          severity: userHistory.severity,
        });
      }
    }

    // Rule 5: Merchant velocity check
    const merchantVelocity = await this.checkMerchantVelocity(transaction);
    if (merchantVelocity.isSuspicious) {
      factors.push({
        description: `Unusual activity at merchant: ${transaction.merchant}`,
        weight: 0.25,
        severity: 0.7,
      });
    }

    // Rule 6: Geographic anomalies
    const geoAnomaly = this.checkGeographicAnomaly(transaction);
    if (geoAnomaly.isAnomalous) {
      factors.push({
        description: geoAnomaly.reason,
        weight: 0.2,
        severity: 0.6,
      });
    }

    return factors;
  }

  /**
   * Analyze user's transaction history
   */
  private async analyzeUserHistory(transaction: Transaction): Promise<{
    isUnusual: boolean;
    reason: string;
    weight: number;
    severity: number;
  }> {
    if (!transaction.userId) {
      return { isUnusual: false, reason: '', weight: 0, severity: 0 };
    }

    // Get user's recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userTransactions = await this.transactionRepository.findByUserId(
      transaction.userId,
      { page: 1, limit: 100 } // Get last 100 transactions
    );

    if (userTransactions.items.length === 0) {
      return {
        isUnusual: true,
        reason: 'First transaction for this user',
        weight: 0.1,
        severity: 0.3,
      };
    }

    // Calculate average transaction amount
    const avgAmount = userTransactions.items.reduce((sum, tx) => sum + tx.getAmountInUSD(), 0) / userTransactions.items.length;
    const currentAmount = transaction.getAmountInUSD();

    // Check if amount is significantly higher than average
    if (currentAmount > avgAmount * 2) {
      return {
        isUnusual: true,
        reason: `Transaction amount significantly higher than user's average ($${avgAmount.toFixed(2)})`,
        weight: 0.25,
        severity: 0.7,
      };
    }

    // Check transaction frequency
    const recentTransactions = userTransactions.items.filter(tx =>
      tx.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    );

    if (recentTransactions.length > 10) {
      return {
        isUnusual: true,
        reason: 'High transaction frequency detected',
        weight: 0.15,
        severity: 0.5,
      };
    }

    return { isUnusual: false, reason: '', weight: 0, severity: 0 };
  }

  /**
   * Check merchant transaction velocity
   */
  private async checkMerchantVelocity(transaction: Transaction): Promise<{
    isSuspicious: boolean;
  }> {
    // In a real implementation, this would check transaction patterns at the merchant
    // For demo purposes, we'll use a simplified check
    const merchantStats = await this.transactionRepository.getStatistics();
    const merchantData = merchantStats.topMerchants.find(m => m.merchant === transaction.merchant);

    // Flag if merchant has very high transaction volume
    const isSuspicious = Boolean(merchantData && merchantData.count > 1000); // Arbitrary threshold

    return { isSuspicious };
  }

  /**
   * Check for geographic anomalies
   */
  private checkGeographicAnomaly(transaction: Transaction): {
    isAnomalous: boolean;
    reason: string;
  } {
    // Simplified geographic check
    // In real implementation, this would compare against user's known locations
    const highRiskCountries = ['North Korea', 'Iran', 'Syria', 'Venezuela'];

    if (highRiskCountries.includes(transaction.location.country)) {
      return {
        isAnomalous: true,
        reason: `Transaction from high-risk country: ${transaction.location.country}`,
      };
    }

    return { isAnomalous: false, reason: '' };
  }

  /**
   * Calculate fraud score from factors
   */
  private calculateFraudScore(factors: Array<{ weight: number; severity: number }>): number {
    if (factors.length === 0) return 10; // Low baseline score

    // Weighted average of all factors
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const weightedScore = factors.reduce((sum, factor) => sum + (factor.weight * factor.severity), 0);

    const score = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 10;

    // Add some randomness for realism (±10)
    const randomFactor = (Math.random() - 0.5) * 20;
    const finalScore = Math.max(0, Math.min(100, score + randomFactor));

    return Math.round(finalScore);
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    if (score < 90) return 'high';
    return 'critical';
  }

  /**
   * Calculate confidence in the fraud score
   */
  private calculateConfidence(factors: Array<{ weight: number; severity: number }>): number {
    // Confidence increases with number of factors and their consistency
    const factorCount = factors.length;
    const averageSeverity = factors.reduce((sum, f) => sum + f.severity, 0) / Math.max(1, factorCount);

    // Base confidence on factor count and severity consistency
    let confidence = 50; // Base confidence

    if (factorCount > 0) confidence += factorCount * 10; // More factors = higher confidence
    if (averageSeverity > 0.7) confidence += 15; // High severity factors = higher confidence
    if (factorCount > 3) confidence += 10; // Multiple factors = higher confidence

    return Math.min(95, Math.max(60, confidence));
  }

  /**
   * Get fraud detection statistics
   */
  async getFraudStatistics(dateRange?: { startDate: Date; endDate: Date }): Promise<{
    totalAnalyses: number;
    fraudulentCount: number;
    averageScore: number;
    riskDistribution: Record<RiskLevel, number>;
  }> {
    const stats = await this.fraudAnalysisRepository.getStatistics(dateRange);

    return {
      totalAnalyses: stats.totalAnalyses,
      fraudulentCount: stats.fraudulentCount,
      averageScore: stats.averageScore,
      riskDistribution: stats.riskLevelDistribution,
    };
  }
}
