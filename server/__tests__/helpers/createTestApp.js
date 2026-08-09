/**
 * Test app factory — creates a clean Express app without starting the HTTP server.
 * Each test suite gets its own app instance to avoid port conflicts.
 */
require('dotenv').config();
const express = require('express');
const authRoutes = require('../../routes/auth.routes');
const projectRoutes = require('../../routes/project.routes');
const taskRoutes = require('../../routes/task.routes');
const userRoutes = require('../../routes/user.routes');
const errorHandler = require('../../middleware/errorHandler');
const v1Routes = require('../../api/v1');

function createTestApp() {
  const app = express();
  app.use(express.json());

  // Attach a no-op io mock so controllers that call req.io.to(...).emit() don't crash
  app.use((req, _res, next) => {
    req.io = {
      to: () => ({ emit: () => {} }),
    };
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/v1', v1Routes);

  app.use(errorHandler);
  return app;
}

module.exports = createTestApp;
