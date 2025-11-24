/**
 * Money Value Object
 * Immutable representation of monetary values with currency
 */

import type { CurrencyCode } from '../types';

export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: CurrencyCode
  ) {
    this.validate();
  }

  static create(amount: number, currency: CurrencyCode): Money {
    return new Money(amount, currency);
  }

  static fromJSON(data: { amount: number; currency: CurrencyCode }): Money {
    return new Money(data.amount, data.currency);
  }

  // Getters
  getAmount(): number {
    return this.amount;
  }

  getCurrency(): CurrencyCode {
    return this.currency;
  }

  // Business methods
  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  divide(divisor: number): Money {
    if (divisor === 0) throw new Error('Cannot divide by zero');
    return new Money(this.amount / divisor, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  isPositive(): boolean {
    return this.amount > 0;
  }

  isNegative(): boolean {
    return this.amount < 0;
  }

  abs(): Money {
    return new Money(Math.abs(this.amount), this.currency);
  }

  round(decimals: number = 2): Money {
    const factor = Math.pow(10, decimals);
    const roundedAmount = Math.round(this.amount * factor) / factor;
    return new Money(roundedAmount, this.currency);
  }

  // Formatting
  format(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  // Serialization
  toJSON(): { amount: number; currency: CurrencyCode } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }

  // Private methods
  private validate(): void {
    if (typeof this.amount !== 'number' || isNaN(this.amount)) {
      throw new Error('Amount must be a valid number');
    }
    if (this.amount < -10000000 || this.amount > 10000000) {
      throw new Error('Amount is outside valid range');
    }
    if (!this.currency || typeof this.currency !== 'string') {
      throw new Error('Currency is required');
    }
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot operate on different currencies: ${this.currency} vs ${other.currency}`);
    }
  }
}
