import * as bcrypt from 'bcryptjs';
import { User } from '../entities/User';
import { UserAuthentication } from '../entities/UserAuthentication';
import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationResult, ValidationError, Context } from '../../shared/types/ValidationTypes';
import { UseCase, DomainError, DomainErrorCode } from '../types/UseCase';

export interface LoginUserCommand {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  success: boolean;
  user?: User;
  errors: ValidationError[];
}

export class LoginUserUseCase implements UseCase<LoginUserCommand, LoginUserResponse> {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async execute(context: Context, command: LoginUserCommand): Promise<LoginUserResponse> {
    try {
      // Validate command/query as per architecture rules
      const commandValidation = this.validateCommand(command);
      if (!commandValidation.valid) {
        return {
          success: false,
          errors: commandValidation.errors
        };
      }

      // Find user with email authentication
      const userWithAuth = await this.userRepository.findUserWithAuthentication(command.email, 'email');
      if (!userWithAuth) {
        return {
          success: false,
          errors: [new ValidationError('email', 'Invalid email or password')]
        };
      }

      const { user, authentication } = userWithAuth;

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          errors: [new ValidationError('account', 'Account is deactivated')]
        };
      }

      // Verify password
      if (!authentication.hashedPassword) {
        return {
          success: false,
          errors: [new ValidationError('password', 'Invalid email or password')]
        };
      }

      const isPasswordValid = await bcrypt.compare(command.password, authentication.hashedPassword);
      if (!isPasswordValid) {
        return {
          success: false,
          errors: [new ValidationError('password', 'Invalid email or password')]
        };
      }

      return {
        success: true,
        user,
        errors: []
      };

    } catch (error: any) {
      return {
        success: false,
        errors: [new ValidationError('system', 'An unexpected error occurred during login')]
      };
    }
  }

  /**
   * Validate command input as per architecture rules
   * Command/Query validation must be stateless and not require repository usage
   */
  private validateCommand(command: LoginUserCommand): ValidationResult {
    const errors: ValidationError[] = [];

    if (!command.email || typeof command.email !== 'string' || command.email.trim().length === 0) {
      errors.push(new ValidationError('email', 'Email is required'));
    } else {
      if (command.email.length > 320) {
        errors.push(new ValidationError('email', 'Email is too long'));
      }
      
      // Basic email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(command.email)) {
        errors.push(new ValidationError('email', 'Invalid email format'));
      }
    }

    if (!command.password || typeof command.password !== 'string' || command.password.length === 0) {
      errors.push(new ValidationError('password', 'Password is required'));
    } else if (command.password.length > 128) {
      errors.push(new ValidationError('password', 'Password is too long'));
    }

    return new ValidationResult(errors.length === 0, errors);
  }
}
