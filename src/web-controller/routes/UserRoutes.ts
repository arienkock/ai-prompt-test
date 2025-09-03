import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GetAllUsersUseCase } from '@/domain/use-cases/GetAllUsersUseCase';
import { UserRepository } from '@/data-access/repositories/UserRepository';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { 
  GetAllUsersQueryDto, 
  GetAllUsersResponseDto
} from '@/domain/types/Dtos';
import { routeToUseCase } from '../utils/RouteUtils';

export class UserRoutes {
  private router: Router;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.router = Router();
    this.prisma = prisma;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get all users route - private read operation requiring admin privileges
    routeToUseCase<GetAllUsersQueryDto, GetAllUsersResponseDto, GetAllUsersUseCase>(
      this.router,
      '/',
      this.prisma,
      GetAllUsersUseCase,
      (prismaTransaction) => {
        const userRepository = new UserRepository(prismaTransaction);
        return new GetAllUsersUseCase(userRepository);
      }
    );
  }

  getRouter(): Router {
    return this.router;
  }
}
