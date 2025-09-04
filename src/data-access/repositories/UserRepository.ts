import { PrismaClient } from '@prisma/client';
import { User } from '../../domain/entities/User';
import { UserAuthentication } from '../../domain/entities/UserAuthentication';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ValidationResult, ValidationError } from '../../domain/types/ValidationTypes';
import { PaginatedResults, PaginationParams, PaginationMeta } from '../../domain/types/Dtos';
import { ValidationDomainError, SystemError } from '../../domain/entities/DomainErrors';

export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string, opts?: { includeRelations?: string[] }): Promise<User | null> {
    const includeAuth = opts?.includeRelations?.includes('authentications');
    
    const userData = await this.prisma.user.findUnique({
      where: { id },
      include: {
        authentications: includeAuth || false
      }
    });

    if (!userData) return null;

    return User.fromData({
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isActive: userData.isActive,
      isAdmin: userData.isAdmin,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const userData = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!userData) return null;

    return User.fromData({
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isActive: userData.isActive,
      isAdmin: userData.isAdmin,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    });
  }

  async create(user: User): Promise<User> {
    const userData = await this.prisma.user.create({
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isAdmin: user.isAdmin
      }
    });

    return User.fromData({
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isActive: userData.isActive,
      isAdmin: userData.isAdmin,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    });
  }

  async update(user: User): Promise<User | null> {
    try {
      if (!user.id) {
        throw new ValidationDomainError('User ID is required for update', [
          new ValidationError('id', 'User ID is required for update')
        ]);
      }

      const userData = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          isAdmin: user.isAdmin
        }
      });

      return User.fromData({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isActive: userData.isActive,
        isAdmin: userData.isAdmin,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      });
    } catch (error: any) {
      if (error.code === 'P2002') { // Unique constraint violation
        throw new ValidationDomainError('Email already exists', [
          new ValidationError('email', 'Email already exists')
        ]);
      }
      if (error.code === 'P2025') { // Record not found
        return null;
      }
      throw new SystemError('Unexpected database error during user update');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id }
      });
    } catch (error: any) {
      if (error.code === 'P2025') { // Record not found
        return; // Silently succeed if record not found
      }
      throw new SystemError('Unexpected database error during user deletion');
    }
  }

  async findMany(pagination: PaginationParams): Promise<PaginatedResults<User>> {
    const skip = (pagination.page - 1) * pagination.pageSize;
    
    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pagination.pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count()
    ]);

    const userEntities = users.map((userData: any) => User.fromData({
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isActive: userData.isActive,
      isAdmin: userData.isAdmin,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    }));

    const meta = new PaginationMeta(
      totalCount,
      pagination.page,
      pagination.pageSize
    );

    return new PaginatedResults(userEntities, meta);
  }

  // User authentication operations
  async findAuthenticationByUserId(userId: string, provider?: string): Promise<UserAuthentication[]> {
    const whereClause: any = { userId };
    if (provider) {
      whereClause.provider = provider;
    }

    const authData = await this.prisma.userAuthentication.findMany({
      where: whereClause
    });

    return authData.map((auth: any) => UserAuthentication.fromData({
      id: auth.id,
      userId: auth.userId,
      provider: auth.provider,
      providerId: auth.providerId,
      hashedPassword: auth.hashedPassword,
      isActive: auth.isActive,
      createdAt: auth.createdAt,
      updatedAt: auth.updatedAt
    }));
  }

  async findAuthenticationByProvider(provider: string, providerId: string): Promise<UserAuthentication | null> {
    const authData = await this.prisma.userAuthentication.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId
        }
      }
    });

    if (!authData) return null;

    return UserAuthentication.fromData({
      id: authData.id,
      userId: authData.userId,
      provider: authData.provider,
      providerId: authData.providerId,
      hashedPassword: authData.hashedPassword,
      isActive: authData.isActive,
      createdAt: authData.createdAt,
      updatedAt: authData.updatedAt
    });
  }

  async createAuthentication(userAuth: UserAuthentication): Promise<void> {
    try {
      await this.prisma.userAuthentication.create({
        data: {
          userId: userAuth.userId,
          provider: userAuth.provider,
          providerId: userAuth.providerId,
          hashedPassword: userAuth.hashedPassword || null,
          isActive: userAuth.isActive
        }
      });
    } catch (error: any) {
      if (error.code === 'P2002') { // Unique constraint violation
        throw new ValidationDomainError('Authentication with this provider already exists', [
          new ValidationError('provider', 'Authentication with this provider already exists')
        ]);
      }
      if (error.code === 'P2003') { // Foreign key constraint violation
        throw new ValidationDomainError('User does not exist', [
          new ValidationError('userId', 'User does not exist')
        ]);
      }
      throw new SystemError('Unexpected database error during authentication creation');
    }
  }

  async updateAuthentication(userAuth: UserAuthentication): Promise<UserAuthentication | null> {
    try {
      if (!userAuth.id) {
        throw new ValidationDomainError('Authentication ID is required for update', [
          new ValidationError('id', 'Authentication ID is required for update')
        ]);
      }

      const authData = await this.prisma.userAuthentication.update({
        where: { id: userAuth.id },
        data: {
          provider: userAuth.provider,
          providerId: userAuth.providerId,
          hashedPassword: userAuth.hashedPassword || null,
          isActive: userAuth.isActive
        }
      });

      return UserAuthentication.fromData({
        id: authData.id,
        userId: authData.userId,
        provider: authData.provider,
        providerId: authData.providerId,
        hashedPassword: authData.hashedPassword,
        isActive: authData.isActive,
        createdAt: authData.createdAt,
        updatedAt: authData.updatedAt
      });
    } catch (error: any) {
      if (error.code === 'P2002') { // Unique constraint violation
        throw new ValidationDomainError('Authentication with this provider already exists', [
          new ValidationError('provider', 'Authentication with this provider already exists')
        ]);
      }
      if (error.code === 'P2025') { // Record not found
        return null;
      }
      throw new SystemError('Unexpected database error during authentication update');
    }
  }

  async deleteAuthentication(id: string): Promise<void> {
    try {
      await this.prisma.userAuthentication.delete({
        where: { id }
      });
    } catch (error: any) {
      if (error.code === 'P2025') { // Record not found
        return; // Silently succeed if record not found
      }
      throw new SystemError('Unexpected database error during authentication deletion');
    }
  }

  async findUserWithAuthentication(email: string, provider: string): Promise<{ user: User; authentication: UserAuthentication } | null> {
    const authData = await this.prisma.userAuthentication.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId: email.toLowerCase()
        }
      },
      include: {
        user: true
      }
    });

    if (!authData || !authData.user) return null;

    const user = User.fromData({
      id: authData.user.id,
      email: authData.user.email,
      firstName: authData.user.firstName,
      lastName: authData.user.lastName,
      isActive: authData.user.isActive,
      isAdmin: authData.user.isAdmin,
      createdAt: authData.user.createdAt,
      updatedAt: authData.user.updatedAt
    });

    const authentication = UserAuthentication.fromData({
      id: authData.id,
      userId: authData.userId,
      provider: authData.provider,
      providerId: authData.providerId,
      hashedPassword: authData.hashedPassword,
      isActive: authData.isActive,
      createdAt: authData.createdAt,
      updatedAt: authData.updatedAt
    });

    return { user, authentication };
  }
}
