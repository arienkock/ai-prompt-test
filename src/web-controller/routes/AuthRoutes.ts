import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { RegisterUserUseCase } from '../../domain/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../domain/use-cases/LoginUserUseCase';
import { UserRepository } from '../../data-access/repositories/UserRepository';
import { jwtService } from '../../shared/services/JwtService';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { Context } from '../../shared/types/ValidationTypes';

export class AuthRoutes {
  private router: Router;
  private userRepository: UserRepository;
  private registerUserUseCase: RegisterUserUseCase;
  private loginUserUseCase: LoginUserUseCase;

  constructor(pool: Pool) {
    this.router = Router();
    this.userRepository = new UserRepository(pool);
    this.registerUserUseCase = new RegisterUserUseCase(this.userRepository);
    this.loginUserUseCase = new LoginUserUseCase(this.userRepository);
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

      const result = await this.registerUserUseCase.execute(
        { email, firstName, lastName, password },
        req.context!
      );

      if (!result.success) {
        res.status(400).json({
          error: 'Registration failed',
          code: 'REGISTRATION_ERROR',
          errors: result.errors.map(e => ({
            field: e.field,
            message: e.message
          }))
        });
        return;
      }

      // Generate tokens for the new user
      const tokens = jwtService.generateTokenPair(result.user!);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.user!.id,
          email: result.user!.email,
          firstName: result.user!.firstName,
          lastName: result.user!.lastName,
          isActive: result.user!.isActive
        },
        ...tokens
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Basic input validation
      if (!email || !password) {
        res.status(400).json({
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
          details: 'email and password are required'
        });
        return;
      }

      const result = await this.loginUserUseCase.execute(
        { email, password },
        req.context!
      );

      if (!result.success) {
        res.status(401).json({
          error: 'Login failed',
          code: 'LOGIN_ERROR',
          errors: result.errors.map(e => ({
            field: e.field,
            message: e.message
          }))
        });
        return;
      }

      // Generate tokens for the user
      const tokens = jwtService.generateTokenPair(result.user!);

      res.json({
        message: 'Login successful',
        user: {
          id: result.user!.id,
          email: result.user!.email,
          firstName: result.user!.firstName,
          lastName: result.user!.lastName,
          isActive: result.user!.isActive
        },
        ...tokens
      });
    } catch (error: any) {
      console.error('Login error:', error);
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
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  private async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      
      const user = await this.userRepository.findById(userId);
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
