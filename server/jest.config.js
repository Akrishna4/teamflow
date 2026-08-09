/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterFramework: [],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'modules/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
  // Run tests serially to avoid MongoDB race conditions
  maxWorkers: 1,
};
