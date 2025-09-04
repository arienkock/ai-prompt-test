import { ValidationError } from '@/domain/types/ValidationTypes';
import { UseCase } from '../types/UseCase';
import { ValidationDomainError, NotFoundDomainError, AuthorizationDomainError } from '../entities/DomainErrors';
import { GetAllUsersQueryDto, GetAllUsersResponseDto, PaginationParams, UserDto } from '../types/Dtos';
import { CrudType } from '../types/CrudType';
import { Context } from '../types/Context';

export const GetAllUsersUseCase: UseCase<GetAllUsersQueryDto, GetAllUsersResponseDto> = Object.assign(
  async (context: Context, query: GetAllUsersQueryDto): Promise<GetAllUsersResponseDto> => {
    // Authorization check - only admins can list all users
    await authorizationCheck(context);

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
    validatePagination(pagination);

    // Get paginated users from repository
    const paginatedUsers = await context.app.userRepository.findMany(pagination);

    // Transform User entities to UserDTOs
    const userDtos: UserDto[] = paginatedUsers.data.map(user => {
      const userDto: any = {
        id: user.id!,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isAdmin: user.isAdmin
      };

      if (user.createdAt) {
        userDto.createdAt = user.createdAt.toISOString();
      }
      if (user.updatedAt) {
        userDto.updatedAt = user.updatedAt.toISOString();
      }

      return userDto;
    });

    // Return DTO response with pagination metadata
    return {
      users: userDtos,
      meta: paginatedUsers.meta
    };
  },
  {
    crudType: CrudType.READ,
    isPublic: false
  })


async function authorizationCheck(context: Context): Promise<void> {
  if (!context.userId) {
    throw new AuthorizationDomainError('Authentication required');
  }

  // Fetch the user to check admin status
  const user = await context.app.userRepository.findById(context.userId);

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


function validatePagination(pagination: PaginationParams): void {
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
