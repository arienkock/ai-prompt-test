import { Router, Request, Response, NextFunction } from 'express';
import { UseCase } from '@/domain/types/UseCase';
import { CrudType } from '@/domain/types/CrudType';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import pino from 'pino';

/**
 * Map CRUD type to HTTP method
 */
function mapCrudTypeToHttpMethod(crudType: CrudType): 'get' | 'post' | 'put' | 'patch' | 'delete' {
  switch (crudType) {
    case CrudType.CREATE: return 'post';
    case CrudType.READ: return 'get';
    case CrudType.UPDATE: return 'put';
    case CrudType.DELETE: return 'delete';
    default: return 'post';
  }
}

/**
 * Utility function to setup routes with use cases following the architecture pattern
 * Handles method determination, authentication middleware, and transaction management
 */
export function routeToUseCase<TCommand, TResponse>(
  router: Router,
  path: string,
  // prisma: PrismaClient,
  // useCaseDetails: {
  //   crudType: CrudType,
  //   isPublic: boolean
  // },
  // useCaseFactory: (prismaTransaction?: any) => TUseCase,
  authMwSupplier: AuthMiddleware,
  useCase: UseCase<TCommand, TResponse>,
  responseHandler?: (result: TResponse, req: Request, res: Response) => void,
): void {
  // Create a sample instance to get the constructor reference
  const {
    crudType,
    isPublic
  } = useCase
  // Determine HTTP method based on explicit parameter or CRUD type
  const method = mapCrudTypeToHttpMethod(crudType);

  // Determine authentication middleware based on use case visibility
  const authMiddleware = isPublic
    ? authMwSupplier.optionalAuthenticate
    : authMwSupplier.authenticate;

  // Create transaction helper
  // const transactionHelper = new PrismaTransactionHelper(prisma);

  // Setup the route with proper middleware chain
  router[method](path, authMiddleware, wrapAsync(async (req: Request, res: Response) => {
    const logger = req.context!.app.logger as pino.Logger
    // Log incoming context and DTO at debug level
    logger.debug({
      route: path,
      method: method.toUpperCase(),
      context: Object.assign({}, req.context, { app: null }),
      user: req.user,
      body: req.body,
      query: req.query,
      params: req.params,
    }, `Incoming request for ${method.toUpperCase()} ${path}`);

    // Extract   command/query from request
    let command: TCommand;
    if (crudType === CrudType.READ) {
      // For read operations, merge query params, route params, and user context
      command = {
        ...req.query,
        ...req.params,
        // Add userId from authenticated user if available
        ...(req.user?.userId && { userId: req.user.userId })
      } as TCommand;
    } else if (method === 'delete') {
      // For delete operations, use route parameters as the primary source
      command = {
        ...req.params,
        // Merge any additional data from request body if needed
        ...req.body
      } as TCommand;
    } else {
      // For other write operations (post, put, patch), use request body
      command = req.body as TCommand;
    }

    logger.debug({ command }, `Processing DTO for ${path}`);

    // Execute use case within transaction context
    // const result = await transactionHelper.executeUseCase<TCommand, TResponse, TUseCase>(
    //   useCaseFactory,
    //   req.context!,
    //   command
    // );
    const result = await useCase(req.context!, command);

    // After use case execution, create a wrapper around res.json to log the response
    const originalJson = res.json;
    res.json = (body?: any) => {
      logger.debug({ response: body }, `Response sent for ${path}`);
      return originalJson.call(res, body);
    };

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
