/**
 * Standard validation types as per architecture rules
 */

export class ValidationError {
  constructor(
    public readonly field: string,
    public readonly message: string
  ) {}
}

export class ValidationResult {
  constructor(
    public readonly valid: boolean = true,
    public readonly errors: ValidationError[] = []
  ) {}

  static success(): ValidationResult {
    return new ValidationResult(true, []);
  }

  static failure(errors: ValidationError | ValidationError[]): ValidationResult {
    return new ValidationResult(false, Array.isArray(errors) ? errors : [errors]);
  }

  static combine(...results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(result => result.errors);
    const isValid = results.every(result => result.valid);
    return new ValidationResult(isValid, allErrors);
  }
}

// Context object as per architecture rules
export class Context {
  public readonly requestId: string;

  constructor(
    public readonly userId?: string | null,
    requestId?: string | null
  ) {
    this.requestId = requestId || this._generateRequestId();
  }

  private _generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
