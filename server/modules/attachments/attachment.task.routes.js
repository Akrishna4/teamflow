const express = require('express');
const AttachmentController = require('./attachment.controller');
const { protect } = require('../../middleware/auth');
const upload = require('./multer.config');

const router = express.Router({ mergeParams: true });

router.use(protect);

/**
 * GET  /api/v1/tasks/:taskId/attachments
 * POST /api/v1/tasks/:taskId/attachments
 * 
 * Note: Multer middleware handles multipart form parsing and file validation 
 * before it hits the controller. `express-validator` struggles with multipart 
 * form data bodies natively alongside multer, so basic body validation is done 
 * inside the controller for this specific route.
 */
router
  .route('/')
  .get(AttachmentController.getAttachments)
  .post(
    upload.single('file'), 
    AttachmentController.uploadAttachment
  );

module.exports = router;
