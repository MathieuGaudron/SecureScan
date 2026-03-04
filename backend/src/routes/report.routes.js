const express = require("express");
const router = express.Router();
const {
  generateReport,
  getReportData,
} = require("../controllers/report.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// GET /api/reports/view/:analysisId - Récupérer le contenu du rapport en JSON
router.get("/view/:analysisId", getReportData);

// GET /api/reports/generate/:analysisId - Générer un rapport PDF (pour plus tard)
router.get("/generate/:analysisId", generateReport);

module.exports = router;
