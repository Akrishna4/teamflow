const express = require('express');
const AttachmentController = require('./attachment.controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.use(protect);

/**
 * GET    /api/v1/attachments/:attachmentId/download
 * DELETE /api/v1/attachments/:attachmentId
 */
router
  .route('/:attachmentId/download')
  .get(AttachmentController.downloadAttachment);

router
  .route('/:attachmentId')
  .delete(AttachmentController.deleteAttachment);

module.exports = router;
