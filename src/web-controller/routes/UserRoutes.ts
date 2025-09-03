import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { GetAllUsersUseCase } from '../../domain/use-cases/GetAllUsersUseCase';
import { UserRepository } from '../../data-access/repositories/UserRepository';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { 
  GetAllUsersQueryDto, 
  GetAllUsersResponseDto 
} from '../../domain/types/Dtos';
import { routeToUseCase } from '../utils/RouteUtils';

export class UserRoutes {
  private router: Router;
  private pool: Pool;

  constructor(pool: Pool) {
    this.router = Router();
    this.pool = pool;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get all users route - private read operation requiring admin privileges
    routeToUseCase<GetAllUsersQueryDto, GetAllUsersResponseDto, GetAllUsersUseCase>(
      this.router,
      '/',
      this.pool,
      (client) => {
        const userRepository = new UserRepository(this.pool, client);
        return new GetAllUsersUseCase(userRepository);
      }
    );
    // Apply unified error handler middleware - must be last
    this.router.use(ErrorHandler.handle);
  }

  getRouter(): Router {
    return this.router;
  }
}
