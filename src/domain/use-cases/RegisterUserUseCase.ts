import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/User';
import { UserAuthentication } from '../entities/UserAuthentication';
import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationResult, ValidationError, Context } from '../../shared/types/ValidationTypes';

export interface RegisterUserRequest {
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

export class RegisterUserUseCase {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async execute(request: RegisterUserRequest, context: Context): Promise<RegisterUserResponse> {
    try {
      // Check if user with email already exists
      const existingUser = await this.userRepository.findByEmail(request.email);
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
        request.email,
        request.firstName,
        request.lastName,
        true // isActive = true by default
      );

      // Validate user entity
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
      const hashedPassword = await bcrypt.hash(request.password, saltRounds);

      // Create user authentication entity
      const authId = uuidv4();
      const userAuth = new UserAuthentication(
        authId,
        userId,
        'email',
        request.email.toLowerCase(),
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
