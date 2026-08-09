/**
 * Custom operational error class.
 * Distinguishes expected errors (validation, auth, not-found)
 * from unexpected programmer errors so the error handler can
 * respond safely in production.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // safe to expose to client
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
