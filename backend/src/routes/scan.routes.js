const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const scanController = require("../controllers/scan.controller");

router.post("/", authMiddleware, scanController.scanRepo);

module.exports = router;
