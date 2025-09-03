import request from 'supertest';
import app from '../../src/main';
import { TestUtils } from '../testUtils';
import { RegisterUserCommandDto, LoginUserCommandDto } from '../../src/domain/types/Dtos';

describe('Get All Users API Tests', () => {
  let adminUserData: RegisterUserCommandDto;
  let regularUserData: RegisterUserCommandDto;
  let adminAccessToken: string;
  let regularAccessToken: string;

  beforeEach(async () => {
    // Generate unique user data for each test
    adminUserData = TestUtils.generateUniqueUserData();
    regularUserData = TestUtils.generateUniqueUserData();

    // Register admin user
    const adminRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send(adminUserData)
      .expect(201);

    adminAccessToken = adminRegisterResponse.body.accessToken;
    const adminUserId = adminRegisterResponse.body.user.id;

    // Promote user to admin
    await TestUtils.updateUserIsAdmin(adminUserId, true);

    // Register regular user
    const regularRegisterResponse = await request(app)
      .post('/api/auth/register')
      .send(regularUserData)
      .expect(201);

    regularAccessToken = regularRegisterResponse.body.accessToken;
  });

  describe('GET /api/users', () => {
    it('should successfully return paginated users for admin user', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.users)).toBe(true);

      // Verify pagination metadata structure
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('pageSize');
      expect(response.body.meta).toHaveProperty('totalPages');
      expect(response.body.meta).toHaveProperty('hasNext');
      expect(response.body.meta).toHaveProperty('hasPrev');

      // Verify default pagination values
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.pageSize).toBe(20);

      // Verify users are returned (should have at least the 2 test users)
      expect(response.body.users.length).toBeGreaterThanOrEqual(2);

      // Verify user structure
      const user = response.body.users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user).toHaveProperty('isActive');
      expect(user).toHaveProperty('isAdmin');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');

      // Verify types
      expect(typeof user.id).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.firstName).toBe('string');
      expect(typeof user.lastName).toBe('string');
      expect(typeof user.isActive).toBe('boolean');
      expect(typeof user.isAdmin).toBe('boolean');
    });

    it('should return authorization error for non-admin user', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(403);

      // Verify error response
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('admin privileges required');

      // Verify no user data is returned
      expect(response.body).not.toHaveProperty('users');
      expect(response.body).not.toHaveProperty('meta');
    });

    it('should handle pagination parameters correctly', async () => {
      // Test with specific page size
      const pageSize = 1;
      const response = await request(app)
        .get('/api/users')
        .query({ page: 1, pageSize })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // Verify pagination metadata
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.pageSize).toBe(pageSize);
      expect(response.body.users.length).toBeLessThanOrEqual(pageSize);

      // If we have more than 1 user, verify pagination works
      if (response.body.meta.total > 1) {
        expect(response.body.meta.totalPages).toBeGreaterThan(1);
        expect(response.body.meta.hasNext).toBe(true);
        expect(response.body.meta.hasPrev).toBe(false);

        // Test second page
        const page2Response = await request(app)
          .get('/api/users')
          .query({ page: 2, pageSize })
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(page2Response.body.meta.page).toBe(2);
        expect(page2Response.body.meta.pageSize).toBe(pageSize);
        expect(page2Response.body.meta.hasPrev).toBe(true);
        expect(page2Response.body.users.length).toBeLessThanOrEqual(pageSize);

        // Verify different users on different pages
        const firstPageUserId = response.body.users[0].id;
        const secondPageUserId = page2Response.body.users[0].id;
        expect(firstPageUserId).not.toBe(secondPageUserId);
      }
    });

    it('should handle large page size correctly', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ pageSize: 100 })
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.meta.pageSize).toBe(100);
      expect(response.body.users.length).toBeLessThanOrEqual(100);
    });

    it('should return users with correct admin flags', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // Find our test users in the response
      const adminUser = response.body.users.find((user: any) => user.email === adminUserData.email);
      const regularUser = response.body.users.find((user: any) => user.email === regularUserData.email);

      expect(adminUser).toBeDefined();
      expect(regularUser).toBeDefined();

      // Verify admin flags
      expect(adminUser.isAdmin).toBe(true);
      expect(regularUser.isAdmin).toBe(false);

      // Verify both are active
      expect(adminUser.isActive).toBe(true);
      expect(regularUser.isActive).toBe(true);
    });
  });

});
