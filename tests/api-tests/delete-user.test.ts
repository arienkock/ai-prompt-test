import request from 'supertest';
import app from '../../src/main';
import { TestUtils } from '../testUtils';
import { RegisterUserCommandDto, LoginUserCommandDto } from '../../src/domain/types/Dtos';

describe('DELETE /api/auth/users/:userId', () => {
  let testUserData: RegisterUserCommandDto;
  let adminUserData: RegisterUserCommandDto;
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    // Generate unique user data for each test
    testUserData = TestUtils.generateUniqueUserData();
    adminUserData = TestUtils.generateUniqueUserData();

    // Create a regular user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUserData)
      .expect(201);

    userId = registerResponse.body.user.id;

    // Login the regular user to get a token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: testUserData.email, password: testUserData.password })
      .expect(200);

    userToken = loginResponse.body.accessToken;

    // Create a regular user for admin (will be promoted)
    const adminRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send(adminUserData)
      .expect(201);
    
    const adminUserId = adminRegisterResponse.body.user.id;

    // Elevate the regular user to admin using SQL update statement
    await TestUtils.updateUserIsAdmin(adminUserId, true);

    // Login the admin user to get a token
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUserData.email, password: adminUserData.password })
      .expect(200);

    adminToken = adminLoginResponse.body.accessToken;
  });

  afterEach(async () => {
    // Clean up users after each test
    await TestUtils.deleteUserByEmail(testUserData.email);
    await TestUtils.deleteUserByEmail(adminUserData.email);
  });

  it('should return 401 when no authorization token is provided', async () => {
    await request(app)
      .delete(`/api/auth/users/${userId}`)
      .expect(401);
  });

  it('should allow user to delete their own account', async () => {
    const response = await request(app)
      .delete(`/api/auth/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.message).toBe('User deleted successfully');

    // Verify user is actually deleted from database
    const userExists = await TestUtils.userExists(testUserData.email);
    expect(userExists).toBe(false);
  });

  it('should allow admin to delete any user', async () => {
    const response = await request(app)
      .delete(`/api/auth/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.message).toBe('User deleted successfully');

    // Verify user is actually deleted from database
    const userExists = await TestUtils.userExists(testUserData.email);
    expect(userExists).toBe(false);
  });

  it('should deny non-admin user from deleting other users', async () => {
    // Create another regular user
    const otherUserData = TestUtils.generateUniqueUserData();
    const otherRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send(otherUserData)
      .expect(201);

    const otherUserId = otherRegisterResponse.body.user.id;

    await request(app)
      .delete(`/api/auth/users/${otherUserId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    // Verify user is NOT deleted from database
    const userExists = await TestUtils.userExists(otherUserData.email);
    expect(userExists).toBe(true);

    // Clean up the other user
    await TestUtils.deleteUserByEmail(otherUserData.email);
  });

  it('should return 400 for invalid UUID format in userId parameter', async () => {
    await request(app)
      .delete('/api/auth/users/invalid-uuid')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(400);
  });

  it('should return 404 for non-existent user ID', async () => {
    await request(app)
      .delete('/api/auth/users/12345678-1234-5678-9012-123456789012')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
