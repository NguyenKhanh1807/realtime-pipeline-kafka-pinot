/**
 * Transaction Model Types
 * Based on Apache Pinot transactions table schema
 */

/**
 * Transaction ID - sequence number
 */
export type TransactionSeq = number;

/**
 * User ID - sequence number
 */
export type UserSeq = number;

/**
 * Transaction data from Pinot
 */
export interface Transaction {
  // Identifiers
  transaction_seq: TransactionSeq;
  user_seq: UserSeq;
  
  // Location
  receiving_country: string | null;
  country_code: string | null;
  
  // User information
  user_name: string | null;
  id_type: string | null;
  stay_qualify: string | null;
  visa_expire_date: string | null;
  birth_date: string | null;
  
  // Payment
  payment_method: string | null;
  autodebit_account: number | null;
  deposit_amount: number | null;
  
  // Dates
  register_date: string | null;
  first_transaction_date: string | null;
  recheck_date: string | null;
  face_pin_date: string | null;
  invite_code: string | null;
  
  // Transaction metrics
  transaction_count_24hour: number | null;
  transaction_amount_24hour: number | null;
  transaction_count_1week: number | null;
  transaction_amount_1week: number | null;
  transaction_count_1month: number | null;
  transaction_amount_1month: number | null;
  
  // Fraud label (0 = legitimate, 1 = fraudulent)
  label: number | null;
  
  // Timestamp
  create_dt: number; // Timestamp in milliseconds
}

/**
 * Transaction query response from Pinot
 */
export interface TransactionQueryResponse {
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
 * Paginated transaction result
 */
export interface PaginatedTransactionResult {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

