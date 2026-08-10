const request = require('supertest');
const fs = require('fs');
const path = require('path');

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

const Attachment = require('../modules/attachments/attachment.model');

let app;

const uploadsDir = path.join(process.cwd(), 'uploads');

beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();

  // Ensure the upload directory exists.
  fs.mkdirSync(uploadsDir, { recursive: true });
});

afterEach(async () => {
  await clearTestDB();

  // Remove test-uploaded files.
  if (fs.existsSync(uploadsDir)) {
    for (const file of fs.readdirSync(uploadsDir)) {
      fs.unlinkSync(path.join(uploadsDir, file));
    }
  }
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('Attachments API', () => {
  describe('GET /api/v1/tasks/:taskId/attachments', () => {
    it('returns attachments for a task', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      await Attachment.create({
        task: task._id,
        uploader: user._id,
        originalName: 'test.txt',
        filename: 'test-file.txt',
        mimetype: 'text/plain',
        size: 100,
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task._id}/attachments`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].originalName).toBe('test.txt');
    });

    it('returns an empty array when the task has no attachments', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .get(`/api/v1/tasks/${task._id}/attachments`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('rejects unauthenticated requests', async () => {
      const { user } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .get(`/api/v1/tasks/${task._id}/attachments`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/tasks/:taskId/attachments', () => {
    it('uploads an attachment successfully', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const testFile = path.join(uploadsDir, 'upload-source.txt');
      fs.writeFileSync(testFile, 'Hello TeamFlow');

      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/attachments`)
        .set('Authorization', authHeader(token))
        .field('projectId', project._id.toString())
        .attach('file', testFile);

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.originalName).toBe('upload-source.txt');
      expect(res.body.data.mimetype).toBe('text/plain');
      expect(res.body.data.size).toBeGreaterThan(0);
    });

    it('rejects upload without a file', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/attachments`)
        .set('Authorization', authHeader(token))
        .field('projectId', project._id.toString());

      expect(res.status).toBe(400);
    });

    it('rejects upload without projectId', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const testFile = path.join(uploadsDir, 'missing-project.txt');
      fs.writeFileSync(testFile, 'Test');

      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/attachments`)
        .set('Authorization', authHeader(token))
        .attach('file', testFile);

      expect(res.status).toBe(400);
    });

    it('returns 404 when task does not belong to the supplied project', async () => {
      const { user, token } = await createAdminUser();

      const project1 = await createTestProject(user._id, {
        name: 'Project 1',
      });

      const project2 = await createTestProject(user._id, {
        name: 'Project 2',
      });

      const task = await createTestTask(user._id, project1._id);

      const testFile = path.join(uploadsDir, 'wrong-project.txt');
      fs.writeFileSync(testFile, 'Test');

      const res = await request(app)
        .post(`/api/v1/tasks/${task._id}/attachments`)
        .set('Authorization', authHeader(token))
        .field('projectId', project2._id.toString())
        .attach('file', testFile);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/attachments/:attachmentId/download', () => {
    it('rejects download without projectId', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const attachment = await Attachment.create({
        task: task._id,
        uploader: user._id,
        originalName: 'download.txt',
        filename: 'download.txt',
        mimetype: 'text/plain',
        size: 10,
      });

      const res = await request(app)
        .get(`/api/v1/attachments/${attachment._id}/download`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(400);
    });

    it('returns 404 for a non-existent attachment', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      const fakeAttachmentId = '000000000000000000000000';

      const res = await request(app)
        .get(
          `/api/v1/attachments/${fakeAttachmentId}/download?projectId=${project._id}`
        )
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(404);
    });

    it('rejects download when attachment belongs to another project', async () => {
      const { user, token } = await createAdminUser();

      const project1 = await createTestProject(user._id, {
        name: 'Project 1',
      });

      const project2 = await createTestProject(user._id, {
        name: 'Project 2',
      });

      const task = await createTestTask(user._id, project1._id);

      const attachment = await Attachment.create({
        task: task._id,
        uploader: user._id,
        originalName: 'private.txt',
        filename: 'private.txt',
        mimetype: 'text/plain',
        size: 10,
      });

      const res = await request(app)
        .get(
          `/api/v1/attachments/${attachment._id}/download?projectId=${project2._id}`
        )
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/attachments/:attachmentId', () => {
    it('rejects deletion without projectId', async () => {
      const { user, token } = await createAdminUser();

      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const attachment = await Attachment.create({
        task: task._id,
        uploader: user._id,
        originalName: 'delete.txt',
        filename: 'delete.txt',
        mimetype: 'text/plain',
        size: 10,
      });

      const res = await request(app)
        .delete(`/api/v1/attachments/${attachment._id}`)
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(400);
    });

    it('returns 404 for a non-existent attachment', async () => {
      const { user, token } = await createAdminUser();
      const project = await createTestProject(user._id);

      const res = await request(app)
        .delete(
          `/api/v1/attachments/000000000000000000000000?projectId=${project._id}`
        )
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(404);
    });

    it('allows an Admin to delete an attachment', async () => {
      const { user, token } = await createAdminUser();

      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const filename = 'admin-delete.txt';
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, 'Delete me');

      const attachment = await Attachment.create({
        task: task._id,
        uploader: user._id,
        originalName: filename,
        filename,
        mimetype: 'text/plain',
        size: 9,
      });

      const res = await request(app)
        .delete(
          `/api/v1/attachments/${attachment._id}?projectId=${project._id}`
        )
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);

      const deleted = await Attachment.findById(attachment._id);
      expect(deleted).toBeNull();

      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('allows the uploader to delete their own attachment', async () => {
      const { user, token } = await createTestUser();

      const project = await createTestProject(user._id);
      const task = await createTestTask(user._id, project._id);

      const filename = 'uploader-delete.txt';
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, 'Delete me');

      const attachment = await Attachment.create({
        task: task._id,
        uploader: user._id,
        originalName: filename,
        filename,
        mimetype: 'text/plain',
        size: 9,
      });

      const res = await request(app)
        .delete(
          `/api/v1/attachments/${attachment._id}?projectId=${project._id}`
        )
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(200);
      expect(await Attachment.findById(attachment._id)).toBeNull();
    });

    it('rejects a non-uploader Member from deleting an attachment', async () => {
      const { user: owner } = await createTestUser();
      const { token: otherUserToken } = await createTestUser();

      const project = await createTestProject(owner._id, {
        members: [owner._id],
      });

      const task = await createTestTask(owner._id, project._id);

      const attachment = await Attachment.create({
        task: task._id,
        uploader: owner._id,
        originalName: 'protected.txt',
        filename: 'protected.txt',
        mimetype: 'text/plain',
        size: 10,
      });

      const res = await request(app)
        .delete(
          `/api/v1/attachments/${attachment._id}?projectId=${project._id}`
        )
        .set('Authorization', authHeader(otherUserToken));

      expect(res.status).toBe(403);
    });

    it('rejects deletion when attachment belongs to another project', async () => {
      const { user, token } = await createAdminUser();

      const project1 = await createTestProject(user._id, {
        name: 'Project 1',
      });

      const project2 = await createTestProject(user._id, {
        name: 'Project 2',
      });

      const task = await createTestTask(user._id, project1._id);

      const attachment = await Attachment.create({
        task: task._id,
        uploader: user._id,
        originalName: 'wrong-project.txt',
        filename: 'wrong-project.txt',
        mimetype: 'text/plain',
        size: 10,
      });

      const res = await request(app)
        .delete(
          `/api/v1/attachments/${attachment._id}?projectId=${project2._id}`
        )
        .set('Authorization', authHeader(token));

      expect(res.status).toBe(403);
    });
  });
});