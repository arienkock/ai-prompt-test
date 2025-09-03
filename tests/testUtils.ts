import { PrismaClient } from '@prisma/client';
import { RegisterUserCommandDto } from '../src/domain/types/Dtos';
import { execSync } from 'child_process';

export class TestUtils {
  private static prisma: PrismaClient | null = null;

  static async initializeTestDatabase(): Promise<PrismaClient> {
    if (!this.prisma) {
      // Ensure we're in test environment
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
      
      // First, create the test database if it doesn't exist
      await this.createTestDatabaseIfNotExists();
      
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL_TEST || 'postgresql://postgres:postgres@localhost:5432/postgres_test'
          }
        }
      });
      
      // Run migrations to ensure test database is up to date
      try {
        execSync('npx prisma migrate deploy', { 
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST }
        });
      } catch (error) {
        console.error('Migration failed:', error);
        throw error;
      }
    }
    return this.prisma;
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
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
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
    const prisma = await this.initializeTestDatabase();
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isAdmin }
      });
    } catch (error) {
      console.error(`Error updating isAdmin status for user ${userId}:`, error);
      throw error;
    }
  }

  static async deleteUserByEmail(email: string): Promise<void> {
    const prisma = await this.initializeTestDatabase();
    
    try {
      await prisma.user.delete({
        where: { email }
      });
    } catch (error) {
      console.error('Error deleting test user:', error);
    }
  }

  static async userExists(email: string): Promise<boolean> {
    const prisma = await this.initializeTestDatabase();
    
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      return user !== null;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }

  static async dropTestDatabase(): Promise<void> {
    // Close existing connections first
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
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
