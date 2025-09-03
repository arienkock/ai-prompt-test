import { Pool, PoolClient } from 'pg';
import { User } from '../../domain/entities/User';
import { UserAuthentication } from '../../domain/entities/UserAuthentication';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ValidationResult, ValidationError, PaginationParams, PaginatedResults, PaginationMeta } from '../../shared/types/ValidationTypes';
import { SystemError, ValidationDomainError } from '@/domain/entities/DomainErrors';

export class UserRepository implements IUserRepository {
  private pool: Pool;
  private client: PoolClient | null;

  constructor(pool: Pool, client?: PoolClient) {
    this.pool = pool;
    this.client = client || null;
  }

  /**
   * Get a database client, either from transaction context or from pool
   */
  private async getClient(): Promise<PoolClient> {
    if (this.client) {
      return this.client;
    }
    return await this.pool.connect();
  }

  /**
   * Release a database client if it was obtained from the pool
   */
  private releaseClient(client: PoolClient): void {
    if (!this.client && client) {
      client.release();
    }
  }

  async findById(id: string, opts?: { includeRelations?: string[] }): Promise<User | null> {
    const client = await this.getClient();
    try {
      // Base query
      let query = 'SELECT id, email, "firstName", "lastName", "isActive", "isAdmin", "createdAt", "updatedAt" FROM users WHERE id = $1';
      const params: any[] = [id];
      
      const result = await client.query(query, params);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return this.rowToUser(row);
    } finally {
      this.releaseClient(client);
    }
  }

  private rowToUser(row: any): User {
    return new User(
      row.id,
      row.email,
      row.firstName,
      row.lastName,
      row.isActive,
      row.isAdmin,
      row.createdAt,
      row.updatedAt
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT id, email, "firstName", "lastName", "isActive", "isAdmin", "createdAt", "updatedAt" FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return this.rowToUser(row);
    } finally {
      this.releaseClient(client);
    }
  }

  async create(user: User): Promise<User> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO users (id, email, "firstName", "lastName", "isActive", "isAdmin", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, email, "firstName", "lastName", "isActive", "isAdmin", "createdAt", "updatedAt"`,
        [
          user.id,
          user.email.toLowerCase(),
          user.firstName,
          user.lastName,
          user.isActive,
          user.isAdmin
        ]
      );
      
      const row = result.rows[0];
      return this.rowToUser(row);
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        throw new ValidationDomainError("Database constraint violation", [
          new ValidationError('email', 'Email address already exists')
        ]);
      }
      throw error      
    } finally {
      this.releaseClient(client);
    }
  }

  async update(user: User): Promise<ValidationResult> {
    const validation = user.validate();
    if (!validation.valid) {
      return validation;
    }

    if (!user.hasValidId()) {
      return new ValidationResult(false, [
        new ValidationError('id', 'User ID is required for update')
      ]);
    }

    const client = await this.getClient();
    try {
      const result = await client.query(
        `UPDATE users SET email = $2, "firstName" = $3, "lastName" = $4, "isActive" = $5, "isAdmin" = $6, "updatedAt" = NOW()
         WHERE id = $1`,
        [
          user.id,
          user.email.toLowerCase(),
          user.firstName,
          user.lastName,
          user.isActive,
          user.isAdmin,
        ]
      );
      
      if (result.rowCount === 0) {
        return new ValidationResult(false, [
          new ValidationError('id', 'User not found')
        ]);
      }
      
      return ValidationResult.success();
    } catch (error: any) {
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        return new ValidationResult(false, [
          new ValidationError('email', 'Email address already exists')
        ]);
      }
      
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to update user')
      ]);
    } finally {
      this.releaseClient(client);
    }
  }

  async delete(id: string): Promise<ValidationResult> {
    const client = await this.getClient();
    try {
      // First delete all user authentications (foreign key constraint)
      await client.query('DELETE FROM user_authentications WHERE "userId" = $1', [id]);
      
      // Then delete the user
      const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        return new ValidationResult(false, [
          new ValidationError('id', 'User not found')
        ]);
      }
      
      return ValidationResult.success();
    } catch (error: any) {
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to delete user')
      ]);
    } finally {
      this.releaseClient(client);
    }
  }

  async list(pagination: PaginationParams): Promise<PaginatedResults<User>> {
    const client = await this.getClient();
    try {
      // Get total count of users
      const countResult = await client.query('SELECT COUNT(*) FROM users');
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated data
      const offset = (pagination.page - 1) * pagination.pageSize;
      const result = await client.query(
        'SELECT id, email, "firstName", "lastName", "isActive", "isAdmin", "createdAt", "updatedAt" FROM users ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
        [pagination.pageSize, offset]
      );
      
      const users = result.rows.map(row => this.rowToUser(row));
      const meta = new PaginationMeta(total, pagination.page, pagination.pageSize);
      
      return new PaginatedResults(users, meta);
    } finally {
      this.releaseClient(client);
    }
  }

  async findAuthenticationByUserId(userId: string, provider?: string): Promise<UserAuthentication[]> {
    const client = await this.getClient();
    try {
      let query = 'SELECT id, "userId", provider, "providerId", "hashedPassword", "isActive", "createdAt", "updatedAt" FROM user_authentications WHERE "userId" = $1';
      const params: any[] = [userId];
      
      if (provider) {
        query += ' AND provider = $2';
        params.push(provider);
      }
      
      query += ' ORDER BY "createdAt" DESC';
      
      const result = await client.query(query, params);
      
      return result.rows.map(row => new UserAuthentication(
        row.id,
        row.userId,
        row.provider,
        row.providerId,
        row.hashedPassword,
        row.isActive,
        row.createdAt,
        row.updatedAt
      ));
    } finally {
      this.releaseClient(client);
    }
  }

  async findAuthenticationByProvider(provider: string, providerId: string): Promise<UserAuthentication | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT id, "userId", provider, "providerId", "hashedPassword", "isActive", "createdAt", "updatedAt" FROM user_authentications WHERE provider = $1 AND "providerId" = $2',
        [provider, providerId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new UserAuthentication(
        row.id,
        row.userId,
        row.provider,
        row.providerId,
        row.hashedPassword,
        row.isActive,
        row.createdAt,
        row.updatedAt
      );
    } finally {
      this.releaseClient(client);
    }
  }

  async createAuthentication(userAuth: UserAuthentication): Promise<ValidationResult> {
    const validation = userAuth.validate();
    if (!validation.valid) {
      return validation;
    }

    const client = await this.getClient();
    try {
      const result = await client.query(
        `INSERT INTO user_authentications (id, "userId", provider, "providerId", "hashedPassword", "isActive", "createdAt", "updatedAt") 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
        [
          userAuth.id,
          userAuth.userId,
          userAuth.provider,
          userAuth.providerId,
          userAuth.hashedPassword,
          userAuth.isActive
        ]
      );
      
