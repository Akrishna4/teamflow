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

describe('Tasks API', () => {
  describe('GET /api/tasks/project/:projectId', () => {
    it('returns tasks for a project', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      await createTestTask(user._id, project._id);

      const res = await request(app)
        .get(`/api/tasks/project/${project._id}`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBe(1);
    });

    it('applies status filter correctly', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      await createTestTask(user._id, project._id, { status: 'To Do' });
      await createTestTask(user._id, project._id, { status: 'Done' });

      const res = await request(app)
        .get(`/api/tasks/project/${project._id}?status=Done`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.tasks.every(t => t.status === 'Done')).toBe(true);
      expect(res.body.tasks.length).toBe(1);
    });

    it('applies priority filter correctly', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      await createTestTask(user._id, project._id, { priority: 'High' });
      await createTestTask(user._id, project._id, { priority: 'Low' });

      const res = await request(app)
        .get(`/api/tasks/project/${project._id}?priority=High`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.tasks.every(t => t.priority === 'High')).toBe(true);
    });
  });

  describe('POST /api/tasks', () => {
    it('allows Admin to create a task', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', authHeader(token))
        .send({
          title: 'My Task',
          project: project._id,
          status: 'To Do',
          priority: 'Medium',
        });

      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe('My Task');
    });

    it('rejects task creation from a Member', async () => {
      const { user: admin } = await createAdminUser();
      const { token: memberToken } = await createTestUser();
      const project = await createTestProject(admin._id);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', authHeader(memberToken))
        .send({ title: 'Task', project: project._id });

      expect(res.status).toBe(403);
    });

    it('rejects task without a title', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', authHeader(token))
        .send({ project: project._id });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('updates a task successfully', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', authHeader(token))
        .send({ title: 'Updated Title', status: 'In Progress' });

      expect(res.status).toBe(200);
      expect(res.body.task.title).toBe('Updated Title');
      expect(res.body.task.status).toBe('In Progress');
    });

    it('rejects invalid status values', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .put(`/api/tasks/${task._id}`)
        .set('Authorization', authHeader(token))
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes a task and returns 200', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent task', async () => {
      const { token } = await createAdminUser();

      const res = await request(app)
        .delete('/api/tasks/000000000000000000000000')
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(404);
    });
  });
});
