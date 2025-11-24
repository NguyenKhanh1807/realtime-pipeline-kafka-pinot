/**
 * Dashboard Commands
 * Orchestrate dashboard analytics operations using Model layer
 */

import { transactionRepository, fraudAnalysisRepository } from '@/src/models/repositories';
import type { DashboardAnalytics } from '@/src/view-models/stores/dashboard-store';

export class DashboardCommands {
  /**
   * Fetch comprehensive dashboard analytics
   * Uses Model layer (repositories) instead of direct service access
   */
  static async fetchAnalytics(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<DashboardAnalytics> {
    // Default to last 24 hours if no date range provided
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const range = dateRange || {
      startDate: oneDayAgo,
      endDate: now,
    };

    // Fetch statistics from repositories (Model layer)
    const [transactionStats, fraudStats] = await Promise.all([
      transactionRepository.getStatistics(range),
      fraudAnalysisRepository.getStatistics(range),
    ]);

    // Calculate fraud rate
    const fraudRate = transactionStats.totalCount > 0
      ? (fraudStats.fraudulentCount / transactionStats.totalCount) * 100
      : 0;

    // Transform repository data to ViewModel format
    const analytics: DashboardAnalytics = {
      totalTransactions: transactionStats.totalCount,
      fraudulentTransactions: fraudStats.fraudulentCount,
      fraudRate: Math.round(fraudRate * 100) / 100, // Round to 2 decimal places
      topRiskFactors: fraudStats.topRiskFactors,
      hourlyTrends: [], // Would require additional repository method for hourly aggregation
      geographicData: [], // Would require additional repository method for geographic aggregation
    };

    return analytics;
  }

  /**
   * Get real-time transaction count
   */
  static async getTransactionCount(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<number> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const range = dateRange || {
      startDate: oneDayAgo,
      endDate: now,
    };

    const stats = await transactionRepository.getStatistics(range);
    return stats.totalCount;
  }

  /**
   * Get fraud rate for a date range
   */
  static async getFraudRate(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<number> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const range = dateRange || {
      startDate: oneDayAgo,
      endDate: now,
    };

    const [transactionStats, fraudStats] = await Promise.all([
      transactionRepository.getStatistics(range),
      fraudAnalysisRepository.getStatistics(range),
    ]);

    if (transactionStats.totalCount === 0) {
      return 0;
    }

    return Math.round((fraudStats.fraudulentCount / transactionStats.totalCount) * 100 * 100) / 100;
  }
}

