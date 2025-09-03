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

// Pagination types
export class PaginationParams {
  public readonly page: number;
  public readonly pageSize: number;

  constructor(page: number = 1, pageSize: number = 20) {
    this.page = Math.max(1, page);
    this.pageSize = Math.min(Math.max(1, pageSize), 500); // Max 500 per architecture rules
  }
}

export class PaginationMeta {
  public readonly totalPages: number;
  public readonly hasNext: boolean;
  public readonly hasPrev: boolean;

  constructor(
    public readonly total: number,
    public readonly page: number,
    public readonly pageSize: number
  ) {
    this.totalPages = Math.ceil(total / pageSize);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}

export class PaginatedResults<T> {
  constructor(
    public readonly data: T[],
    public readonly meta: PaginationMeta
  ) {}
}
