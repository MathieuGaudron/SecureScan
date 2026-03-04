const { getFixTemplate, getGenericFixTemplate } = require("./fix-templates");
const claudeService = require("./claude.service");

/**
 * Service de génération de corrections pour les vulnérabilités
 */

/**
 * Génère une correction pour une vulnérabilité
 * @param {Object} vulnerability - Objet vulnérabilité avec ruleId, codeSnippet, etc.
 * @param {string} semgrepAutofix - Autofix proposé par Semgrep (si disponible)
 * @param {string} repoPath - Chemin du repository cloné (pour Claude)
 * @returns {Promise<Object>} Correction générée
 */
async function generateFix(
  vulnerability,
  semgrepAutofix = null,
  repoPath = null,
) {
  const { ruleId, severity, owaspCategory, codeSnippet } = vulnerability;

  // 1. Priorité MAXIMALE : Claude AI si disponible et repoPath fourni
  if (claudeService.isAvailable() && repoPath) {
    try {
      console.log(
        `🤖 Génération correction avec Claude pour ${vulnerability.filePath}`,
      );
      const claudeFix = await claudeService.generateFix(
        vulnerability,
        repoPath,
      );
      return claudeFix;
    } catch (error) {
      console.error("❌ Erreur Claude, fallback sur templates:", error.message);
      // Continue avec les autres méthodes si Claude échoue
    }
  }

  // 2. Priorité : autofix Semgrep si disponible
  if (semgrepAutofix && semgrepAutofix.trim() !== "") {
    return {
      fixType: "semgrep-autofix",
      title: "Correction automatique Semgrep",
      originalCode: codeSnippet,
      fixedCode: semgrepAutofix,
      explanation:
        "Cette correction a été générée automatiquement par Semgrep. Vérifiez qu'elle correspond à votre contexte avant application.",
      confidence: "high",
      resources: [],
    };
  }

  // 3. Template spécifique basé sur le ruleId
  const template = getFixTemplate(ruleId);
  if (template) {
    return {
      fixType: "template",
      title: template.title,
      originalCode: codeSnippet,
      fixedCode: template.fixedCode,
      explanation: template.explanation,
      confidence: "medium",
      resources: template.resources || [],
    };
  }

  // 4. Template générique basé sur OWASP catégorie
  const genericTemplate = getGenericFixTemplate(severity, owaspCategory);
  return {
    fixType: "generic",
    title: genericTemplate.title,
    originalCode: codeSnippet,
    fixedCode: genericTemplate.fixedCode,
    explanation: genericTemplate.explanation,
    confidence: "low",
    resources: [
      `https://owasp.org/Top10/fr/${owaspCategory}/`,
      "https://cheatsheetseries.owasp.org/",
    ],
  };
}

/**
 * Génère des corrections pour plusieurs vulnérabilités
 * @param {Array} vulnerabilities - Liste de vulnérabilités
 * @param {string} repoPath - Chemin du repository (pour Claude)
 * @returns {Promise<Array>} Liste de corrections
 */
async function generateBulkFixes(vulnerabilities, repoPath = null) {
  const fixes = [];
  for (const vuln of vulnerabilities) {
    const fix = await generateFix(vuln, vuln.semgrepAutofix, repoPath);
    fixes.push({
      vulnerabilityId: vuln.id,
      ...fix,
    });
  }
  return fixes;
}

/**
 * Évalue si une correction peut être appliquée automatiquement
 * @param {Object} fix - Objet correction
 * @returns {boolean}
 */
function canAutoApply(fix) {
  // Seuls les autofixes Semgrep avec haute confiance peuvent être auto-appliqués
  return fix.fixType === "semgrep-autofix" && fix.confidence === "high";
}

/**
 * Prépare une correction pour affichage frontend
 * @param {Object} vulnerability
 * @param {Object} fix
 * @returns {Object}
 */
function formatFixForDisplay(vulnerability, fix) {
  return {
    vulnerability: {
      id: vulnerability.id,
      title: vulnerability.title,
      severity: vulnerability.severity,
      filePath: vulnerability.filePath,
      lineNumber: vulnerability.lineNumber,
    },
    fix: {
      id: fix.id,
      type: fix.fixType,
      title: fix.title,
      confidence: fix.confidence,
      canAutoApply: canAutoApply(fix),
      diff: {
        // Utiliser le diff pré-généré par Claude si disponible, sinon fallback
        before: fix.diff?.before || fix.originalCode,
        after: fix.diff?.after || fix.fixedCode,
      },
      explanation: fix.explanation,
      resources: fix.resources,
    },
  };
}

module.exports = {
  generateFix,
  generateBulkFixes,
  canAutoApply,
  formatFixForDisplay,
};
