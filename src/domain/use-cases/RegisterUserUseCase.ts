import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/User';
import { UserAuthentication } from '../entities/UserAuthentication';
import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationResult, ValidationError, Context } from '@/shared/types/ValidationTypes';
import { UseCase } from '../types/UseCase';
import { ValidationDomainError, ConflictDomainError, SystemError } from '../entities/DomainErrors';
import { RegisterUserCommandDto, RegisterUserResponseDto } from '../types/Dtos';

export class RegisterUserUseCase implements UseCase<RegisterUserCommandDto, RegisterUserResponseDto> {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }
  isRead(): Boolean {
    return false
  }
  isPublic(): Boolean {
    return true
  }

  async execute(context: Context, command: RegisterUserCommandDto): Promise<RegisterUserResponseDto> {
    // Validate command/query as per architecture rules
    this.validateCommand(command);

    // Check if user with email already exists
    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser) {
      throw new ConflictDomainError(
        'User with this email already exists'
      );
    }

    // Create user entity (let Prisma generate the ID)
    const user = new User(
      undefined, // Let Prisma generate the ID
      command.email.toLowerCase(), // Ensure consistent lowercase email
      command.firstName,
      command.lastName,
      true, // isActive = true by default
      false // isAdmin = false by default
    );

    // Validate user entity as per architecture rules
    const userValidation = user.validate();
    if (!userValidation.valid) {
      throw new ValidationDomainError(
        'User entity validation failed',
        userValidation.errors
      );
    }

    // Create user in database
    const createdUser = await this.userRepository.create(user);

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(command.password, saltRounds);

    // Create user authentication entity using the actual created user ID
    const userAuth = new UserAuthentication(
      undefined, // Let Prisma generate the ID
      createdUser.id!, // Use the actual user ID from database
      'email',
      command.email.toLowerCase(),
      hashedPassword,
      true, // isActive = true by default
    );

    // Validate authentication entity
    const authValidation = userAuth.validate();
    if (!authValidation.valid) {
      // No manual cleanup needed - Prisma transaction will automatically rollback
      throw new ValidationDomainError(
        'User authentication validation failed',
        authValidation.errors
      );
    }

    // Create authentication in database
    const createAuthResult = await this.userRepository.createAuthentication(userAuth);
    if (!createAuthResult.valid) {
      // No manual cleanup needed - Prisma transaction will automatically rollback
      throw new ValidationDomainError(
        'Authentication creation failed',
        createAuthResult.errors
      );
    }
    // Return DTO response
    const userDto: any = {
      id: createdUser.id!,
      email: createdUser.email,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      isActive: createdUser.isActive,
      isAdmin: createdUser.isAdmin
    };

    if (createdUser.createdAt) {
      userDto.createdAt = createdUser.createdAt.toISOString();
    }
    if (createdUser.updatedAt) {
      userDto.updatedAt = createdUser.updatedAt.toISOString();
    }

    return {
      message: 'User registered successfully',
      user: userDto,
      accessToken: '', // These will be filled by the web controller
      refreshToken: ''
    };
  }

  /**
   * Validate command input as per architecture rules
   * Command/Query validation must be stateless and not require repository usage
   */
  private validateCommand(command: RegisterUserCommandDto): void {
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
    
    if (!command.password || command.password.length < 8) {
      errors.push(new ValidationError('password', 'Password must be at least 8 characters long'));
    }

    if (command.password.length > 128) {
      errors.push(new ValidationError('password', 'Password must be less than 128 characters'));
    }

    if (errors.length !== 0) {
      throw new ValidationDomainError(
        'Invalid registration command',
        errors
      );
    }
  }
}
