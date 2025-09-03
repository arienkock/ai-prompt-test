import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationError, Context } from '@/shared/types/ValidationTypes';
import { UseCase } from '../types/UseCase';
import { ValidationDomainError, AuthorizationDomainError, NotFoundDomainError, AuthenticationDomainError } from '../entities/DomainErrors';
import { DeleteUserCommandDto, DeleteUserResponseDto } from '../types/Dtos';
import { CrudType } from '../types/CrudType';

export class DeleteUserUseCase implements UseCase<DeleteUserCommandDto, DeleteUserResponseDto> {
  private userRepository: IUserRepository;

  static readonly crudType = CrudType.DELETE;
  static readonly isPublic = false;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async execute(context: Context, command: DeleteUserCommandDto): Promise<DeleteUserResponseDto> {
    // Use case MUST throw Unauthenticated error if no user provided
    if (!context.userId) {
      throw new AuthenticationDomainError(
        'Authentication required'
      );
    }

    // Validate command/query as per architecture rules
    this.validateCommand(command);

    // Get the requesting user to check authorization
    const requestingUser = await this.userRepository.findById(context.userId);
    if (!requestingUser) {
      throw new AuthenticationDomainError(
        'Invalid user session'
      );
    }

    // Get the target user to be deleted
    const targetUser = await this.userRepository.findById(command.userId);
    if (!targetUser) {
      throw new NotFoundDomainError(
        'User not found'
      );
    }

    // Authorization check: user can delete their own account OR user is admin
    const canDeleteOwnAccount = context.userId === command.userId;
    const isAdmin = requestingUser.isAdmin;

    if (!canDeleteOwnAccount && !isAdmin) {
      throw new AuthorizationDomainError(
        'You do not have permission to delete this user'
      );
    }

    // Delete user authentication records first (to maintain referential integrity)
    const userAuthentications = await this.userRepository.findAuthenticationByUserId(command.userId);
    for (const auth of userAuthentications) {
      await this.userRepository.deleteAuthentication(auth.id!);
    }

    // Delete the user record
    await this.userRepository.delete(command.userId);

    // Return success response
    return {
      message: 'User deleted successfully'
    };
  }

  /**
   * Validate command input as per architecture rules
   * Command/Query validation must be stateless and not require repository usage
   */
  private validateCommand(command: DeleteUserCommandDto): void {
    const errors: ValidationError[] = [];

    if (!command.userId || typeof command.userId !== 'string' || command.userId.trim().length === 0) {
      errors.push(new ValidationError('userId', 'User ID is required'));
    }

    if (errors.length !== 0) {
      throw new ValidationDomainError(
        'Invalid delete user command',
        errors
      );
    }
  }
}
