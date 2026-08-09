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

describe('Search API', () => {
  let admin, adminToken, project, task;

  beforeEach(async () => {
    const result = await createAdminUser();
    admin = result.user;
    adminToken = result.token;
    project = await createTestProject(admin._id, { name: 'Alpha Project' });
    task = await createTestTask(admin._id, project._id, { title: 'Fix the login bug' });
  });

  it('finds a project by name substring', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=Alpha')
      .set('Authorization', authHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.projects.length).toBeGreaterThan(0);
    expect(res.body.data.projects[0].name).toContain('Alpha');
  });

  it('finds a task by title substring', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=login')
      .set('Authorization', authHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.tasks.length).toBeGreaterThan(0);
    expect(res.body.data.tasks[0].title).toContain('login');
  });

  it('returns empty results for a non-matching query', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=zzznomatch')
      .set('Authorization', authHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.projects.length).toBe(0);
    expect(res.body.data.tasks.length).toBe(0);
  });

  it('rejects query shorter than 2 characters', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=a')
      .set('Authorization', authHeader(adminToken));

    expect(res.status).toBe(400);
  });

  it('rejects query longer than 100 characters', async () => {
    const res = await request(app)
      .get(`/api/v1/search?q=${'a'.repeat(101)}`)
      .set('Authorization', authHeader(adminToken));

    expect(res.status).toBe(400);
  });

  it('does NOT return results from projects the user does not belong to', async () => {
    // Create a separate user and their own project
    const { token: otherToken } = await createTestUser({ email: 'other@example.com' });
    await createTestProject(admin._id, { name: 'Secret Admin Project' });

    // Other user searches for the admin's secret project
    const res = await request(app)
      .get('/api/v1/search?q=Secret')
      .set('Authorization', authHeader(otherToken));

    expect(res.status).toBe(200);
    // The other user must not see the secret project they are not a member of
    expect(res.body.data.projects.length).toBe(0);
  });

  it('safely handles regex special characters in query', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=.*+?^')
      .set('Authorization', authHeader(adminToken));

    // Must not crash with a 500 — regex chars must be escaped
    expect(res.status).not.toBe(500);
  });
});
