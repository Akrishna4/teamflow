const Notification = require("../../models/Notification");

class NotificationService {
  static async create(data) {
    return Notification.create(data);
  }

  static async getByUser(userId, limit = 50) {
    return Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  static async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true },
      { returnDocument: "after" }
    );
  }

  static async markAllAsRead(userId) {
    return Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );
  }

  static async deleteByTasks(taskIds) {
    return Notification.deleteMany({ task: { $in: taskIds } });
  }
}

module.exports = NotificationService;
