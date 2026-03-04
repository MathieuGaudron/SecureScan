const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const { sequelize } = require("../database/connection");
const { Analysis, Vulnerability } = require("../models");
const owaspMapping = require("../utils/owasp-mapping.json");

// -------- MOTEUR DE SCAN ----------
// Extraire un snippet de code depuis un fichier
function extractCodeSnippet(filePath, startLine, endLine, projectPath) {
  try {
    const fullPath = path.join(projectPath, filePath);
    if (!fs.existsSync(fullPath)) return null;

    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");

    // Ajouter 2 lignes de contexte avant et après
    const contextBefore = 2;
    const contextAfter = 2;
    const start = Math.max(0, (startLine || 1) - 1 - contextBefore);
    const end = Math.min(
      lines.length,
      (endLine || startLine || 1) + contextAfter,
    );

    return lines.slice(start, end).join("\n");
  } catch (error) {
    console.error(`Erreur lecture snippet: ${error.message}`);
    return null;
  }
}

function execPromise(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      {
        ...options,
        maxBuffer: 50 * 1024 * 1024,
        env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
      },
      (error, stdout, stderr) => {
        if (error) return reject(stderr || error.message);
        resolve(stdout);
      },
    );
  });
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// delete du fichier tmp apres le scan (on garde tout en DB)
function cleanupTmp(projectPath) {
  try {
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
  } catch (_) {}
}

function getRepoName(repoUrl) {
  try {
    const last = repoUrl.split("/").pop() || "";
    return last.endsWith(".git") ? last.slice(0, -4) : last;
  } catch {
    return null;
  }
}

// Mapping vers le model Vulnerability
function mapSeverity(semgrepSeverity) {
  const s = String(semgrepSeverity || "").toUpperCase();

  if (s.includes("CRITICAL")) return "critical";
  if (s.includes("ERROR") || s.includes("HIGH")) return "high";
  if (s.includes("WARNING") || s.includes("MEDIUM")) return "medium";
  if (s.includes("LOW")) return "low";
  return "info";
}

function extractOwaspCategory(metadata) {
  const owasp = metadata?.owasp;
  if (Array.isArray(owasp) && owasp.length > 0) {
    const m = String(owasp[0]).match(/A(0[1-9]|10)/);
    return m ? `A${m[1]}` : "Other";
  }
  return "Other";
}

function getOwaspInfo(category) {
  const info = owaspMapping[category];
  if (!info) return { owaspName: null, owaspDescription: null, owaspSeverity: null };
  return {
    owaspName: info.name,
    owaspDescription: info.description,
    owaspSeverity: info.severity,
  };
}

function extractCweId(metadata) {
  const cwe = metadata?.cwe;
  if (Array.isArray(cwe) && cwe.length > 0) {
    const m = String(cwe[0]).match(/CWE-\d+/);
    return m ? m[0] : null;
  }
  return null;
}

// Détecter les langages en scannant tous les fichiers du repo cloné
function detectLanguages(projectPath) {
  const extMap = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".py": "Python",
    ".java": "Java",
    ".rb": "Ruby",
    ".php": "PHP",
    ".go": "Go",
    ".rs": "Rust",
    ".c": "C",
    ".cpp": "C++",
    ".cs": "C#",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".scala": "Scala",
    ".html": "HTML",
    ".css": "CSS",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".sh": "Shell",
    ".sql": "SQL",
    ".dart": "Dart",
    ".lua": "Lua",
    ".vue": "Vue",
    ".svelte": "Svelte",
  };

  const langSet = new Set();
  const ignoreDirs = new Set(["node_modules", ".git", "vendor", "dist", "build", "__pycache__", ".next"]);

  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!ignoreDirs.has(entry.name)) {
            scanDir(path.join(dir, entry.name));
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (extMap[ext]) {
            langSet.add(extMap[ext]);
          }
        }
      }
    } catch (_) {}
  }

  scanDir(projectPath);
  return [...langSet].sort();
}

function computeScore(counts) {
  let score = 100;
  score -= counts.critical * 20;
  score -= counts.high * 10;
  score -= counts.medium * 5;
  score -= counts.low * 2;
  score -= counts.info * 1;
  return Math.max(0, Math.min(100, score));
}

