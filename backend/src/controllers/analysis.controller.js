const { Analysis, Vulnerability } = require("../models");

// GET /analyses
exports.getAnalyses = async (req, res) => {
  try {
    const analyses = await Analysis.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.json(analyses);
  } catch (err) {
    res.status(500).json({ error: "Erreur récupération analyses" });
  }
};

// GET /analyses/:id
exports.getAnalysisById = async (req, res) => {
  try {
    const analysis = await Analysis.findByPk(req.params.id, {
      include: [
        {
          model: Vulnerability,
          as: "vulnerabilities",
        },
      ],
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analyse non trouvée" });
    }

    res.json(analysis);
  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: "Erreur récupération analyse" });
  }
};