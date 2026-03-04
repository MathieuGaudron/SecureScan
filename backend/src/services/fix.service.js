const { getFixTemplate, getGenericFixTemplate } = require("./fix-templates");

/**
 * Service de génération de corrections pour les vulnérabilités
 */

/**
 * Génère une correction pour une vulnérabilité
 * @param {Object} vulnerability - Objet vulnérabilité avec ruleId, codeSnippet, etc.
 * @param {string} semgrepAutofix - Autofix proposé par Semgrep (si disponible)
 * @returns {Object} Correction générée
 */
function generateFix(vulnerability, semgrepAutofix = null) {
  const { ruleId, severity, owaspCategory, codeSnippet } = vulnerability;

  // 1. Priorité : autofix Semgrep si disponible
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

  // 2. Template spécifique basé sur le ruleId
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

  // 3. Template générique basé sur OWASP catégorie
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
 * @returns {Array} Liste de corrections
 */
function generateBulkFixes(vulnerabilities) {
  return vulnerabilities.map((vuln) => {
    const fix = generateFix(vuln, vuln.semgrepAutofix);
    return {
      vulnerabilityId: vuln.id,
      ...fix,
    };
  });
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
        before: fix.originalCode,
        after: fix.fixedCode,
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
