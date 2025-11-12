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

// Money value object
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

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
