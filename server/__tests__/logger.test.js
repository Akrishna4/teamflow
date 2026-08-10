const { EventEmitter } = require("events");

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockUuid = jest.fn(() => "generated-request-id");

jest.mock("pino", () => {
  const pino = jest.fn(() => mockLogger);

  pino.stdTimeFunctions = {
    isoTime: jest.fn(),
  };

  return pino;
});

jest.mock("uuid", () => ({
  v4: mockUuid,
}));

const {
  logger,
  requestLoggerMiddleware,
  withLoggerContext,
} = require("../modules/shared/logger");

describe("Logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("withLoggerContext", () => {
    it("executes the callback inside the logger context", async () => {
      const callback = jest.fn(() => "result");

      const result = await withLoggerContext(
        {
          reqId: "req-123",
          userId: "user-123",
        },
        callback
      );

      expect(result).toBe("result");
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("requestLoggerMiddleware", () => {
    const createMocks = (headers = {}, statusCode = 200) => {
      const req = {
        headers,
        method: "GET",
        url: "/api/test",
        ip: "127.0.0.1",
      };

      const res = new EventEmitter();

      res.statusCode = statusCode;
      res.setHeader = jest.fn();

      const next = jest.fn();

      return { req, res, next };
    };

    it("uses an existing x-request-id header", () => {
      const { req, res, next } = createMocks({
        "x-request-id": "existing-request-id",
      });

      requestLoggerMiddleware(req, res, next);

      expect(req.id).toBe("existing-request-id");
      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Request-Id",
        "existing-request-id"
      );
      expect(mockUuid).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("generates a request id when x-request-id is missing", () => {
      const { req, res, next } = createMocks();

      requestLoggerMiddleware(req, res, next);

      expect(req.id).toBe("generated-request-id");
      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Request-Id",
        "generated-request-id"
      );
      expect(mockUuid).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("logs info when the response status is below 400", () => {
      const { req, res, next } = createMocks({}, 200);

      requestLoggerMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      res.emit("finish");

      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("logs warn for 4xx responses", () => {
      const { req, res, next } = createMocks({}, 400);

      requestLoggerMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      res.emit("finish");

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it("logs error for 5xx responses", () => {
      const { req, res, next } = createMocks({}, 500);

      requestLoggerMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);

      res.emit("finish");

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it("handles a user id from req.user", () => {
      const { req, res, next } = createMocks();

      req.user = {
        _id: {
          toString: () => "user-123",
        },
      };

      requestLoggerMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it("handles req.user without an _id", () => {
      const { req, res, next } = createMocks();

      req.user = {};

      requestLoggerMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("logger", () => {
    it("exports the logger instance", () => {
      expect(logger).toBe(mockLogger);
    });
  });
});