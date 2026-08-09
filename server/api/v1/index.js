const express = require('express');

// Comments
const taskCommentRoutes = require('../../modules/comments/comment.routes');
const baseCommentRoutes = require('../../modules/comments/comment.base.routes');

// Checklists
const taskChecklistRoutes = require('../../modules/checklists/checklist.routes');
const baseChecklistRoutes = require('../../modules/checklists/checklist.base.routes');
const checklistItemRoutes = require('../../modules/checklists/checklist-item.routes');

// Labels
const projectLabelRoutes = require('../../modules/labels/label.project.routes');
const baseLabelRoutes = require('../../modules/labels/label.base.routes');
const taskLabelRoutes = require('../../modules/labels/label.task.routes');

// Attachments
const taskAttachmentRoutes = require('../../modules/attachments/attachment.task.routes');
const baseAttachmentRoutes = require('../../modules/attachments/attachment.base.routes');

// Activity
const activityRoutes = require('../../modules/activity/activity.routes');

// Search
const searchRoutes = require('../../modules/search/search.routes');

// Views
const viewRoutes = require('../../modules/views/saved-view.routes');

const router = express.Router();

// ── Comments ─────────────────────────────────────────────────────────────────
router.use('/tasks/:taskId/comments', taskCommentRoutes);
router.use('/comments', baseCommentRoutes);

// ── Checklists ────────────────────────────────────────────────────────────────
router.use('/tasks/:taskId/checklists', taskChecklistRoutes);
router.use('/checklists', baseChecklistRoutes);
router.use('/checklist-items', checklistItemRoutes);

// ── Labels ────────────────────────────────────────────────────────────────────
router.use('/projects/:projectId/labels', projectLabelRoutes);
router.use('/labels', baseLabelRoutes);
router.use('/tasks/:taskId/labels', taskLabelRoutes);

// ── Attachments ───────────────────────────────────────────────────────────────
router.use('/tasks/:taskId/attachments', taskAttachmentRoutes);
router.use('/attachments', baseAttachmentRoutes);

// ── Activity ──────────────────────────────────────────────────────────────────
router.use('/activity', activityRoutes);

// ── Search ────────────────────────────────────────────────────────────────────
router.use('/search', searchRoutes);

// ── Views ─────────────────────────────────────────────────────────────────────
router.use('/views', viewRoutes);

module.exports = router;
