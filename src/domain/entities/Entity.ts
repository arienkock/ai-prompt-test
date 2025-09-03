import { ValidationResult } from '@/shared/types/ValidationTypes';
import { SystemError } from './DomainErrors';

/**
 * Abstract base Entity class as per architecture rules
 * All entities must have identity fields and validation methods
 */
export abstract class Entity {
  constructor(public readonly id?: string) {
    if (new.target === Entity) {
      throw new SystemError('Cannot instantiate abstract Entity class');
    }
  }

  /**
   * Abstract validation method - must be implemented by subclasses
   * @returns {ValidationResult}
   */
  abstract validate(): ValidationResult;

  /**
   * Check if entity has valid identity
   * @returns {boolean}
   */
  hasValidId(): boolean {
    return !!this.id && typeof this.id === 'string' && this.id.length > 0;
  }
}

/**
 * Value object base class - never persisted
 */
export abstract class ValueObject {
  constructor() {
    if (new.target === ValueObject) {
      throw new SystemError('Cannot instantiate abstract ValueObject class');
    }
  }

  abstract validate(): ValidationResult;
}
