import { Context } from './Context';
import { CrudType } from './CrudType';

/**
 * Standardized use case interface as per architecture rules
 * All use cases must implement this interface
 */
export interface UseCase<TRequest, TResponse> {
  /**
   * Execute the use case with proper parameter order
   * @param context - Request context (MUST be first parameter)
   * @param request - Command or query object (MUST be second parameter)
   * @returns Promise of response
   */
  (context: Context, request: TRequest): Promise<TResponse>;
  readonly crudType: CrudType;
  readonly isPublic: boolean;
}

