const request = require('supertest');
const createTestApp = require('./helpers/createTestApp');
const {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createTestUser,
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

      describe('Task service edge cases and filters', () => {
      it('applies multiple project filters correctly', async () => {
        const { user, token } = await createAdminUser();
        const project = await createTestProject(user._id);

        await createTestTask(user._id, project._id, {
          status: 'Done',
          priority: 'High',
        });

        await createTestTask(user._id, project._id, {
          status: 'To Do',
          priority: 'Low',
        });

        const res = await request(app)
          .get(
            `/api/tasks/project/${project._id}?status=Done&priority=High`
          )
          .set('Authorization', authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.tasks.length).toBe(1);
        expect(res.body.tasks[0].status).toBe('Done');
        expect(res.body.tasks[0].priority).toBe('High');
      });

      it('filters tasks by due date', async () => {
        const { user, token } = await createAdminUser();
        const project = await createTestProject(user._id);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        await createTestTask(user._id, project._id, {
          title: 'Overdue Task',
          dueDate: yesterday,
        });

        await createTestTask(user._id, project._id, {
          title: 'Upcoming Task',
          dueDate: tomorrow,
        });

        const overdueRes = await request(app)
          .get(`/api/tasks/project/${project._id}?dueDate=overdue`)
          .set('Authorization', authHeader(token));

        expect(overdueRes.status).toBe(200);
        expect(
          overdueRes.body.tasks.some(t => t.title === 'Overdue Task')
        ).toBe(true);

        const upcomingRes = await request(app)
          .get(`/api/tasks/project/${project._id}?dueDate=upcoming`)
          .set('Authorization', authHeader(token));

        expect(upcomingRes.status).toBe(200);
        expect(
          upcomingRes.body.tasks.some(t => t.title === 'Upcoming Task')
        ).toBe(true);
      });

      it('filters tasks due today', async () => {
        const { user, token } = await createAdminUser();
        const project = await createTestProject(user._id);

        const today = new Date();
        today.setHours(12, 0, 0, 0);

        await createTestTask(user._id, project._id, {
          title: 'Today Task',
          dueDate: today,
        });

        const res = await request(app)
          .get(`/api/tasks/project/${project._id}?dueDate=today`)
          .set('Authorization', authHeader(token));

        expect(res.status).toBe(200);
        expect(
          res.body.tasks.some(t => t.title === 'Today Task')
        ).toBe(true);
      });

      it('supports different task sort options', async () => {
        const { user, token } = await createAdminUser();
        const project = await createTestProject(user._id);

        await createTestTask(user._id, project._id, {
          title: 'Low Priority',
          priority: 'Low',
        });

        await createTestTask(user._id, project._id, {
          title: 'High Priority',
          priority: 'High',
        });

        const res = await request(app)
          .get(
            `/api/tasks/project/${project._id}?sort=priority_desc`
          )
          .set('Authorization', authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.tasks.length).toBe(2);
      });
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

  describe('Additional Task Controller Coverage', () => {
    it('returns all tasks for authenticated user', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      await createTestTask(user._id, project._id);

      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);
    });

    it('returns tasks assigned to the current user', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      await createTestTask(user._id, project._id, {
        assignedTo: [user._id],
      });

      const res = await request(app)
        .get('/api/tasks/my-tasks')
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });

    it('returns a single task by id', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .get(`/api/tasks/${task._id}`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.task._id).toBe(task._id.toString());
    });

    it('returns the task dashboard for the current user', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      await createTestTask(user._id, project._id, {
        assignedTo: [user._id],
        status: 'To Do',
      });

      const res = await request(app)
        .get('/api/tasks/my/dashboard')
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });

    it('updates task status through the dedicated status endpoint', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .put(`/api/tasks/${task._id}/status`)
        .set('Authorization', authHeader(token))
        .send({ status: 'Done' });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('Done');
    });

    it('rejects missing status in the dedicated status endpoint', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .put(`/api/tasks/${task._id}/status`)
        .set('Authorization', authHeader(token))
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects invalid status in the dedicated status endpoint', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .put(`/api/tasks/${task._id}/status`)
        .set('Authorization', authHeader(token))
        .send({ status: 'INVALID' });

      expect(res.status).toBe(400);
    });

    it('duplicates an existing task', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      const task = await createTestTask(user._id, project._id, {
        title: 'Original Task',
      });

      const res = await request(app)
        .post(`/api/tasks/${task._id}/duplicate`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(201);
      expect(res.body.task).toBeDefined();
      expect(res.body.task._id).not.toBe(task._id.toString());
    });
  });
});
