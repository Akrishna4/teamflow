const express = require('express');
const { body, query } = require('express-validator');
const LabelController = require('./label.controller');
const { protect, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

const router = express.Router();

router.use(protect);

/**
 * PUT    /api/v1/labels/:labelId (Admin only)
 * DELETE /api/v1/labels/:labelId (Admin only)
 */
router
  .route('/:labelId')
  .put(
    authorize('Admin'),
    [
      body('projectId').trim().notEmpty().withMessage('projectId is required'),
      body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 50 }),
      body('color').optional().trim().matches(/^#([0-9a-fA-F]{3}){1,2}$/).withMessage('Invalid hex color'),
    ],
    validate,
    LabelController.updateLabel
  )
  .delete(
    authorize('Admin'),
    [query('projectId').trim().notEmpty().withMessage('projectId query param is required')],
    validate,
    LabelController.deleteLabel
  );

module.exports = router;
