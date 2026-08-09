const request = require('supertest');
const createTestApp = require('../helpers/createTestApp');
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createAdminUser,
  createTestProject,
  createTestTask,
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

describe('Labels API', () => {
  let admin, adminToken, project;

  beforeEach(async () => {
    const result = await createAdminUser();
    admin = result.user;
    adminToken = result.token;
    project = await createTestProject(admin._id);
  });

  describe('POST /api/v1/projects/:projectId/labels', () => {
    it('creates a label with a valid hex color', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Bug', color: '#FF0000' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Bug');
      expect(res.body.data.color).toBe('#ff0000'); // normalized to lowercase
    });

    it('rejects label creation with duplicate name in same project', async () => {
      await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Bug', color: '#FF0000' });

      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Bug', color: '#00FF00' });

      expect(res.status).toBe(409);
    });

    it('rejects label with invalid color format', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Feature', color: 'notacolor' });

      expect(res.status).toBe(400);
    });

    it('rejects empty label name', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({ name: '', color: '#FF0000' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/projects/:projectId/labels', () => {
    it('retrieves all labels for a project', async () => {
      await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Bug', color: '#FF0000' });

      const res = await request(app)
        .get(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('Bug');
    });
  });

  describe('DELETE /api/v1/labels/:id', () => {
    it('deletes a label', async () => {
      const createRes = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({ name: 'Deletable', color: '#123456' });

      const labelId = createRes.body.data._id;

      const res = await request(app)
        .delete(`/api/v1/labels/${labelId}?projectId=${project._id}`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
    });
  });
});
