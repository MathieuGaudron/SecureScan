const jwt = require("jsonwebtoken");
const { User, Analysis } = require("../models");

/**
 * Générer un token JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
};

/**
 * Inscription d'un nouvel utilisateur
 * POST /api/users/register
 */
exports.register = async (req, res) => {
  try {
    const { email, password, username, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email, password et username sont requis",
      });
    }

    // Vérifier si l'email existe déjà
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({
        error: "Conflict",
        message: "Cet email est déjà utilisé",
      });
    }

    // Vérifier si le username existe déjà
    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({
        error: "Conflict",
        message: "Ce nom d'utilisateur est déjà pris",
      });
    }

    // Créer l'utilisateur (le password sera hashé par le hook beforeCreate)
    const user = await User.create({
      email,
      password,
      username,
      firstName,
      lastName,
    });

    // Générer le token
    const token = generateToken(user);

    return res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: user.toSafeObject(),
      token,
    });
  } catch (error) {
    console.error("Erreur register:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Erreur lors de la création de l'utilisateur",
    });
  }
};

/**
 * Connexion d'un utilisateur
 * POST /api/users/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email et password sont requis",
      });
    }

    // Trouver l'utilisateur par email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Email ou mot de passe incorrect",
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Email ou mot de passe incorrect",
      });
    }

    // Mettre à jour la date de dernière connexion
    user.lastLoginAt = new Date();
    await user.save();

    // Générer le token
    const token = generateToken(user);

    return res.status(200).json({
      message: "Connexion réussie",
      user: user.toSafeObject(),
      token,
    });
  } catch (error) {
    console.error("Erreur login:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Erreur lors de la connexion",
    });
  }
};

/**
 * Récupérer le profil de l'utilisateur connecté
 * GET /api/users/me
 */
exports.getProfile = async (req, res) => {
  try {
    // req.user est déjà défini par le middleware auth
    return res.status(200).json({
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    console.error("Erreur getProfile:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Erreur lors de la récupération du profil",
    });
  }
};

/**
 * Mettre à jour le profil de l'utilisateur
 * PUT /api/users/me
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, username } = req.body;
    const user = req.user;

    // Vérifier si le username est déjà pris (par un autre user)
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(409).json({
          error: "Conflict",
          message: "Ce nom d'utilisateur est déjà pris",
        });
      }
    }

    // Mettre à jour les champs autorisés
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (username !== undefined) user.username = username;

    await user.save();

    return res.status(200).json({
      message: "Profil mis à jour avec succès",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Erreur updateProfile:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Erreur lors de la mise à jour du profil",
    });
  }
};

/**
 * Récupérer l'historique des analyses de l'utilisateur
 * GET /api/users/me/analyses
 */
exports.getAnalysisHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Récupérer les analyses de l'utilisateur
    const { count, rows: analyses } = await Analysis.findAndCountAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      attributes: [
        "id",
        "repositoryUrl",
        "repositoryName",
        "status",
        "securityScore",
        "scoreGrade",
        "totalVulnerabilities",
        "criticalCount",
        "highCount",
        "mediumCount",
        "lowCount",
        "infoCount",
        "createdAt",
        "scanCompletedAt",
      ],
    });

    return res.status(200).json({
      total: count,
      limit,
      offset,
      analyses,
    });
  } catch (error) {
    console.error("Erreur getAnalysisHistory:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Erreur lors de la récupération de l'historique",
    });
  }
};
