/**
 * Pinot API Response Types
 * Based on Apache Pinot query API responses
 */

import type { Transaction } from '@/src/models/types/transaction';

/**
 * Pinot Query Request
 */
export interface PinotQueryRequest {
  sql: string;
  queryOptions?: Record<string, string>;
}

/**
 * Pinot Query Response
 */
export interface PinotQueryResponse {
  resultTable: {
    dataSchema: {
      columnNames: string[];
      columnDataTypes: string[];
    };
    rows: unknown[][];
  };
  exceptions?: Array<{
    message: string;
    errorCode: number;
  }>;
  numServersQueried: number;
  numServersResponded: number;
  numSegmentsQueried: number;
  numSegmentsProcessed: number;
  numSegmentsMatched: number;
  numConsumingSegmentsQueried: number;
  numDocsScanned: number;
  numEntriesScannedInFilter: number;
  numEntriesScannedPostFilter: number;
  numGroupsLimitReached: boolean;
  totalDocs: number;
  timeUsedMs: number;
  segmentStatistics: unknown[];
  traceInfo: unknown;
}

/**
 * Transaction API Response
 */
export interface TransactionApiResponse {
  transactions: Transaction[];
  total: number;
  page?: number;
  pageSize?: number;
}

/**
 * Dashboard Analytics API Response
 */
export interface DashboardAnalyticsApiResponse {
  totalTransactions: number;
  fraudulentTransactions: number;
  fraudRate: number;
  topRiskFactors: Array<{ factor: string; count: number }>;
  hourlyTrends: Array<{ hour: string; transactions: number; frauds: number }>;
  geographicData: Array<{
    country: string;
    fraudCount: number;
    totalTransactions: number;
    fraudRate: number;
  }>;
}

