const User = require("../models/User");

/**
 * GET /api/users
 * Returns all users with sensitive fields stripped.
 * Used in project/task creation forms to list assignable users.
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};
