import { ValidationError } from '@/domain/types/ValidationTypes';
import { UseCase } from '../types/UseCase';
import { ValidationDomainError, AuthorizationDomainError, NotFoundDomainError, AuthenticationDomainError } from '../entities/DomainErrors';
import { DeleteUserCommandDto, DeleteUserResponseDto } from '../types/Dtos';
import { CrudType } from '../types/CrudType';
import { Context } from '../types/Context';

export const DeleteUserUseCase: UseCase<DeleteUserCommandDto, DeleteUserResponseDto> = Object.assign(
  async (context: Context, command: DeleteUserCommandDto): Promise<DeleteUserResponseDto> => {
    // Use case MUST throw Unauthenticated error if no user provided
    if (!context.userId) {
      throw new AuthenticationDomainError(
        'Authentication required'
      );
    }

    // Validate command/query as per architecture rules
    validateCommand(command);

    // Get the requesting user to check authorization
    const requestingUser = await context.app.userRepository.findById(context.userId);
    if (!requestingUser) {
      throw new AuthenticationDomainError(
        'Invalid user session'
      );
    }

    // Get the target user to be deleted
    const targetUser = await context.app.userRepository.findById(command.userId);
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
    const userAuthentications = await context.app.userRepository.findAuthenticationByUserId(command.userId);
    for (const auth of userAuthentications) {
      await context.app.userRepository.deleteAuthentication(auth.id!);
    }

    // Delete the user record
    await context.app.userRepository.delete(command.userId);

    // Return success response
    return {
      message: 'User deleted successfully'
    };
  }, {
    crudType: CrudType.DELETE,
    isPublic: false,
  })
  

/**
 * Validate command input as per architecture rules
 * Command/Query validation must be stateless and not require repository usage
 */
function validateCommand(command: DeleteUserCommandDto): void {
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