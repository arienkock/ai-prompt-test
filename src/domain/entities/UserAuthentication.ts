import { Entity } from './Entity';
import { ValidationResult, ValidationError } from '@/domain/types/ValidationTypes';

/**
 * UserAuthentication entity - weak entity following architecture rules:
 * - Must have non-nullable relationship to User
 * - Has identity field (id)
 * - All fields have constraints
 * - Relational constraints are checked
 */
export class UserAuthentication extends Entity {
  constructor(
    id: string | undefined,
    public readonly userId: string, // Non-nullable FK - weak entity rule
    public readonly provider: string,
    public readonly providerId: string,
    public readonly hashedPassword?: string | null,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {
    super(id);
  }

  /**
   * Validate all entity fields and relational constraints
   * @returns {ValidationResult}
   */
  validate(): ValidationResult {
    const errors: ValidationError[] = [];

    // ID validation - only required for existing entities (not new ones)
    if (this.id !== undefined && !this.hasValidId()) {
      errors.push(new ValidationError('id', 'ID must be a non-empty string when provided'));
    }

    // userId validation (weak entity - must belong to a User)
    if (!this.userId || typeof this.userId !== 'string' || this.userId.trim().length === 0) {
      errors.push(new ValidationError('userId', 'User ID is required (weak entity constraint)'));
    }

    // Provider validation
    if (!this.provider || typeof this.provider !== 'string') {
      errors.push(new ValidationError('provider', 'Provider is required'));
    } else {
      if (this.provider.length > 50) {
        errors.push(new ValidationError('provider', 'Provider must not exceed 50 characters'));
      }
      if (!this._isValidProvider(this.provider)) {
        errors.push(new ValidationError('provider', 'Provider must be one of: email, google, github, facebook'));
      }
    }

    // Provider ID validation
    if (!this.providerId || typeof this.providerId !== 'string') {
      errors.push(new ValidationError('providerId', 'Provider ID is required'));
    } else if (this.providerId.length > 255) {
      errors.push(new ValidationError('providerId', 'Provider ID must not exceed 255 characters'));
    }

    // Hashed password validation (required for email provider)
    if (this.provider === 'email') {
      if (!this.hashedPassword || typeof this.hashedPassword !== 'string') {
        errors.push(new ValidationError('hashedPassword', 'Hashed password is required for email provider'));
      } else if (this.hashedPassword.length < 10) {
        errors.push(new ValidationError('hashedPassword', 'Hashed password appears to be invalid'));
      }
    } else {
      // For non-email providers, hashedPassword should be null
      if (this.hashedPassword !== null && this.hashedPassword !== undefined) {
        errors.push(new ValidationError('hashedPassword', 'Hashed password should be null for non-email providers'));
      }
    }

    // isActive validation
    if (typeof this.isActive !== 'boolean') {
      errors.push(new ValidationError('isActive', 'isActive must be a boolean value'));
    }

    // Provider-specific providerId validation
    if (this.provider === 'email') {
      if (!this._isValidEmail(this.providerId)) {
        errors.push(new ValidationError('providerId', 'Provider ID must be a valid email for email provider'));
      }
    }

    return errors.length === 0 
      ? ValidationResult.success() 
      : ValidationResult.failure(errors);
  }

  /**
   * Validate provider values
   * @private
   */
  private _isValidProvider(provider: string): boolean {
    const validProviders = ['email', 'google', 'github', 'facebook', 'apple', 'microsoft'];
    return validProviders.includes(provider.toLowerCase());
  }

  /**
   * Email format validation
   * @private
   */
  private _isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if this is an email/password authentication
   * @returns {boolean}
   */
  isEmailProvider(): boolean {
    return this.provider === 'email';
  }

  /**
   * Check if this is a social authentication
   * @returns {boolean}
   */
  isSocialProvider(): boolean {
    return !this.isEmailProvider();
  }

  /**
   * Static factory method for email authentication
   */
  static createEmailAuth(userId: string, email: string, hashedPassword: string): UserAuthentication {
    return new UserAuthentication(undefined, userId, 'email', email, hashedPassword);
  }

  /**
   * Static factory method for social authentication
   */
  static createSocialAuth(userId: string, provider: string, providerId: string): UserAuthentication {
    return new UserAuthentication(undefined, userId, provider, providerId, null);
  }

  /**
   * Create with existing data
   */
  static fromData(data: {
    id: string;
    userId: string;
    provider: string;
    providerId: string;
    hashedPassword?: string | null;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): UserAuthentication {
    return new UserAuthentication(
      data.id,
      data.userId,
      data.provider,
      data.providerId,
      data.hashedPassword,
      data.isActive,
      data.createdAt,
      data.updatedAt
    );
  }
}
