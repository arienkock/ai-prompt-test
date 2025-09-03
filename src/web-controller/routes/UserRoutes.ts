import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GetAllUsersUseCase } from '@/domain/use-cases/GetAllUsersUseCase';
import { UserRepository } from '@/data-access/repositories/UserRepository';
import { PrismaTransactionHelper } from '@/data-access/utils/PrismaTransactionHelper';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { 
  GetAllUsersQueryDto, 
  GetAllUsersResponseDto,
  PaginationParams 
} from '@/domain/types/Dtos';
import { wrapAsync } from '../utils/RouteUtils';
import { v4 as uuidv4 } from 'uuid';

export class UserRoutes {
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
    // Get all users route - private read operation requiring admin privileges
    this.router.get('/', AuthMiddleware.authenticate, wrapAsync(async (req: Request, res: Response) => {
      // Parse pagination parameters from query string
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
      
      const query: GetAllUsersQueryDto = {
        pagination: new PaginationParams(page, pageSize)
      };
      
      const result = await this.transactionHelper.executeUseCase<GetAllUsersQueryDto, GetAllUsersResponseDto, GetAllUsersUseCase>(
        (prismaTransaction) => {
          const userRepository = new UserRepository(prismaTransaction);
          return new GetAllUsersUseCase(userRepository);
        },
        req.context!,
        query
      );

      res.json(result);
    }));
    
    // Apply unified error handler middleware - must be last
    this.router.use(ErrorHandler.handle);
  }

  getRouter(): Router {
    return this.router;
  }
}
