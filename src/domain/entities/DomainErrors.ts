import { ValidationError } from '@/shared/types/ValidationTypes';

/**
 * Base error codes for domain errors as per architecture rules
 * Used to distinguish error types for proper HTTP status mapping
 */

export enum DomainErrorCode {
  VALIDATION = 'VALIDATION',// Maps to 400
  AUTHENTICATION = 'AUTHENTICATION',// Maps to 401  
  AUTHORIZATION = 'AUTHORIZATION',// Maps to 403
  NOT_FOUND = 'NOT_FOUND',// Maps to 404
  CONFLICT = 'CONFLICT',// Maps to 409
  SYSTEM = 'SYSTEM' // Maps to 500
}
/**
 * Standard domain error class
 */

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
/**
 * Specialized domain error for validation failures
 * Contains structured field errors for consistent API responses
 */

export class ValidationDomainError extends DomainError {
  constructor(
    message: string,
    public readonly fieldErrors: ValidationError[],
    details?: any
  ) {
    super(DomainErrorCode.VALIDATION, message, details);
    this.name = 'ValidationDomainError';
  }
}
/**
 * Authentication domain error for login/credential failures
 */

export class AuthenticationDomainError extends DomainError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(DomainErrorCode.AUTHENTICATION, message, details);
    this.name = 'AuthenticationDomainError';
  }
}
/**
 * Authorization domain error for permission failures
 */

export class AuthorizationDomainError extends DomainError {
  constructor(message: string = 'Access denied', details?: any) {
    super(DomainErrorCode.AUTHORIZATION, message, details);
    this.name = 'AuthorizationDomainError';
  }
}
/**
 * Not found domain error for missing resources
 */

export class NotFoundDomainError extends DomainError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(DomainErrorCode.NOT_FOUND, message, details);
    this.name = 'NotFoundDomainError';
  }
}
/**
 * Conflict domain error for duplicate resources
 */

export class ConflictDomainError extends DomainError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(DomainErrorCode.CONFLICT, message, details);
    this.name = 'ConflictDomainError';
  }
}
/**
 * Generic System Error
 */

export class SystemError extends DomainError {
  constructor(message: string = 'Internal system error', details?: any) {
    super(DomainErrorCode.SYSTEM, message, details);
    this.name = 'SystemError';
  }
}
