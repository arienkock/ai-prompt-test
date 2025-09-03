import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationError, Context } from '@/shared/types/ValidationTypes';
import { UseCase } from '../types/UseCase';
import { ValidationDomainError, NotFoundDomainError, AuthorizationDomainError } from '../entities/DomainErrors';
import { GetUserProfileQueryDto, GetUserProfileResponseDto } from '../types/Dtos';

export class GetUserProfileUseCase implements UseCase<GetUserProfileQueryDto, GetUserProfileResponseDto> {
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

  async execute(context: Context, query: GetUserProfileQueryDto): Promise<GetUserProfileResponseDto> {
    // Validate query as per architecture rules
    this.validateQuery(query);

    // Authorization check - user can only access their own profile
    this.authorizationCheck(context, query);

    // Find user by ID
    const user = await this.userRepository.findById(query.userId);
    
    if (!user) {
      throw new NotFoundDomainError('User not found');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthorizationDomainError('Account is not active');
    }

    // Return DTO response
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

    return {
      user: userDto
    };
  }

    private authorizationCheck(context: Context, query: GetUserProfileQueryDto) {
        if (!context.userId) {
            throw new AuthorizationDomainError('Authentication required');
        }

        if (context.userId !== query.userId) {
            throw new AuthorizationDomainError('Access denied - can only access own profile');
        }
    }

  /**
   * Validate query input as per architecture rules
   * Command/Query validation must be stateless and not require repository usage
   */
  private validateQuery(query: GetUserProfileQueryDto): void {
    const errors: ValidationError[] = [];

    if (!query.userId || typeof query.userId !== 'string' || query.userId.trim().length === 0) {
      errors.push(new ValidationError('userId', 'User ID is required'));
    }

    if (errors.length !== 0) {
      throw new ValidationDomainError(
        'Invalid get profile query',
        errors
      );
    }
  }
}
