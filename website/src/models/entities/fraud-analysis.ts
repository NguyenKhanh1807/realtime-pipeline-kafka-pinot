/**
 * FraudAnalysis Domain Entity
 * Represents the result of fraud detection analysis on a transaction
 */

import type {
  FraudCaseId,
  TransactionId,
  RiskLevel,
  Timestamp
} from '../types';

export interface FraudAnalysisProps {
  id: FraudCaseId;
  transactionId: TransactionId;
  score: number; // 0-100, higher = more fraudulent
  riskLevel: RiskLevel;
  confidence: number; // 0-100, confidence in the score
  factors: string[]; // Reasons for the score
  processingTime: number; // milliseconds
  analyzedAt: Timestamp;
  analyzedBy: string; // System or analyst ID
  metadata?: Record<string, unknown>;
}

export class FraudAnalysis {
  private props: FraudAnalysisProps;

  constructor(props: FraudAnalysisProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  // Getters
  get id(): FraudCaseId { return this.props.id; }
  get transactionId(): TransactionId { return this.props.transactionId; }
  get score(): number { return this.props.score; }
  get riskLevel(): RiskLevel { return this.props.riskLevel; }
  get confidence(): number { return this.props.confidence; }
  get factors(): string[] { return [...this.props.factors]; }
  get processingTime(): number { return this.props.processingTime; }
  get analyzedAt(): Timestamp { return this.props.analyzedAt; }
  get analyzedBy(): string { return this.props.analyzedBy; }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata; }

  // Business logic methods
  isFraudulent(): boolean {
    return this.props.score >= 70; // Threshold for fraud
  }

  isHighRisk(): boolean {
    return this.props.riskLevel === 'high' || this.props.riskLevel === 'critical';
  }

  isLowRisk(): boolean {
    return this.props.riskLevel === 'low';
  }

  getRiskColor(): string {
    switch (this.props.riskLevel) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  }

  getRiskDescription(): string {
    const descriptions = {
      low: 'Low risk transaction',
      medium: 'Medium risk - requires review',
      high: 'High risk - likely fraudulent',
      critical: 'Critical risk - block immediately',
    };
    return descriptions[this.props.riskLevel];
  }

  // Domain validation
  private validateProps(props: FraudAnalysisProps): void {
    if (!props.id) throw new Error('FraudAnalysis ID is required');
    if (!props.transactionId) throw new Error('Transaction ID is required');
    if (props.score < 0 || props.score > 100) throw new Error('Score must be between 0 and 100');
    if (props.confidence < 0 || props.confidence > 100) throw new Error('Confidence must be between 0 and 100');
    if (!props.factors || props.factors.length === 0) throw new Error('At least one risk factor is required');
    if (props.processingTime < 0) throw new Error('Processing time cannot be negative');
    if (!props.analyzedAt) throw new Error('Analysis timestamp is required');
    if (!props.analyzedBy) throw new Error('Analyzer ID is required');

    this.validateRiskLevel(props.score, props.riskLevel);
  }

  private validateRiskLevel(score: number, riskLevel: RiskLevel): void {
    // Ensure risk level matches score ranges
    const expectedLevel = this.calculateRiskLevel(score);
    if (expectedLevel !== riskLevel) {
      throw new Error(`Risk level ${riskLevel} does not match score ${score}. Expected: ${expectedLevel}`);
    }
  }

  private calculateRiskLevel(score: number): RiskLevel {
    if (score < 30) return 'low';
    if (score < 70) return 'medium';
    if (score < 90) return 'high';
    return 'critical';
  }

  // Factory methods
  static create(props: Omit<FraudAnalysisProps, 'id' | 'analyzedAt'>): FraudAnalysis {
    return new FraudAnalysis({
      ...props,
      id: crypto.randomUUID(),
      analyzedAt: new Date(),
    });
  }

  static createFromTransaction(
    transactionId: TransactionId,
    score: number,
    factors: string[],
    processingTime: number,
    analyzedBy: string
  ): FraudAnalysis {
    const riskLevel = score < 30 ? 'low' : score < 70 ? 'medium' : score < 90 ? 'high' : 'critical';
    const confidence = Math.min(95, 70 + Math.random() * 25); // Simplified confidence calculation

    return FraudAnalysis.create({
      transactionId,
      score,
      riskLevel,
      confidence,
      factors,
      processingTime,
      analyzedBy,
    });
  }

  // Serialization for external use
  toJSON(): FraudAnalysisProps {
    return { ...this.props };
  }

  // For display purposes (ViewModel layer)
  toDisplay(): {
    id: FraudCaseId;
    transactionId: TransactionId;
    score: number;
    riskLevel: RiskLevel;
    confidence: number;
    factors: string[];
    processingTime: number;
    analyzedAt: Timestamp;
    analyzedBy: string;
    isFraudulent: boolean;
    isHighRisk: boolean;
    riskColor: string;
    riskDescription: string;
  } {
    return {
      id: this.id,
      transactionId: this.transactionId,
      score: this.score,
      riskLevel: this.riskLevel,
      confidence: this.confidence,
      factors: this.factors,
      processingTime: this.processingTime,
      analyzedAt: this.analyzedAt,
      analyzedBy: this.analyzedBy,
      isFraudulent: this.isFraudulent(),
      isHighRisk: this.isHighRisk(),
      riskColor: this.getRiskColor(),
      riskDescription: this.getRiskDescription(),
    };
  }
}
