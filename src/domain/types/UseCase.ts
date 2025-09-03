import { Context } from '@/shared/types/ValidationTypes';
import { CrudType } from './CrudType';

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
 * Interface for use case constructors with static properties
 * Used by RouteUtils to access metadata without instantiation
 */
export interface UseCaseConstructor<TCommand, TResponse> {
  new (...args: any[]): UseCase<TCommand, TResponse>;
  readonly crudType: CrudType;
  readonly isPublic: boolean;
}
