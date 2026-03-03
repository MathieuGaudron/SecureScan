const express = require("express");
const router = express.Router();

const scanController = require("../controllers/scan.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.post("/", authMiddleware, scanController.scanRepo);

module.exports = router;