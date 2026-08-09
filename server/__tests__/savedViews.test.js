const request = require('supertest');
const createTestApp = require('../helpers/createTestApp');
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createTestUser,
  createAdminUser,
  createTestProject,
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

describe('Saved Views API', () => {
  let admin, adminToken, project;

  beforeEach(async () => {
    const result = await createAdminUser();
    admin = result.user;
    adminToken = result.token;
    project = await createTestProject(admin._id);
  });

  describe('POST /api/v1/views', () => {
    it('creates a saved view', async () => {
      const res = await request(app)
        .post('/api/v1/views')
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'High Priority',
          project: project._id,
          filters: { priority: ['High'] },
          sort: '-createdAt',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('High Priority');
    });
  });

  describe('GET /api/v1/views', () => {
    it('returns only views belonging to the requesting user', async () => {
      // Admin creates a view
      await request(app)
        .post('/api/v1/views')
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Admin View', project: project._id, filters: {}, sort: '-createdAt' });

      // Another user should NOT see admin's views
      const { token: otherToken } = await createTestUser({ email: 'other@example.com' });
      const res = await request(app)
        .get(`/api/v1/views?projectId=${project._id}`)
        .set('Authorization', authHeader(otherToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('returns the user\'s own saved views', async () => {
      await request(app)
        .post('/api/v1/views')
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'My View', project: project._id, filters: {}, sort: '-createdAt' });

      const res = await request(app)
        .get(`/api/v1/views?projectId=${project._id}`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('My View');
    });
  });

  describe('PUT /api/v1/views/:id', () => {
    it('updates a saved view\'s name', async () => {
      const createRes = await request(app)
        .post('/api/v1/views')
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Old Name', project: project._id, filters: {}, sort: '-createdAt' });

      const viewId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/v1/views/${viewId}`)
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
    });

    it('prevents another user from editing someone else\'s view', async () => {
      const createRes = await request(app)
        .post('/api/v1/views')
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Admin View', project: project._id, filters: {}, sort: '-createdAt' });

      const viewId = createRes.body.data._id;
      const { token: otherToken } = await createTestUser({ email: 'other@example.com' });

      const res = await request(app)
        .put(`/api/v1/views/${viewId}`)
        .set('Authorization', authHeader(otherToken))
        .send({ name: 'Hacked' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/views/:id', () => {
    it('deletes a saved view', async () => {
      const createRes = await request(app)
        .post('/api/v1/views')
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'To Delete', project: project._id, filters: {}, sort: '-createdAt' });

      const viewId = createRes.body.data._id;

      const res = await request(app)
        .delete(`/api/v1/views/${viewId}`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
    });

    it('prevents deleting another user\'s view', async () => {
      const createRes = await request(app)
        .post('/api/v1/views')
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Admin Only', project: project._id, filters: {}, sort: '-createdAt' });

      const viewId = createRes.body.data._id;
      const { token: otherToken } = await createTestUser({ email: 'other2@example.com' });

      const res = await request(app)
        .delete(`/api/v1/views/${viewId}`)
        .set('Authorization', authHeader(otherToken));

      expect(res.status).toBe(403);
    });
  });
});
