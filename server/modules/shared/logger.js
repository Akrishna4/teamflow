const pino = require('pino');
const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

const asyncLocalStorage = new AsyncLocalStorage();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  mixin() {
    const store = asyncLocalStorage.getStore();
    return store ? { reqId: store.reqId, userId: store.userId } : {};
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

const withLoggerContext = (context, fn) => {
  return asyncLocalStorage.run(context, fn);
};

const requestLoggerMiddleware = (req, res, next) => {
  const reqId = req.headers['x-request-id'] || uuidv4();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  
  // Extract userId if available (may not be present before auth middleware, 
  // but context is a shallow copy so it won't dynamically update unless we 
  // put an object in store and mutate it, but simple approach is fine)
  const context = {
    reqId,
    get userId() { return req.user?._id?.toString() || null; }
  };

  withLoggerContext(context, () => {
    const start = Date.now();
    logger.info({
      msg: 'Incoming request',
      method: req.method,
      url: req.url,
      ip: req.ip
    });

    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      
      logger[logLevel]({
        msg: 'Request completed',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        durationMs: duration
      });
    });

    next();
  });
};

module.exports = {
  logger,
  requestLoggerMiddleware,
  withLoggerContext
};
