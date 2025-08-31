import { Pool } from 'pg';
import { Database } from '../src/data-access/config/database';
import { MigrationRunner } from '../src/data-access/migrations/MigrationRunner';
import { RegisterUserCommandDto } from '../src/domain/types/Dtos';

export class TestUtils {
  private static database: Database | null = null;
  private static pool: Pool | null = null;

  static async initializeTestDatabase(): Promise<Pool> {
    if (!this.database) {
      // Ensure we're in test environment
      process.env.NODE_ENV = 'test';
      
      // First, create the test database if it doesn't exist
      await this.createTestDatabaseIfNotExists();
      
      this.database = new Database();
      this.pool = this.database.getPool();
      
      // Run migrations to ensure test database is up to date
      const migrationRunner = new MigrationRunner(this.pool);
      await migrationRunner.runPendingMigrations();
    }
    return this.pool!;
  }

  private static async createTestDatabaseIfNotExists(): Promise<void> {
    const { Pool } = require('pg');
    
    // Create a temporary connection to the default postgres database
    const tempPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'postgres', // Connect to default postgres database
      user: 'postgres',
      password: 'postgres',
      max: 1,
    });

    try {
      const client = await tempPool.connect();
      try {
        // Check if test database exists
        const result = await client.query(
          "SELECT 1 FROM pg_database WHERE datname = 'postgres_test'"
        );
        
        if (result.rows.length === 0) {
          // Create test database if it doesn't exist
          await client.query('CREATE DATABASE postgres_test');
          console.log('✅ Created test database: postgres_test');
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating test database:', error);
      throw error;
    } finally {
      await tempPool.end();
    }
  }

  static async closeTestDatabase(): Promise<void> {
    if (this.database) {
      await this.database.close();
      this.database = null;
      this.pool = null;
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

  static async updateUserIsAdmin(userId: string, isAdmin: boolean): Promise<void> {
    const pool = await this.initializeTestDatabase();
    const client = await pool.connect();
    try {
      await client.query('UPDATE users SET "isAdmin" = $1 WHERE id = $2', [isAdmin, userId]);
    } catch (error) {
      console.error(`Error updating isAdmin status for user ${userId}:`, error);
      throw error;
    } finally {
      client.release();
    }
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

  static async dropTestDatabase(): Promise<void> {
    // Close existing connections first
    if (this.database) {
      await this.database.close();
      this.database = null;
      this.pool = null;
    }

    const { Pool } = require('pg');
    
    // Create a temporary connection to the default postgres database
    const tempPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'postgres', // Connect to default postgres database
      user: 'postgres',
      password: 'postgres',
      max: 1,
    });

    try {
      const client = await tempPool.connect();
      try {
        // Terminate all connections to the test database
        await client.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = 'postgres_test' AND pid <> pg_backend_pid()
        `);
        
        // Drop the test database
        await client.query('DROP DATABASE IF EXISTS postgres_test');
        console.log('🗑️ Dropped test database: postgres_test');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error dropping test database:', error);
    } finally {
      await tempPool.end();
    }
  }
}
