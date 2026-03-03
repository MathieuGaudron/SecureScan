const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const scanController = require("../controllers/scan.controller");

// Route protégée : nécessite un token JWT valide
router.post("/", authMiddleware, scanController.scanRepo);

module.exports = router;