const express = require('express');
const { body, query } = require('express-validator');
const LabelController = require('./label.controller');
const { protect } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

const router = express.Router({ mergeParams: true });

router.use(protect);

/**
 * POST   /api/v1/tasks/:taskId/labels/:labelId
 * DELETE /api/v1/tasks/:taskId/labels/:labelId
 */
router
  .route('/:labelId')
  .post(
    [body('projectId').trim().notEmpty().withMessage('projectId is required')],
    validate,
    LabelController.assignToTask
  )
  .delete(
    [query('projectId').trim().notEmpty().withMessage('projectId query param is required')],
    validate,
    LabelController.removeFromTask
  );

module.exports = router;
