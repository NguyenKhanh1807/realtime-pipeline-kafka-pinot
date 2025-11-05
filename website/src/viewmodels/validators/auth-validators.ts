import { VALIDATION_RULES } from '@/src/utils/constants';
import { FormFieldViewModel } from '@/src/viewmodels/types';

/**
 * Authentication form validators
 * Contains business logic validation rules for auth forms
 */

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

export interface ResetPasswordFormData {
  email: string;
}

/**
 * Validate login form
 */
export const validateLoginForm = (data: LoginFormData): Record<keyof LoginFormData, string | null> => {
  const errors: Record<string, string | null> = {
    email: null,
    password: null,
    rememberMe: null,
  };

  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!VALIDATION_RULES.email.pattern.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < VALIDATION_RULES.password.minLength) {
    errors.password = `Password must be at least ${VALIDATION_RULES.password.minLength} characters`;
  }

  return errors;
};

/**
 * Validate registration form
 */
export const validateRegisterForm = (data: RegisterFormData): Record<keyof RegisterFormData, string | null> => {
  const errors: Record<string, string | null> = {
    email: null,
    password: null,
    confirmPassword: null,
    firstName: null,
    lastName: null,
    acceptTerms: null,
  };

  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!VALIDATION_RULES.email.pattern.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < VALIDATION_RULES.password.minLength) {
    errors.password = `Password must be at least ${VALIDATION_RULES.password.minLength} characters`;
  } else if (VALIDATION_RULES.password.requireUppercase && !/[A-Z]/.test(data.password)) {
    errors.password = 'Password must contain at least one uppercase letter';
  } else if (VALIDATION_RULES.password.requireLowercase && !/[a-z]/.test(data.password)) {
    errors.password = 'Password must contain at least one lowercase letter';
  } else if (VALIDATION_RULES.password.requireNumbers && !/\d/.test(data.password)) {
    errors.password = 'Password must contain at least one number';
  }

  // Confirm password validation
  if (!data.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Name validation
  if (!data.firstName?.trim()) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.length < VALIDATION_RULES.name.minLength) {
    errors.firstName = `First name must be at least ${VALIDATION_RULES.name.minLength} characters`;
  } else if (!VALIDATION_RULES.name.pattern.test(data.firstName)) {
    errors.firstName = 'First name contains invalid characters';
  }

  if (!data.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.length < VALIDATION_RULES.name.minLength) {
    errors.lastName = `Last name must be at least ${VALIDATION_RULES.name.minLength} characters`;
  } else if (!VALIDATION_RULES.name.pattern.test(data.lastName)) {
    errors.lastName = 'Last name contains invalid characters';
  }

  // Terms acceptance
  if (!data.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms and conditions';
  }

  return errors;
};

/**
 * Validate reset password form
 */
export const validateResetPasswordForm = (data: ResetPasswordFormData): Record<keyof ResetPasswordFormData, string | null> => {
  const errors: Record<string, string | null> = {
    email: null,
  };

  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!VALIDATION_RULES.email.pattern.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  return errors;
};

/**
 * Check if form has any validation errors
 */
export const hasValidationErrors = (errors: Record<string, string | null>): boolean => {
  return Object.values(errors).some(error => error !== null);
};

/**
 * Get form field view model with validation
 */
export const getFormFieldViewModel = (
  name: string,
  value: any,
  error: string | null,
  touched: boolean = false
): FormFieldViewModel => ({
  name,
  label: formatFieldLabel(name),
  value,
  error: touched ? error : undefined,
  touched,
  required: isFieldRequired(name),
  disabled: false,
});

/**
 * Helper functions
 */
function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function isFieldRequired(fieldName: string): boolean {
  const requiredFields = [
    'email',
    'password',
    'confirmPassword',
    'firstName',
    'lastName',
    'acceptTerms'
  ];
  return requiredFields.includes(fieldName);
}
