const express = require('express');
const { body, query } = require('express-validator');
const ChecklistController = require('./checklist.controller');
const { protect, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

const router = express.Router({ mergeParams: true });

router.use(protect);

/**
 * GET  /api/v1/tasks/:taskId/checklists
 * POST /api/v1/tasks/:taskId/checklists  (Admin only)
 */
router
  .route('/')
  .get(ChecklistController.getChecklists)
  .post(
    authorize('Admin'),
    [
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('projectId').trim().notEmpty().withMessage('projectId is required'),
    ],
    validate,
    ChecklistController.createChecklist
  );

module.exports = router;
