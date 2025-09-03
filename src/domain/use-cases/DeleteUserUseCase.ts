import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationError, Context } from '@/shared/types/ValidationTypes';
import { UseCase } from '../types/UseCase';
import { ValidationDomainError, AuthorizationDomainError, NotFoundDomainError, AuthenticationDomainError } from '../entities/DomainErrors';
import { DeleteUserCommandDto, DeleteUserResponseDto } from '../types/Dtos';

export class DeleteUserUseCase implements UseCase<DeleteUserCommandDto, DeleteUserResponseDto> {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  isRead(): Boolean {
    return false;
  }

  isPublic(): Boolean {
    return false; // Private endpoint - requires authentication
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
      const deleteAuthResult = await this.userRepository.deleteAuthentication(auth.id!);
      if (!deleteAuthResult.valid) {
        throw new ValidationDomainError(
          'Failed to delete user authentication records',
          deleteAuthResult.errors
        );
      }
    }

    // Delete the user record
    const deleteUserResult = await this.userRepository.delete(command.userId);
    if (!deleteUserResult.valid) {
      throw new ValidationDomainError(
        'Failed to delete user',
        deleteUserResult.errors
      );
    }

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
    } else {
      // Basic UUID format validation (36 characters with hyphens)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(command.userId)) {
        errors.push(new ValidationError('userId', 'User ID must be a valid UUID'));
      }
    }

    if (errors.length !== 0) {
      throw new ValidationDomainError(
        'Invalid delete user command',
        errors
      );
    }
  }
}
