const { Analysis, Vulnerability } = require("../models");

// GET /analyses
exports.getAnalyses = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized", message: "Token manquant ou invalide" });
    }

    const analyses = await Analysis.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    res.json(analyses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur récupération analyses" });
  }
};


// GET /analyses/:id
exports.getAnalysisById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized", message: "Token manquant ou invalide" });
    }

    const analysis = await Analysis.findByPk(req.params.id, {
      include: [
        {
          model: Vulnerability,
          as: "vulnerabilities",
        },
      ],
      order: [[{ model: Vulnerability, as: "vulnerabilities" }, "createdAt", "DESC"]],
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analyse non trouvée" });
    }

    // 🔒 Empêche un user de lire l'analyse d'un autre user
    if (analysis.userId !== userId) {
      return res.status(403).json({ error: "Forbidden", message: "Accès refusé" });
    }

    return res.json(analysis);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur récupération analyse" });
  }
};