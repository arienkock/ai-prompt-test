import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationError, Context } from '@/shared/types/ValidationTypes';
import { UseCase } from '../types/UseCase';
import { ValidationDomainError, NotFoundDomainError, AuthorizationDomainError } from '../entities/DomainErrors';
import { GetAllUsersQueryDto, GetAllUsersResponseDto, PaginationParams, UserDto } from '../types/Dtos';

export class GetAllUsersUseCase implements UseCase<GetAllUsersQueryDto, GetAllUsersResponseDto> {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  isRead(): Boolean {
    return true;
  }

  isPublic(): Boolean {
    return false;
  }

  async execute(context: Context, query: GetAllUsersQueryDto): Promise<GetAllUsersResponseDto> {
    // Authorization check - only admins can list all users
    await this.authorizationCheck(context);

    // Handle pagination - routeToUseCase passes query params directly, so we need to construct PaginationParams
    let pagination: PaginationParams;
    
    if (query.pagination) {
      // If pagination object is provided, use it
      pagination = query.pagination;
    } else {
      // Otherwise, extract page/pageSize from query params (routeToUseCase compatibility)
      const queryWithParams = query as any; // Type assertion for compatibility
      const page = queryWithParams.page ? (typeof queryWithParams.page === 'string' ? parseInt(queryWithParams.page, 10) : queryWithParams.page) : 1;
      const pageSize = queryWithParams.pageSize ? (typeof queryWithParams.pageSize === 'string' ? parseInt(queryWithParams.pageSize, 10) : queryWithParams.pageSize) : 20;
      pagination = new PaginationParams(page, pageSize);
    }

    // Validate pagination
    this.validatePagination(pagination);

    // Get paginated users from repository
    const paginatedUsers = await this.userRepository.list(pagination);

    // Transform User entities to UserDTOs
    const userDtos: UserDto[] = paginatedUsers.data.map(user => ({
      id: user.id!,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt?.toISOString(),
      updatedAt: user.updatedAt?.toISOString()
    }));

    // Return DTO response with pagination metadata
    return {
      users: userDtos,
      meta: paginatedUsers.meta
    };
  }

  private async authorizationCheck(context: Context): Promise<void> {
    if (!context.userId) {
      throw new AuthorizationDomainError('Authentication required');
    }

    // Fetch the user to check admin status
    const user = await this.userRepository.findById(context.userId);
    
    if (!user) {
      throw new NotFoundDomainError('User not found');
    }

    if (!user.isActive) {
      throw new AuthorizationDomainError('Account is not active');
    }

    if (!user.isAdmin) {
      throw new AuthorizationDomainError('Access denied - admin privileges required');
    }
  }

  /**
   * Validate pagination parameters as per architecture rules
   * Command/Query validation must be stateless and not require repository usage
   */
  private validatePagination(pagination: PaginationParams): void {
    const errors: ValidationError[] = [];

    if (pagination.page < 1) {
      errors.push(new ValidationError('page', 'Page must be a positive number'));
    }

    if (pagination.pageSize < 1 || pagination.pageSize > 500) {
      errors.push(new ValidationError('pageSize', 'Page size must be a number between 1 and 500'));
    }

    if (errors.length !== 0) {
      throw new ValidationDomainError(
        'Invalid pagination parameters',
        errors
      );
    }
  }
}
