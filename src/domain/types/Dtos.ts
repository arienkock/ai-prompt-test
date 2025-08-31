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

// Profile response DTO
export interface ProfileResponseDto {
  user: UserDto;
}
