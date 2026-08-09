require("dotenv").config();

// ─────────────────────────────────────────────
// Environment Variable Validation — fail fast.
// Never start with missing required configuration.
// ─────────────────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "PORT", "CORS_ORIGIN"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  // Use console.error here intentionally — logger isn't initialized yet.
  console.error(
    `[FATAL] Missing required environment variables: ${missingEnv.join(", ")}\n` +
    `Please set them in your .env file before starting the server.`
  );
  process.exit(1);
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const http = require("http");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const { logger, requestLoggerMiddleware } = require("./modules/shared/logger");

const authRoutes = require("./routes/auth.routes");
const projectRoutes = require("./routes/project.routes");
const taskRoutes = require("./routes/task.routes");
const userRoutes = require("./routes/user.routes");
const notificationRoutes = require("./routes/notification.routes");
const errorHandler = require("./middleware/errorHandler");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./docs/swagger");

// ─────────────────────────────────────────────
// Uncaught Exceptions & Unhandled Rejections
// ─────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled Rejection");
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────
// Production Security & Proxy Configuration
// ─────────────────────────────────────────────
app.set("trust proxy", 1); // Trust first proxy (Render/Vercel/Nginx)
app.use(helmet());         // Secure HTTP headers
app.use(compression());    // GZIP compress responses

// ─────────────────────────────────────────────
// CORS — only allow the configured origin.
// Credentials: true is required for future
// httpOnly-cookie-based sessions.
// ─────────────────────────────────────────────
const allowedOrigin = process.env.CORS_ORIGIN;

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(requestLoggerMiddleware);

// ─────────────────────────────────────────────
// Socket.IO — configured with matching CORS.
// Authentication middleware validates the JWT
// token sent in socket.handshake.auth before
// any connection is accepted. This prevents
// unauthenticated clients from joining rooms.
// ─────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.IO JWT authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required for socket connection."));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id; // attach verified userId to socket
    next();
  } catch (err) {
    next(new Error("Invalid or expired token."));
  }
});

// ─────────────────────────────────────────────
// Rate Limiters
// Auth routes: 20 attempts per 15 minutes.
// Prevents brute-force login attacks.
// ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many requests from this IP. Please try again in 15 minutes.",
  },
});

// ─────────────────────────────────────────────
// Attach io instance to every request so
// controllers can emit real-time events.
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

// v1 Modular Routes
const v1Routes = require("./api/v1");
app.use("/api/v1", v1Routes);

// OpenAPI Documentation
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "TeamFlow API Documentation",
  })
);

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "TeamFlow API is running." });
});

app.get("/health", (req, res) => {
  const isMongoConnected = mongoose.connection.readyState === 1;
  const healthData = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    memoryUsage: process.memoryUsage(),
    database: {
      status: isMongoConnected ? "connected" : "disconnected",
    },
  };

  if (isMongoConnected) {
    res.status(200).json({ status: "healthy", ...healthData });
  } else {
    res.status(503).json({ status: "unhealthy", ...healthData });
  }
});

app.get("/ready", (req, res) => {
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ status: "ready" });
  } else {
    res.status(503).json({ status: "not ready" });
  }
});

app.get("/metrics", (req, res) => {
  // Placeholder for future Prometheus integration
  res.status(200).json({
    message:
      "Metrics endpoint prepared. Integrate prom-client here in the future.",
  });
});

// ─────────────────────────────────────────────
// Centralized error handler — must be LAST.
// Catches all errors passed via next(err) from
// controllers, middleware, and validators.
// ─────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────
// Socket.IO connection handler
// User room is joined automatically using the
// verified userId from the JWT — clients no
// longer need to emit a "join" event.
// ─────────────────────────────────────────────
io.on("connection", (socket) => {
  const RoomService = require("./services/socket/room.service");

  // Auto-join the user's private notification room
  socket.join(RoomService.getUserRoom(socket.userId));
  logger.info({ userId: socket.userId, socketId: socket.id }, "Socket connected");

  socket.on("join-project", (projectId) => {
    socket.join(RoomService.getProjectRoom(projectId));
  });

  socket.on("leave-project", (projectId) => {
    socket.leave(RoomService.getProjectRoom(projectId));
  });

  socket.on("disconnect", () => {
    logger.info({ userId: socket.userId, socketId: socket.id }, "Socket disconnected");
  });
});

// Setup EventBus Listeners
const setupEventBusListeners = require("./modules/shared/event-bus.listeners");
setupEventBusListeners(io);

// ─────────────────────────────────────────────
// Database + Server startup
// ─────────────────────────────────────────────
const PORT = process.env.PORT;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("Connected to MongoDB");
    server.listen(PORT, () => {
      logger.info({ port: PORT, corsOrigin: allowedOrigin }, `Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.fatal({ err }, "MongoDB connection error");
    process.exit(1);
  });