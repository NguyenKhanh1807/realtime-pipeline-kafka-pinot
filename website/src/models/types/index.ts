// Domain types - Pure domain concepts without UI or infrastructure dependencies

// Core domain identifiers
export type UserId = string;
export type TransactionId = string;
export type FraudCaseId = string;
export type SessionId = string;

// Common domain types
export type Email = string;
export type Username = string;
export type PasswordHash = string;

// Audit and tracking
export type CorrelationId = string;
export type Timestamp = Date;

// Status types
export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

// Risk levels
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Transaction types
export type TransactionType = 'credit_card' | 'debit_card' | 'digital_wallet' | 'bank_transfer' | 'crypto';

// Payment methods
export type PaymentMethod = 'visa' | 'mastercard' | 'amex' | 'paypal' | 'apple_pay' | 'google_pay' | 'bank_transfer';

// Currency codes
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';

// Geographic data
export interface GeographicLocation {
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

// Money type - Interface for data structures
// Note: For domain operations with behavior, use Money class from value-objects/money.ts
// This interface is used for DTOs, API contracts, and type definitions
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

// Note: Money value object class is exported from '../value-objects/money'
// Import it directly: import { Money } from '@/src/models/value-objects'

// Time range for queries
export interface DateRange {
  startDate: Timestamp;
  endDate: Timestamp;
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Generic paginated response
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Export transaction types
export * from './transaction';

// Export extended transaction types and type guards
export * from './transaction-extended';

// Re-export auth types (UserRole) from auth.ts
export type { UserRole, RoleDefinition } from './auth';
export { ROLE_DEFINITIONS } from './auth';