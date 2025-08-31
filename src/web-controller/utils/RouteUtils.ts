import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { UseCase } from '../../domain/types/UseCase';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { TransactionHelper } from '../../data-access/utils/TransactionHelper';
import { Context } from '../../shared/types/ValidationTypes';

/**
 * Utility function to setup routes with use cases following the architecture pattern
 * Handles method determination, authentication middleware, and transaction management
 */
export function routeToUseCase<TCommand, TResponse, TUseCase extends UseCase<TCommand, TResponse>>(
  router: Router,
  path: string,
  pool: Pool,
  useCaseFactory: (client?: any) => TUseCase,
  responseHandler?: (result: TResponse, req: Request, res: Response) => void
): void {
  // Create a sample use case instance to determine properties
  const sampleUseCase = useCaseFactory();
  
  // Determine HTTP method based on use case type
  const method = sampleUseCase.isRead() ? 'get' : 'post';
  
  // Determine authentication middleware based on use case visibility
  const authMiddleware = sampleUseCase.isPublic() 
    ? AuthMiddleware.optionalAuthenticate 
    : AuthMiddleware.authenticate;

  // Create transaction helper
  const transactionHelper = new TransactionHelper(pool);

  // Setup the route with proper middleware chain
  router[method](path, authMiddleware, wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Extract command/query from request
    let command: TCommand;
    if (sampleUseCase.isRead()) {
      // For read operations, merge query params, route params, and user context
      command = { 
        ...req.query, 
        ...req.params,
        // Add userId from authenticated user if available
        ...(req.user?.userId && { userId: req.user.userId })
      } as TCommand;
    } else {
      // For write operations, use request body
      command = req.body as TCommand;
    }

    // Execute use case within transaction context
    const result = await transactionHelper.executeUseCase<TCommand, TResponse, TUseCase>(
      useCaseFactory,
      req.context!,
      command
    );

    // Handle the response
    if (responseHandler) {
      responseHandler(result, req, res);
    } else {
      // Default response handling
      res.json(result);
    }
  }));
}

/**
 * Wrapper to catch async errors and pass them to the error handler
 */
export function wrapAsync(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
