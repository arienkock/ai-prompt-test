import { TestUtils } from './testUtils';

// Global test setup
beforeAll(async () => {
  // Ensure we're in test environment
  process.env.NODE_ENV = 'test';
  // Initialize test database and run migrations once for all tests
  await TestUtils.initializeTestDatabase();
});

afterAll(async () => {
  // Global cleanup - drop test database and close all connections
  await TestUtils.dropTestDatabase();
  // Give a moment for connections to fully close
  await new Promise(resolve => setTimeout(resolve, 200));
});
