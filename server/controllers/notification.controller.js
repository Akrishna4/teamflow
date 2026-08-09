const NotificationService = require("../services/notification/notification.service");
const ActivityService = require("../services/activity/activity.service");
const EVENTS = require("../constants/socketEvents");

exports.getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await NotificationService.getByUser(req.user._id);
    res.status(200).json({ notifications });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await NotificationService.markAsRead(
      req.params.id,
      req.user._id
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    ActivityService.log({
      action: EVENTS.NOTIFICATION_READ,
      entityModel: "Notification",
      entityId: notification._id,
      user: req.user._id,
    });

    res.status(200).json({ notification });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await NotificationService.markAllAsRead(req.user._id);
    res.status(200).json({ message: "All notifications marked as read." });
  } catch (error) {
    next(error);
  }
};
