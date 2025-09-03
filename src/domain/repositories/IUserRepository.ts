import { User } from '../entities/User';
import { UserAuthentication } from '../entities/UserAuthentication';
import { ValidationResult } from '@/shared/types/ValidationTypes';
import { PaginatedResults, PaginationParams } from '../types/Dtos';

export interface IUserRepository {
  // User operations
  findById(id: string, opts?: { includeRelations?: string[] }): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User | null>;
  delete(id: string): Promise<void>;
  findMany(pagination: PaginationParams): Promise<PaginatedResults<User>>;
  
  // User authentication operations
  findAuthenticationByUserId(userId: string, provider?: string): Promise<UserAuthentication[]>;
  findAuthenticationByProvider(provider: string, providerId: string): Promise<UserAuthentication | null>;
  createAuthentication(userAuth: UserAuthentication): Promise<void>;
  updateAuthentication(userAuth: UserAuthentication): Promise<UserAuthentication | null>;
  deleteAuthentication(id: string): Promise<void>;
  
  // User with authentication operations
  findUserWithAuthentication(email: string, provider: string): Promise<{ user: User; authentication: UserAuthentication } | null>;
}
