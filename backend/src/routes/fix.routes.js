const express = require("express");
const router = express.Router();
const fixController = require("../controllers/fix.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// POST /api/fixes/generate/:vulnerabilityId - Générer un fix pour une vulnérabilité
router.post("/generate/:vulnerabilityId", fixController.generateFix);

// POST /api/fixes/:id/accept - Accepter un fix
router.post("/:id/accept", fixController.acceptFix);

// POST /api/fixes/:id/reject - Rejeter un fix
router.post("/:id/reject", fixController.rejectFix);

// POST /api/fixes/analysis/:analysisId/apply-all - Appliquer tous les fixes acceptés
router.post("/analysis/:analysisId/apply-all", fixController.applyAllFixes);

module.exports = router;
