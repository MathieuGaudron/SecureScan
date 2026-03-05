const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const simpleGit = require("simple-git");

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

// Nettoie les dossiers temporaires de plus de 24 heures
function cleanupOldScans() {
  const baseDir = "/tmp/securescan";
  const maxAgeMs = 24 * 60 * 60 * 1000; // 24 heures

  try {
    if (!fs.existsSync(baseDir)) return;

    const dirs = fs.readdirSync(baseDir);
    const now = Date.now();
    let cleaned = 0;

    for (const dir of dirs) {
      const dirPath = path.join(baseDir, dir); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
      const stats = fs.statSync(dirPath);

      // Si le dossier a plus de 24h, le supprimer
      if (now - stats.mtimeMs > maxAgeMs) {
        console.log(`🧹 Nettoyage dossier ancien: ${dir}`);
        fs.rmSync(dirPath, { recursive: true, force: true });
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`✅ ${cleaned} dossier(s) temporaire(s) nettoyé(s)`);
    }
  } catch (error) {
    console.error("❌ Erreur nettoyage automatique:", error.message);
  }
}

// Lance une commande (git, semgrep, npm, eslint…)
// Utilisé uniquement avec des commandes hardcodées (npm, semgrep, eslint), pas d'entrée utilisateur
function execPromise(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    exec(
      // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
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

// Fonction de validation pour éviter le path traversal
// Cette fonction est elle-même la protection contre le path traversal
function validatePath(basePath, targetPath) {
  const resolvedBase = path.resolve(basePath); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const resolvedTarget = path.resolve(basePath, targetPath); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal

  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error("Path traversal detected");
  }

  return resolvedTarget;
}

// On extrait un petit bout de code autour d'une ligne (pour l'affichage)
function extractCodeSnippet(filePath, startLine, endLine, projectPath) {
  try {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    // Protégé par validatePath() qui vérifie qu'on ne sort pas du répertoire de base
    const fullPath = validatePath(projectPath, filePath);
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
// Priorite : tag 2025 > tag 2021 > premier tag trouve
function extractOwaspCategory(metadata) {
  const owasp = metadata?.owasp;
  if (!Array.isArray(owasp) || owasp.length === 0) return "Other";

  // Chercher d'abord un tag :2025
  for (const tag of owasp) {
    const m2025 = String(tag).match(/A(0[1-9]|10):2025/);
    if (m2025) return `A${m2025[1]}`;
  }

  // Sinon un tag :2021
  for (const tag of owasp) {
    const m2021 = String(tag).match(/A(0[1-9]|10):2021/);
    if (m2021) return `A${m2021[1]}`;
  }

  // Sinon le premier tag OWASP trouve
  for (const tag of owasp) {
    const m = String(tag).match(/A(0[1-9]|10)/);
    if (m) return `A${m[1]}`;
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

// Mappe un ruleId ESLint vers une catégorie OWASP
// en cherchant dans les rules[] du owasp-mapping.json
function mapEslintToOwasp(ruleId) {
  if (!ruleId) return "Other";
  for (const [category, info] of Object.entries(owaspMapping)) {
    if (!Array.isArray(info.rules)) continue;
    for (const rule of info.rules) {
      // Les rules dans le JSON sont prefixees "eslint." (ex: "eslint.security/detect-eval-with-expression")
      if (rule.startsWith("eslint.") && rule.slice(7) === ruleId) {
        return category;
      }
    }
  }
  return "Other";
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
  const ignoreDirs = new Set([
    "node_modules",
    ".git",
    "vendor",
    "dist",
    "build",
    "__pycache__",
    ".next",
  ]);

  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!ignoreDirs.has(entry.name)) {
            scanDir(path.join(dir, entry.name)); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
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

function isNodeProject(projectPath) {
  return fs.existsSync(path.join(projectPath, "package.json")); // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
}

// Installe les dépendances si besoin
async function ensureNodeDeps(projectPath) {
  if (!isNodeProject(projectPath)) return false;

  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  if (fs.existsSync(path.join(projectPath, "node_modules"))) return true;

  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
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

      const npmOwasp = getOwaspInfo("A03");
      rows.push({
        analysisId,
        title: `npm audit: ${pkg}`,
        description: firstViaObj?.title || null,
        severity: mapNpmSeverity(v.severity),
        owaspCategory: "A03",
        owaspName: npmOwasp.owaspName,
        owaspDescription: npmOwasp.owaspDescription,
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

        const eslintOwasp = mapEslintToOwasp(m.ruleId);
        const eslintOwaspInfo = getOwaspInfo(eslintOwasp);
        rows.push({
          analysisId,
          title: `eslint: ${m.ruleId || "unknown"}`,
          description: m.message || null,
          severity:
            eslintOwaspInfo.owaspSeverity || mapEslintSeverity(m.severity),
          owaspCategory: eslintOwasp,
          owaspName: eslintOwaspInfo.owaspName,
          owaspDescription: eslintOwaspInfo.owaspDescription,
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

// ============================================================
// Logique partagee : lance Semgrep + npm audit + ESLint,
// calcule le score, detecte les langages, sauve en DB.
// Utilisee par scanRepo (Git) ET scanZip (ZIP).
// ============================================================
async function runAnalysis(projectPath, analysis) {
  // 1) Semgrep
  console.log("🔍 Semgrep...");
  let semgrepRows = [];
  try {
    const semgrepRaw = await execPromise(
      "semgrep --config auto --json --disable-version-check",
      {
        cwd: projectPath,
        timeout: 2 * 60 * 1000,
        env: { PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
      },
    );

    const semgrepReport = JSON.parse(semgrepRaw);

    semgrepRows = (semgrepReport.results || []).map((r) => {
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

      const suggestedFix = r?.extra?.fix || null;

      return {
        analysisId: analysis.id,
        title: r?.check_id || "Semgrep finding",
        description: r?.extra?.message || null,
        severity: owaspInfo.owaspSeverity || baseSeverity,
        owaspCategory,
        owaspName: owaspInfo.owaspName,
        owaspDescription: owaspInfo.owaspDescription,
        cweId: extractCweId(metadata),
        filePath: r?.path || null,
        lineNumber: r?.start?.line ?? null,
        lineEndNumber: r?.end?.line ?? null,
        codeSnippet,
        suggestedFix,
        toolSource: "semgrep",
        ruleId: r?.check_id || null,
        confidence: "medium",
      };
    });
  } catch (e) {
    console.log("⚠️ Semgrep error (on continue):", String(e).slice(0, 800));
  }

  console.log("📊 Semgrep findings:", semgrepRows.length);

  // 2) npm audit + eslint (si projet node)
  const npmRows = await runNpmAudit(projectPath, analysis.id);
  const eslintRows = await runEslint(projectPath, analysis.id);

  console.log("📊 FINAL COUNT", {
    semgrep: semgrepRows.length,
    "npm-audit": npmRows.length,
    eslint: eslintRows.length,
  });

  // 3) Tout regrouper
  const allRows = [...semgrepRows, ...npmRows, ...eslintRows];

  // 4) Compteurs + score
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const v of allRows) counts[v.severity]++;

  const total = allRows.length;
  const securityScore = computeScore(counts);
  const scoreGrade = gradeFromScore(securityScore);

  // 5) Detecter les langages
  const detectedLanguages = detectLanguages(projectPath);
  const language = detectedLanguages.join(", ") || null;

  // 6) Insertion DB en transaction
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
        language,
        projectPath,
      },
      { transaction: t },
    );
  });

  return {
    analysisId: analysis.id,
    status: "completed",
    repositoryUrl: analysis.repositoryUrl,
    repositoryName: analysis.repositoryName,
    summary: {
      totalVulnerabilities: total,
      counts,
      securityScore,
      scoreGrade,
    },
  };
}

// ============================================================
// SCAN GIT (existant, refactoré)
// ============================================================
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

    analysis = await Analysis.create({
      userId,
      repositoryUrl: repoUrl,
      repositoryName: getRepoName(repoUrl),
      sourceType: "git",
      branch: branch || "main",
      status: "analyzing",
      scanStartedAt: new Date(),
    });

    // Clone - Utiliser simple-git pour éviter l'injection de commandes
    console.log("📥 Clonage repo...");
    const git = simpleGit();
    await git.clone(repoUrl, projectPath, ["--depth", "1"]);
    console.log("✅ Repo cloné");

    if (branch && branch !== "main") {
      // Valider le nom de la branche (alphanumeric, -, _, /)
      if (!/^[a-zA-Z0-9_\-\/]+$/.test(branch)) {
        throw new Error("Invalid branch name");
      }
      const gitRepo = simpleGit(projectPath);
      await gitRepo.fetch(["--depth", "1", "origin", branch]);
      await gitRepo.checkout(branch);
      console.log("🌿 Branch checkout:", branch);
    }

    // Analyse partagee
    const result = await runAnalysis(projectPath, analysis);
    result.scanId = scanId;
    return res.json(result);
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
    // NE PAS nettoyer ici - les fichiers sont nécessaires pour la génération de corrections avec Claude
    // cleanupTmp(projectPath);
  }
};

// ============================================================
// SCAN ZIP (nouveau)
// ============================================================
exports.scanZip = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized", message: "Token manquant ou invalide" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Fichier ZIP manquant" });
  }

  const scanId = `scan_${Date.now()}`;
  const baseDir = "/tmp/securescan";
  const projectPath = path.join(baseDir, scanId);
  let analysis = null;

  try {
    ensureDir(baseDir);
    ensureDir(projectPath);

    // Extraction du ZIP
    console.log("📦 Extraction ZIP...");
    const zip = new AdmZip(req.file.buffer);
    zip.extractAllTo(projectPath, true);
    console.log("✅ ZIP extrait");

    // Si le ZIP contient un seul dossier racine, on rentre dedans
    let actualPath = projectPath;
    const entries = fs.readdirSync(projectPath);
    if (entries.length === 1) {
      const singleEntry = path.join(projectPath, entries[0]);
      if (fs.statSync(singleEntry).isDirectory()) {
        actualPath = singleEntry;
      }
    }

    const originalName = req.file.originalname
      ? req.file.originalname.replace(/\.zip$/i, "")
      : "zip-upload";

    analysis = await Analysis.create({
      userId,
      repositoryUrl: `zip://${originalName}`,
      repositoryName: originalName,
      sourceType: "zip",
      branch: null,
      status: "analyzing",
      scanStartedAt: new Date(),
    });

    // Analyse partagee (memes outils que Git)
    const result = await runAnalysis(actualPath, analysis);
    result.scanId = scanId;
    return res.json(result);
  } catch (err) {
    console.log("❌ SCAN ZIP FAILED:", String(err).slice(0, 1200));

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
    // NE PAS nettoyer ici - les fichiers sont nécessaires pour la génération de corrections avec Claude
    // cleanupTmp(projectPath);
  }
};

// Exporter la fonction de nettoyage pour l'utiliser au démarrage du serveur
exports.cleanupOldScans = cleanupOldScans;
