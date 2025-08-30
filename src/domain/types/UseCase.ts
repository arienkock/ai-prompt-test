import { Context } from '../../shared/types/ValidationTypes';

/**
 * Standardized use case interface as per architecture rules
 * All use cases must implement this interface
 */
export interface UseCase<TCommand, TResponse> {
  /**
   * Execute the use case with proper parameter order
   * @param context - Request context (MUST be first parameter)
   * @param command - Command or query object (MUST be second parameter)
   * @returns Promise of response
   */
  execute(context: Context, command: TCommand): Promise<TResponse>;
}

/**
 * Base error codes for domain errors as per architecture rules
 * Used to distinguish error types for proper HTTP status mapping
 */
export enum DomainErrorCode {
  VALIDATION = 'VALIDATION',      // Maps to 400
  AUTHENTICATION = 'AUTH',        // Maps to 401  
  AUTHORIZATION = 'AUTH',         // Maps to 403
  NOT_FOUND = 'NOT_FOUND',       // Maps to 404
  CONFLICT = 'CONFLICT',         // Maps to 409
  SYSTEM = 'SYSTEM'              // Maps to 500
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
