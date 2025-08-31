import { DeleteUserUseCase } from '../src/domain/use-cases/DeleteUserUseCase';
import { User } from '../src/domain/entities/User';
import { UserAuthentication } from '../src/domain/entities/UserAuthentication';
import { IUserRepository } from '../src/domain/repositories/IUserRepository';
import { ValidationResult, ValidationError, Context } from '../src/shared/types/ValidationTypes';
import { 
  DeleteUserCommandDto, 
  DeleteUserResponseDto 
} from '../src/domain/types/Dtos';
import { 
  ValidationDomainError, 
  AuthorizationDomainError, 
  NotFoundDomainError, 
  AuthenticationDomainError 
} from '../src/domain/types/UseCase';

// Mock repository
class MockUserRepository implements IUserRepository {
  private users: User[] = [];
  private authentications: UserAuthentication[] = [];

  // Helper methods for test setup
  addUser(user: User): void {
    this.users.push(user);
  }

  addAuthentication(auth: UserAuthentication): void {
    this.authentications.push(auth);
  }

  clear(): void {
    this.users = [];
    this.authentications = [];
  }

  // IUserRepository implementation
  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email.toLowerCase()) || null;
  }

  async create(user: User): Promise<ValidationResult> {
    this.users.push(user);
    return ValidationResult.success();
  }

  async update(user: User): Promise<ValidationResult> {
    const index = this.users.findIndex(u => u.id === user.id);
    if (index === -1) {
      return ValidationResult.failure(new ValidationError('id', 'User not found'));
    }
    this.users[index] = user;
    return ValidationResult.success();
  }

  async delete(id: string): Promise<ValidationResult> {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      return ValidationResult.failure(new ValidationError('id', 'User not found'));
    }
    this.users.splice(index, 1);
    return ValidationResult.success();
  }

  async list(): Promise<User[]> {
    return this.users;
  }

  async findAuthenticationByUserId(userId: string): Promise<UserAuthentication[]> {
    return this.authentications.filter(a => a.userId === userId);
  }

  async findAuthenticationByProvider(provider: string, providerId: string): Promise<UserAuthentication | null> {
    return this.authentications.find(a => a.provider === provider && a.providerId === providerId) || null;
  }

  async createAuthentication(userAuth: UserAuthentication): Promise<ValidationResult> {
    this.authentications.push(userAuth);
    return ValidationResult.success();
  }

  async updateAuthentication(userAuth: UserAuthentication): Promise<ValidationResult> {
    const index = this.authentications.findIndex(a => a.id === userAuth.id);
    if (index === -1) {
      return ValidationResult.failure(new ValidationError('id', 'Authentication not found'));
    }
    this.authentications[index] = userAuth;
    return ValidationResult.success();
  }

  async deleteAuthentication(id: string): Promise<ValidationResult> {
    const index = this.authentications.findIndex(a => a.id === id);
    if (index === -1) {
      return ValidationResult.failure(new ValidationError('id', 'Authentication not found'));
    }
    this.authentications.splice(index, 1);
    return ValidationResult.success();
  }

  async findUserWithAuthentication(): Promise<{ user: User; authentication: UserAuthentication } | null> {
    return null;
  }
}

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockRepository: MockUserRepository;

  beforeEach(() => {
    mockRepository = new MockUserRepository();
    useCase = new DeleteUserUseCase(mockRepository);
  });

  afterEach(() => {
    mockRepository.clear();
  });

  describe('Architecture Compliance', () => {
    test('should implement UseCase interface correctly', () => {
      expect(useCase.isRead()).toBe(false);
      expect(useCase.isPublic()).toBe(false);
      expect(typeof useCase.execute).toBe('function');
    });

    test('should be private (not public) operation', () => {
      expect(useCase.isPublic()).toBe(false);
    });

    test('should be write (not read) operation', () => {
      expect(useCase.isRead()).toBe(false);
    });
  });

  describe('Authentication Requirements', () => {
    test('should throw AuthenticationDomainError when no user in context', async () => {
      const context = new Context(null);
      const command: DeleteUserCommandDto = { userId: '12345678-1234-5678-9012-123456789012' };

      await expect(useCase.execute(context, command)).rejects.toThrow(AuthenticationDomainError);
      await expect(useCase.execute(context, command)).rejects.toThrow('Authentication required');
    });

    test('should throw AuthenticationDomainError when requesting user does not exist', async () => {
      const context = new Context('12345678-1234-5678-9012-123456789012');
      const command: DeleteUserCommandDto = { userId: '87654321-4321-1765-a109-876543210987' };

      await expect(useCase.execute(context, command)).rejects.toThrow(AuthenticationDomainError);
      await expect(useCase.execute(context, command)).rejects.toThrow('Invalid user session');
    });
  });

  describe('Command Validation', () => {
    test('should validate required userId field', async () => {
      const context = new Context('12345678-1234-5678-9012-123456789012');
      const user = User.fromData({
        id: '12345678-1234-5678-9012-123456789012',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isAdmin: false
      });
      mockRepository.addUser(user);

      const invalidCommands = [
        { userId: '' },
        { userId: '   ' },
        { userId: undefined as any },
        { userId: null as any }
      ];

      for (const command of invalidCommands) {
        await expect(useCase.execute(context, command)).rejects.toThrow(ValidationDomainError);
        
        // Check that the error message contains the validation error
        try {
          await useCase.execute(context, command);
        } catch (error: any) {
          expect(error.fieldErrors.some((e: any) => e.message.includes('User ID is required'))).toBe(true);
        }
      }
    });

    test('should validate UUID format', async () => {
      const context = new Context('12345678-1234-5678-9012-123456789012');
      const user = User.fromData({
        id: '12345678-1234-5678-9012-123456789012',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isAdmin: false
      });
      mockRepository.addUser(user);

      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        'user-id-invalid',
        '12345678-1234-1234-1234-12345678901x'
      ];

      for (const invalidUUID of invalidUUIDs) {
        const command: DeleteUserCommandDto = { userId: invalidUUID };
        await expect(useCase.execute(context, command)).rejects.toThrow(ValidationDomainError);
        
        // Check that the error message contains UUID validation error
        try {
          await useCase.execute(context, command);
        } catch (error: any) {
          expect(error.fieldErrors.some((e: any) => e.message.includes('valid UUID'))).toBe(true);
        }
      }
    });
  });

  describe('Authorization Logic', () => {
    test('should allow user to delete their own account', async () => {
      const userId = '12345678-1234-5678-9012-123456789012';
      const context = new Context(userId);
      
      const user = User.fromData({
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isAdmin: false
      });
      mockRepository.addUser(user);

      const auth = new UserAuthentication(
        'auth-id',
        userId,
        'email',
        'test@example.com',
        'hashedPassword',
        true
      );
      mockRepository.addAuthentication(auth);

      const command: DeleteUserCommandDto = { userId };

      const result = await useCase.execute(context, command);

      expect(result.message).toBe('User deleted successfully');
      expect(await mockRepository.findById(userId)).toBeNull();
      expect(await mockRepository.findAuthenticationByUserId(userId)).toHaveLength(0);
    });

    test('should allow admin to delete any user', async () => {
      const adminId = '12345678-1234-5678-9012-123456789012';
      const targetUserId = '87654321-4321-1765-a109-876543210987';
      const context = new Context(adminId);
      
      // Create admin user
      const adminUser = User.fromData({
        id: adminId,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        isAdmin: true
      });
      mockRepository.addUser(adminUser);

      // Create target user
      const targetUser = User.fromData({
        id: targetUserId,
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'User',
        isActive: true,
        isAdmin: false
      });
      mockRepository.addUser(targetUser);

      const auth = new UserAuthentication(
        'auth-id',
        targetUserId,
        'email',
        'target@example.com',
        'hashedPassword',
        true
      );
      mockRepository.addAuthentication(auth);

      const command: DeleteUserCommandDto = { userId: targetUserId };

      const result = await useCase.execute(context, command);

      expect(result.message).toBe('User deleted successfully');
      expect(await mockRepository.findById(targetUserId)).toBeNull();
      expect(await mockRepository.findAuthenticationByUserId(targetUserId)).toHaveLength(0);
    });

    test('should deny non-admin user from deleting other users', async () => {
      const userId = '12345678-1234-5678-9012-123456789012';
      const targetUserId = '87654321-4321-1765-a109-876543210987';
      const context = new Context(userId);
      
      // Create requesting user (not admin)
      const user = User.fromData({
        id: userId,
        email: 'user@example.com',
        firstName: 'Regular',
        lastName: 'User',
        isActive: true,
        isAdmin: false
      });
      mockRepository.addUser(user);

      // Create target user
      const targetUser = User.fromData({
        id: targetUserId,
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'User',
        isActive: true,
        isAdmin: false
      });
      mockRepository.addUser(targetUser);

      const command: DeleteUserCommandDto = { userId: targetUserId };

      await expect(useCase.execute(context, command)).rejects.toThrow(AuthorizationDomainError);
      await expect(useCase.execute(context, command)).rejects.toThrow('You do not have permission to delete this user');
    });
  });

  describe('Target User Validation', () => {
    test('should throw NotFoundDomainError when target user does not exist', async () => {
      const userId = '12345678-1234-5678-9012-123456789012';
      const context = new Context(userId);
      
      const user = User.fromData({
        id: userId,
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        isAdmin: true
      });
      mockRepository.addUser(user);

      const command: DeleteUserCommandDto = { userId: '87654321-4321-1765-a109-876543210987' };

      await expect(useCase.execute(context, command)).rejects.toThrow(NotFoundDomainError);
      await expect(useCase.execute(context, command)).rejects.toThrow('User not found');
    });
  });

  describe('Data Cleanup', () => {
    test('should delete all user authentication records', async () => {
      const userId = '12345678-1234-5678-9012-123456789012';
      const context = new Context(userId);
      
      const user = User.fromData({
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isAdmin: false
      });
      mockRepository.addUser(user);

      // Add multiple authentication records
      const auth1 = new UserAuthentication('auth-1', userId, 'email', 'test@example.com', 'hash1', true);
      const auth2 = new UserAuthentication('auth-2', userId, 'google', 'google-id', null, true);
      mockRepository.addAuthentication(auth1);
      mockRepository.addAuthentication(auth2);

      const command: DeleteUserCommandDto = { userId };

      await useCase.execute(context, command);

      expect(await mockRepository.findAuthenticationByUserId(userId)).toHaveLength(0);
      expect(await mockRepository.findById(userId)).toBeNull();
    });

    test('should handle case where user has no authentication records', async () => {
      const userId = '12345678-1234-5678-9012-123456789012';
      const context = new Context(userId);
      
      const user = User.fromData({
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isAdmin: false
      });
      mockRepository.addUser(user);

      const command: DeleteUserCommandDto = { userId };

      const result = await useCase.execute(context, command);

      expect(result.message).toBe('User deleted successfully');
      expect(await mockRepository.findById(userId)).toBeNull();
    });
  });

  describe('Use Case Response', () => {
    test('should return correct response DTO structure', async () => {
      const userId = '12345678-1234-5678-9012-123456789012';
      const context = new Context(userId);
      
      const user = User.fromData({
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        isAdmin: false
      });
      mockRepository.addUser(user);

      const command: DeleteUserCommandDto = { userId };

      const result = await useCase.execute(context, command);

      expect(result).toEqual({
        message: 'User deleted successfully'
      });
      expect(typeof result.message).toBe('string');
    });
  });
});