function gradeFromScore(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ---------- CONTROLLER ----------
exports.scanRepo = async (req, res) => {
  console.log("Controller - req.body:", req.body);
  console.log("Controller - req.body.repoUrl:", req.body.repoUrl);

  const { repoUrl, branch } = req.body;
  const userId = req.user?.id;
  if (!userId)
    return res
      .status(401)
      .json({ error: "Unauthorized", message: "Token manquant ou invalide" });

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl manquant" });
  }

  const scanId = `scan_${Date.now()}`;
  const baseDir = "/tmp/securescan";
  const projectPath = path.join(baseDir, scanId);

  let analysis = null;

  try {
    ensureDir(baseDir);

    //Create Analysis en DB
    analysis = await Analysis.create({
      userId, // Lier l'analyse au user connecté
      repositoryUrl: repoUrl,
      repositoryName: getRepoName(repoUrl),
      sourceType: "git",
      branch: branch || "main",
      status: "analyzing",
      scanStartedAt: new Date(),
      userId: req.user.id,
    });

    // 2) git clone
    await execPromise(`git clone --depth 1 ${repoUrl} ${projectPath}`);
    if (branch && branch !== "main") {
      await execPromise(`git fetch --depth 1 origin ${branch}`, {
        cwd: projectPath,
      });
      await execPromise(`git checkout ${branch}`, { cwd: projectPath });
    }

    // Scan semgrep (avec UTF-8 pour Windows)
    const semgrepJson = await execPromise(
      `semgrep --config auto --json --disable-version-check`,
      {
        cwd: projectPath,
        timeout: 2 * 60 * 1000,
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          PYTHONUTF8: "1",
        },
      },
    );

    // Parsing du json
    let report;
    try {
      report = JSON.parse(semgrepJson);
    } catch (e) {
      await analysis.update({
        status: "failed",
        scanCompletedAt: new Date(),
        errorMessage: `Semgrep output non-JSON: ${String(e)}`,
      });

      return res.status(500).json({
        error: "Semgrep output non-JSON",
        details: String(e),
        raw: semgrepJson.slice(0, 2000),
      });
    }

    const results = report.results || [];

    //Transform results -> Vulnerability rows
    const vulnRows = results.map((r) => {
      const metadata = r?.extra?.metadata || {};
      const severity = mapSeverity(r?.extra?.severity);

      // Toujours extraire depuis le fichier (Semgrep peut retourner "requires login")
      let codeSnippet = null;
      if (r?.path && r?.start?.line) {
        codeSnippet = extractCodeSnippet(
          r.path,
          r.start.line,
          r.end?.line || r.start.line,
          projectPath,
        );
      }

      const owaspCategory = extractOwaspCategory(metadata);
      const owaspInfo = getOwaspInfo(owaspCategory);

      return {
        analysisId: analysis.id,
        title: r?.check_id || "Semgrep finding",
        description: r?.extra?.message || null,
        severity: owaspInfo.owaspSeverity || severity,
        owaspCategory,
        owaspName: owaspInfo.owaspName,
        owaspDescription: owaspInfo.owaspDescription,
        cweId: extractCweId(metadata),
        filePath: r?.path || null,
        lineNumber: r?.start?.line ?? null,
        lineEndNumber: r?.end?.line ?? null,
        codeSnippet,
        toolSource: "semgrep",
        ruleId: r?.check_id || null,
        confidence: "medium",
      };
    });

    // Counts + score
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const v of vulnRows) counts[v.severity]++;

    const total = vulnRows.length;
    const securityScore = computeScore(counts);
    const scoreGrade = gradeFromScore(securityScore);

    // Détecter les langages du projet (scan du dossier cloné)
    const detectedLanguages = detectLanguages(projectPath);
    const language = detectedLanguages.join(", ") || null;

    // insert vulnerabilities + update analysis
    await sequelize.transaction(async (t) => {
      if (vulnRows.length > 0) {
        await Vulnerability.bulkCreate(vulnRows, { transaction: t });
      }

      await analysis.update(
        {
          status: "completed",
          scanCompletedAt: new Date(),
          totalVulnerabilities: total,
          criticalCount: counts.critical,
          highCount: counts.high,
          mediumCount: counts.medium,
          lowCount: counts.low,
          infoCount: counts.info,
          securityScore,
          scoreGrade,
          language,
        },
        { transaction: t },
      );
    });

    return res.json({
      analysisId: analysis.id,
      scanId,
      status: "completed",
      repositoryUrl: analysis.repositoryUrl,
      repositoryName: analysis.repositoryName,
      summary: {
        totalVulnerabilities: total,
        counts,
        securityScore,
        scoreGrade,
      },
    });
  } catch (err) {
    if (analysis) {
      try {
        await analysis.update({
          status: "failed",
          scanCompletedAt: new Date(),
          errorMessage: String(err),
        });
      } catch (_) {}
    }

    return res.status(500).json({
      error: "Scan failed",
      details: String(err),
    });
  } finally {
    cleanupTmp(projectPath);
  }
};
