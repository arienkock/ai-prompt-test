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
  isPublic(): Boolean
  isRead(): Boolean
}


