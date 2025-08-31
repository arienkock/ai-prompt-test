import { Entity } from './Entity';
import { ValidationResult, ValidationError } from '../../shared/types/ValidationTypes';

/**
 * User entity following architecture rules:
 * - Has identity field (id)
 * - All fields have constraints
 * - Text fields have max length constraints
 * - Validation checks all constraints
 */
export class User extends Entity {
  constructor(
    id: string | undefined,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly isActive: boolean = true,
    public readonly isAdmin: boolean = false,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {
    super(id);
  }

  /**
   * Validate all entity fields and constraints
   * @returns {ValidationResult}
   */
  validate(): ValidationResult {
    const errors: ValidationError[] = [];

    // ID validation
    if (!this.hasValidId()) {
      errors.push(new ValidationError('id', 'ID is required and must be a non-empty string'));
    }

    // Email validation
    if (!this.email || typeof this.email !== 'string') {
      errors.push(new ValidationError('email', 'Email is required'));
    } else {
      if (this.email.length > 255) {
        errors.push(new ValidationError('email', 'Email must not exceed 255 characters'));
      }
      if (!this._isValidEmail(this.email)) {
        errors.push(new ValidationError('email', 'Email format is invalid'));
      }
    }

    // First name validation
    if (!this.firstName || typeof this.firstName !== 'string') {
      errors.push(new ValidationError('firstName', 'First name is required'));
    } else if (this.firstName.length > 100) {
      errors.push(new ValidationError('firstName', 'First name must not exceed 100 characters'));
    } else if (this.firstName.trim().length === 0) {
      errors.push(new ValidationError('firstName', 'First name cannot be empty'));
    }

    // Last name validation
    if (!this.lastName || typeof this.lastName !== 'string') {
      errors.push(new ValidationError('lastName', 'Last name is required'));
    } else if (this.lastName.length > 100) {
      errors.push(new ValidationError('lastName', 'Last name must not exceed 100 characters'));
    } else if (this.lastName.trim().length === 0) {
      errors.push(new ValidationError('lastName', 'Last name cannot be empty'));
    }

    // isActive validation
    if (typeof this.isActive !== 'boolean') {
      errors.push(new ValidationError('isActive', 'isActive must be a boolean value'));
    }

    // isAdmin validation
    if (typeof this.isAdmin !== 'boolean') {
      errors.push(new ValidationError('isAdmin', 'isAdmin must be a boolean value'));
    }

    return errors.length === 0 
      ? ValidationResult.success() 
      : ValidationResult.failure(errors);
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
   * Get full name
   * @returns {string}
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * Static factory method
   */
  static create(email: string, firstName: string, lastName: string, isAdmin: boolean = false): User {
    return new User(undefined, email, firstName, lastName, true, isAdmin);
  }

  /**
   * Create with existing data
   */
  static fromData(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    isAdmin: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): User {
    return new User(
      data.id,
      data.email,
      data.firstName,
      data.lastName,
      data.isActive,
      data.isAdmin,
      data.createdAt,
      data.updatedAt
    );
  }
}
