const express = require('express');
const SearchController = require('./search.controller');
const { protect } = require('../../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', SearchController.search);

module.exports = router;
