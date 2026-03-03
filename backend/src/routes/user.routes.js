const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");

// ========================================
// ROUTES PUBLIQUES (pas d'authentification)
// ========================================

/**
 * @route   POST /api/users/register
 * @desc    Créer un nouveau compte utilisateur
 * @access  Public
 */
router.post("/register", userController.register);

/**
 * @route   POST /api/users/login
 * @desc    Connexion utilisateur
 * @access  Public
 */
router.post("/login", userController.login);

// ========================================
// ROUTES PROTÉGÉES (authentification requise)
// ========================================

/**
 * @route   GET /api/users/me
 * @desc    Récupérer le profil de l'utilisateur connecté
 * @access  Private
 */
router.get("/me", authMiddleware, userController.getProfile);

/**
 * @route   PUT /api/users/me
 * @desc    Mettre à jour le profil de l'utilisateur connecté
 * @access  Private
 */
router.put("/me", authMiddleware, userController.updateProfile);

/**
 * @route   GET /api/users/me/analyses
 * @desc    Récupérer l'historique des analyses de l'utilisateur
 * @access  Private
 */
router.get("/me/analyses", authMiddleware, userController.getAnalysisHistory);

module.exports = router;
