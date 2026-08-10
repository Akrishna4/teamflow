const request = require('supertest');
const createTestApp = require('./helpers/createTestApp');
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createAdminUser,
  createTestProject,
  createTestTask,
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
        .send({ title: 'Item 1', projectId: project._id });

      expect(res.status).toBe(201);
      expect(res.body.data.item.title).toBe('Item 1');
      expect(res.body.data.item.completed).toBe(false);
    });

    it('can toggle an item as completed', async () => {
      const createRes = await request(app)
        .post(`/api/v1/checklists/${checklistId}/items`)
        .set('Authorization', authHeader(adminToken))
        .send({ title: 'Item 1', projectId: project._id });

      const itemId = createRes.body.data.item._id;

      const res = await request(app)
        .put(`/api/v1/checklist-items/${itemId}`)
        .set('Authorization', authHeader(adminToken))
        .send({ completed: true, projectId: project._id });

      expect(res.status).toBe(200);
      expect(res.body.data.items[0].completed).toBe(true);
    });
  });

  describe('GET /api/v1/tasks/:taskId/checklists', () => {
    it('returns checklists for a task with progress information', async () => {
      const createRes = await request(app)
        .post(`/api/v1/tasks/${task._id}/checklists`)
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'Progress Checklist',
          projectId: project._id,
        });

      const checklistId = createRes.body.data._id;

      await request(app)
        .post(`/api/v1/checklists/${checklistId}/items`)
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'Item 1',
          projectId: project._id,
        });

      const res = await request(app)
        .get(`/api/v1/tasks/${task._id}/checklists`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Progress Checklist');
      expect(res.body.data[0].items).toHaveLength(1);
      expect(res.body.data[0].progress).toBe(0);
      expect(res.body.data[0].total).toBe(1);
      expect(res.body.data[0].done).toBe(0);
    });
  });

  describe('PUT /api/v1/checklists/:id', () => {
    it('updates a checklist title', async () => {
      const createRes = await request(app)
        .post(`/api/v1/tasks/${task._id}/checklists`)
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'Old Title',
          projectId: project._id,
        });

      const checklistId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/v1/checklists/${checklistId}`)
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'Updated Title',
          projectId: project._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('returns 404 for a non-existent checklist', async () => {
      const res = await request(app)
        .put('/api/v1/checklists/000000000000000000000000')
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'Updated',
          projectId: project._id,
        });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/checklist-items/:id', () => {
    it('deletes a checklist item', async () => {
      const checklistRes = await request(app)
        .post(`/api/v1/tasks/${task._id}/checklists`)
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'Delete Item Checklist',
          projectId: project._id,
        });

      const checklistId = checklistRes.body.data._id;

      const itemRes = await request(app)
        .post(`/api/v1/checklists/${checklistId}/items`)
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'Item to delete',
          projectId: project._id,
        });

      const itemId = itemRes.body.data.item._id;

      const res = await request(app)
        .delete(`/api/v1/checklist-items/${itemId}?projectId=${project._id}`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
    });

    it('returns 404 for a non-existent checklist item', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/checklist-items/000000000000000000000000?projectId=${project._id}`
        )
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/v1/checklists/:checklistId/reorder', () => {
    it('reorders checklist items', async () => {
      const checklistRes = await request(app)
        .post(`/api/v1/tasks/${task._id}/checklists`)
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'Reorder Checklist',
          projectId: project._id,
        });

      const checklistId = checklistRes.body.data._id;

      const firstRes = await request(app)
        .post(`/api/v1/checklists/${checklistId}/items`)
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'First',
          projectId: project._id,
        });

      const secondRes = await request(app)
        .post(`/api/v1/checklists/${checklistId}/items`)
        .set('Authorization', authHeader(adminToken))
        .send({
          title: 'Second',
          projectId: project._id,
        });

      const firstId = firstRes.body.data.item._id;
      const secondId = secondRes.body.data.item._id;

      const res = await request(app)
        .put(`/api/v1/checklists/${checklistId}/reorder`)
        .set('Authorization', authHeader(adminToken))
        .send({
          orderedIds: [secondId, firstId],
          projectId: project._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.items[0].title).toBe('Second');
      expect(res.body.data.items[1].title).toBe('First');
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
