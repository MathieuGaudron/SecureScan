const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const { sequelize } = require("../database/connection");
const { Analysis, Vulnerability } = require("../models");
const owaspMapping = require("../utils/owasp-mapping.json");


// Crée un dossier s'il n'existe pas
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// Supprime le dossier temporaire après le scan
function cleanupTmp(projectPath) {
  try {
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
  } catch (_) {}
}

// Lance une commande (git, semgrep, npm, eslint…)
function execPromise(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      {
        ...options,
        maxBuffer: 100 * 1024 * 1024,
        env: {
          ...process.env,
          ...options.env,
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8",
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          if (stdout && stdout.trim().length > 0) return resolve(stdout);
          return reject(stderr || error.message);
        }
        resolve(stdout);
      },
    );
  });
}
// get name du repo depus l'url
function getRepoName(repoUrl) {
  try {
    const last = repoUrl.split("/").pop() || "";
    return last.endsWith(".git") ? last.slice(0, -4) : last;
  } catch {
    return null;
  }
}

// On extrait un petit bout de code autour d'une ligne (pour l'affichage)
function extractCodeSnippet(filePath, startLine, endLine, projectPath) {
  try {
    const fullPath = path.join(projectPath, filePath);
    if (!fs.existsSync(fullPath)) return null;

    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");

    const before = 2;
    const after = 2;

    const start = Math.max(0, (startLine || 1) - 1 - before);
    const end = Math.min(lines.length, (endLine || startLine || 1) + after);

    return lines.slice(start, end).join("\n");
  } catch {
    return null;
  }
}


// MAPPING OWASP + SEVERITY
function mapSemgrepSeverity(semgrepSeverity) {
  const s = String(semgrepSeverity || "").toUpperCase();
  if (s.includes("CRITICAL")) return "critical";
  if (s.includes("ERROR") || s.includes("HIGH")) return "high";
  if (s.includes("WARNING") || s.includes("MEDIUM")) return "medium";
  if (s.includes("LOW")) return "low";
  return "info";
}

function mapNpmSeverity(s) {
  const v = String(s || "").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high") return "high";
  if (v === "moderate" || v === "medium") return "medium";
  if (v === "low") return "low";
  return "info";
}

// ESLint : 2 = error, 1 = warning
function mapEslintSeverity(n) {
  if (n === 2) return "medium";
  if (n === 1) return "low";
  return "info";
}

// Sort le code OWASP (ex: A01, A02...) depuis les metadata Semgrep
function extractOwaspCategory(metadata) {
  const owasp = metadata?.owasp;
  if (Array.isArray(owasp) && owasp.length > 0) {
    const m = String(owasp[0]).match(/A(0[1-9]|10)/);
    return m ? `A${m[1]}` : "Other";
  }
  return "Other";
}

// Récupère le nom/description/sévérité depuis ton JSON
function getOwaspInfo(category) {
  const info = owaspMapping?.[category];
  if (!info) {
    return { owaspName: null, owaspDescription: null, owaspSeverity: null };
  }
  return {
    owaspName: info.name ?? null,
    owaspDescription: info.description ?? null,
    owaspSeverity: info.severity ?? null,
  };
}

// Extrait un identifiant CWE si présent
function extractCweId(metadata) {
  const cwe = metadata?.cwe;
  if (Array.isArray(cwe) && cwe.length > 0) {
    const m = String(cwe[0]).match(/CWE-\d+/);
    return m ? m[0] : null;
  }
  return null;
}


// SCORE 
function computeScore(counts) {
  let score = 100;
  score -= counts.critical * 20;
  score -= counts.high * 10;
  score -= counts.medium * 5;
  score -= counts.low * 2;
  score -= counts.info * 1;
  return Math.max(0, Math.min(100, score));
}
// GRADE
function gradeFromScore(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}



function isNodeProject(projectPath) {
  return fs.existsSync(path.join(projectPath, "package.json"));
}

