const simpleGit = require("simple-git");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

class GitService {
  constructor() {
    this.tempDir = path.join(__dirname, "../../temp");
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Clone un repository (public ou privé avec token)
   * @param {string} repoUrl - URL du repository
   * @param {string} token - Token GitHub (optionnel pour repos publics)
   * @returns {Promise<string>} - Chemin local du repo cloné
   */
  async cloneRepository(repoUrl, token = null) {
    try {
      // Nettoyer l'URL et extraire le nom du repo
      const repoName = this.extractRepoName(repoUrl);

      // Valider repoName pour éviter path traversal
      if (!repoName || /[\.\/\\]/.test(repoName)) {
        throw new Error("Invalid repository name");
      }
      // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
      // Protégé : repoName validé ci-dessus (reject si contient . / \)      const localPath = path.join(this.tempDir, `${repoName}-${Date.now()}`);

      // Construire l'URL avec token si fourni
      let cloneUrl = repoUrl;
      if (token) {
        cloneUrl = this.buildAuthUrl(repoUrl, token);
      }

      console.log(`Clonage du repository: ${repoName}`);
      const git = simpleGit();
      await git.clone(cloneUrl, localPath);

      return localPath;
    } catch (error) {
      console.error("Erreur lors du clonage:", error);
      throw new Error(`Impossible de cloner le repository: ${error.message}`);
    }
  }

  /**
   * Applique des corrections à des fichiers
   * @param {string} repoPath - Chemin local du repo
   * @param {Array} fixes - Tableau de corrections { filePath, fixedCode }
   */
  async applyFixes(repoPath, fixes) {
    try {
      for (const fix of fixes) {
        // Valider le path pour éviter path traversal
        // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
        // Protection explicite contre path traversal avec vérification startsWith
        const resolvedBase = path.resolve(repoPath);
        const resolvedTarget = path.resolve(repoPath, fix.filePath);

        if (!resolvedTarget.startsWith(resolvedBase)) {
          console.warn(`⚠️ Path traversal detected, skipping: ${fix.filePath}`);
          continue;
        }

        const fullPath = resolvedTarget;

        // Créer le dossier parent si nécessaire
        await fs.ensureDir(path.dirname(fullPath));

        // Écrire le code corrigé
        await fs.writeFile(fullPath, fix.fixedCode, "utf-8");
        console.log(`Correction appliquée: ${fix.filePath}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'application des corrections:", error);
      throw new Error(
        `Impossible d'appliquer les corrections: ${error.message}`,
      );
    }
  }

  /**
   * Crée une branche, commit et push les changements
   * @param {string} repoPath - Chemin local du repo
   * @param {string} branchName - Nom de la branche
   * @param {string} commitMessage - Message du commit
   * @param {string} token - Token GitHub
   * @param {string} repoUrl - URL du repository
   */
  async commitAndPush(repoPath, branchName, commitMessage, token, repoUrl) {
    try {
      const git = simpleGit(repoPath);

      // Configurer Git avec les infos du token
      await git.addConfig("user.name", "SecureScan Bot");
      await git.addConfig("user.email", "bot@securescan.com");

      // Créer et basculer vers la nouvelle branche
      await git.checkoutLocalBranch(branchName);

      // Ajouter tous les fichiers modifiés
      await git.add(".");

      // Commit
      await git.commit(commitMessage);

      // Construire l'URL avec token pour le push
      const authUrl = this.buildAuthUrl(repoUrl, token);

      // Push vers le remote
      await git.push(authUrl, branchName, ["--set-upstream"]);

      console.log(`Changements poussés sur la branche: ${branchName}`);
    } catch (error) {
      console.error("Erreur lors du commit/push:", error);
      throw new Error(
        `Impossible de pousser les changements: ${error.message}`,
      );
    }
  }

  /**
   * Crée une Pull Request sur GitHub
   * @param {string} repoOwner - Propriétaire du repo
   * @param {string} repoName - Nom du repo
   * @param {string} branchName - Branche source
   * @param {string} title - Titre de la PR
   * @param {string} body - Description de la PR
   * @param {string} token - Token GitHub
   */
  async createPullRequest(repoOwner, repoName, branchName, title, body, token) {
    try {
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/pulls`;

      const response = await axios.post(
        url,
        {
          title,
          body,
          head: branchName,
          base: "main", // ou "master" selon le repo
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      console.log(`Pull Request créée: ${response.data.html_url}`);
      return response.data;
    } catch (error) {
      // Si la branche de base n'est pas "main", essayer "master"
      if (error.response?.status === 422) {
        try {
          const url = `https://api.github.com/repos/${repoOwner}/${repoName}/pulls`;
          const response = await axios.post(
            url,
            {
              title,
              body,
              head: branchName,
              base: "master",
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
              },
            },
          );
          return response.data;
        } catch (retryError) {
          throw new Error(`Impossible de créer la PR: ${retryError.message}`);
        }
      }
      throw new Error(`Impossible de créer la PR: ${error.message}`);
    }
  }

  /**
   * Nettoie le repository local
   * @param {string} repoPath - Chemin local du repo
   */
  async cleanup(repoPath) {
    try {
      if (fs.existsSync(repoPath)) {
        await fs.remove(repoPath);
        console.log(`Repository nettoyé: ${repoPath}`);
      }
    } catch (error) {
      console.error("Erreur lors du nettoyage:", error);
    }
  }

  /**
   * Extrait le nom du repository depuis l'URL
   * @param {string} repoUrl - URL du repository
   * @returns {string} - Nom du repository
   */
  extractRepoName(repoUrl) {
    const cleanUrl = repoUrl.replace(/\.git$/, "");
    const parts = cleanUrl.split("/");
    return parts[parts.length - 1] || "repo";
  }

  /**
   * Extrait owner/repo depuis l'URL
   * @param {string} repoUrl - URL du repository
   * @returns {Object} - { owner, repo }
   */
  parseRepoUrl(repoUrl) {
    const cleanUrl = repoUrl.replace(/\.git$/, "");
    const parts = cleanUrl.split("/");
    return {
      owner: parts[parts.length - 2],
      repo: parts[parts.length - 1],
    };
  }

  /**
   * Construit une URL avec authentification
   * @param {string} repoUrl - URL du repository
   * @param {string} token - Token GitHub
   * @returns {string} - URL avec token
   *
   * ⚠️ ATTENTION : Le token est inclus dans l'URL. Si simple-git log une erreur,
   * le token pourrait apparaître dans les logs. Pour la production, considérer :
   * - Utiliser des SSH keys au lieu de HTTPS
   * - Utiliser git credential helper
   * - Wrapper les erreurs pour filtrer les tokens
   */
  buildAuthUrl(repoUrl, token) {
    // Format: https://x-access-token:TOKEN@github.com/owner/repo.git
    const cleanUrl = repoUrl
      .replace(/^https?:\/\//, "")
      .replace(/^(www\.)?github\.com\//, "")
      .replace(/^git@github\.com:/, "")
      .replace(/\.git$/, "");

    return `https://x-access-token:${token}@github.com/${cleanUrl}.git`;
  }

  /**
   * Vérifie si un token GitHub est valide
   * @param {string} token - Token GitHub
   * @returns {Promise<Object>} - Infos utilisateur GitHub
   */
  async verifyToken(token) {
    try {
      const response = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      return {
        valid: true,
        username: response.data.login,
        email: response.data.email,
        name: response.data.name,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}

module.exports = new GitService();
