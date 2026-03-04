const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const analysisController = require("../controllers/analysis.controller");

router.get("/", authMiddleware, analysisController.getAnalyses);
router.get("/history", authMiddleware, analysisController.getHistory);
router.get("/:id", authMiddleware, analysisController.getAnalysisById);

module.exports = router;
