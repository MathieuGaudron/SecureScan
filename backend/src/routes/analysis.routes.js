const express = require("express");
const router = express.Router();
const analysisController = require("../controllers/analysis.controller");

router.get("/", analysisController.getAnalyses);
router.get("/:id", analysisController.getAnalysisById);

module.exports = router;