const request = require('supertest');
const createTestApp = require('../helpers/createTestApp');
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createTestUser,
  authHeader,
} = require('../helpers/testHelpers');

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

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({ name: 'Alice', email: 'alice@example.com' });
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('rejects registration with a duplicate email', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Password123!',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Alice 2',
        email: 'alice@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(400);
    });

    it('rejects registration with missing fields', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'noname@example.com',
      });
      expect(res.status).toBe(400);
    });

    it('rejects a weak password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bob',
        email: 'bob@example.com',
        password: '123',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'Password123!',
      });
    });

    it('logs in with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'alice@example.com',
        password: 'Password123!',
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('rejects incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'alice@example.com',
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
    });

    it('rejects unknown email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'unknown@example.com',
        password: 'Password123!',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC — protect middleware', () => {
    it('rejects requests without a token', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });

    it('rejects requests with an invalid token', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });

    it('allows access with a valid token', async () => {
      const { token } = await createTestUser();
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', authHeader(token));
      expect(res.status).toBe(200);
    });
  });
});
