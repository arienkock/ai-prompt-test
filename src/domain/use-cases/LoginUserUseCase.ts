import * as bcrypt from 'bcryptjs';
import { User } from '../entities/User';
import { UserAuthentication } from '../entities/UserAuthentication';
import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationResult, ValidationError, Context } from '../../shared/types/ValidationTypes';

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  success: boolean;
  user?: User;
  errors: ValidationError[];
}

export class LoginUserUseCase {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async execute(request: LoginUserRequest, context: Context): Promise<LoginUserResponse> {
    try {
      // Input validation
      const inputValidation = this.validateInput(request);
      if (!inputValidation.valid) {
        return {
          success: false,
          errors: inputValidation.errors
        };
      }

      // Find user with email authentication
      const userWithAuth = await this.userRepository.findUserWithAuthentication(request.email, 'email');
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

      const isPasswordValid = await bcrypt.compare(request.password, authentication.hashedPassword);
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

  private validateInput(request: LoginUserRequest): ValidationResult {
    const errors: ValidationError[] = [];

    if (!request.email || request.email.trim().length === 0) {
      errors.push(new ValidationError('email', 'Email is required'));
    }

    if (!request.password || request.password.length === 0) {
      errors.push(new ValidationError('password', 'Password is required'));
    }

    if (request.email && request.email.length > 320) {
      errors.push(new ValidationError('email', 'Email is too long'));
    }

    if (request.password && request.password.length > 128) {
      errors.push(new ValidationError('password', 'Password is too long'));
    }

    // Basic email format validation
    if (request.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
      errors.push(new ValidationError('email', 'Invalid email format'));
    }

    return new ValidationResult(errors.length === 0, errors);
  }
}