// Installe les dépendances si besoin
async function ensureNodeDeps(projectPath) {
  if (!isNodeProject(projectPath)) return false;

  if (fs.existsSync(path.join(projectPath, "node_modules"))) return true;

  const hasLock = fs.existsSync(path.join(projectPath, "package-lock.json"));

  // On tente plusieurs commandes (ça évite de planter sur certains repos)
  const commands = hasLock
    ? [
        "npm ci --silent --ignore-scripts",
        "npm ci --silent --ignore-scripts --legacy-peer-deps",
      ]
    : [
        "npm install --silent --ignore-scripts",
        "npm install --silent --ignore-scripts --legacy-peer-deps",
      ];

  for (const cmd of commands) {
    try {
      console.log("⬇️ Installation deps:", cmd);
      await execPromise(cmd, { cwd: projectPath });
      console.log("✅ Dépendances installées");
      return true;
    } catch (e) {
      console.log("❌ Échec install:", cmd);
      console.log(String(e).slice(0, 600));
    }
  }

  throw new Error("Impossible d'installer les dépendances Node");
}

async function runNpmAudit(projectPath, analysisId) {
  console.log("🛡️ npm audit...");

  if (!isNodeProject(projectPath)) {
    console.log("↪️ Pas un projet Node => npm audit ignoré");
    return [];
  }

  try {
    await ensureNodeDeps(projectPath);

    const raw = await execPromise("npm audit --json", { cwd: projectPath });

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.log("❌ npm audit: JSON invalide");
      return [];
    }

    const rows = [];

    // Version moderne : data.vulnerabilities
    const vulns = data.vulnerabilities || {};
    for (const [pkg, v] of Object.entries(vulns)) {
      // v.via peut être une string ou un objet
      const via = Array.isArray(v.via) ? v.via : [];
      const firstViaObj = typeof via[0] === "object" ? via[0] : null;

      rows.push({
        analysisId,
        title: `npm audit: ${pkg}`,
        description: firstViaObj?.title || null,
        severity: mapNpmSeverity(v.severity),
        owaspCategory: "Other",
        owaspName: null,
        owaspDescription: null,
        cweId: null,
        filePath: "package-lock.json",
        lineNumber: null,
        lineEndNumber: null,
        codeSnippet: null,
        toolSource: "npm-audit",
        ruleId: firstViaObj?.source || null,
        confidence: "high",
      });
    }

    console.log("📊 npm audit findings:", rows.length);
    return rows;
  } catch (e) {
    console.log("❌ npm audit error:", String(e).slice(0, 800));
    return [];
  }
}

async function runEslint(projectPath, analysisId) {
  console.log("🧹 ESLint...");

  if (!isNodeProject(projectPath)) {
    console.log("↪️ Pas un projet Node => ESLint ignoré");
    return [];
  }

  try {
    await ensureNodeDeps(projectPath);

    // Si le repo n'a pas de config ESLint, ça peut échouer -> catch -> []
    const raw = await execPromise(
      "npx eslint . -f json --no-error-on-unmatched-pattern",
      { cwd: projectPath },
    );

    let report;
    try {
      report = JSON.parse(raw);
    } catch {
      console.log("❌ ESLint: JSON invalide");
      return [];
    }

    const rows = [];

    for (const file of report) {
      const relPath = file.filePath
        ? path.relative(projectPath, file.filePath)
        : null;

      for (const m of file.messages || []) {
        let codeSnippet = null;
        if (relPath && m.line) {
          codeSnippet = extractCodeSnippet(
            relPath,
            m.line,
            m.endLine || m.line,
            projectPath,
          );
        }

        rows.push({
          analysisId,
          title: `eslint: ${m.ruleId || "unknown"}`,
          description: m.message || null,
          severity: mapEslintSeverity(m.severity),
          owaspCategory: "Other",
          owaspName: null,
          owaspDescription: null,
          cweId: null,
          filePath: relPath,
          lineNumber: m.line || null,
          lineEndNumber: m.endLine || null,
          codeSnippet,
          toolSource: "eslint",
          ruleId: m.ruleId || null,
          confidence: "medium",
        });
      }
    }

    console.log("📊 ESLint findings:", rows.length);
    return rows;
  } catch (e) {
    // Très important : si pas de config eslint dans le repo, on ne casse pas le scan complet
    console.log("❌ ESLint error:", String(e).slice(0, 1200));
    return [];
  }
}


