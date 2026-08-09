const express = require('express');
const ActivityService = require('../../services/activity/activity.service');
const ResponseHandler = require('../shared/response.handler');
const { protect } = require('../../middleware/auth');

const router = express.Router();
router.use(protect);

/**
 * GET /api/v1/activity?entityModel=Task&entityId=xxx&page=1
 */
router.get('/', async (req, res, next) => {
  try {
    const { entityModel, entityId, action, page, limit } = req.query;
    const filters = {};
    if (entityModel) filters.entityModel = entityModel;
    if (entityId) filters.entityId = entityId;
    if (action) filters.action = action;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;

    const timeline = await ActivityService.getTimeline(filters, pageNum, limitNum);
    return ResponseHandler.success(res, timeline, 'Timeline retrieved');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
