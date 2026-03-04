const { Analysis, Vulnerability } = require("../models");

// GET /analyses?page=1&limit=10
exports.getAnalyses = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized", message: "Token manquant ou invalide" });
    }

    // Pagination optionnelle
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Par défaut 50
    const offset = (page - 1) * limit;

    const { count, rows } = await Analysis.findAndCountAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
      analyses: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
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
      return res
        .status(401)
        .json({ error: "Unauthorized", message: "Token manquant ou invalide" });
    }

    const analysis = await Analysis.findByPk(req.params.id, {
      include: [
        {
          model: Vulnerability,
          as: "vulnerabilities",
        },
      ],
      order: [
        [{ model: Vulnerability, as: "vulnerabilities" }, "createdAt", "DESC"],
      ],
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analyse non trouvée" });
    }

    // 🔒 Empêche un user de lire l'analyse d'un autre user
    if (analysis.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden", message: "Accès refusé" });
    }

    return res.json(analysis);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur récupération analyse" });
  }
};

// GET /analyses/history - Historique des 30 derniers jours
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized", message: "Token manquant ou invalide" });
    }

    // Date limite : 30 jours en arrière
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Récupérer tous les scans des 30 derniers jours
    const scans = await Analysis.findAll({
      where: {
        userId,
        createdAt: {
          [require("sequelize").Op.gte]: thirtyDaysAgo,
        },
      },
      include: [
        {
          model: Vulnerability,
          as: "vulnerabilities",
          attributes: [], // On ne veut que le count
        },
      ],
      attributes: [
        "id",
        "repositoryName",
        "repositoryUrl",
        "status",
        "createdAt",
        [
          require("sequelize").fn(
            "COUNT",
            require("sequelize").col("vulnerabilities.id"),
          ),
          "vulnerabilitiesCount",
        ],
      ],
      group: ["Analysis.id"],
      order: [["createdAt", "DESC"]],
    });

    // Calculer les stats
    const totalScans = scans.length;
    const totalVulnerabilities = scans.reduce(
      (sum, scan) => sum + parseInt(scan.dataValues.vulnerabilitiesCount || 0),
      0,
    );
    const uniqueProjects = new Set(scans.map((scan) => scan.repositoryUrl))
      .size;

    res.json({
      scans: scans.map((scan) => ({
        id: scan.id,
        projectName: scan.repositoryName,
        repositoryUrl: scan.repositoryUrl,
        status: scan.status,
        createdAt: scan.createdAt,
        vulnerabilitiesCount: parseInt(
          scan.dataValues.vulnerabilitiesCount || 0,
        ),
      })),
      stats: {
        totalScans,
        totalVulnerabilities,
        projectsScanned: uniqueProjects,
      },
    });
  } catch (err) {
    console.error("Erreur getHistory:", err);
    res.status(500).json({ error: "Erreur récupération historique" });
  }
};
