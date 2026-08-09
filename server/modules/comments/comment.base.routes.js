const express = require('express');
const { body, query } = require('express-validator');
const CommentController = require('./comment.controller');
const { protect } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

const router = express.Router();

router.use(protect);

/**
 * PUT    /api/v1/comments/:commentId           — edit own comment
 * DELETE /api/v1/comments/:commentId           — delete (own or admin)
 */
router
  .route('/:commentId')
  .put(
    [
      body('content').trim().notEmpty().withMessage('Comment content is required'),
      body('projectId').trim().notEmpty().withMessage('projectId is required'),
    ],
    validate,
    CommentController.updateComment
  )
  .delete(
    [
      query('projectId').trim().notEmpty().withMessage('projectId query param is required'),
    ],
    validate,
    CommentController.deleteComment
  );

module.exports = router;
