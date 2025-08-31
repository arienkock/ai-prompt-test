import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { RegisterUserUseCase } from '../../domain/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../domain/use-cases/LoginUserUseCase';
import { GetUserProfileUseCase } from '../../domain/use-cases/GetUserProfileUseCase';
import { DeleteUserUseCase } from '../../domain/use-cases/DeleteUserUseCase';
import { UserRepository } from '../../data-access/repositories/UserRepository';
import { jwtService } from '../../shared/services/JwtService';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { AuthenticationDomainError } from '../../domain/types/UseCase';
import { 
  RegisterUserCommandDto, 
  RegisterUserResponseDto, 
  LoginUserCommandDto, 
  LoginUserResponseDto,
  GetUserProfileQueryDto,
  GetUserProfileResponseDto,
  DeleteUserCommandDto,
  DeleteUserResponseDto 
} from '../../domain/types/Dtos';
import { routeToUseCase, wrapAsync } from '../utils/RouteUtils';

export class AuthRoutes {
  private router: Router;
  private pool: Pool;

  constructor(pool: Pool) {
    this.router = Router();
    this.pool = pool;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Register route - public write operation with token generation
    routeToUseCase<RegisterUserCommandDto, RegisterUserResponseDto, RegisterUserUseCase>(
      this.router,
      '/register',
      this.pool,
      (client) => {
        const userRepository = new UserRepository(this.pool, client);
        return new RegisterUserUseCase(userRepository);
      },
      (result, req, res) => {
        // Generate tokens for the new user
        const tokens = jwtService.generateTokenPair({
          userId: result.user.id,
          email: result.user.email
        });

        res.status(201).json({
          message: result.message,
          user: result.user,
          ...tokens
        });
      }
    );

    // Login route - public write operation with token generation
    routeToUseCase<LoginUserCommandDto, LoginUserResponseDto, LoginUserUseCase>(
      this.router,
      '/login',
      this.pool,
      (client) => {
        const userRepository = new UserRepository(this.pool, client);
        return new LoginUserUseCase(userRepository);
      },
      (result, req, res) => {
        // Generate tokens for the user
        const tokens = jwtService.generateTokenPair({
          userId: result.user.id,
          email: result.user.email
        });

        res.json({
          message: result.message,
          user: result.user,
          ...tokens
        });
      }
    );

    // Profile route - private read operation
    routeToUseCase<GetUserProfileQueryDto, GetUserProfileResponseDto, GetUserProfileUseCase>(
      this.router,
      '/profile',
      this.pool,
      (client) => {
        const userRepository = new UserRepository(this.pool, client);
        return new GetUserProfileUseCase(userRepository);
      }
    );

    // Delete user route - private write operation
    this.router.delete('/users/:userId', AuthMiddleware.authenticate, wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.params;
      const command: DeleteUserCommandDto = { userId };

      // Execute use case within transaction context
      const transactionHelper = new (await import('../../data-access/utils/TransactionHelper')).TransactionHelper(this.pool);
      const result = await transactionHelper.executeUseCase<DeleteUserCommandDto, DeleteUserResponseDto, DeleteUserUseCase>(
        (client) => {
          const userRepository = new UserRepository(this.pool, client);
          return new DeleteUserUseCase(userRepository);
        },
        req.context!,
        command
      );

      res.json(result);
    }));

    // Non-use-case routes
    this.router.post('/refresh', AuthMiddleware.requireContext, wrapAsync(this.refresh.bind(this)));
    this.router.post('/logout', AuthMiddleware.authenticate, wrapAsync(this.logout.bind(this)));
    
    // Health check
    this.router.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'OK', 
        service: 'Authentication',
        timestamp: new Date().toISOString()
      });
    });

    // Apply unified error handler middleware - must be last
    this.router.use(ErrorHandler.handle);
  }

  private async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationDomainError('Missing refresh token');
    }

    const tokens = jwtService.refreshTokenPair(refreshToken);
    if (!tokens) {
      throw new AuthenticationDomainError('Invalid or expired refresh token');
    }

    res.json({
      message: 'Token refreshed successfully',
      ...tokens
    });
  }


  private async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    // In a production app, you might want to blacklist the token
    // For now, just return success (client should discard tokens)
    res.json({
      message: 'Logout successful'
    });
  }

  getRouter(): Router {
    return this.router;
  }
}
