import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

export interface Migration {
  id: string;
  filename: string;
  content: string;
}

export class MigrationRunner {
  private pool: Pool;
  private migrationsPath: string;

  constructor(pool: Pool, migrationsPath: string = path.join(__dirname, '.')) {
    this.pool = pool;
    this.migrationsPath = migrationsPath;
  }

  async initializeMigrationTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } finally {
      client.release();
    }
  }

  async getExecutedMigrations(): Promise<string[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT id FROM migrations ORDER BY id');
      return result.rows.map(row => row.id);
    } finally {
      client.release();
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const executed = await this.getExecutedMigrations();
    const allMigrations = this.loadMigrationFiles();
    
    return allMigrations.filter(migration => !executed.includes(migration.id));
  }

  private loadMigrationFiles(): Migration[] {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const filePath = path.join(this.migrationsPath, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      const id = filename.replace('.sql', '');
      
      return { id, filename, content };
    });
  }

  async executeMigration(migration: Migration): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(migration.content);
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
        [migration.id, migration.filename]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migration executed: ${migration.filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${migration.filename}`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runPendingMigrations(): Promise<void> {
    console.log('🔄 Checking for database migrations...');
    
    await this.initializeMigrationTable();
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('✨ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migration(s)`);
    
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }
    
    console.log('🎉 All migrations completed successfully');
  }

  async rollbackLastMigration(): Promise<void> {
    const executed = await this.getExecutedMigrations();
    if (executed.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigrationId = executed[executed.length - 1];
    const client = await this.pool.connect();
    
    try {
      await client.query('DELETE FROM migrations WHERE id = $1', [lastMigrationId]);
      console.log(`🔄 Rollback recorded for migration: ${lastMigrationId}`);
      console.log('⚠️ Note: SQL rollback must be done manually');
    } finally {
      client.release();
    }
  }
}
