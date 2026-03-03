const jwt = require("jsonwebtoken");
const { User } = require("../models");

/**
 * Middleware d'authentification JWT
 * Vérifie le token dans le header Authorization
 * Attache l'utilisateur à req.user si valide
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Extraire le token du header Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token manquant ou format invalide",
      });
    }

    const token = authHeader.split(" ")[1];

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Récupérer l'utilisateur depuis la DB
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] }, // Ne pas inclure le password
    });

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Utilisateur introuvable",
      });
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token invalide",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token expiré",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Erreur lors de la vérification du token",
    });
  }
};

module.exports = authMiddleware;
