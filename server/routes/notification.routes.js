const express = require("express");
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} = require("../controllers/notification.controller");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect); // Require auth

router.get("/", getMyNotifications);
router.put("/mark-all-read", markAllAsRead);
router.put("/:id/read", markAsRead);

module.exports = router;
