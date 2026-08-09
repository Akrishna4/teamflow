const express = require('express');
const { body, query } = require('express-validator');
const LabelController = require('./label.controller');
const { protect, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

const router = express.Router({ mergeParams: true });

router.use(protect);

/**
 * GET  /api/v1/projects/:projectId/labels
 * POST /api/v1/projects/:projectId/labels (Admin only)
 */
router
  .route('/')
  .get(LabelController.getProjectLabels)
  .post(
    authorize('Admin'),
    [
      body('name').trim().notEmpty().withMessage('Label name is required').isLength({ max: 50 }),
      body('color')
        .trim()
        .notEmpty()
        .matches(/^#([0-9a-fA-F]{3}){1,2}$/)
        .withMessage('Valid hex color is required'),
    ],
    validate,
    LabelController.createLabel
  );

module.exports = router;
