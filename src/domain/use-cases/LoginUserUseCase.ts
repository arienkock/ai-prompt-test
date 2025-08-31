import * as bcrypt from 'bcryptjs';
import { User } from '../entities/User';
import { UserAuthentication } from '../entities/UserAuthentication';
import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationResult, ValidationError, Context } from '../../shared/types/ValidationTypes';
import { UseCase } from '../types/UseCase';
import { LoginUserCommandDto, LoginUserResponseDto } from '../types/Dtos';

export class LoginUserUseCase implements UseCase<LoginUserCommandDto, LoginUserResponseDto> {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async execute(context: Context, command: LoginUserCommandDto): Promise<LoginUserResponseDto> {
    try {
      console.log(`Login attempt for email: ${command.email}`);
      
      // Validate command/query as per architecture rules
      const commandValidation = this.validateCommand(command);
      if (!commandValidation.valid) {
        throw new Error(JSON.stringify(commandValidation.errors));
      }

      // Find user with email authentication
      console.log(`Finding user with authentication for email: ${command.email}`);
      const userWithAuth = await this.userRepository.findUserWithAuthentication(command.email, 'email');
      console.log(`User with auth result: ${JSON.stringify(userWithAuth)}`);
      
      if (!userWithAuth) {
        console.log(`No user found with email: ${command.email}`);
        throw new Error(JSON.stringify([new ValidationError('email', 'Invalid email or password')]));
      }

      const { user, authentication } = userWithAuth;

      // Check if user is active
      if (!user.isActive) {
        throw new Error(JSON.stringify([new ValidationError('account', 'Account is deactivated')]));
      }

      // Verify password
      if (!authentication.hashedPassword) {
        throw new Error(JSON.stringify([new ValidationError('password', 'Invalid email or password')]));
      }

      const isPasswordValid = await bcrypt.compare(command.password, authentication.hashedPassword);
      if (!isPasswordValid) {
        throw new Error(JSON.stringify([new ValidationError('password', 'Invalid email or password')]));
      }

      // Return DTO response
      return {
        message: 'Login successful',
        user: {
          id: user.id!,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          createdAt: user.createdAt?.toISOString(),
          updatedAt: user.updatedAt?.toISOString()
        },
        accessToken: '', // These will be filled by the web controller
        refreshToken: ''
      };

    } catch (error: any) {
      throw new Error(error.message || 'An unexpected error occurred during login');
    }
  }

  /**
   * Validate command input as per architecture rules
   * Command/Query validation must be stateless and not require repository usage
   */
  private validateCommand(command: LoginUserCommandDto): ValidationResult {
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
