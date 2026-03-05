const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");

class ClaudeReportService {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.client = this.apiKey ? new Anthropic({ apiKey: this.apiKey }) : null;
  }

  /**
   * Génère le contenu intelligent du rapport avec Claude
   * @param {Object} analysis - Analyse complète
   * @param {Array} vulnerabilities - Liste des vulnérabilités
   * @returns {Promise<Object>} - Contenu du rapport
   */
  async generateReportContent(analysis, vulnerabilities) {
    if (!this.client) {
      throw new Error("Claude API non configurée");
    }

    try {
      const prompt = this.buildReportPrompt(analysis, vulnerabilities);

      const message = await this.client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000, // Plus de tokens pour le rapport complet
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const response = message.content[0].text;
      return this.parseReportResponse(response);
    } catch (error) {
      console.error("Erreur Claude Report API:", error);
      throw new Error(`Impossible de générer le rapport: ${error.message}`);
    }
  }

  /**
   * Construit le prompt pour Claude
   */
  buildReportPrompt(analysis, vulnerabilities) {
    // Grouper par sévérité
    const bySeverity = {
      critical: vulnerabilities.filter((v) => v.severity === "critical"),
      high: vulnerabilities.filter((v) => v.severity === "high"),
      medium: vulnerabilities.filter((v) => v.severity === "medium"),
      low: vulnerabilities.filter((v) => v.severity === "low"),
    };

    // Grouper par OWASP
    const byOwasp = vulnerabilities.reduce((acc, v) => {
      if (!acc[v.owaspCategory]) acc[v.owaspCategory] = [];
      acc[v.owaspCategory].push(v);
      return acc;
    }, {});

    return `Tu es un expert en sécurité des applications. Génère un rapport de sécurité simple et professionnel sur les erreurs détectées.

**PROJET ANALYSÉ:**
- Repository: ${analysis.repositoryName || analysis.repositoryUrl}
- Score de sécurité: ${analysis.securityScore}/100 (Grade ${analysis.scoreGrade})
- Langages: ${analysis.language || "Non détecté"}
- Date d'analyse: ${new Date(analysis.createdAt).toLocaleDateString("fr-FR")}

**STATISTIQUES:**
- Total vulnérabilités: ${analysis.totalVulnerabilities}
- Critiques: ${analysis.criticalCount}
- Élevées: ${analysis.highCount}
- Moyennes: ${analysis.mediumCount}
- Basses: ${analysis.lowCount}

**VULNÉRABILITÉS PAR CATÉGORIE OWASP:**
${Object.entries(byOwasp)
  .map(([cat, vulns]) => `- ${cat}: ${vulns.length} vulnérabilité(s)`)
  .join("\n")}

**DÉTAIL DES VULNÉRABILITÉS CRITIQUES/ÉLEVÉES (top 10):**
${[...bySeverity.critical, ...bySeverity.high]
  .slice(0, 10)
  .map(
    (v, i) => `
${i + 1}. ${v.title}
   - Fichier: ${v.filePath}:${v.lineNumber}
   - Catégorie: ${v.owaspCategory}
   - Description: ${v.description || "N/A"}
`,
  )
  .join("\n")}

**INSTRUCTIONS:**
Rédige un rapport de sécurité en français comprenant UNIQUEMENT deux sections :

1. **RÉSUMÉ EXÉCUTIF** (3-4 paragraphes)
   - Vue d'ensemble de l'état de sécurité du projet
   - Principaux risques identifiés
   - Niveau d'urgence et impact potentiel

2. **ANALYSE DÉTAILLÉE DES ERREURS**
   Pour chaque catégorie OWASP trouvée, rédige un paragraphe détaillé expliquant :
   - En quoi consiste cette vulnérabilité
   - Pourquoi c'est problématique pour ce projet
   - Les risques concrets encourus
   - Des exemples précis trouvés dans le code

Écris en paragraphes fluides, style document professionnel. Pas de listes à puces. Ton professionnel mais accessible.

Réponds directement avec le texte du rapport, sans balises markdown ni formatage spécial.`;
  }

  /**
   * Parse la réponse de Claude
   */
  parseReportResponse(response) {
    try {
      // Claude retourne directement le texte du rapport
      return {
        reportText: response.trim(),
      };
    } catch (error) {
      console.error("Erreur parsing réponse Claude:", error);
      throw new Error(
        `Impossible de parser la réponse Claude: ${error.message}`,
      );
    }
  }

  /**
   * Vérifie si Claude est disponible
   */
  isAvailable() {
    return this.client !== null;
  }
}

module.exports = new ClaudeReportService();
