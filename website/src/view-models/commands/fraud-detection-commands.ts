/**
 * Fraud Detection Commands
 * ViewModel commands for fraud detection operations
 * Uses Model layer (services) for fraud analysis
 */

import { FraudDetectionService } from '@/src/models/services/fraud-detection-service';
import { transactionRepository, fraudAnalysisRepository } from '@/src/models/repositories';
import { Transaction } from '@/src/models/entities/transaction';
import { Money } from '@/src/models/value-objects/money';
import { log as logger } from '@/src/lib/logger';
import type { FraudResult } from '@/src/components/molecules';

export interface TransactionAnalysisData {
  cardNumber: string;
  amount: number;
  merchant: string;
  location: string;
  customerEmail: string;
}

/**
 * Fraud Detection Commands
 * Handles fraud detection operations through Model layer
 */
export class FraudDetectionCommands {
  private static fraudDetectionService = new FraudDetectionService(
    transactionRepository,
    fraudAnalysisRepository
  );

  /**
   * Analyze a transaction for fraud
   */
  static async analyzeTransaction(data: TransactionAnalysisData): Promise<FraudResult> {
    try {
      // Create a Transaction entity from the raw data
      const transaction = Transaction.create({
        amount: Money.create(data.amount, 'USD'),
        merchant: data.merchant,
        description: `Transaction for ${data.customerEmail}`,
        type: 'credit_card',
        paymentMethod: 'visa', // Default, could be determined from card number
        location: {
          country: data.location || 'Unknown',
          countryCode: 'XX',
        },
        timestamp: new Date(),
        cardNumber: data.cardNumber.replace(/\s/g, '').slice(-4), // Store last 4 digits only
        metadata: {
          customerEmail: data.customerEmail,
        },
      });

      // Analyze using domain service
      const result = await this.fraudDetectionService.analyzeTransaction(
        transaction,
        'system-analyzer'
      );

      // Transform domain result to ViewModel format
      return {
        score: result.score,
        riskLevel: result.riskLevel,
        confidence: result.confidence,
        factors: result.factors,
        processingTime: result.processingTime,
        transactionId: result.transactionId,
      };
    } catch (error) {
      const correlationId = logger.generateCorrelationId();
      logger.error('Fraud analysis failed', error instanceof Error ? error : new Error(String(error)), {
        correlationId,
        operation: 'analyzeTransaction',
        metadata: { transactionData: data },
      });

      // Fallback to mock result if service is unavailable
      return {
        score: Math.floor(Math.random() * 40) + 30, // 30-70 range for fallback
        riskLevel: 'medium' as const,
        confidence: 75,
        factors: ['Analysis temporarily unavailable - using fallback scoring'],
        processingTime: 150,
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    }
  }
}

