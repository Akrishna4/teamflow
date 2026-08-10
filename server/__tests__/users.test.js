const request = require('supertest');
const createTestApp = require('./helpers/createTestApp');

const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createTestUser,
  createAdminUser,
  authHeader,
} = require('./helpers/testHelpers');

let app;

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Users API', () => {
  describe('GET /api/users', () => {
    it('returns all users without exposing passwords', async () => {
      const { token: adminToken } = await createAdminUser();

      await createTestUser({
        name: 'User One',
        email: 'user1@example.com',
      });

      await createTestUser({
        name: 'User Two',
        email: 'user2@example.com',
      });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBe(3);

      res.body.users.forEach((user) => {
        expect(user.password).toBeUndefined();
      });
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/users');

      expect(res.status).toBe(401);
    });
  });
});