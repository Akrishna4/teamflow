class ResponseHandler {
  static success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
    const response = {
      success: true,
      message,
    };
    if (data) response.data = data;
    if (meta) response.meta = meta;

    return res.status(statusCode).json(response);
  }

  static error(res, message = 'Internal Server Error', statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    const response = {
      success: false,
      error: {
        code,
        message,
      },
    };
    if (details) response.error.details = details;

    return res.status(statusCode).json(response);
  }
}

module.exports = ResponseHandler;
