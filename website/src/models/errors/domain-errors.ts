/**
 * Domain Error Classes
 * Standardized error handling for domain layer
 */

/**
 * Base domain error class
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'DomainError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }
}

/**
 * Validation error - for business rule violations
 */
export class ValidationError extends DomainError {
  constructor(
    public readonly field: string,
    message: string
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error - for missing resources
 */
export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Authentication error - for authentication failures
 */
export class AuthenticationError extends DomainError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error - for permission/authorization failures
 */
export class AuthorizationError extends DomainError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Conflict error - for resource conflicts (e.g., duplicate username)
 */
export class ConflictError extends DomainError {
  constructor(resource: string, message?: string) {
    super(
      message || `${resource} already exists`,
      'CONFLICT_ERROR',
      409
    );
    this.name = 'ConflictError';
  }
}

/**
 * External service error - for failures in external services
 */
export class ExternalServiceError extends DomainError {
  constructor(
    service: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(`External service error (${service}): ${message}`, 'EXTERNAL_SERVICE_ERROR', 502);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Network error - for network-related failures
 */
export class NetworkError extends DomainError {
  constructor(message: string = 'Network request failed', public readonly originalError?: Error) {
    super(message, 'NETWORK_ERROR', 503);
    this.name = 'NetworkError';
  }
}

