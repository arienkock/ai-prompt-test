import { Router } from 'express';
import { GetAllUsersUseCase } from '@/domain/use-cases/GetAllUsersUseCase';
import { 
  GetAllUsersQueryDto, 
  GetAllUsersResponseDto
} from '@/domain/types/Dtos';
import { routeToUseCase } from '../utils/RouteUtils';
import { AuthMiddleware } from '../middleware/AuthMiddleware';

export const UserRoutes = {
  buildRouter(authMiddlewareProvider: AuthMiddleware): Router {
    const router = Router()
    // Get all users route - private read operation requiring admin privileges
    routeToUseCase<GetAllUsersQueryDto, GetAllUsersResponseDto>(
      router,
      '/',
      authMiddlewareProvider,
      GetAllUsersUseCase
    );
    return router
  }
}
