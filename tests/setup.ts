import { Pool } from 'pg';
import { TestUtils } from './testUtils';
import { database } from '../src/data-access/config/database';

// Global test setup
beforeAll(async () => {
  // Set NODE_ENV to test if not already set
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
});

afterAll(async () => {
  // Global cleanup - drop test database and close all connections
  await TestUtils.dropTestDatabase();
  
  // Close the main application database connection as well
  await database.close();
  
  // Give a moment for connections to fully close
  await new Promise(resolve => setTimeout(resolve, 200));
});
