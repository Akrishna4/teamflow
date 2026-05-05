const express = require("express");
const { getAllUsers } = require("../controllers/user.controller");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getAllUsers);

module.exports = router;
