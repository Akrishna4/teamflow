const express = require('express');
const { body, query } = require('express-validator');
const ChecklistController = require('./checklist.controller');
const { protect, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

const router = express.Router();

router.use(protect);

/**
 * PUT    /api/v1/checklists/:checklistId          (Admin only — rename)
 * DELETE /api/v1/checklists/:checklistId          (Admin only — cascade delete items)
 */
router
  .route('/:checklistId')
  .put(
    authorize('Admin'),
    [
      body('title').trim().notEmpty().withMessage('Title is required'),
      body('projectId').trim().notEmpty().withMessage('projectId is required'),
    ],
    validate,
    ChecklistController.updateChecklist
  )
  .delete(
    authorize('Admin'),
    [query('projectId').trim().notEmpty().withMessage('projectId query param is required')],
    validate,
    ChecklistController.deleteChecklist
  );

/**
 * POST /api/v1/checklists/:checklistId/items   (Admin only — add item)
 * PUT  /api/v1/checklists/:checklistId/reorder (Admin only — reorder items)
 */
router.post(
  '/:checklistId/items',
  authorize('Admin'),
  [
    body('title').trim().notEmpty().withMessage('Item title is required'),
    body('projectId').trim().notEmpty().withMessage('projectId is required'),
  ],
  validate,
  ChecklistController.createItem
);

router.put(
  '/:checklistId/reorder',
  authorize('Admin'),
  [
    body('orderedIds').isArray({ min: 1 }).withMessage('orderedIds must be a non-empty array'),
    body('projectId').trim().notEmpty().withMessage('projectId is required'),
  ],
  validate,
  ChecklistController.reorderItems
);

module.exports = router;
