import { Request, Response, NextFunction } from 'express';
import { DomainError, DomainErrorCode, ValidationDomainError } from '../../domain/types/UseCase';
import { ValidationError } from '../../shared/types/ValidationTypes';
import { logger } from '../services/LoggingService';

/**
 * Unified error response format
 */
interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
  fieldErrors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Unified Express error handler middleware
 * Maps domain errors to appropriate HTTP status codes and consistent JSON responses
 */
export class ErrorHandler {
  /**
   * Express error handling middleware
   * Must be the last middleware in the chain
   */
  static handle(error: any, req: Request, res: Response, next: NextFunction): void {
    logger.error(error, 'Error caught by unified error handler:')

    // Handle domain errors with proper status code mapping
    if (error instanceof DomainError) {
      const statusCode = ErrorHandler.mapDomainErrorToStatusCode(error.code);
      const response = ErrorHandler.createErrorResponse(error);
      
      res.status(statusCode).json(response);
      return;
    }

    // Handle generic errors (fallback to 500)
    const response: ErrorResponse = {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };

    res.status(500).json(response);
  }

  /**
   * Map domain error codes to HTTP status codes as per architecture rules
   */
  private static mapDomainErrorToStatusCode(code: DomainErrorCode): number {
    switch (code) {
      case DomainErrorCode.VALIDATION:
        return 400;
      case DomainErrorCode.AUTHENTICATION:
        return 401;
      case DomainErrorCode.AUTHORIZATION:
        return 403;
      case DomainErrorCode.NOT_FOUND:
        return 404;
      case DomainErrorCode.CONFLICT:
        return 409;
      case DomainErrorCode.SYSTEM:
      default:
        return 500;
    }
  }

  /**
   * Create consistent error response format
   */
  private static createErrorResponse(error: DomainError): ErrorResponse {
    const response: ErrorResponse = {
      error: error.message,
      code: error.code,
      details: error.details
    };

    // Add field errors for validation errors
    if (error instanceof ValidationDomainError) {
      response.fieldErrors = error.fieldErrors.map(fieldError => ({
        field: fieldError.field,
        message: fieldError.message
      }));
    }

    return response;
  }
}
