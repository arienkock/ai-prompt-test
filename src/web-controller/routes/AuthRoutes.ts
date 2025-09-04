import { Router, Request, Response } from 'express';
import { RegisterUserUseCase } from '@/domain/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '@/domain/use-cases/LoginUserUseCase';
import { GetUserProfileUseCase } from '@/domain/use-cases/GetUserProfileUseCase';
import { DeleteUserUseCase } from '@/domain/use-cases/DeleteUserUseCase';
import { jwtService } from '@/shared/services/JwtService';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
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
import { routeToUseCase } from '../utils/RouteUtils';

export const AuthRoutes = {
  buildRouter(authMiddlewareProvider: AuthMiddleware): Router {
    const router = Router()
    // Register route - public write operation with token generation
    routeToUseCase<RegisterUserCommandDto, RegisterUserResponseDto>(
      router,
      '/register',
      authMiddlewareProvider,
      RegisterUserUseCase,
      handleTokenResponse(201)
    );

    // Login route - public write operation with token generation
    routeToUseCase<LoginUserCommandDto, LoginUserResponseDto>(
      router,
      '/login',
      authMiddlewareProvider,
      LoginUserUseCase,
      handleTokenResponse(200)
    );

    // Profile route - private read operation
    routeToUseCase<GetUserProfileQueryDto, GetUserProfileResponseDto>(
      router,
      '/profile',
      authMiddlewareProvider,
      GetUserProfileUseCase
    );

    // Delete user route - private write operation
    routeToUseCase<DeleteUserCommandDto, DeleteUserResponseDto>(
      router,
      '/users/:userId',
      authMiddlewareProvider,
      DeleteUserUseCase,
    );

    // Non-use-case routes
    const refresh = (req: Request, res: Response): void => {
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


    const logout = (req: Request, res: Response): void => {
      // In a production app, you might want to blacklist the token
      // For now, just return success (client should discard tokens)
      res.json({
        message: 'Logout successful'
      });
    }
    router.post('/refresh', authMiddlewareProvider.requireContext, refresh);
    router.post('/logout', authMiddlewareProvider.authenticate, logout);

    // Health check
    router.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'OK',
        service: 'Authentication',
        timestamp: new Date().toISOString()
      });
    });
    return router
  }
}
function handleTokenResponse(status: number) {
  return (result: RegisterUserResponseDto, req: Request, res: Response) => {
    // Generate tokens for the new user
    const tokens = jwtService.generateTokenPair({
      userId: result.user.id,
      email: result.user.email
    });

    res.status(status).json({
      message: result.message,
      user: result.user,
      ...tokens
    });
  }
}

