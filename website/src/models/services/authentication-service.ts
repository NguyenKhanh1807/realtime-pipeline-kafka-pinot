/**
 * Authentication Domain Service
 * Contains business logic for user authentication
 * Handles password verification and authentication rules
 */

import bcrypt from 'bcryptjs';
import type { User } from '@/src/models/entities/user';
import type { PasswordHash } from '@/src/models/types';

export interface AuthenticationCredentials {
  username: string;
  password: string;
}

export interface AuthenticationResult {
  isValid: boolean;
  error?: string;
}

export class AuthenticationService {
  /**
   * Verify password against stored hash
   * This is domain business logic for password verification
   */
  static verifyPassword(plainPassword: string, passwordHash: PasswordHash): AuthenticationResult {
    // Validate inputs
    if (!plainPassword || plainPassword.trim() === '') {
      return {
        isValid: false,
        error: 'Password is required',
      };
    }

    if (!passwordHash) {
      return {
        isValid: false,
        error: 'Password hash is required',
      };
    }

    try {
      // Use bcrypt to compare password with hash
      const passwordMatch = bcrypt.compareSync(plainPassword, passwordHash);

      if (!passwordMatch) {
        return {
          isValid: false,
          error: 'Invalid password',
        };
      }

      return {
        isValid: true,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Password verification failed',
      };
    }
  }

  /**
   * Hash a plain password
   * Used when creating new users or changing passwords
   */
  static hashPassword(plainPassword: string): PasswordHash {
    if (!plainPassword || plainPassword.trim() === '') {
      throw new Error('Password cannot be empty');
    }

    // Generate salt and hash password
    const saltRounds = 10;
    return bcrypt.hashSync(plainPassword, saltRounds) as PasswordHash;
  }

  /**
   * Validate password strength
   * Business rules for password requirements
   */
  static validatePasswordStrength(password: string): AuthenticationResult {
    if (!password) {
      return {
        isValid: false,
        error: 'Password is required',
      };
    }

    if (password.length < 8) {
      return {
        isValid: false,
        error: 'Password must be at least 8 characters long',
      };
    }

    if (password.length > 128) {
      return {
        isValid: false,
        error: 'Password must be less than 128 characters long',
      };
    }

    // Check for character variety (optional business rule)
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasLowercase || !hasUppercase || !hasNumbers) {
      return {
        isValid: false,
        error: 'Password must contain uppercase, lowercase, and numbers',
      };
    }

    return {
      isValid: true,
    };
  }

  /**
   * Authenticate user with credentials
   * This is a high-level authentication operation
   */
  static authenticate(
    credentials: AuthenticationCredentials,
    user: User
  ): AuthenticationResult {
    // Validate credentials
    if (!credentials.username || !credentials.password) {
      return {
        isValid: false,
        error: 'Username and password are required',
      };
    }

    // Check if user can login (business rules)
    if (!user.canLogin()) {
      return {
        isValid: false,
        error: user.isLocked() ? 'Account is locked' : 'Account is inactive',
      };
    }

    // Note: Password verification should happen server-side via API
    // This method is kept for domain logic validation (account status, etc.)
    // The actual password comparison happens in the API/repository layer
    
    // For now, we assume password was already verified by the API
    // In a proper implementation, this would be called after API verification
    // Record successful login
    user.recordLogin();

    return {
      isValid: true,
    };
  }
}

