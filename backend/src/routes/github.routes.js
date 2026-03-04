const express = require("express");
const router = express.Router();
const githubController = require("../controllers/github.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

// POST /api/github/token - Sauvegarder le token GitHub
router.post("/token", githubController.saveToken);

// GET /api/github/status - Récupérer le statut de la connexion
router.get("/status", githubController.getStatus);

// DELETE /api/github/connection - Supprimer la connexion GitHub
router.delete("/connection", githubController.deleteConnection);

// POST /api/github/push - Pousser des corrections vers GitHub
router.post("/push", githubController.pushFixes);

module.exports = router;
