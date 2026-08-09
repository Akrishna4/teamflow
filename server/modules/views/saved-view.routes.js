const express = require('express');
const SavedViewController = require('./saved-view.controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', SavedViewController.getViews);
router.post('/', SavedViewController.createView);
router.put('/:id', SavedViewController.updateView);
router.delete('/:id', SavedViewController.deleteView);

module.exports = router;
