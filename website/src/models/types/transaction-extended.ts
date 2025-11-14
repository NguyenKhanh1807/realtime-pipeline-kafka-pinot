/**
 * Extended Transaction Types and Type Guards
 * Provides type safety for transactions with additional fields from Pinot
 */

import type { TransactionHistoryRowProps } from '@/src/components/molecules';

/**
 * Extended transaction with additional fields from Pinot
 */
export interface ExtendedTransaction extends TransactionHistoryRowProps {
  createDt: number;
  fraudLabel: number;
  transactionSeq?: number;
  userSeq?: number;
  userName?: string;
  receivingCountry?: string;
  countryCode?: string;
  paymentMethod?: string;
  transactionAmount24hour?: number;
  transactionCount24hour?: number;
  transactionAmount1week?: number;
  transactionCount1week?: number;
  transactionAmount1month?: number;
  transactionCount1month?: number;
}

/**
 * Type guard to check if a transaction has extended fields
 */
export function isExtendedTransaction(
  tx: TransactionHistoryRowProps
): tx is ExtendedTransaction {
  return (
    'createDt' in tx &&
    typeof (tx as any).createDt === 'number' &&
    'fraudLabel' in tx &&
    typeof (tx as any).fraudLabel === 'number'
  );
}

/**
 * Type guard to check if createDt is valid
 */
export function hasValidCreateDt(tx: TransactionHistoryRowProps): boolean {
  if (!isExtendedTransaction(tx)) {
    return false;
  }
  return tx.createDt > 0 && !isNaN(tx.createDt);
}

/**
 * Type guard to check if fraudLabel exists
 */
export function hasFraudLabel(tx: TransactionHistoryRowProps): boolean {
  if (!isExtendedTransaction(tx)) {
    return false;
  }
  return typeof tx.fraudLabel === 'number';
}

/**
 * Helper to safely get createDt
 */
export function getCreateDt(tx: TransactionHistoryRowProps): number | null {
  if (hasValidCreateDt(tx)) {
    return (tx as ExtendedTransaction).createDt;
  }
  return null;
}

/**
 * Helper to safely get fraudLabel
 */
export function getFraudLabel(tx: TransactionHistoryRowProps): number | null {
  if (hasFraudLabel(tx)) {
    return (tx as ExtendedTransaction).fraudLabel;
  }
  return null;
}

