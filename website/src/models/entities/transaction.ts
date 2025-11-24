/**
 * Transaction Domain Entity
 * Represents a financial transaction in the fraud detection system
 */

import type {
  TransactionId,
  Timestamp,
  TransactionType,
  PaymentMethod,
  GeographicLocation,
  CurrencyCode,
} from '@/src/models/types';
import { Money } from '@/src/models/value-objects/money';

export interface TransactionProps {
  id: TransactionId;
  amount: Money;
  merchant: string;
  description?: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  location: GeographicLocation;
  timestamp: Timestamp;
  userId?: string; // Associated user if known
  cardNumber?: string; // Masked for security
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class Transaction {
  private props: TransactionProps;

  constructor(props: TransactionProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  // Getters
  get id(): TransactionId { return this.props.id; }
  get amount(): Money { return this.props.amount; }
  get merchant(): string { return this.props.merchant; }
  get description(): string | undefined { return this.props.description; }
  get type(): TransactionType { return this.props.type; }
  get paymentMethod(): PaymentMethod { return this.props.paymentMethod; }
  get location(): GeographicLocation { return { ...this.props.location }; }
  get timestamp(): Timestamp { return this.props.timestamp; }
  get userId(): string | undefined { return this.props.userId; }
  get cardNumber(): string | undefined { return this.props.cardNumber; }
  get ipAddress(): string | undefined { return this.props.ipAddress; }
  get userAgent(): string | undefined { return this.props.userAgent; }
  get metadata(): Record<string, unknown> | undefined { return this.props.metadata; }

  // Business logic methods
  getAmountInUSD(): number {
    // In real implementation, this would use currency conversion rates
    const currency = this.props.amount.getCurrency();
    if (currency === 'USD') {
      return this.props.amount.getAmount();
    }
    // Simplified conversion for demo
    const rates: Record<string, number> = { EUR: 1.1, GBP: 1.3, JPY: 0.009, CAD: 0.8, AUD: 0.7 };
    const rate = rates[currency] || 1;
    return this.props.amount.getAmount() * rate;
  }

  isHighValue(threshold: number = 1000): boolean {
    return this.getAmountInUSD() >= threshold;
  }

  isInternational(): boolean {
    // Simplified check - in real app, compare with user's home country
    return true; // Assume international for demo
  }

  getMaskedCardNumber(): string | undefined {
    if (!this.props.cardNumber) return undefined;
    // Return last 4 digits only
    return `****-****-****-${this.props.cardNumber.slice(-4)}`;
  }

  // Domain validation
  private validateProps(props: TransactionProps): void {
    if (!props.id) throw new Error('Transaction ID is required');
    if (!props.amount || props.amount.amount < 0) throw new Error('Valid amount is required');
    if (!props.merchant) throw new Error('Merchant is required');
    if (!props.type) throw new Error('Transaction type is required');
    if (!props.paymentMethod) throw new Error('Payment method is required');
    if (!props.location) throw new Error('Location is required');
    if (!props.timestamp) throw new Error('Timestamp is required');

    this.validateAmount(props.amount);
    this.validateLocation(props.location);
  }

  private validateAmount(amount: Money): void {
    if (amount.isNegative()) {
      throw new Error('Transaction amount cannot be negative');
    }
    if (amount.getAmount() > 1000000) { // $1M limit
      throw new Error('Transaction amount exceeds maximum allowed');
    }
  }

  private validateLocation(location: GeographicLocation): void {
    if (!location.country || !location.countryCode) {
      throw new Error('Country and country code are required');
    }
  }

  // Factory methods
  static create(props: Omit<TransactionProps, 'id'>): Transaction {
    return new Transaction({
      ...props,
      id: crypto.randomUUID(), // In real app, use proper ID generation
    });
  }

  /**
   * Create Transaction entity from Pinot API data
   * Transforms Pinot response to domain entity
   */
  static fromPinotData(data: {
    transaction_seq: number;
    user_seq: number;
    user_name?: string | null;
    receiving_country?: string | null;
    country_code?: string | null;
    payment_method?: string | null;
    transaction_amount_24hour?: number | null;
    transaction_count_24hour?: number | null;
    transaction_amount_1week?: number | null;
    transaction_count_1week?: number | null;
    transaction_amount_1month?: number | null;
    transaction_count_1month?: number | null;
    label?: number | null; // 0 = legitimate, 1 = fraudulent
    create_dt: number; // Timestamp in milliseconds
  }): Transaction {
    // Transform Pinot data to domain entity
    const amount = Money.create(
      data.transaction_amount_24hour || 0,
      'USD' // Default to USD, could be determined from country_code
    );

    const location: GeographicLocation = {
      country: data.receiving_country || 'Unknown',
      countryCode: data.country_code || 'XX',
    };

    // Map payment method
    const paymentMethodMap: Record<string, PaymentMethod> = {
      'credit_card': 'visa',
      'debit_card': 'visa',
      'digital_wallet': 'paypal',
      'bank_transfer': 'bank_transfer',
    };
    const paymentMethod: PaymentMethod = paymentMethodMap[data.payment_method || ''] || 'visa';

    // Determine transaction type from payment method
    const transactionType: TransactionType = 
      data.payment_method?.includes('card') ? 'credit_card' :
      data.payment_method?.includes('wallet') ? 'digital_wallet' :
      data.payment_method?.includes('transfer') ? 'bank_transfer' :
      'credit_card'; // Default

    return new Transaction({
      id: `TXN-${data.transaction_seq}`,
      amount,
      merchant: data.user_name || 'Unknown Merchant',
      description: `Transaction #${data.transaction_seq}`,
      type: transactionType,
      paymentMethod,
      location,
      timestamp: new Date(data.create_dt),
      userId: data.user_seq.toString(),
      metadata: {
        transactionSeq: data.transaction_seq,
        userSeq: data.user_seq,
        transactionCount24h: data.transaction_count_24hour,
        transactionAmount24h: data.transaction_amount_24hour,
        transactionCount1week: data.transaction_count_1week,
        transactionAmount1week: data.transaction_amount_1week,
        transactionCount1month: data.transaction_count_1month,
        transactionAmount1month: data.transaction_amount_1month,
        fraudLabel: data.label || 0,
        isFraudulent: data.label === 1,
      },
    });
  }

  // Serialization for external use
  toJSON(): TransactionProps {
    return { ...this.props };
  }

  // For display purposes (ViewModel layer)
  toDisplay(): {
    id: TransactionId;
    amount: { amount: number; currency: CurrencyCode }; // Convert to interface for ViewModel
    merchant: string;
    description?: string;
    type: TransactionType;
    paymentMethod: PaymentMethod;
    location: GeographicLocation;
    timestamp: Timestamp;
    maskedCardNumber?: string;
    amountInUSD: number;
    isHighValue: boolean;
  } {
    return {
      id: this.id,
      amount: this.amount.toJSON(), // Convert value object to interface
      merchant: this.merchant,
      description: this.description,
      type: this.type,
      paymentMethod: this.paymentMethod,
      location: this.location,
      timestamp: this.timestamp,
      maskedCardNumber: this.getMaskedCardNumber(),
      amountInUSD: this.getAmountInUSD(),
      isHighValue: this.isHighValue(),
    };
  }
}
