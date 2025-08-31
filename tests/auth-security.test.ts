import request from 'supertest';
import app from '../src/main';
import { TestUtils } from './testUtils';
import { RegisterUserCommandDto, LoginUserCommandDto } from '../src/domain/types/Dtos';

describe('Authentication Security Tests', () => {
  let testUserData: RegisterUserCommandDto;

  beforeAll(async () => {
    // Ensure we're in test environment
    process.env.NODE_ENV = 'test';
    
    // Initialize test database (creates fresh database)
    await TestUtils.initializeTestDatabase();
  });

  afterAll(async () => {
    // Drop the entire test database for complete cleanup
    await TestUtils.dropTestDatabase();
    
    // Note: Database connection cleanup is handled in global setup
    // to avoid issues with multiple test files
  });

  beforeEach(() => {
    // Generate unique user data for each test
    testUserData = TestUtils.generateUniqueUserData();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user with valid data (happy path)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUserData)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Verify user data in response
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUserData.email);
      expect(response.body.user.firstName).toBe(testUserData.firstName);
      expect(response.body.user.lastName).toBe(testUserData.lastName);
      expect(response.body.user.isActive).toBe(true);

      // Verify tokens are strings
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);
      expect(response.body.refreshToken.length).toBeGreaterThan(0);

      // Verify user was actually created in database
      const userExists = await TestUtils.userExists(testUserData.email);
      expect(userExists).toBe(true);
    });

    it('should return error when attempting to register duplicate user', async () => {
      // First registration - should succeed
      await request(app)
        .post('/api/auth/register')
        .send(testUserData)
        .expect(201);

      // Second registration with same email - should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUserData)
        .expect(409);

      // Verify error response
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
      
      // Verify only one user exists in database
      const userExists = await TestUtils.userExists(testUserData.email);
      expect(userExists).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUserData)
        .expect(201);
    });

    it('should successfully login with valid credentials (happy path)', async () => {
      const loginData: LoginUserCommandDto = {
        email: testUserData.email,
        password: testUserData.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Verify user data in response
      expect(response.body.user.email).toBe(testUserData.email);
      expect(response.body.user.firstName).toBe(testUserData.firstName);
      expect(response.body.user.lastName).toBe(testUserData.lastName);

      // Verify tokens are present
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);
      expect(response.body.refreshToken.length).toBeGreaterThan(0);
    });

    it('should return error when login with incorrect password', async () => {
      const loginData: LoginUserCommandDto = {
        email: testUserData.email,
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      // Verify error response
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid|credentials|password/i);

      // Verify no tokens are returned
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
    });

    it('should return error when login with non-existent email', async () => {
      const loginData: LoginUserCommandDto = {
        email: 'nonexistent@example.com',
        password: testUserData.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      // Verify error response
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid|credentials|user|found/i);

      // Verify no tokens are returned
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
    });
  });
});
