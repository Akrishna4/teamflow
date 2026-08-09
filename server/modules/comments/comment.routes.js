const express = require('express');
const { body, query } = require('express-validator');
const CommentController = require('./comment.controller');
const { protect } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

const router = express.Router({ mergeParams: true });

router.use(protect);

/**
 * GET  /api/v1/tasks/:taskId/comments          — list (paginated, threaded)
 * POST /api/v1/tasks/:taskId/comments          — create
 */
router
  .route('/')
  .get(CommentController.getComments)
  .post(
    [
      body('content').trim().notEmpty().withMessage('Comment content is required'),
      body('projectId').trim().notEmpty().withMessage('projectId is required'),
      body('parentComment').optional().isMongoId().withMessage('Invalid parent comment ID'),
    ],
    validate,
    CommentController.createComment
  );

module.exports = router;
