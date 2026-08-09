/**
 * Test helpers — shared test database setup, app factory, and JWT utilities.
 * Imported by every test file; do NOT start the real server here.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

let mongoServer;

/**
 * Start an in-memory MongoDB server and connect Mongoose.
 * Call in beforeAll().
 */
async function connectTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

/**
 * Drop all collections between tests for a clean slate.
 * Call in beforeEach() or afterEach().
 */
async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

/**
 * Disconnect and stop the in-memory server.
 * Call in afterAll().
 */
async function disconnectTestDB() {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
}

/**
 * Create a test user in the database and return a signed JWT.
 */
async function createTestUser(overrides = {}) {
  const defaults = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'Password123!',
    role: 'Member',
  };
  const data = { ...defaults, ...overrides };
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const user = await User.create({ ...data, password: hashedPassword });
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
  return { user, token, rawPassword: data.password };
}

/**
 * Create a test admin user.
 */
async function createAdminUser(overrides = {}) {
  return createTestUser({ role: 'Admin', name: 'Admin User', ...overrides });
}

/**
 * Create a test project with the given user as createdBy and member.
 */
async function createTestProject(userId, overrides = {}) {
  const defaults = {
    name: 'Test Project',
    description: 'A test project',
    createdBy: userId,
    members: [userId],
  };
  return Project.create({ ...defaults, ...overrides });
}

/**
 * Create a test task.
 */
async function createTestTask(userId, projectId, overrides = {}) {
  const defaults = {
    title: 'Test Task',
    description: 'A test task',
    status: 'To Do',
    priority: 'Medium',
    project: projectId,
    createdBy: userId,
  };
  return Task.create({ ...defaults, ...overrides });
}

/**
 * Build an Authorization header value from a token.
 */
function authHeader(token) {
  return `Bearer ${token}`;
}

module.exports = {
  connectTestDB,
  clearTestDB,
  disconnectTestDB,
  createTestUser,
  createAdminUser,
  createTestProject,
  createTestTask,
  authHeader,
};
