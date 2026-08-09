const Attachment = require('./attachment.model');
const Task = require('../../models/Task');
const storageAdapter = require('../storage/local.adapter');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const EventBus = require('../shared/event-bus');

class AttachmentService {
  /**
   * Get all attachments for a specific task.
   */
  static async getByTask(taskId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return Attachment.find({ task: taskId })
      .populate('uploader', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Get a single attachment for download purposes.
   */
  static async getAttachmentForDownload(attachmentId, projectId, userId, userRole) {
    const attachment = await Attachment.findById(attachmentId).populate('task');
    if (!attachment) throw new NotFoundError('Attachment not found');
    
    if (attachment.task.project.toString() !== projectId) {
      throw new ForbiddenError('Attachment does not belong to this project');
    }

    if (userRole !== 'Admin') {
      const Project = require('../../models/Project');
      const project = await Project.findById(projectId);
      if (!project) throw new NotFoundError('Project not found');
      
      const isMember = project.members.some(member => member.toString() === userId.toString());
      if (!isMember) {
        throw new ForbiddenError('You are not a member of this project');
      }
    }

    const filePath = storageAdapter.getFilePath(attachment.filename);
    return { attachment, filePath };
  }

  /**
   * Process a newly uploaded file.
   */
  static async processUpload(taskId, file, user, projectId) {
    const task = await Task.findOne({ _id: taskId, project: projectId });
    if (!task) {
      // Clean up the file if task doesn't exist
      await storageAdapter.deleteFile(file.filename);
      throw new NotFoundError('Task not found');
    }

    const attachment = await Attachment.create({
      task: taskId,
      uploader: user._id,
      originalName: file.originalname,
      filename: file.filename, // generated safely by multer
      mimetype: file.mimetype,
      size: file.size,
    });

    const populated = await Attachment.findById(attachment._id)
      .populate('uploader', 'name email')
      .lean();

    EventBus.publish('attachment.uploaded', {
      entity: 'attachment',
      action: 'uploaded',
      actor: user._id,
      taskId,
      projectId,
      payload: populated,
      changes: null,
    });

    return populated;
  }

  /**
   * Delete an attachment.
   */
  static async deleteAttachment(attachmentId, user, projectId) {
    const attachment = await Attachment.findById(attachmentId).populate('task');
    if (!attachment) throw new NotFoundError('Attachment not found');

    if (attachment.task.project.toString() !== projectId) {
      throw new ForbiddenError('Attachment does not belong to this project');
    }

    // Only Admin or Uploader can delete
    if (user.role !== 'Admin' && attachment.uploader.toString() !== user._id.toString()) {
      throw new ForbiddenError('You can only delete your own attachments');
    }

    // 1. Delete from DB
    await Attachment.findByIdAndDelete(attachmentId);

    // 2. Delete from disk
    await storageAdapter.deleteFile(attachment.filename);

    EventBus.publish('attachment.deleted', {
      entity: 'attachment',
      action: 'deleted',
      actor: user._id,
      taskId: attachment.task._id,
      projectId,
      payload: { _id: attachmentId },
      changes: null,
    });

    return { _id: attachmentId };
  }
}

module.exports = AttachmentService;
