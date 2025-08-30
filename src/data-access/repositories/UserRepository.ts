import { Pool, PoolClient } from 'pg';
import { User } from '../../domain/entities/User';
import { UserAuthentication } from '../../domain/entities/UserAuthentication';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ValidationResult, ValidationError } from '../../shared/types/ValidationTypes';

export class UserRepository implements IUserRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async findById(id: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new User(
        row.id,
        row.email,
        row.first_name,
        row.last_name,
        row.is_active,
        row.created_at,
        row.updated_at
      );
    } finally {
      client.release();
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new User(
        row.id,
        row.email,
        row.first_name,
        row.last_name,
        row.is_active,
        row.created_at,
        row.updated_at
      );
    } finally {
      client.release();
    }
  }

  async create(user: User): Promise<ValidationResult> {
    const validation = user.validate();
    if (!validation.valid) {
      return validation;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `INSERT INTO users (id, email, first_name, last_name, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          user.id,
          user.email.toLowerCase(),
          user.firstName,
          user.lastName,
          user.isActive,
          new Date(),
          new Date()
        ]
      );
      
      await client.query('COMMIT');
      return ValidationResult.success();
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Handle unique constraint violations
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        return new ValidationResult(false, [
          new ValidationError('email', 'Email address already exists')
        ]);
      }
      
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to create user')
      ]);
    } finally {
      client.release();
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

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `UPDATE users SET email = $2, first_name = $3, last_name = $4, is_active = $5, updated_at = $6 
         WHERE id = $1`,
        [
          user.id,
          user.email.toLowerCase(),
          user.firstName,
          user.lastName,
          user.isActive,
          new Date()
        ]
      );
      
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return new ValidationResult(false, [
          new ValidationError('id', 'User not found')
        ]);
      }
      
      await client.query('COMMIT');
      return ValidationResult.success();
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        return new ValidationResult(false, [
          new ValidationError('email', 'Email address already exists')
        ]);
      }
      
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to update user')
      ]);
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<ValidationResult> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // First delete all user authentications (foreign key constraint)
      await client.query('DELETE FROM user_authentications WHERE user_id = $1', [id]);
      
      // Then delete the user
      const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return new ValidationResult(false, [
          new ValidationError('id', 'User not found')
        ]);
      }
      
      await client.query('COMMIT');
      return ValidationResult.success();
    } catch (error: any) {
      await client.query('ROLLBACK');
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to delete user')
      ]);
    } finally {
      client.release();
    }
  }

  async list(limit: number = 50, offset: number = 0): Promise<User[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      return result.rows.map(row => new User(
        row.id,
        row.email,
        row.first_name,
        row.last_name,
        row.is_active,
        row.created_at,
        row.updated_at
      ));
    } finally {
      client.release();
    }
  }

  async findAuthenticationByUserId(userId: string, provider?: string): Promise<UserAuthentication[]> {
    const client = await this.pool.connect();
    try {
      let query = 'SELECT * FROM user_authentications WHERE user_id = $1';
      const params: any[] = [userId];
      
      if (provider) {
        query += ' AND provider = $2';
        params.push(provider);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await client.query(query, params);
      
      return result.rows.map(row => new UserAuthentication(
        row.id,
        row.user_id,
        row.provider,
        row.provider_id,
        row.hashed_password,
        row.created_at,
        row.updated_at
      ));
    } finally {
      client.release();
    }
  }

  async findAuthenticationByProvider(provider: string, providerId: string): Promise<UserAuthentication | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM user_authentications WHERE provider = $1 AND provider_id = $2',
        [provider, providerId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return new UserAuthentication(
        row.id,
        row.user_id,
        row.provider,
        row.provider_id,
        row.hashed_password,
        row.created_at,
        row.updated_at
      );
    } finally {
      client.release();
    }
  }

  async createAuthentication(userAuth: UserAuthentication): Promise<ValidationResult> {
    const validation = userAuth.validate();
    if (!validation.valid) {
      return validation;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `INSERT INTO user_authentications (id, user_id, provider, provider_id, hashed_password, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          userAuth.id,
          userAuth.userId,
          userAuth.provider,
          userAuth.providerId,
          userAuth.hashedPassword,
          new Date(),
          new Date()
        ]
      );
      
      await client.query('COMMIT');
      return ValidationResult.success();
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Handle foreign key constraint violations
      if (error.code === '23503' && error.constraint === 'user_authentications_user_id_fkey') {
        return new ValidationResult(false, [
          new ValidationError('userId', 'User does not exist')
        ]);
      }
      
      // Handle unique constraint violations
      if (error.code === '23505' && error.constraint === 'user_authentications_provider_provider_id_unique') {
        return new ValidationResult(false, [
          new ValidationError('provider', 'Authentication already exists for this provider')
        ]);
      }
      
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to create user authentication')
      ]);
    } finally {
      client.release();
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

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        `UPDATE user_authentications SET user_id = $2, provider = $3, provider_id = $4, hashed_password = $5, updated_at = $6 
         WHERE id = $1`,
        [
          userAuth.id,
          userAuth.userId,
          userAuth.provider,
          userAuth.providerId,
          userAuth.hashedPassword,
          new Date()
        ]
      );
      
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return new ValidationResult(false, [
          new ValidationError('id', 'User authentication not found')
        ]);
      }
      
      await client.query('COMMIT');
      return ValidationResult.success();
    } catch (error: any) {
      await client.query('ROLLBACK');
      return new ValidationResult(false, [
        new ValidationError('database', 'Failed to update user authentication')
      ]);
    } finally {
      client.release();
    }
  }

  async deleteAuthentication(id: string): Promise<ValidationResult> {
    const client = await this.pool.connect();
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
      client.release();
    }
  }

  async findUserWithAuthentication(email: string, provider: string): Promise<{ user: User; authentication: UserAuthentication } | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT u.*, ua.* 
         FROM users u 
         JOIN user_authentications ua ON u.id = ua.user_id 
         WHERE u.email = $1 AND ua.provider = $2`,
        [email.toLowerCase(), provider]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      const user = new User(
        row.id,
        row.email,
        row.first_name,
        row.last_name,
        row.is_active,
        row.created_at,
        row.updated_at
      );
      
      const authentication = new UserAuthentication(
        row.id,
        row.user_id,
        row.provider,
        row.provider_id,
        row.hashed_password,
        row.created_at,
        row.updated_at
      );
      
      return { user, authentication };
    } finally {
      client.release();
    }
  }
}
