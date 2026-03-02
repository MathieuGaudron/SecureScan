const { Analysis, Vulnerability, Fix } = require("../models");

// POST /api/analysis/submit - Soumettre un repo pour analyse
const submitAnalysis = async (req, res) => {
  try {
    const { repositoryUrl, sourceType, language } = req.body;

    if (!repositoryUrl) {
      return res.status(400).json({ error: "repositoryUrl est requis" });
    }

    // Extraire le nom du repo depuis l'URL
    const repositoryName = repositoryUrl.split("/").pop().replace(".git", "");

    // Créer l'analyse en DB
    const analysis = await Analysis.create({
      repositoryUrl,
      repositoryName,
      sourceType: sourceType || "git",
      language: language || null,
      status: "pending",
    });

    // TODO: Lancer le scan en arrière-plan (services)
    // Pour l'instant on retourne l'analyse créée

    res.status(201).json({
      message: "Analyse créée avec succès",
      analysis,
    });
  } catch (error) {
    console.error("Erreur submitAnalysis:", error);
    res.status(500).json({ error: "Erreur lors de la création de l'analyse" });
  }
};

// GET /api/analysis/:id - Récupérer une analyse avec ses vulnérabilités
const getAnalysis = async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await Analysis.findByPk(id, {
      include: [
        {
          model: Vulnerability,
          as: "vulnerabilities",
          include: [{ model: Fix, as: "fix" }],
        },
      ],
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analyse non trouvée" });
    }

    res.json(analysis);
  } catch (error) {
    console.error("Erreur getAnalysis:", error);
    res.status(500).json({ error: "Erreur lors de la récupération de l'analyse" });
  }
};

// GET /api/analysis/:id/status - Récupérer le statut d'une analyse
const getAnalysisStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await Analysis.findByPk(id, {
      attributes: ["id", "status", "securityScore", "scoreGrade", "totalVulnerabilities"],
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analyse non trouvée" });
    }

    res.json(analysis);
  } catch (error) {
    console.error("Erreur getAnalysisStatus:", error);
    res.status(500).json({ error: "Erreur lors de la récupération du statut" });
  }
};

// GET /api/analysis - Lister toutes les analyses
const getAllAnalyses = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const { count, rows } = await Analysis.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      total: count,
      analyses: rows,
    });
  } catch (error) {
    console.error("Erreur getAllAnalyses:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des analyses" });
  }
};

module.exports = {
  submitAnalysis,
  getAnalysis,
  getAnalysisStatus,
  getAllAnalyses,
};
