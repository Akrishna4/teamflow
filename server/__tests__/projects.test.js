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

describe('Projects API', () => {
  describe('GET /api/projects', () => {
    it('returns projects for the authenticated user', async () => {
      const { user, token } = await createTestUser();
      await createTestProject(user._id);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.projects)).toBe(true);
      expect(res.body.projects.length).toBeGreaterThan(0);
    });

    it('returns 401 without authentication', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/projects', () => {
    it('allows Admin to create a project', async () => {
      const { token } = await createAdminUser();

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', authHeader(token))
        .send({ name: 'New Project', description: 'Test description' });

      expect(res.status).toBe(201);
      expect(res.body.project.name).toBe('New Project');
    });

    it('rejects project creation from a Member', async () => {
      const { token } = await createTestUser({ role: 'Member' });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', authHeader(token))
        .send({ name: 'New Project' });

      expect(res.status).toBe(403);
    });

    it('rejects a project without a name', async () => {
      const { token } = await createAdminUser();

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', authHeader(token))
        .send({ description: 'No name' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('allows Admin to update a project', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      const res = await request(app)
        .put(`/api/projects/${project._id}`)
        .set('Authorization', authHeader(token))
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.project.name).toBe('Updated Name');
    });

    it('returns 404 for non-existent project', async () => {
      const { token } = await createAdminUser();

      const res = await request(app)
        .put('/api/projects/000000000000000000000000')
        .set('Authorization', authHeader(token))
        .send({ name: 'X' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('allows Admin to delete a project', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      const res = await request(app)
        .delete(`/api/projects/${project._id}`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
    });

    it('rejects deletion from a Member', async () => {
      const { user: adminUser } = await createAdminUser();
      const { token: memberToken } = await createTestUser();
      const project = await createTestProject(adminUser._id);

      const res = await request(app)
        .delete(`/api/projects/${project._id}`)
        .set('Authorization', authHeader(memberToken));

      expect(res.status).toBe(403);
    });
  });
});
