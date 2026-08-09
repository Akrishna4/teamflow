const User = require("../models/User");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const DemoSeederService = require("../services/seeder/demoSeeder.service");
const { logger } = require("../modules/shared/logger");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

/**
 * POST /api/auth/register
 *
 * Security fix: the `role` field from req.body is intentionally ignored.
 * All self-registrations are hardcoded to "Member".
 * An Admin must manually elevate a user's role via a dedicated admin endpoint.
 * This prevents API-level privilege escalation attacks.
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("An account with that email already exists.", 400));
    }

    // Role is ALWAYS "Member" regardless of what the client sends.
    const user = await User.create({
      name,
      email,
      password,
      role: "Member",
    });

    const token = signToken(user._id);

    // Fire-and-forget: seed demo tasks for the user asynchronously
    DemoSeederService.seedDemoTasksForUser(user._id).catch(err => {
      logger.error({ err }, "[DemoSeeder] Unhandled background error");
    });

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError("Incorrect email or password.", 401));
    }

    const token = signToken(user._id);

    // Fire-and-forget: seed demo tasks for the user asynchronously
    DemoSeederService.seedDemoTasksForUser(user._id).catch(err => {
      logger.error({ err }, "[DemoSeeder] Unhandled background error");
    });

    res.status(200).json({ token, user });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("projects");
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
