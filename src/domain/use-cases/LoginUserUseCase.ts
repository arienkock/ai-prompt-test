import * as bcrypt from 'bcryptjs';
import { IUserRepository } from '../repositories/IUserRepository';
import { ValidationError, Context } from '@/shared/types/ValidationTypes';
import { UseCase } from '../types/UseCase';
import { ValidationDomainError, AuthenticationDomainError } from '../entities/DomainErrors';
import { LoginUserCommandDto, LoginUserResponseDto } from '../types/Dtos';

export class LoginUserUseCase implements UseCase<LoginUserCommandDto, LoginUserResponseDto> {
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

  async execute(context: Context, command: LoginUserCommandDto): Promise<LoginUserResponseDto> {
    console.log(`Login attempt for email: ${command.email}`);
    
    // Validate command/query as per architecture rules
    this.validateCommand(command);

    // Find user with email authentication
    console.log(`Finding user with authentication for email: ${command.email}`);
    const userWithAuth = await this.userRepository.findUserWithAuthentication(command.email, 'email');
    console.log(`User with auth result: ${JSON.stringify(userWithAuth)}`);
    
    if (!userWithAuth) {
      console.log(`No user found with email: ${command.email}`);
      throw new AuthenticationDomainError(
        'Invalid email or password'
      );
    }

    const { user, authentication } = userWithAuth;

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationDomainError(
        'Account validation failed'
      );
    }

    // Verify password
    if (!authentication.hashedPassword) {
      throw new AuthenticationDomainError(
        'Invalid email or password'
      );
    }

    const isPasswordValid = await bcrypt.compare(command.password, authentication.hashedPassword);
    if (!isPasswordValid) {
      throw new AuthenticationDomainError(
        'Invalid email or password'
      );
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
      message: 'Login successful',
      user: userDto,
      accessToken: '', // These will be filled by the web controller
      refreshToken: ''
    };
  }

  /**
   * Validate command input as per architecture rules
   * Command/Query validation must be stateless and not require repository usage
   */
  private validateCommand(command: LoginUserCommandDto): void {
    const errors: ValidationError[] = [];

    if (!command.email || typeof command.email !== 'string' || command.email.trim().length === 0) {
      errors.push(new ValidationError('email', 'Email is required'));
    } else {
      if (command.email.length > 320) {
        errors.push(new ValidationError('email', 'Email is too long'));
      }
    }

    if (!command.password || typeof command.password !== 'string' || command.password.length === 0) {
      errors.push(new ValidationError('password', 'Password is required'));
    } else if (command.password.length > 128) {
      errors.push(new ValidationError('password', 'Password is too long'));
    }

    if (errors.length !== 0) {
      throw new ValidationDomainError(
        'Invalid login command',
        errors
      );
    }
  }
}
