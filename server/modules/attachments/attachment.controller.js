const AttachmentService = require('./attachment.service');
const ResponseHandler = require('../shared/response.handler');

class AttachmentController {
  /** GET /api/v1/tasks/:taskId/attachments */
  static async getAttachments(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const attachments = await AttachmentService.getByTask(req.params.taskId, page, limit);
      return ResponseHandler.success(res, attachments, 'Attachments retrieved');
    } catch (err) { next(err); }
  }

  /** POST /api/v1/tasks/:taskId/attachments */
  static async uploadAttachment(req, res, next) {
    try {
      if (!req.file) {
        return ResponseHandler.error(res, 'No file provided', 400);
      }
      const projectId = req.body.projectId;
      if (!projectId) {
        return ResponseHandler.error(res, 'projectId is required', 400);
      }

      const attachment = await AttachmentService.processUpload(
        req.params.taskId,
        req.file,
        { _id: req.user._id, role: req.user.role },
        projectId
      );
      
      return ResponseHandler.success(res, attachment, 'File uploaded', 201);
    } catch (err) { next(err); }
  }

  /** GET /api/v1/attachments/:attachmentId/download?projectId=xxx */
  static async downloadAttachment(req, res, next) {
    try {
      const projectId = req.query.projectId;
      if (!projectId) {
        return ResponseHandler.error(res, 'projectId query param is required', 400);
      }

      const { attachment, filePath } = await AttachmentService.getAttachmentForDownload(
        req.params.attachmentId,
        projectId,
        req.user._id,
        req.user.role
      );

      // We use res.download to securely pipe the file from the local filesystem
      // It sets appropriate Content-Disposition headers automatically
      res.download(filePath, attachment.originalName, (err) => {
        if (err) {
          console.error(`Download error for ${filePath}:`, err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to download file' });
          }
        }
      });
    } catch (err) { next(err); }
  }

  /** DELETE /api/v1/attachments/:attachmentId?projectId=xxx */
  static async deleteAttachment(req, res, next) {
    try {
      const projectId = req.query.projectId;
      if (!projectId) {
        return ResponseHandler.error(res, 'projectId query param is required', 400);
      }

      const result = await AttachmentService.deleteAttachment(
        req.params.attachmentId,
        { _id: req.user._id, role: req.user.role },
        projectId
      );
      return ResponseHandler.success(res, result, 'Attachment deleted');
    } catch (err) { next(err); }
  }
}

module.exports = AttachmentController;
