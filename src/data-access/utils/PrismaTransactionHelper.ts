import { PrismaClient } from '@prisma/client';
import { ValidationResult, ValidationError } from '@/domain/types/ValidationTypes';

export type PrismaTransactionCallback<T> = (prisma: PrismaClient) => Promise<T>;

/**
 * Prisma transaction helper higher order function as required by architecture rules
 * MUST be used to invoke use cases within a transaction
 * Uses Prisma's $transaction method instead of raw SQL transactions
 */
export class PrismaTransactionHelper {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Execute a callback within a Prisma transaction
   * Automatically handles commit/rollback
   */
  async executeInTransaction<T>(callback: PrismaTransactionCallback<T>): Promise<T> {
    return this.prisma.$transaction(async (prismaTransaction: any) => {
      return await callback(prismaTransaction);
    });
  }

  /**
   * Execute a use case within a transaction
   * This is the required pattern for calling use cases
   */
  async executeUseCase<TCommand, TResult, TUseCase extends { execute(context: any, command: TCommand): Promise<TResult> }>(
    useCaseFactory: (prisma: PrismaClient) => TUseCase,
    context: any,
    command: TCommand
  ): Promise<TResult> {
    return this.executeInTransaction(async (prismaTransaction: any) => {
      // Create the use case with a repository that uses the transaction client
      const useCase = useCaseFactory(prismaTransaction);
      return await useCase.execute(context, command);
    });
  }
}

/**
 * Factory function to create a Prisma transaction helper
 */
export function createPrismaTransactionHelper(prisma: PrismaClient): PrismaTransactionHelper {
  return new PrismaTransactionHelper(prisma);
}