      return ValidationResult.success();
    } catch (error: any) {
      // Handle foreign key constraint violations
      if (error.code === '23503' && error.constraint === 'user_authentications_userId_fkey') {
        return new ValidationResult(false, [
          new ValidationError('userId', 'User does not exist')
        ]);
      }
      
      // Handle unique constraint violations
      if (error.code === '23505' && error.constraint === 'user_authentications_provider_providerId_unique') {
        return new ValidationResult(false, [
          new ValidationError('provider', 'Authentication already exists for this provider')
        ]);
      }
      
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to create user authentication')
      ]);
    } finally {
      this.releaseClient(client);
    }
  }

  async updateAuthentication(userAuth: UserAuthentication): Promise<ValidationResult> {
    const validation = userAuth.validate();
    if (!validation.valid) {
      return validation;
    }

    if (!userAuth.hasValidId()) {
      return new ValidationResult(false, [
        new ValidationError('id', 'Authentication ID is required for update')
      ]);
    }

    const client = await this.getClient();
    try {
      const result = await client.query(
        `UPDATE user_authentications SET "userId" = $2, provider = $3, "providerId" = $4, "hashedPassword" = $5, "isActive" = $6, "updatedAt" = NOW()
         WHERE id = $1`,
        [
          userAuth.id,
          userAuth.userId,
          userAuth.provider,
          userAuth.providerId,
          userAuth.hashedPassword,
          userAuth.isActive,
        ]
      );
      
      if (result.rowCount === 0) {
        return new ValidationResult(false, [
          new ValidationError('id', 'User authentication not found')
        ]);
      }
      
      return ValidationResult.success();
    } catch (error: any) {
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to update user authentication')
      ]);
    } finally {
      this.releaseClient(client);
    }
  }

  async deleteAuthentication(id: string): Promise<ValidationResult> {
    const client = await this.getClient();
    try {
      const result = await client.query('DELETE FROM user_authentications WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        return new ValidationResult(false, [
          new ValidationError('id', 'User authentication not found')
        ]);
      }
      
      return ValidationResult.success();
    } catch (error: any) {
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to delete user authentication')
      ]);
    } finally {
      this.releaseClient(client);
    }
  }

  async findUserWithAuthentication(email: string, provider: string): Promise<{ user: User; authentication: UserAuthentication } | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT u.id as "user_id", u.email as "user_email", u."firstName" as "user_firstName", u."lastName" as "user_lastName", u."isActive" as "user_isActive", u."isAdmin" as "user_isAdmin", u."createdAt" as "user_createdAt", u."updatedAt" as "user_updatedAt",
         ua.id as "auth_id", ua."userId" as "auth_userId", ua.provider as "auth_provider", ua."providerId" as "auth_providerId", ua."hashedPassword" as "auth_hashedPassword", ua."isActive" as "auth_isActive", ua."createdAt" as "auth_createdAt", ua."updatedAt" as "auth_updatedAt"
         FROM users u 
         JOIN user_authentications ua ON u.id = ua."userId" 
         WHERE u.email = $1 AND ua.provider = $2`,
        [email.toLowerCase(), provider]
      );
      
      if (result.rows.length === 0) {
        console.log(`No user found with email: ${email} and provider: ${provider}`);
        return null;
      }
      
      const row = result.rows[0];
      console.log(`Found user row: ${JSON.stringify(row)}`);
      
      const user = new User(
        row.user_id,
        row.user_email,
        row.user_firstName,
        row.user_lastName,
        row.user_isActive,
        row.user_isAdmin,
        row.user_createdAt,
        row.user_updatedAt
      );
      
      const authentication = new UserAuthentication(
        row.auth_id,
        row.auth_userId,
        row.auth_provider,
        row.auth_providerId,
        row.auth_hashedPassword,
        row.auth_isActive,
        row.auth_createdAt,
        row.auth_updatedAt
      );
      
      console.log(`Created user: ${JSON.stringify(user)}`);
      console.log(`Created authentication: ${JSON.stringify(authentication)}`);
      console.log(`Authentication hashedPassword: ${authentication.hashedPassword}`);
      console.log(`Authentication userId: ${authentication.userId}`);
      console.log(`Authentication providerId: ${authentication.providerId}`);
      
      return { user, authentication };
    } finally {
      this.releaseClient(client);
    }
  }
}
