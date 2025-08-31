import { Pool } from 'pg';
import { Database } from '../src/data-access/config/database';
import { MigrationRunner } from '../src/data-access/migrations/MigrationRunner';
import { RegisterUserCommandDto } from '../src/domain/types/Dtos';

export class TestUtils {
  private static database: Database;
  private static pool: Pool;

  static async initializeTestDatabase(): Promise<Pool> {
    if (!this.database) {
      this.database = new Database();
      this.pool = this.database.getPool();
      
      // Run migrations to ensure test database is up to date
      const migrationRunner = new MigrationRunner(this.pool);
      await migrationRunner.runPendingMigrations();
    }
    return this.pool;
  }

  static async closeTestDatabase(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  static generateUniqueUserData(): RegisterUserCommandDto {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return {
      email: `testuser_${timestamp}_${randomSuffix}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      password: 'TestPassword123!'
    };
  }

  static async deleteUserByEmail(email: string): Promise<void> {
    const pool = await this.initializeTestDatabase();
    const client = await pool.connect();
    
    try {
      await client.query('DELETE FROM users WHERE email = $1', [email]);
    } catch (error) {
      console.error('Error deleting test user:', error);
    } finally {
      client.release();
    }
  }

  static async userExists(email: string): Promise<boolean> {
    const pool = await this.initializeTestDatabase();
    const client = await pool.connect();
    
    try {
      const result = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    } finally {
      client.release();
    }
  }

  static async cleanupTestUsers(): Promise<void> {
    const pool = await this.initializeTestDatabase();
    const client = await pool.connect();
    
    try {
      // Delete all test users (those with email containing 'testuser_')
      await client.query('DELETE FROM users WHERE email LIKE $1', ['testuser_%@example.com']);
    } catch (error) {
      console.error('Error cleaning up test users:', error);
    } finally {
      client.release();
    }
  }
}
