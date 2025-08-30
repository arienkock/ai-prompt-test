import { Pool, PoolClient } from 'pg';
import { ValidationResult, ValidationError } from '../../shared/types/ValidationTypes';

export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Transaction helper higher order function as required by architecture rules
 * MUST be used to invoke use cases within a transaction
 */
export class TransactionHelper {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Execute a callback within a database transaction
   * Automatically handles commit/rollback and connection management
   */
  async executeInTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a use case within a transaction
   * This is the required pattern for calling use cases
   */
  async executeUseCase<TCommand, TResult>(
    useCase: { execute(context: any, command: TCommand): Promise<TResult> },
    context: any,
    command: TCommand
  ): Promise<TResult> {
    return this.executeInTransaction(async (client) => {
      // The use case will use repository methods that should inherit the transaction
      // Since the repositories use the same pool, they will participate in the transaction
      return await useCase.execute(context, command);
    });
  }
}

/**
 * Factory function to create a transaction helper
 */
export function createTransactionHelper(pool: Pool): TransactionHelper {
  return new TransactionHelper(pool);
}
