const request = require('supertest');
const createTestApp = require('./helpers/createTestApp');
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createAdminUser,
  createTestUser,
  createTestProject,
  createTestTask,
  authHeader,
} = require('./helpers/testHelpers');

const Label = require('../modules/labels/label.model');

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
  let admin;
  let adminToken;
  let project;
  let task;

  beforeEach(async () => {
    const result = await createAdminUser();

    admin = result.user;
    adminToken = result.token;

    project = await createTestProject(admin._id);
    task = await createTestTask(admin._id, project._id);
  });

  describe('POST /api/v1/projects/:projectId/labels', () => {
    it('creates a label with a valid hex color', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Bug',
          color: '#FF0000',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Bug');
      expect(res.body.data.color).toBe('#ff0000');
    });

    it('rejects label creation from a Member', async () => {
      const { token: memberToken } = await createTestUser({
        role: 'Member',
      });

      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(memberToken))
        .send({
          name: 'Bug',
          color: '#FF0000',
        });

      expect(res.status).toBe(403);
    });

    it('rejects label creation with duplicate name in same project', async () => {
      await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Bug',
          color: '#FF0000',
        });

      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Bug',
          color: '#00FF00',
        });

      expect(res.status).toBe(409);
    });

    it('rejects label with invalid color format', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Feature',
          color: 'notacolor',
        });

      expect(res.status).toBe(400);
    });

    it('rejects empty label name', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: '',
          color: '#FF0000',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/projects/:projectId/labels', () => {
    it('retrieves all labels for a project', async () => {
      await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Bug',
          color: '#FF0000',
        });

      const res = await request(app)
        .get(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Bug');
    });
  });

  describe('PUT /api/v1/labels/:labelId', () => {
    let label;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Bug',
          color: '#FF0000',
        });

      label = res.body.data;
    });

    it('updates label name and color', async () => {
      const res = await request(app)
        .put(`/api/v1/labels/${label._id}`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Critical',
          color: '#00FF00',
          projectId: project._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Critical');
      expect(res.body.data.color).toBe('#00ff00');
    });

    it('allows update with no actual changes', async () => {
      const res = await request(app)
        .put(`/api/v1/labels/${label._id}`)
        .set('Authorization', authHeader(adminToken))
        .send({
          projectId: project._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Bug');
      expect(res.body.data.color).toBe('#ff0000');
    });

    it('rejects update from a Member', async () => {
      const { token: memberToken } = await createTestUser({
        role: 'Member',
      });

      const res = await request(app)
        .put(`/api/v1/labels/${label._id}`)
        .set('Authorization', authHeader(memberToken))
        .send({
          name: 'Updated',
          projectId: project._id,
        });

      expect(res.status).toBe(403);
    });

    it('returns 404 for a non-existent label', async () => {
      const res = await request(app)
        .put('/api/v1/labels/000000000000000000000000')
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Updated',
          projectId: project._id,
        });

      expect(res.status).toBe(404);
    });

    it('rejects duplicate label name during update', async () => {
      await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Feature',
          color: '#00FF00',
        });

      const res = await request(app)
        .put(`/api/v1/labels/${label._id}`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Feature',
          projectId: project._id,
        });

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/v1/labels/:labelId', () => {
    it('deletes a label', async () => {
      const createRes = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Deletable',
          color: '#123456',
        });

      const labelId = createRes.body.data._id;

      const res = await request(app)
        .delete(`/api/v1/labels/${labelId}?projectId=${project._id}`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);

      const deleted = await Label.findById(labelId);
      expect(deleted).toBeNull();
    });

    it('rejects deletion from a Member', async () => {
      const createRes = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Protected',
          color: '#123456',
        });

      const { token: memberToken } = await createTestUser({
        role: 'Member',
      });

      const res = await request(app)
        .delete(
          `/api/v1/labels/${createRes.body.data._id}?projectId=${project._id}`
        )
        .set('Authorization', authHeader(memberToken));

      expect(res.status).toBe(403);
    });

    it('returns 404 for a non-existent label', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/labels/000000000000000000000000?projectId=${project._id}`
        )
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/tasks/:taskId/labels/:labelId', () => {
    let label;

    beforeEach(async () => {
      const createRes = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Bug',
          color: '#FF0000',
        });

      label = createRes.body.data;
    });

    it('assigns a label to a task', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/labels/${label._id}`)
        .set('Authorization', authHeader(adminToken))
        .send({
          projectId: project._id,
        });

      expect(res.status).toBe(200);

      const assignedIds = res.body.data.labels.map((item) =>
        item._id.toString()
      );

      expect(assignedIds).toContain(label._id.toString());
    });

    it('returns 404 for a non-existent label', async () => {
      const res = await request(app)
        .post(
          `/api/v1/tasks/${task._id}/labels/000000000000000000000000`
        )
        .set('Authorization', authHeader(adminToken))
        .send({
          projectId: project._id,
        });

      expect(res.status).toBe(404);
    });

    it('returns 404 for a non-existent task', async () => {
      const res = await request(app)
        .post(
          `/api/v1/tasks/000000000000000000000000/labels/${label._id}`
        )
        .set('Authorization', authHeader(adminToken))
        .send({
          projectId: project._id,
        });

      expect(res.status).toBe(404);
    });

    it('rejects missing projectId', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/labels/${label._id}`)
        .set('Authorization', authHeader(adminToken))
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/tasks/:taskId/labels/:labelId', () => {
    let label;

    beforeEach(async () => {
      const createRes = await request(app)
        .post(`/api/v1/projects/${project._id}/labels`)
        .set('Authorization', authHeader(adminToken))
        .send({
          name: 'Bug',
          color: '#FF0000',
        });

      label = createRes.body.data;

      await request(app)
        .post(`/api/v1/tasks/${task._id}/labels/${label._id}`)
        .set('Authorization', authHeader(adminToken))
        .send({
          projectId: project._id,
        });
    });

    it('removes a label from a task', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/tasks/${task._id}/labels/${label._id}?projectId=${project._id}`
        )
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);

      const assignedIds = res.body.data.labels.map((item) =>
        item._id.toString()
      );

      expect(assignedIds).not.toContain(label._id.toString());
    });

    it('returns 404 for a non-existent task', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/tasks/000000000000000000000000/labels/${label._id}?projectId=${project._id}`
        )
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(404);
    });

    it('rejects missing projectId', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/tasks/${task._id}/labels/${label._id}`
        )
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(400);
    });
  });
});
