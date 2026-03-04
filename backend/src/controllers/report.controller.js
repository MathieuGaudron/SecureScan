const PDFDocument = require("pdfkit");
const { Analysis, Vulnerability } = require("../models");
const claudeReportService = require("../services/claude-report.service");

/**
 * GET /api/reports/view/:analysisId
 * Récupère le contenu du rapport en JSON pour affichage web
 */
exports.getReportData = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const userId = req.user?.id;

    // Récupérer l'analyse
    const analysis = await Analysis.findOne({
      where: { id: analysisId, userId },
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analyse non trouvée" });
    }

    // Récupérer toutes les vulnérabilités
    const vulnerabilities = await Vulnerability.findAll({
      where: { analysisId },
      order: [
        ["severity", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    console.log(
      `📊 Récupération données rapport pour ${analysis.repositoryName} (${vulnerabilities.length} vulnérabilités)`,
    );

    // Générer le contenu avec Claude
    let reportContent;
    if (claudeReportService.isAvailable()) {
      console.log("🤖 Génération du contenu avec Claude...");
      try {
        reportContent = await claudeReportService.generateReportContent(
          analysis.toJSON(),
          vulnerabilities.map((v) => v.toJSON()),
        );
        console.log("✅ Contenu Claude généré avec succès");
      } catch (error) {
        console.error(
          "❌ Erreur Claude, fallback sur contenu basique:",
          error.message,
        );
        reportContent = generateBasicContent(analysis, vulnerabilities);
      }
    } else {
      console.log("⚠️ Claude non disponible, contenu basique");
      reportContent = generateBasicContent(analysis, vulnerabilities);
    }

    // Retourner les données en JSON
    res.json({
      analysis: {
        id: analysis.id,
        repositoryName: analysis.repositoryName,
        repositoryUrl: analysis.repositoryUrl,
        securityScore: analysis.securityScore,
        scoreGrade: analysis.scoreGrade,
        totalVulnerabilities: analysis.totalVulnerabilities,
        criticalCount: analysis.criticalCount,
        highCount: analysis.highCount,
        mediumCount: analysis.mediumCount,
        lowCount: analysis.lowCount,
        language: analysis.language,
        createdAt: analysis.createdAt,
      },
      vulnerabilities: vulnerabilities.map((v) => v.toJSON()),
      reportContent,
    });
  } catch (error) {
    console.error("Erreur récupération données rapport:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des données du rapport",
      message: error.message,
    });
  }
};

/**
 * GET /api/reports/generate/:analysisId
 * Génère un rapport PDF avec contenu Claude
 */
exports.generateReport = async (req, res) => {
  try {
    const { analysisId } = req.params;
    const userId = req.user?.id;

    // Récupérer l'analyse
    const analysis = await Analysis.findOne({
      where: { id: analysisId, userId },
    });

    if (!analysis) {
      return res.status(404).json({ error: "Analyse non trouvée" });
    }

    // Récupérer toutes les vulnérabilités
    const vulnerabilities = await Vulnerability.findAll({
      where: { analysisId },
      order: [
        ["severity", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    console.log(
      `📊 Génération rapport pour ${analysis.repositoryName} (${vulnerabilities.length} vulnérabilités)`,
    );

    // Générer le contenu avec Claude
    let reportContent;
    if (claudeReportService.isAvailable()) {
      console.log("🤖 Génération du contenu avec Claude...");
      try {
        reportContent = await claudeReportService.generateReportContent(
          analysis.toJSON(),
          vulnerabilities.map((v) => v.toJSON()),
        );
        console.log("✅ Contenu Claude généré avec succès");
      } catch (error) {
        console.error(
          "❌ Erreur Claude, fallback sur contenu basique:",
          error.message,
        );
        reportContent = generateBasicContent(analysis, vulnerabilities);
      }
    } else {
      console.log("⚠️ Claude non disponible, contenu basique");
      reportContent = generateBasicContent(analysis, vulnerabilities);
    }

    // Créer le PDF avec pdfkit
    const doc = new PDFDocument({ margin: 50 });

    // Headers pour le téléchargement
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=securescan-report-${analysisId}.pdf`,
    );

    // Gérer les erreurs du stream
    doc.on("error", (err) => {
      console.error("❌ Erreur stream PDF:", err);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Erreur lors de la génération du PDF",
          message: err.message,
        });
      }
    });

    // Stream le PDF vers la réponse
    doc.pipe(res);

    // Générer le contenu du PDF (dans un try/catch pour capturer les erreurs)
    try {
      generatePDF(doc, analysis, vulnerabilities, reportContent);
    } catch (pdfError) {
      console.error("❌ Erreur génération contenu PDF:", pdfError);
      // Terminer le document même en cas d'erreur
      doc.end();
      return;
    }

    // Finaliser le PDF
    doc.end();

    // Logger uniquement après que le stream soit terminé
    doc.on("end", () => {
      console.log("✅ Rapport PDF généré et envoyé");
    });
  } catch (error) {
    console.error("Erreur génération rapport:", error);
    // Ne pas envoyer de JSON si les headers sont déjà envoyés
    if (!res.headersSent) {
      res.status(500).json({
        error: "Erreur lors de la génération du rapport",
        message: error.message,
      });
    }
  }
};

/**
 * Génère le contenu basique (fallback si Claude indisponible)
 */
function generateBasicContent(analysis, vulnerabilities) {
  const text = `RÉSUMÉ EXÉCUTIF

L'analyse de sécurité du projet ${analysis.repositoryName} révèle un score de ${analysis.securityScore} sur 100, correspondant à un grade ${analysis.scoreGrade}. Au total, ${analysis.totalVulnerabilities} vulnérabilités ont été détectées dans le code source, dont ${analysis.criticalCount} sont classées comme critiques et ${analysis.highCount} comme élevées.

Ces vulnérabilités représentent des risques potentiels pour la sécurité de l'application et doivent faire l'objet d'une attention particulière. Les vulnérabilités critiques requièrent une action immédiate, tandis que les autres doivent être traitées selon leur niveau de priorité.

ANALYSE DÉTAILLÉE DES ERREURS

Les vulnérabilités identifiées couvrent plusieurs catégories de sécurité. Les problèmes critiques et élevés nécessitent une correction prioritaire pour assurer la sécurité de l'application. Il est recommandé de traiter ces vulnérabilités dans l'ordre de leur criticité, en commençant par les plus graves.

L'équipe de développement devrait revoir chaque vulnérabilité listée dans l'annexe de ce rapport et appliquer les correctifs appropriés selon les standards de sécurité actuels.`;

  return {
    reportText: text,
  };
}

/**
 * Génère le PDF avec pdfkit
 */
function generatePDF(doc, analysis, vulnerabilities, content) {
  // Page de garde
  doc.fontSize(28).fillColor("#ef4444").text("SecureScan", { align: "center" });
  doc.moveDown(0.5);
  doc
    .fontSize(20)
    .fillColor("#000000")
    .text("Rapport de Sécurité", { align: "center" });
  doc.moveDown(2);

  // Infos projet
  doc.fontSize(12).fillColor("#666666");
  doc.text(`Projet: ${analysis.repositoryName || analysis.repositoryUrl}`);
  doc.text(`Date: ${new Date(analysis.createdAt).toLocaleDateString("fr-FR")}`);
  doc.text(
    `Score: ${analysis.securityScore}/100 (Grade ${analysis.scoreGrade})`,
  );
  doc.text(`Langages: ${analysis.language || "Non détecté"}`);
  doc.moveDown(3);

  // Executive Summary
  doc.fontSize(16).fillColor("#000000").text("Executive Summary");
  doc.moveDown(0.5);
  doc
    .fontSize(11)
    .fillColor("#333333")
    .text(content.executiveSummary, { align: "justify" });
  doc.moveDown(2);

  // Statistiques
  doc.addPage();
  doc.fontSize(16).fillColor("#000000").text("Statistiques");
  doc.moveDown(1);

  const stats = [
    { label: "Total vulnérabilités", value: analysis.totalVulnerabilities },
    { label: "Critiques", value: analysis.criticalCount, color: "#ef4444" },
    { label: "Élevées", value: analysis.highCount, color: "#f97316" },
    { label: "Moyennes", value: analysis.mediumCount, color: "#eab308" },
    { label: "Basses", value: analysis.lowCount, color: "#22c55e" },
  ];

  stats.forEach((stat) => {
    doc
      .fontSize(12)
      .fillColor(stat.color || "#000000")
      .text(`${stat.label}: ${stat.value}`);
    doc.moveDown(0.3);
  });

  doc.moveDown(2);

  // Recommandations
  if (content.recommendations.length > 0) {
    doc.addPage();
    doc.fontSize(16).fillColor("#000000").text("Recommandations Priorisées");
    doc.moveDown(1);

    content.recommendations.forEach((rec, idx) => {
      const priorityColors = {
        CRITICAL: "#ef4444",
        HIGH: "#f97316",
        MEDIUM: "#eab308",
        LOW: "#22c55e",
      };

      doc
        .fontSize(12)
        .fillColor(priorityColors[rec.priority] || "#000000")
        .text(`${idx + 1}. [${rec.priority}] ${rec.title}`);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#666666").text(rec.description);
      doc.fontSize(9).text(`Temps estimé: ${rec.estimatedTime}`);
      doc.moveDown(1);
    });
  }

  // Plan d'action
  if (content.actionPlan) {
    doc.addPage();
    doc.fontSize(16).fillColor("#000000").text("Plan d'Action");
    doc.moveDown(1);

    if (content.actionPlan.week1) {
      doc.fontSize(13).fillColor("#ef4444").text("Semaine 1 (Urgent)");
      doc.moveDown(0.5);
      content.actionPlan.week1.forEach((action) => {
        doc.fontSize(10).fillColor("#333333").text(`• ${action}`);
        doc.moveDown(0.3);
      });
      doc.moveDown(1);
    }

    if (content.actionPlan.week2to4) {
      doc.fontSize(13).fillColor("#f97316").text("Semaines 2-4");
      doc.moveDown(0.5);
      content.actionPlan.week2to4.forEach((action) => {
        doc.fontSize(10).fillColor("#333333").text(`• ${action}`);
        doc.moveDown(0.3);
      });
      doc.moveDown(1);
    }

    if (content.actionPlan.month2to3) {
      doc.fontSize(13).fillColor("#eab308").text("Mois 2-3");
      doc.moveDown(0.5);
      content.actionPlan.month2to3.forEach((action) => {
        doc.fontSize(10).fillColor("#333333").text(`• ${action}`);
        doc.moveDown(0.3);
      });
    }
  }

  // Liste des vulnérabilités (annexe)
  doc.addPage();
  doc
    .fontSize(16)
    .fillColor("#000000")
    .text("Annexe: Liste des Vulnérabilités");
  doc.moveDown(1);

  vulnerabilities.slice(0, 20).forEach((vuln, idx) => {
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text(`${idx + 1}. ${vuln.title}`);
    doc.fontSize(9).fillColor("#666666");
    doc.text(`   Fichier: ${vuln.filePath}:${vuln.lineNumber}`);
    doc.text(`   Sévérité: ${vuln.severity.toUpperCase()}`);
    doc.moveDown(0.5);
  });

  if (vulnerabilities.length > 20) {
    doc
      .fontSize(9)
      .fillColor("#999999")
      .text(`... et ${vulnerabilities.length - 20} autres vulnérabilités`);
  }

  // Footer
  doc
    .fontSize(8)
    .fillColor("#999999")
    .text(
      `Généré par SecureScan - ${new Date().toLocaleString("fr-FR")}`,
      50,
      doc.page.height - 50,
      { align: "center" },
    );
}