// api scan
exports.scanRepo = async (req, res) => {
  const { repoUrl, branch } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized", message: "Token manquant ou invalide" });
  }

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl manquant" });
  }

  const scanId = `scan_${Date.now()}`;
  const baseDir = "/tmp/securescan";
  const projectPath = path.join(baseDir, scanId);

  let analysis = null;

  try {
    ensureDir(baseDir);

    // 1) On crée la ligne "Analysis" en base
    analysis = await Analysis.create({
      userId,
      repositoryUrl: repoUrl,
      repositoryName: getRepoName(repoUrl),
      sourceType: "git",
      branch: branch || "main",
      status: "analyzing",
      scanStartedAt: new Date(),
    });

    // 2) Clone du repo
    console.log("📥 Clonage repo...");
    await execPromise(`git clone --depth 1 ${repoUrl} ${projectPath}`);
    console.log("✅ Repo cloné");

    // 3) Switch branch si nécessaire
    if (branch && branch !== "main") {
      await execPromise(`git fetch --depth 1 origin ${branch}`, { cwd: projectPath });
      await execPromise(`git checkout ${branch}`, { cwd: projectPath });
      console.log("🌿 Branch checkout:", branch);
    }

    // 4) Semgrep
    console.log("🔍 Semgrep...");
    const semgrepRaw = await execPromise(
      "semgrep --config auto --json --disable-version-check",
      {
        cwd: projectPath,
        timeout: 2 * 60 * 1000,
        env: { PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      },
    );

    let semgrepReport;
    try {
      semgrepReport = JSON.parse(semgrepRaw);
    } catch (e) {
      await analysis.update({
        status: "failed",
        scanCompletedAt: new Date(),
        errorMessage: `Semgrep JSON invalide: ${String(e)}`,
      });
      return res.status(500).json({
        error: "Semgrep output non-JSON",
        details: String(e),
      });
    }

    const semgrepRows = (semgrepReport.results || []).map((r) => {
      const metadata = r?.extra?.metadata || {};
      const baseSeverity = mapSemgrepSeverity(r?.extra?.severity);

      const owaspCategory = extractOwaspCategory(metadata);
      const owaspInfo = getOwaspInfo(owaspCategory);

      let codeSnippet = null;
      if (r?.path && r?.start?.line) {
        codeSnippet = extractCodeSnippet(
          r.path,
          r.start.line,
          r.end?.line || r.start.line,
          projectPath,
        );
      }

      return {
        analysisId: analysis.id,
        title: r?.check_id || "Semgrep finding",
        description: r?.extra?.message || null,

        // Si ton mapping OWASP donne une sévérité, on la prend, sinon on garde celle de semgrep
        severity: owaspInfo.owaspSeverity || baseSeverity,

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

    console.log("📊 Semgrep findings:", semgrepRows.length);

    // 5) npm audit + eslint (si projet node)
    const npmRows = await runNpmAudit(projectPath, analysis.id);
    const eslintRows = await runEslint(projectPath, analysis.id);

    console.log("📊 FINAL COUNT", {
      semgrep: semgrepRows.length,
      "npm-audit": npmRows.length,
      eslint: eslintRows.length,
    });

    // 6) Tout regrouper
    const allRows = [...semgrepRows, ...npmRows, ...eslintRows];

    // 7) Compteurs + score
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const v of allRows) counts[v.severity]++;

    const total = allRows.length;
    const securityScore = computeScore(counts);
    const scoreGrade = gradeFromScore(securityScore);

    // 8) Insertion DB en transaction
    await sequelize.transaction(async (t) => {
      if (allRows.length > 0) {
        await Vulnerability.bulkCreate(allRows, { transaction: t });
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
    console.log("❌ SCAN FAILED:", String(err).slice(0, 1200));

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