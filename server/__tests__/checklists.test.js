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

describe('Checklists API', () => {
  let admin, adminToken, project, task;

  beforeEach(async () => {
    const result = await createAdminUser();
    admin = result.user;
    adminToken = result.token;
    project = await createTestProject(admin._id);
    task = await createTestTask(admin._id, project._id);
  });

  describe('POST /api/v1/tasks/:taskId/checklists', () => {
    it('creates a checklist on a task', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/checklists`)
        .set('Authorization', authHeader(adminToken))
        .send({ title: 'My Checklist', projectId: project._id });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('My Checklist');
    });

    it('rejects checklist without a title', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/checklists`)
        .set('Authorization', authHeader(adminToken))
        .send({ projectId: project._id });

      expect(res.status).toBe(400);
    });
  });

  describe('Checklist Items', () => {
    let checklistId;

    beforeEach(async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/checklists`)
        .set('Authorization', authHeader(adminToken))
        .send({ title: 'My Checklist', projectId: project._id });
      checklistId = res.body.data._id;
    });

    it('adds an item to a checklist', async () => {
      const res = await request(app)
        .post(`/api/v1/checklists/${checklistId}/items`)
        .set('Authorization', authHeader(adminToken))
        .send({ text: 'Item 1', projectId: project._id });

      expect(res.status).toBe(201);
      expect(res.body.data.text).toBe('Item 1');
      expect(res.body.data.completed).toBe(false);
    });

    it('can toggle an item as completed', async () => {
      const createRes = await request(app)
        .post(`/api/v1/checklists/${checklistId}/items`)
        .set('Authorization', authHeader(adminToken))
        .send({ text: 'Item 1', projectId: project._id });

      const itemId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/v1/checklist-items/${itemId}`)
        .set('Authorization', authHeader(adminToken))
        .send({ completed: true, projectId: project._id });

      expect(res.status).toBe(200);
      expect(res.body.data.completed).toBe(true);
    });
  });

  describe('DELETE /api/v1/checklists/:id', () => {
    it('deletes a checklist', async () => {
      const createRes = await request(app)
        .post(`/api/v1/tasks/${task._id}/checklists`)
        .set('Authorization', authHeader(adminToken))
        .send({ title: 'Delete me', projectId: project._id });

      const checklistId = createRes.body.data._id;

      const res = await request(app)
        .delete(`/api/v1/checklists/${checklistId}?projectId=${project._id}`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
    });
  });
});
