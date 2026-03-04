const { Fix, Vulnerability } = require("../models");
const fixService = require("../services/fix.service");

// POST /api/fixes/generate/:vulnerabilityId - Générer un fix pour une vulnérabilité
const generateFix = async (req, res) => {
  try {
    const { vulnerabilityId } = req.params;

    const vulnerability = await Vulnerability.findByPk(vulnerabilityId);
    if (!vulnerability) {
      return res.status(404).json({ error: "Vulnérabilité non trouvée" });
    }

    // Vérifier si un fix existe déjà
    let existingFix = await Fix.findOne({
      where: { vulnerabilityId },
    });

    // ✅ Utiliser fix.service pour générer le fix
    const generatedFix = fixService.generateFix(
      {
        ruleId: vulnerability.ruleId,
        severity: vulnerability.severity,
        owaspCategory: vulnerability.owaspCategory,
        codeSnippet: vulnerability.codeSnippet,
      },
      vulnerability.suggestedFix, // Autofix Semgrep si disponible
    );

    let fix;

    if (existingFix) {
      // Si le fix existe et est rejeté, le remettre à "proposed"
      if (existingFix.status === "rejected") {
        existingFix.status = "proposed";
        await existingFix.save();
      }
      fix = existingFix;
    } else {
      // Créer l'entrée Fix en DB
      fix = await Fix.create({
        vulnerabilityId,
        fixType: generatedFix.fixType,
        description: generatedFix.explanation,
        originalCode: generatedFix.originalCode || null,
        fixedCode: generatedFix.fixedCode || null,
        filePath: vulnerability.filePath,
        status: "proposed",
      });
    }

    // Formatter la réponse pour le frontend
    const formattedFix = fixService.formatFixForDisplay(vulnerability, {
      ...generatedFix,
      id: fix.id,
      status: fix.status,
    });

    res.status(201).json({
      message: "Fix généré avec succès",
      fix: formattedFix,
      confidence: generatedFix.confidence,
      canAutoApply: fixService.canAutoApply(generatedFix),
    });
  } catch (error) {
    console.error("Erreur generateFix:", error);
    res.status(500).json({ error: "Erreur lors de la génération du fix" });
  }
};

// POST /api/fixes/:id/accept - Accepter un fix
const acceptFix = async (req, res) => {
  try {
    const { id } = req.params;

    const fix = await Fix.findByPk(id);
    if (!fix) {
      return res.status(404).json({ error: "Fix non trouvé" });
    }

    fix.status = "accepted";
    await fix.save();

    res.json({ message: "Fix accepté", fix });
  } catch (error) {
    console.error("Erreur acceptFix:", error);
    res.status(500).json({ error: "Erreur lors de l'acceptation du fix" });
  }
};

// POST /api/fixes/:id/reject - Rejeter un fix
const rejectFix = async (req, res) => {
  try {
    const { id } = req.params;

    const fix = await Fix.findByPk(id);
    if (!fix) {
      return res.status(404).json({ error: "Fix non trouvé" });
    }

    fix.status = "rejected";
    await fix.save();

    res.json({ message: "Fix rejeté", fix });
  } catch (error) {
    console.error("Erreur rejectFix:", error);
    res.status(500).json({ error: "Erreur lors du rejet du fix" });
  }
};

// POST /api/fixes/analysis/:analysisId/apply-all - Appliquer tous les fixes acceptés
const applyAllFixes = async (req, res) => {
  try {
    const { analysisId } = req.params;

    // Récupérer tous les fixes acceptés pour cette analyse
    const fixes = await Fix.findAll({
      where: { status: "accepted" },
      include: [
        {
          model: Vulnerability,
          as: "vulnerability",
          where: { analysisId },
        },
      ],
    });

    if (fixes.length === 0) {
      return res.status(400).json({ error: "Aucun fix accepté à appliquer" });
    }

    // TODO: Utiliser git.service pour appliquer les fixes et push
    // Pour l'instant on marque les fixes comme applied
    for (const fix of fixes) {
      fix.status = "applied";
      fix.appliedAt = new Date();
      await fix.save();
    }

    res.json({
      message: `${fixes.length} fix(es) appliqué(s)`,
      appliedCount: fixes.length,
    });
  } catch (error) {
    console.error("Erreur applyAllFixes:", error);
    res.status(500).json({ error: "Erreur lors de l'application des fixes" });
  }
};

module.exports = {
  generateFix,
  acceptFix,
  rejectFix,
  applyAllFixes,
};
