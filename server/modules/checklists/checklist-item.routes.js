const express = require('express');
const { body, query } = require('express-validator');
const ChecklistController = require('./checklist.controller');
const { protect } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

const router = express.Router();

router.use(protect);

/**
 * PUT    /api/v1/checklist-items/:itemId   — toggle completion (any member) or rename (admin)
 * DELETE /api/v1/checklist-items/:itemId   — admin only
 */
router
  .route('/:itemId')
  .put(
    [
      body('projectId').trim().notEmpty().withMessage('projectId is required'),
      body('completed').optional().isBoolean().withMessage('completed must be boolean'),
      body('title').optional().trim().notEmpty().withMessage('title cannot be empty'),
    ],
    validate,
    ChecklistController.updateItem
  )
  .delete(
    [query('projectId').trim().notEmpty().withMessage('projectId query param is required')],
    validate,
    ChecklistController.deleteItem
  );

module.exports = router;
