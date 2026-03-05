const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs-extra");
const path = require("path");

class ClaudeService {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    if (!this.apiKey) {
      console.warn(
        "⚠️ CLAUDE_API_KEY non définie - les corrections utiliseront les templates",
      );
    }
    this.client = this.apiKey ? new Anthropic({ apiKey: this.apiKey }) : null;
  }

  /**
   * Génère une correction intelligente avec Claude
   * @param {Object} vulnerability - Vulnérabilité détectée
   * @param {string} repoPath - Chemin du repository cloné
   * @returns {Promise<Object>} - Correction générée
   */
  async generateFix(vulnerability, repoPath) {
    if (!this.client) {
      throw new Error("Claude API non configurée");
    }

    try {
      // Valider le path pour éviter path traversal
      const resolvedBase = path.resolve(repoPath);
      const resolvedTarget = path.resolve(repoPath, vulnerability.filePath);

      if (!resolvedTarget.startsWith(resolvedBase)) {
        throw new Error("Path traversal detected in filePath");
      }

      // Lire le fichier complet pour le contexte
      const filePath = resolvedTarget;
      let fullFileContent = "";

      if (await fs.pathExists(filePath)) {
        fullFileContent = await fs.readFile(filePath, "utf-8");
      } else {
        // Si le fichier n'existe pas dans le repo, utiliser le codeSnippet
        fullFileContent = vulnerability.codeSnippet || "";
      }

      // Construire le prompt pour Claude
      const prompt = this.buildPrompt(vulnerability, fullFileContent);

      // Appel à Claude
      const message = await this.client.messages.create({
        model: "claude-sonnet-4-6", // Claude 4 Sonnet (Mars 2026)
        max_tokens: 4096,
        temperature: 0.3, // Moins de créativité = plus de précision
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Parser la réponse de Claude
      const response = message.content[0].text;
      return this.parseClaudeResponse(response, vulnerability);
    } catch (error) {
      console.error("Erreur Claude API:", error);
      throw new Error(`Impossible de générer la correction: ${error.message}`);
    }
  }

  /**
   * Construit le prompt pour Claude
   * @param {Object} vulnerability - Vulnérabilité
   * @param {string} fileContent - Contenu complet du fichier
   * @returns {string} - Prompt formaté
   */
  buildPrompt(vulnerability, fileContent) {
    return `Tu es un expert en sécurité logicielle. Analyse cette vulnérabilité et génère une correction.

**VULNÉRABILITÉ DÉTECTÉE:**
- Type: ${vulnerability.owaspCategory} - ${vulnerability.owaspName || ""}
- Sévérité: ${vulnerability.severity}
- Description: ${vulnerability.description}
- Fichier: ${vulnerability.filePath}
- Ligne: ${vulnerability.lineNumber}
- Outil de détection: ${vulnerability.toolSource}

**CODE VULNÉRABLE:**
\`\`\`
${vulnerability.codeSnippet || "Non fourni"}
\`\`\`

**FICHIER COMPLET (contexte):**
\`\`\`
${fileContent.slice(0, 10000)} ${fileContent.length > 10000 ? "...(tronqué)" : ""}
\`\`\`

**INSTRUCTIONS:**
1. Génère le fichier COMPLET corrigé (pas juste un snippet)
2. Garde TOUTE la structure, imports, et logique existante
3. Corrige UNIQUEMENT la vulnérabilité identifiée
4. Utilise les meilleures pratiques de sécurité (OWASP, CWE)
5. Ajoute des commentaires explicatifs si nécessaire
6. Le code doit compiler et fonctionner

**FORMAT DE RÉPONSE (JSON strict):**
{
  "fixedCode": "le code complet du fichier corrigé",
  "explanation": "explication courte de la correction (2-3 phrases)",
  "confidence": "high|medium|low",
  "resources": ["URL1", "URL2"]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
  }

  /**
   * Parse la réponse de Claude
   * @param {string} response - Réponse brute de Claude
   * @param {Object} vulnerability - Vulnérabilité originale
   * @returns {Object} - Correction formatée
   */
  parseClaudeResponse(response, vulnerability) {
    try {
      // Extraire le JSON si Claude a ajouté du texte avant/après
      let jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Pas de JSON trouvé dans la réponse");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        fixType: "ai-generated",
        title: `Correction ${vulnerability.owaspCategory}`,
        code: parsed.fixedCode.trim(),
        fixedCode: parsed.fixedCode.trim(), // Fichier complet (pour push)
        originalCode: vulnerability.codeSnippet, // Code original (pour diff)
        explanation: parsed.explanation,
        confidence: parsed.confidence || "medium",
        resources: parsed.resources || [],
        diff: {
          before: vulnerability.codeSnippet,
          after: this.extractRelevantSnippet(
            parsed.fixedCode,
            vulnerability.lineNumber,
          ),
        },
      };
    } catch (error) {
      console.error("Erreur parsing réponse Claude:", error);
      console.error("Réponse brute:", response);
      throw new Error(
        `Impossible de parser la réponse Claude: ${error.message}`,
      );
    }
  }

  /**
   * Extrait un snippet pertinent du code corrigé pour l'affichage diff
   * @param {string} fixedCode - Code complet corrigé
   * @param {number} lineNumber - Numéro de ligne de la vulnérabilité
   * @returns {string} - Snippet extrait
   */
  extractRelevantSnippet(fixedCode, lineNumber) {
    const lines = fixedCode.split("\n");
    const start = Math.max(0, lineNumber - 3);
    const end = Math.min(lines.length, lineNumber + 3);
    return lines.slice(start, end).join("\n");
  }

  /**
   * Vérifie si Claude API est disponible
   * @returns {boolean}
   */
  isAvailable() {
    return this.client !== null;
  }
}

module.exports = new ClaudeService();
