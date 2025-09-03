import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { RegisterUserUseCase } from '@/domain/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '@/domain/use-cases/LoginUserUseCase';
import { GetUserProfileUseCase } from '@/domain/use-cases/GetUserProfileUseCase';
import { DeleteUserUseCase } from '@/domain/use-cases/DeleteUserUseCase';
import { UserRepository } from '@/data-access/repositories/UserRepository';
import { PrismaTransactionHelper } from '@/data-access/utils/PrismaTransactionHelper';
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
import { v4 as uuidv4 } from 'uuid';

export class AuthRoutes {
  private router: Router;
  private prisma: PrismaClient;
  private transactionHelper: PrismaTransactionHelper;

  constructor(prisma: PrismaClient) {
    this.router = Router();
    this.prisma = prisma;
    this.transactionHelper = new PrismaTransactionHelper(prisma);
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Register route - public write operation with token generation
    this.router.post('/register', wrapAsync(async (req: Request, res: Response) => {
      const command: RegisterUserCommandDto = req.body;
      
      const result = await this.transactionHelper.executeUseCase<RegisterUserCommandDto, RegisterUserResponseDto, RegisterUserUseCase>(
        (prismaTransaction) => {
          const userRepository = new UserRepository(prismaTransaction);
          return new RegisterUserUseCase(userRepository);
        },
        { userId: undefined, requestId: uuidv4() },
        command
      );

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
    }));

    // Login route - public write operation with token generation
    this.router.post('/login', wrapAsync(async (req: Request, res: Response) => {
      const command: LoginUserCommandDto = req.body;
      
      const result = await this.transactionHelper.executeUseCase<LoginUserCommandDto, LoginUserResponseDto, LoginUserUseCase>(
        (prismaTransaction) => {
          const userRepository = new UserRepository(prismaTransaction);
          return new LoginUserUseCase(userRepository);
        },
        { userId: undefined, requestId: uuidv4() },
        command
      );

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
    }));

    // Profile route - private read operation
    this.router.get('/profile', AuthMiddleware.authenticate, wrapAsync(async (req: Request, res: Response) => {
      const query: GetUserProfileQueryDto = { userId: req.context!.userId! };
      
      const result = await this.transactionHelper.executeUseCase<GetUserProfileQueryDto, GetUserProfileResponseDto, GetUserProfileUseCase>(
        (prismaTransaction) => {
          const userRepository = new UserRepository(prismaTransaction);
          return new GetUserProfileUseCase(userRepository);
        },
        req.context!,
        query
      );

      res.json(result);
    }));

    // Delete user route - private write operation
    this.router.delete('/users/:userId', AuthMiddleware.authenticate, wrapAsync(async (req: Request, res: Response) => {
      const { userId } = req.params;
      
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }
      
      const command: DeleteUserCommandDto = { userId };

      const result = await this.transactionHelper.executeUseCase<DeleteUserCommandDto, DeleteUserResponseDto, DeleteUserUseCase>(
        (prismaTransaction) => {
          const userRepository = new UserRepository(prismaTransaction);
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
