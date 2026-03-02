const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const router = express.Router();

router.post("/", async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl manquant" });
  }

  const scanId = `scan_${Date.now()}`;
  const baseDir = "/tmp/securescan";
  const projectPath = path.join(baseDir, scanId);

  try {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // clone le repo
    await new Promise((resolve, reject) => {
      exec(`git clone --depth 1 ${repoUrl} ${projectPath}`, (error, stdout, stderr) => {
        if (error) return reject(stderr || error.message);
        resolve(stdout);
      });
    });

    // semgrep scan le repo
    const semgrepJson = await new Promise((resolve, reject) => {
      exec(
        `semgrep --config auto --json --disable-version-check`,
        { cwd: projectPath, maxBuffer: 50 * 1024 * 1024, timeout: 2 * 60 * 1000 },
        (error, stdout, stderr) => {
          if (error) return reject(stderr || error.message);
          resolve(stdout);
        }
      );
    });

    let report;
    try {
      report = JSON.parse(semgrepJson);
    } catch (e) {
      return res.status(500).json({
        error: "Semgrep output non-JSON",
        details: String(e),
        raw: semgrepJson.slice(0, 2000),
      });
    }

    const results = report.results || [];
    const summary = {
      totalFindings: results.length,
      bySeverity: results.reduce((acc, r) => {
        const sev = r?.extra?.severity || "UNKNOWN";
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      }, {}),
    };
    try {

    // supprime du dossier tmp (je vais enlever car on va sauvegarder en db les historique et)
    fs.rmSync(projectPath, { recursive: true, force: true });
      console.log(`Dossier temporaire supprimé: ${projectPath}`);
    } catch (cleanupError) {
      console.error("Erreur suppression dossier:", cleanupError.message);
    }

    return res.json({
      scanId,
      status: "scanned",
      message: "Repository cloné + scan Semgrep terminé",
      path: projectPath,
      summary,
      results, 
    });
  } catch (err) {
    return res.status(500).json({
      error: "Scan failed",
      details: String(err),
    });
  }
});

module.exports = router;