/**
 * Domain Validators
 * Business rule validation for domain entities
 */

import type { Money, GeographicLocation, Email, Username } from '../types';

// Money validation
export function validateMoney(amount: Money): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!amount || typeof amount.amount !== 'number') {
    errors.push('Amount must be a valid number');
  } else {
    if (amount.amount < 0) {
      errors.push('Amount cannot be negative');
    }
    if (amount.amount > 10000000) { // $10M limit
      errors.push('Amount exceeds maximum transaction limit');
    }
  }

  if (!amount.currency || typeof amount.currency !== 'string') {
    errors.push('Currency is required');
  } else if (!['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].includes(amount.currency)) {
    errors.push('Unsupported currency');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Geographic location validation
export function validateGeographicLocation(location: GeographicLocation): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!location.country || typeof location.country !== 'string') {
    errors.push('Country is required');
  }

  if (!location.countryCode || typeof location.countryCode !== 'string') {
    errors.push('Country code is required');
  } else if (location.countryCode.length !== 2) {
    errors.push('Country code must be 2 characters');
  }

  if (location.latitude !== undefined) {
    if (typeof location.latitude !== 'number' || location.latitude < -90 || location.latitude > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
  }

  if (location.longitude !== undefined) {
    if (typeof location.longitude !== 'number' || location.longitude < -180 || location.longitude > 180) {
      errors.push('Longitude must be between -180 and 180');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Email validation
export function validateEmail(email: Email): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
    if (email.length > 254) {
      errors.push('Email is too long');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Username validation
export function validateUsername(username: Username): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!username || typeof username !== 'string') {
    errors.push('Username is required');
  } else {
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (username.length > 50) {
      errors.push('Username must be less than 50 characters long');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Password validation (domain rules)
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    // Check for character variety
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChars) {
      errors.push('Password must contain at least one special character');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Transaction amount validation
export function validateTransactionAmount(amount: Money, context?: {
  userDailyLimit?: number;
  merchantDailyLimit?: number;
}): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic amount validation
  const amountValidation = validateMoney(amount);
  errors.push(...amountValidation.errors);

  if (amountValidation.isValid) {
    // Context-specific validations
    if (context?.userDailyLimit && amount.amount > context.userDailyLimit) {
      errors.push(`Amount exceeds daily user limit of ${context.userDailyLimit} ${amount.currency}`);
    }

    if (context?.merchantDailyLimit && amount.amount > context.merchantDailyLimit) {
      warnings.push(`Amount exceeds merchant daily limit of ${context.merchantDailyLimit} ${amount.currency}`);
    }

    // Business rule warnings
    if (amount.amount > 10000) {
      warnings.push('High-value transaction - additional verification recommended');
    }

    if (amount.amount < 1) {
      warnings.push('Very low transaction amount - may be test transaction');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Fraud score validation
export function validateFraudScore(score: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof score !== 'number' || isNaN(score)) {
    errors.push('Fraud score must be a valid number');
  } else {
    if (score < 0) {
      errors.push('Fraud score cannot be negative');
    }
    if (score > 100) {
      errors.push('Fraud score cannot exceed 100');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Date range validation
export function validateDateRange(startDate: Date, endDate: Date): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    errors.push('Start date must be a valid date');
  }

  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    errors.push('End date must be a valid date');
  }

  if (errors.length === 0 && startDate >= endDate) {
    errors.push('Start date must be before end date');
  }

  // Prevent queries that are too broad
  if (errors.length === 0) {
    const diffInDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffInDays > 365) {
      errors.push('Date range cannot exceed 1 year');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
