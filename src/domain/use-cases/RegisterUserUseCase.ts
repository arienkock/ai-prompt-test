import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/User';
import { UserAuthentication } from '../entities/UserAuthentication';
import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationResult, ValidationError, Context } from '../../shared/types/ValidationTypes';
import { UseCase, DomainError, DomainErrorCode } from '../types/UseCase';

export interface RegisterUserCommand {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface RegisterUserResponse {
  success: boolean;
  user?: User;
  errors: ValidationError[];
}

export class RegisterUserUseCase implements UseCase<RegisterUserCommand, RegisterUserResponse> {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async execute(context: Context, command: RegisterUserCommand): Promise<RegisterUserResponse> {
    try {
      // Validate command/query as per architecture rules
      const commandValidation = this.validateCommand(command);
      if (!commandValidation.valid) {
        return {
          success: false,
          errors: commandValidation.errors
        };
      }

      // Validate password (was missing from execution flow)
      const passwordValidation = this.validatePassword(command.password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          errors: passwordValidation.errors
        };
      }

      // Check if user with email already exists
      const existingUser = await this.userRepository.findByEmail(command.email);
      if (existingUser) {
        return {
          success: false,
          errors: [new ValidationError('email', 'User with this email already exists')]
        };
      }

      // Create user entity
      const userId = uuidv4();
      const user = new User(
        userId,
        command.email,
        command.firstName,
        command.lastName,
        true // isActive = true by default
      );

      // Validate user entity as per architecture rules
      const userValidation = user.validate();
      if (!userValidation.valid) {
        return {
          success: false,
          errors: userValidation.errors
        };
      }

      // Create user in database
      const createUserResult = await this.userRepository.create(user);
      if (!createUserResult.valid) {
        return {
          success: false,
          errors: createUserResult.errors
        };
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(command.password, saltRounds);

      // Create user authentication entity
      const authId = uuidv4();
      const userAuth = new UserAuthentication(
        authId,
        userId,
        'email',
        command.email.toLowerCase(),
        hashedPassword
      );

      // Validate authentication entity
      const authValidation = userAuth.validate();
      if (!authValidation.valid) {
        // If authentication fails, we should clean up the created user
        await this.userRepository.delete(userId);
        return {
          success: false,
          errors: authValidation.errors
        };
      }

      // Create authentication in database
      const createAuthResult = await this.userRepository.createAuthentication(userAuth);
      if (!createAuthResult.valid) {
        // If authentication creation fails, clean up the user
        await this.userRepository.delete(userId);
        return {
          success: false,
          errors: createAuthResult.errors
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
        errors: [new ValidationError('system', 'An unexpected error occurred during registration')]
      };
    }
  }

  /**
   * Validate command input as per architecture rules
   * Command/Query validation must be stateless and not require repository usage
   */
  private validateCommand(command: RegisterUserCommand): ValidationResult {
    const errors: ValidationError[] = [];

    if (!command.email || typeof command.email !== 'string' || command.email.trim().length === 0) {
      errors.push(new ValidationError('email', 'Email is required'));
    } else if (command.email.length > 255) {
      errors.push(new ValidationError('email', 'Email must not exceed 255 characters'));
    }

    if (!command.firstName || typeof command.firstName !== 'string' || command.firstName.trim().length === 0) {
      errors.push(new ValidationError('firstName', 'First name is required'));
    } else if (command.firstName.length > 100) {
      errors.push(new ValidationError('firstName', 'First name must not exceed 100 characters'));
    }

    if (!command.lastName || typeof command.lastName !== 'string' || command.lastName.trim().length === 0) {
      errors.push(new ValidationError('lastName', 'Last name is required'));
    } else if (command.lastName.length > 100) {
      errors.push(new ValidationError('lastName', 'Last name must not exceed 100 characters'));
    }

    if (!command.password || typeof command.password !== 'string') {
      errors.push(new ValidationError('password', 'Password is required'));
    }

    return new ValidationResult(errors.length === 0, errors);
  }

  /**
   * Validate password complexity - stateless validation as per architecture rules
   */
  private validatePassword(password: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!password || password.length < 8) {
      errors.push(new ValidationError('password', 'Password must be at least 8 characters long'));
    }

    if (password.length > 128) {
      errors.push(new ValidationError('password', 'Password must be less than 128 characters'));
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push(new ValidationError('password', 'Password must contain at least one uppercase letter'));
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push(new ValidationError('password', 'Password must contain at least one lowercase letter'));
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      errors.push(new ValidationError('password', 'Password must contain at least one number'));
    }

    return new ValidationResult(errors.length === 0, errors);
  }
}
