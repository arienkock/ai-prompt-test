import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { RegisterUserUseCase } from '../../domain/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../domain/use-cases/LoginUserUseCase';
import { UserRepository } from '../../data-access/repositories/UserRepository';
import { TransactionHelper } from '../../data-access/utils/TransactionHelper';
import { jwtService } from '../../shared/services/JwtService';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { Context } from '../../shared/types/ValidationTypes';
import { DomainError, DomainErrorCode } from '../../domain/types/UseCase';
import { RegisterUserCommandDto, RegisterUserResponseDto, LoginUserCommandDto, LoginUserResponseDto } from '../../domain/types/Dtos';
import { ValidationError } from '../../shared/types/ValidationTypes';

export class AuthRoutes {
  private router: Router;
  private pool: Pool;
  private transactionHelper: TransactionHelper;

  constructor(pool: Pool) {
    this.router = Router();
    this.pool = pool;
    this.transactionHelper = new TransactionHelper(pool);
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Public routes
    this.router.post('/register', AuthMiddleware.requireContext, this.register.bind(this));
    this.router.post('/login', AuthMiddleware.requireContext, this.login.bind(this));
    this.router.post('/refresh', AuthMiddleware.requireContext, this.refresh.bind(this));

    // Protected routes
    this.router.get('/profile', AuthMiddleware.authenticate, this.getProfile.bind(this));
    this.router.post('/logout', AuthMiddleware.authenticate, this.logout.bind(this));
    
    // Health check
    this.router.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'OK', 
        service: 'Authentication',
        timestamp: new Date().toISOString()
      });
    });
  }

  private async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, firstName, lastName, password } = req.body;

      // Basic input validation
      if (!email || !firstName || !lastName || !password) {
        res.status(400).json({
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
          details: 'email, firstName, lastName, and password are required'
        });
        return;
      }

      // Create use case within transaction context
      const result = await this.transactionHelper.executeUseCase<RegisterUserCommandDto, RegisterUserResponseDto, RegisterUserUseCase>(
        (client) => {
          const userRepository = new UserRepository(this.pool, client);
          return new RegisterUserUseCase(userRepository);
        },
        req.context!,
        { email, firstName, lastName, password }
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
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle validation errors
      if (error.message && error.message.includes('ValidationError')) {
        try {
          const errors = JSON.parse(error.message);
          res.status(400).json({
            error: 'Registration failed',
            code: 'REGISTRATION_ERROR',
            errors: errors.map((e: any) => ({
              field: e.field,
              message: e.message
            }))
          });
          return;
        } catch (parseError) {
          // If parsing fails, treat as general error
        }
      }
      
      // Handle domain errors properly
      if (error instanceof DomainError) {
        switch (error.code) {
          case DomainErrorCode.VALIDATION:
            res.status(400).json({
              error: error.message,
              code: 'VALIDATION_ERROR',
              details: error.details
            });
            return;
          case DomainErrorCode.AUTHENTICATION:
            res.status(401).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.AUTHORIZATION:
            res.status(403).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.NOT_FOUND:
            res.status(404).json({
              error: error.message,
              code: 'NOT_FOUND'
            });
            return;
          case DomainErrorCode.CONFLICT:
            res.status(409).json({
              error: error.message,
              code: 'CONFLICT'
            });
            return;
          default:
            res.status(500).json({
              error: 'Internal server error',
              code: 'INTERNAL_ERROR'
            });
            return;
        }
      }
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      console.log(`\n\nBODY ${JSON.stringify({ email, password })}\n\n`)
      // Basic input validation
      if (!email || !password) {
        res.status(400).json({
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
          details: 'email and password are required'
        });
        return;
      }

      // Create use case within transaction context
      const result = await this.transactionHelper.executeUseCase<LoginUserCommandDto, LoginUserResponseDto, LoginUserUseCase>(
        (client) => {
          const userRepository = new UserRepository(this.pool, client);
          return new LoginUserUseCase(userRepository);
        },
        req.context!,
        { email, password }
      );
      console.log(`\n\nresult ${JSON.stringify(result)}\n\n`)

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
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle validation errors
      if (error.message && error.message.includes('ValidationError')) {
        try {
          const errors = JSON.parse(error.message);
          // Check if it's an authentication error
          const isAuthError = errors.some((e: any) => e.field === 'email' || e.field === 'password' || e.field === 'account');
          res.status(isAuthError ? 401 : 400).json({
            error: 'Login failed',
            code: 'LOGIN_ERROR',
            errors: errors.map((e: any) => ({
              field: e.field,
              message: e.message
            }))
          });
          return;
        } catch (parseError) {
          // If parsing fails, treat as general error
        }
      }
      
      // Handle domain errors properly
      if (error instanceof DomainError) {
        switch (error.code) {
          case DomainErrorCode.VALIDATION:
            res.status(400).json({
              error: error.message,
              code: 'VALIDATION_ERROR',
              details: error.details
            });
            return;
          case DomainErrorCode.AUTHENTICATION:
            res.status(401).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.AUTHORIZATION:
            res.status(403).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.NOT_FOUND:
            res.status(404).json({
              error: error.message,
              code: 'NOT_FOUND'
            });
            return;
          case DomainErrorCode.CONFLICT:
            res.status(409).json({
              error: error.message,
              code: 'CONFLICT'
            });
            return;
          default:
            res.status(500).json({
              error: 'Internal server error',
              code: 'INTERNAL_ERROR'
            });
            return;
        }
      }
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Missing refresh token',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const tokens = jwtService.refreshTokenPair(refreshToken);
      if (!tokens) {
        res.status(401).json({
          error: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
        return;
      }

      res.json({
        message: 'Token refreshed successfully',
        ...tokens
      });
    } catch (error: any) {
      console.error('Token refresh error:', error);
      
      // Handle domain errors properly
      if (error instanceof DomainError) {
        switch (error.code) {
          case DomainErrorCode.VALIDATION:
            res.status(400).json({
              error: error.message,
              code: 'VALIDATION_ERROR',
              details: error.details
            });
            return;
          case DomainErrorCode.AUTHENTICATION:
            res.status(401).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.AUTHORIZATION:
            res.status(403).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.NOT_FOUND:
            res.status(404).json({
              error: error.message,
              code: 'NOT_FOUND'
            });
            return;
          case DomainErrorCode.CONFLICT:
            res.status(409).json({
              error: error.message,
              code: 'CONFLICT'
            });
            return;
          default:
            res.status(500).json({
              error: 'Internal server error',
              code: 'INTERNAL_ERROR'
            });
            return;
        }
      }
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      
      // Create repository within transaction context for consistency
      const user = await this.transactionHelper.executeInTransaction(async (client) => {
        const userRepository = new UserRepository(this.pool, client);
        return await userRepository.findById(userId);
      });
      
      if (!user) {
        res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    } catch (error: any) {
      console.error('Profile fetch error:', error);
      
      // Handle domain errors properly
      if (error instanceof DomainError) {
        switch (error.code) {
          case DomainErrorCode.VALIDATION:
            res.status(400).json({
              error: error.message,
              code: 'VALIDATION_ERROR',
              details: error.details
            });
            return;
          case DomainErrorCode.AUTHENTICATION:
            res.status(401).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.AUTHORIZATION:
            res.status(403).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.NOT_FOUND:
            res.status(404).json({
              error: error.message,
              code: 'NOT_FOUND'
            });
            return;
          case DomainErrorCode.CONFLICT:
            res.status(409).json({
              error: error.message,
              code: 'CONFLICT'
            });
            return;
          default:
            res.status(500).json({
              error: 'Internal server error',
              code: 'INTERNAL_ERROR'
            });
            return;
        }
      }
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a production app, you might want to blacklist the token
      // For now, just return success (client should discard tokens)
      res.json({
        message: 'Logout successful'
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      
      // Handle domain errors properly
      if (error instanceof DomainError) {
        switch (error.code) {
          case DomainErrorCode.VALIDATION:
            res.status(400).json({
              error: error.message,
              code: 'VALIDATION_ERROR',
              details: error.details
            });
            return;
          case DomainErrorCode.AUTHENTICATION:
            res.status(401).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.AUTHORIZATION:
            res.status(403).json({
              error: error.message,
              code: 'AUTH_ERROR'
            });
            return;
          case DomainErrorCode.NOT_FOUND:
            res.status(404).json({
              error: error.message,
              code: 'NOT_FOUND'
            });
            return;
          case DomainErrorCode.CONFLICT:
            res.status(409).json({
              error: error.message,
              code: 'CONFLICT'
            });
            return;
          default:
            res.status(500).json({
              error: 'Internal server error',
              code: 'INTERNAL_ERROR'
            });
            return;
        }
      }
      
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  getRouter(): Router {
    return this.router;
  }
}
