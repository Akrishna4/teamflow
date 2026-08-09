const request = require('supertest');
const createTestApp = require('../helpers/createTestApp');
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createTestUser,
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

describe('Comments API', () => {
  let admin, adminToken, project, task;

  beforeEach(async () => {
    const result = await createAdminUser();
    admin = result.user;
    adminToken = result.token;
    project = await createTestProject(admin._id);
    task = await createTestTask(admin._id, project._id);
  });

  describe('POST /api/v1/tasks/:taskId/comments', () => {
    it('creates a comment on a task', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/comments`)
        .set('Authorization', authHeader(adminToken))
        .send({ content: 'This is a comment', projectId: project._id });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toBe('This is a comment');
    });

    it('rejects empty comment content', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/comments`)
        .set('Authorization', authHeader(adminToken))
        .send({ content: '', projectId: project._id });

      expect(res.status).toBe(400);
    });

    it('rejects comments exceeding max length', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/comments`)
        .set('Authorization', authHeader(adminToken))
        .send({ content: 'x'.repeat(10001), projectId: project._id });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/tasks/:taskId/comments', () => {
    it('returns paginated comments for a task', async () => {
      await request(app)
        .post(`/api/v1/tasks/${task._id}/comments`)
        .set('Authorization', authHeader(adminToken))
        .send({ content: 'Comment 1', projectId: project._id });

      const res = await request(app)
        .get(`/api/v1/tasks/${task._id}/comments`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('PUT /api/v1/comments/:id', () => {
    it('allows the author to edit their comment', async () => {
      const createRes = await request(app)
        .post(`/api/v1/tasks/${task._id}/comments`)
        .set('Authorization', authHeader(adminToken))
        .send({ content: 'Original', projectId: project._id });

      const commentId = createRes.body.data._id;

      const res = await request(app)
        .put(`/api/v1/comments/${commentId}`)
        .set('Authorization', authHeader(adminToken))
        .send({ content: 'Edited', projectId: project._id });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toBe('Edited');
      expect(res.body.data.edited).toBe(true);
    });

    it('prevents non-author from editing a comment', async () => {
      const createRes = await request(app)
        .post(`/api/v1/tasks/${task._id}/comments`)
        .set('Authorization', authHeader(adminToken))
        .send({ content: 'Original', projectId: project._id });

      const commentId = createRes.body.data._id;
      const { token: otherToken } = await createTestUser();

      const res = await request(app)
        .put(`/api/v1/comments/${commentId}`)
        .set('Authorization', authHeader(otherToken))
        .send({ content: 'Hacked', projectId: project._id });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/comments/:id', () => {
    it('allows the author to delete their comment', async () => {
      const createRes = await request(app)
        .post(`/api/v1/tasks/${task._id}/comments`)
        .set('Authorization', authHeader(adminToken))
        .send({ content: 'To delete', projectId: project._id });

      const commentId = createRes.body.data._id;

      const res = await request(app)
        .delete(`/api/v1/comments/${commentId}?projectId=${project._id}`)
        .set('Authorization', authHeader(adminToken));

      expect(res.status).toBe(200);
    });
  });
});
