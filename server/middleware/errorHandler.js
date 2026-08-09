const AppError = require("../utils/AppError");
const { logger } = require("../modules/shared/logger");

/**
 * Centralized Express error-handling middleware.
 * Must be registered as the LAST middleware in server.js (4-arg signature).
 *
 * Handles:
 *   - Mongoose CastError (invalid ObjectId)
 *   - Mongoose duplicate key (E11000)
 *   - Mongoose ValidationError
 *   - JWT errors
 *   - All operational AppErrors
 *   - Unknown programmer errors (safe 500 in production)
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Mongoose: bad ObjectId  e.g. /tasks/not-valid-id
  if (err.name === "CastError") {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // Mongoose: duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new AppError(
      `An account with that ${field} already exists.`,
      400
    );
  }

  // Mongoose schema validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new AppError(messages.join(". "), 400);
  }

  // JWT: malformed token
  if (err.name === "JsonWebTokenError") {
    error = new AppError("Invalid authentication token.", 401);
  }

  // JWT: expired token
  if (err.name === "TokenExpiredError") {
    error = new AppError("Your session has expired. Please log in again.", 401);
  }

  // Development: include full stack for debugging
  if (process.env.NODE_ENV === "development") {
    return res.status(error.statusCode).json({
      status: "error",
      message: error.message,
      stack: err.stack,
    });
  }

  // Production: only expose operational errors
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: "error",
      message: error.message,
    });
  }

  // Programming/unknown error — log and send generic message
  logger.error({ err, msg: "UNHANDLED ERROR" });
  return res.status(500).json({
    status: "error",
    message: "Something went wrong on our end. Please try again later.",
  });
};

module.exports = errorHandler;
