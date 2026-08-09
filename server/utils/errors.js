const AppError = require("./AppError");

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400);
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, 409);
  }
}

module.exports = {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
};
