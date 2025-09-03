/**
 * DTO types for commands and responses as per architecture rules
 * Command and Query objects MUST NOT use / reference entity types.
 * Instead they MUST use DTO types that have a subset of the fields of the entities.
 */

// User DTOs
export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Register command DTO - subset of User entity fields
export interface RegisterUserCommandDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

// Login command DTO - subset of User entity fields
export interface LoginUserCommandDto {
  email: string;
  password: string;
}

// Register response DTO
export interface RegisterUserResponseDto {
  message: string;
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

// Login response DTO
export interface LoginUserResponseDto {
  message: string;
  user: UserDto;
  accessToken: string;
  refreshToken: string;
}

// Get user profile query DTO
export interface GetUserProfileQueryDto {
  userId: string;
}

// Profile response DTO
export interface GetUserProfileResponseDto {
  user: UserDto;
}

// Delete user command DTO
export interface DeleteUserCommandDto {
  userId: string;
}

// Delete user response DTO
export interface DeleteUserResponseDto {
  message: string;
}

// Get all users query DTO
export interface GetAllUsersQueryDto {
  pagination?: PaginationParams;
  // Future filter parameters can be added here
  // filters?: UserFilterDto;
}

// Get all users response DTO
export interface GetAllUsersResponseDto {
  users: UserDto[];
  meta: PaginationMeta;
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