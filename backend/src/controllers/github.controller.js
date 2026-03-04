const { GitHubConnection } = require("../models");
const gitService = require("../services/git.service");

/**
 * Sauvegarde un token GitHub pour l'utilisateur
 */
exports.saveToken = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token GitHub requis" });
    }

    // Vérifier que le token est valide
    const verification = await gitService.verifyToken(token);

    if (!verification.valid) {
      return res.status(400).json({
        message: "Token GitHub invalide",
        error: verification.error,
      });
    }

    // Chercher une connexion existante
    let connection = await GitHubConnection.findOne({ where: { userId } });

    if (connection) {
      // Mettre à jour la connexion existante
      connection.accessToken = token;
      connection.githubUsername = verification.username;
      connection.githubEmail = verification.email;
      connection.isActive = true;
      await connection.save();
    } else {
      // Créer une nouvelle connexion
      connection = await GitHubConnection.create({
        userId,
        accessToken: token,
        githubUsername: verification.username,
        githubEmail: verification.email,
        isActive: true,
      });
    }

    res.status(200).json({
      message: "Token GitHub enregistré avec succès",
      connection: {
        githubUsername: connection.githubUsername,
        githubEmail: connection.githubEmail,
        createdAt: connection.createdAt,
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du token:", error);
    res.status(500).json({
      message: "Erreur lors de l'enregistrement du token",
      error: error.message,
    });
  }
};

/**
 * Récupère le statut de la connexion GitHub
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const connection = await GitHubConnection.findOne({ where: { userId } });

    if (!connection || !connection.isActive) {
      return res.status(200).json({ connected: false });
    }

    res.status(200).json({
      connected: true,
      githubUsername: connection.githubUsername,
      githubEmail: connection.githubEmail,
      lastUsed: connection.lastUsed,
      createdAt: connection.createdAt,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du statut:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération du statut",
      error: error.message,
    });
  }
};

/**
 * Supprime la connexion GitHub
 */
exports.deleteConnection = async (req, res) => {
  try {
    const userId = req.user.id;

    const connection = await GitHubConnection.findOne({ where: { userId } });

    if (!connection) {
      return res
        .status(404)
        .json({ message: "Aucune connexion GitHub trouvée" });
    }

    await connection.destroy();

    res.status(200).json({ message: "Connexion GitHub supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la connexion:", error);
    res.status(500).json({
      message: "Erreur lors de la suppression de la connexion",
      error: error.message,
    });
  }
};

/**
 * Pousse des corrections vers GitHub (crée branche + PR)
 */
exports.pushFixes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { analysisId, repositoryUrl, fixes } = req.body;

    if (!analysisId || !repositoryUrl || !fixes || fixes.length === 0) {
      return res.status(400).json({
        message: "Paramètres manquants (analysisId, repositoryUrl, fixes)",
      });
    }

    // Récupérer la connexion GitHub
    const connection = await GitHubConnection.findOne({ where: { userId } });

    if (!connection || !connection.isActive) {
      return res.status(401).json({
        message:
          "Connexion GitHub requise. Configurez votre token dans les paramètres.",
      });
    }

    const token = connection.accessToken;
    let repoPath;

    try {
      // 1. Cloner le repository
      repoPath = await gitService.cloneRepository(repositoryUrl, token);

      // 2. Appliquer les corrections
      await gitService.applyFixes(repoPath, fixes);

      // 3. Créer une branche avec timestamp
      const branchName = `securescan-fixes-${Date.now()}`;
      const commitMessage = `🔒 SecureScan: Correction de ${fixes.length} vulnérabilité(s)`;

      // 4. Commit et push
      await gitService.commitAndPush(
        repoPath,
        branchName,
        commitMessage,
        token,
        repositoryUrl,
      );

      // 5. Créer la Pull Request
      const { owner, repo } = gitService.parseRepoUrl(repositoryUrl);
      const prTitle = `🔒 SecureScan: Corrections de sécurité`;
      const prBody = `## Corrections automatiques de SecureScan\n\nCette Pull Request contient **${fixes.length} correction(s)** de vulnérabilités détectées par SecureScan.\n\n### Corrections appliquées:\n${fixes.map((f, i) => `${i + 1}. \`${f.filePath}\` - ${f.description || "Correction de vulnérabilité"}`).join("\n")}\n\n---\n*Généré automatiquement par [SecureScan](https://github.com/securescan)*`;

      const pullRequest = await gitService.createPullRequest(
        owner,
        repo,
        branchName,
        prTitle,
        prBody,
        token,
      );

      // 6. Mettre à jour lastUsed
      connection.lastUsed = new Date();
      await connection.save();

      // 7. Nettoyer le repo local
      await gitService.cleanup(repoPath);

      res.status(200).json({
        message: "Corrections poussées avec succès",
        pullRequest: {
          url: pullRequest.html_url,
          number: pullRequest.number,
          title: pullRequest.title,
        },
        branch: branchName,
        fixesCount: fixes.length,
      });
    } catch (gitError) {
      // Nettoyer en cas d'erreur
      if (repoPath) {
        await gitService.cleanup(repoPath);
      }
      throw gitError;
    }
  } catch (error) {
    console.error("Erreur lors du push des corrections:", error);
    res.status(500).json({
      message: "Erreur lors du push des corrections",
      error: error.message,
    });
  }
};
