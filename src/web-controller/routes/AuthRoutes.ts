import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { RegisterUserUseCase } from '@/domain/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '@/domain/use-cases/LoginUserUseCase';
import { GetUserProfileUseCase } from '@/domain/use-cases/GetUserProfileUseCase';
import { DeleteUserUseCase } from '@/domain/use-cases/DeleteUserUseCase';
import { UserRepository } from '@/data-access/repositories/UserRepository';
import { jwtService } from '@/shared/services/JwtService';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { AuthenticationDomainError } from '@/domain/entities/DomainErrors';
import { 
  RegisterUserCommandDto, 
  RegisterUserResponseDto, 
  LoginUserCommandDto, 
  LoginUserResponseDto,
  GetUserProfileQueryDto,
  GetUserProfileResponseDto,
  DeleteUserCommandDto,
  DeleteUserResponseDto 
} from '@/domain/types/Dtos';
import { routeToUseCase, wrapAsync } from '../utils/RouteUtils';

export class AuthRoutes {
  private router: Router;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.router = Router();
    this.prisma = prisma;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Register route - public write operation with token generation
    routeToUseCase<RegisterUserCommandDto, RegisterUserResponseDto, RegisterUserUseCase>(
      this.router,
      '/register',
      this.prisma,
      (prismaTransaction) => {
        const userRepository = new UserRepository(prismaTransaction);
        return new RegisterUserUseCase(userRepository);
      },
      (result: RegisterUserResponseDto, req: Request, res: Response) => {
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
      this.prisma,
      (prismaTransaction) => {
        const userRepository = new UserRepository(prismaTransaction);
        return new LoginUserUseCase(userRepository);
      },
      (result: LoginUserResponseDto, req: Request, res: Response) => {
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
      this.prisma,
      (prismaTransaction) => {
        const userRepository = new UserRepository(prismaTransaction);
        return new GetUserProfileUseCase(userRepository);
      }
    );

    // Delete user route - private write operation
    routeToUseCase<DeleteUserCommandDto, DeleteUserResponseDto, DeleteUserUseCase>(
      this.router,
      '/users/:userId',
      this.prisma,
      (prismaTransaction) => {
        const userRepository = new UserRepository(prismaTransaction);
        return new DeleteUserUseCase(userRepository);
      },
      undefined,
      'delete'
    );

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
