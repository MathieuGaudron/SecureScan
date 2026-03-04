import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const severityStyles = {
  critical: { label: "Critique", bg: "bg-red-500", text: "text-white" },
  high: { label: "Elevee", bg: "bg-orange-500", text: "text-white" },
  medium: { label: "Moyenne", bg: "bg-yellow-500", text: "text-black" },
  low: { label: "Basse", bg: "bg-green-500", text: "text-white" },
  info: { label: "Info", bg: "bg-blue-500", text: "text-white" },
};

function FindingCard({
  finding,
  isApplied,
  onApplyFix,
  onCancelFix,
  onRejectFix,
}) {
  const [expanded, setExpanded] = useState(false);
  const [generatedFix, setGeneratedFix] = useState(finding.fix || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const style = severityStyles[finding.severity] || severityStyles.info;

  const generateFix = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/fixes/generate/${finding.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la génération du fix");
      }

      const data = await response.json();
      setGeneratedFix(data.fix);
    } catch (err) {
      console.error("Erreur generateFix:", err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReject = async (e) => {
    e.stopPropagation();
    if (generatedFix?.fix?.id) {
      await onRejectFix(generatedFix.fix.id);
      setGeneratedFix(null); // Faire disparaître la correction
    }
  };

  return (
    <div
      className={`bg-[#1a1f2e] border rounded-xl overflow-hidden transition-colors ${
        isApplied ? "border-emerald-500/50" : "border-gray-700"
      }`}
    >
      <div
        className="p-4 cursor-pointer hover:bg-[#1e2438] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold ${style.bg} ${style.text}`}
          >
            {style.label}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-700 text-gray-300">
            {finding.owaspCategory}
            {finding.owaspName ? ` - ${finding.owaspName}` : ""}
          </span>
          <span className="text-xs text-gray-500">{finding.toolSource}</span>
          {isApplied && (
            <span className="ml-auto text-xs text-emerald-400 font-medium">
              ✓ Fix applique
            </span>
          )}
          <span className="ml-auto text-gray-500 text-lg">
            {expanded ? "▾" : "▸"}
          </span>
        </div>
        <p className="text-white text-sm font-medium">{finding.title}</p>
        <p className="text-gray-500 text-xs mt-1">
          {finding.filePath}:{finding.lineNumber}
        </p>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700/50 pt-3">
          <p className="text-gray-400 text-sm mb-3">{finding.description}</p>

          {finding.owaspDescription && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-3">
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                OWASP {finding.owaspCategory} - {finding.owaspName}
              </p>
              <p className="text-gray-400 text-xs">
                {finding.owaspDescription}
              </p>
            </div>
          )}

          {finding.codeSnippet && (
            <>
              <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">
                Code vulnerable
              </p>
              <div className="bg-[#0f1419] rounded-lg p-3 mb-4">
                <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap">
                  {finding.codeSnippet}
                </pre>
              </div>
            </>
          )}

          {/* Affichage du suggestedFix (autofix Semgrep) si disponible */}
          {finding.suggestedFix && !generatedFix && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                Correction Semgrep
              </p>
              <pre className="text-blue-300 text-sm font-mono whitespace-pre-wrap">
                {finding.suggestedFix}
              </pre>
              <p className="text-gray-400 text-xs mt-2 italic">
                Correction automatique détectée par Semgrep
              </p>
            </div>
          )}

          {generatedFix ? (
            <>
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                Correction proposee
              </p>
              <div className="bg-[#0f1419] rounded-lg p-3 mb-4">
                {/* Titre de la correction */}
                {generatedFix.fix?.title && (
                  <p className="text-emerald-300 text-sm font-semibold mb-2">
                    {generatedFix.fix.title}
                  </p>
                )}

                {/* Type et confiance */}
                <div className="flex gap-2 mb-3">
                  {/* Badge type de correction */}
                  {generatedFix.fix?.type && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        generatedFix.fix.type === "ai-generated"
                          ? "bg-purple-500/20 text-purple-400"
                          : generatedFix.fix.type === "semgrep-autofix"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {generatedFix.fix.type === "ai-generated"
                        ? "🤖 Claude AI"
                        : generatedFix.fix.type === "semgrep-autofix"
                          ? "Semgrep Autofix"
                          : "Template OWASP"}
                    </span>
                  )}
                  {generatedFix.confidence && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        generatedFix.confidence === "high"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : generatedFix.confidence === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      Confiance: {generatedFix.confidence}
                    </span>
                  )}
                  {generatedFix.canAutoApply && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                      Auto-applicable
                    </span>
                  )}
                </div>

                {/* Code avant/après */}
                {generatedFix.fix?.diff && (
                  <div className="space-y-2 mb-3">
                    {generatedFix.fix.diff.before && (
                      <div>
                        <p className="text-red-400 text-xs font-medium mb-1">
                          Avant:
                        </p>
                        <pre className="text-red-300 text-sm font-mono whitespace-pre-wrap bg-red-900/10 rounded p-2">
                          {generatedFix.fix.diff.before}
                        </pre>
                      </div>
                    )}
                    {generatedFix.fix.diff.after && (
                      <div>
                        <p className="text-emerald-400 text-xs font-medium mb-1">
                          Après:
                        </p>
                        <pre className="text-emerald-300 text-sm font-mono whitespace-pre-wrap bg-emerald-900/10 rounded p-2">
                          {generatedFix.fix.diff.after}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Explication */}
                {generatedFix.fix?.explanation && (
                  <div className="mb-3">
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {generatedFix.fix.explanation}
                    </p>
                  </div>
                )}

                {/* Ressources */}
                {generatedFix.fix?.resources &&
                  generatedFix.fix.resources.length > 0 && (
                    <div className="border-t border-gray-700 pt-2">
                      <p className="text-cyan-400 text-xs font-medium mb-1">
                        Ressources:
                      </p>
                      <ul className="space-y-1">
                        {generatedFix.fix.resources.map((resource, idx) => (
                          <li key={idx}>
                            <a
                              href={resource}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 text-xs underline"
                            >
                              {resource}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {!isApplied ? (
                <div className="flex gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyFix(finding.id);
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Appliquer le fix
                  </button>
                  <button
                    onClick={handleReject}
                    className="border border-gray-600 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Rejeter
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <span className="text-emerald-400 text-sm font-medium py-2">
                    Correction appliquee
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelFix(finding.id);
                    }}
                    className="text-gray-500 text-sm hover:text-red-400 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </>
          ) : (
            <div>
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-3">
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  generateFix();
                }}
                disabled={isGenerating}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generation en cours...
                  </span>
                ) : (
                  "Generer une correction"
                )}
              </button>
              <p className="text-gray-500 text-xs italic mt-2 text-center">
                Génère une correction basée sur les templates OWASP
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Findings({
  scanResults,
  appliedFixes,
  onApplyFix,
  onCancelFix,
  onRejectFix,
}) {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [owaspFilter, setOwaspFilter] = useState("all");
  const [githubConnected, setGithubConnected] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState(null);
  const navigate = useNavigate();

  // Vérifier la connexion GitHub au chargement
  useEffect(() => {
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/github/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGithubConnected(data.connected);
      }
    } catch (err) {
      console.error("Erreur checkGitHubConnection:", err);
    }
  };

  const handlePushFixes = async () => {
    if (!githubConnected) {
      navigate("/settings");
      return;
    }

    if (appliedFixes.size === 0) {
      return;
    }

    try {
      setIsPushing(true);
      setPushMessage(null);

      const token = localStorage.getItem("token");

      // Récupérer les fixes depuis la BDD pour les vulnérabilités appliquées
      const fixesToPush = [];
      for (const vulnId of appliedFixes) {
        const vuln = scanResults.vulnerabilities.find((v) => v.id === vulnId);
        if (!vuln) continue;

        // Chercher le fix en BDD
        const fixResponse = await fetch(
          `http://localhost:3000/api/vulnerabilities/${vulnId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (fixResponse.ok) {
          const vulnData = await fixResponse.json();
          if (vulnData.fix && vulnData.fix.fixedCode) {
            fixesToPush.push({
              filePath: vuln.filePath,
              fixedCode: vulnData.fix.fixedCode,
              description: vuln.title,
            });
          }
        }
      }

      if (fixesToPush.length === 0) {
        setPushMessage({
          type: "error",
          text: "Aucune correction valide à pousser. Assurez-vous d'avoir généré et appliqué les corrections.",
        });
        setIsPushing(false);
        return;
      }

      const response = await fetch("http://localhost:3000/api/github/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysisId: scanResults.id,
          repositoryUrl:
            scanResults.repositoryUrl || scanResults.repositoryName,
          fixes: fixesToPush,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors du push");
      }

      setPushMessage({
        type: "success",
        text: `Pull Request créée avec succès ! ${data.pullRequest.url}`,
        prUrl: data.pullRequest.url,
      });
    } catch (err) {
      console.error("Erreur handlePushFixes:", err);
      setPushMessage({ type: "error", text: err.message });
    } finally {
      setIsPushing(false);
    }
  };

  if (!scanResults) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-400 text-lg mb-4">Aucune analyse disponible</p>
        <button
          onClick={() => navigate("/")}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Lancer une analyse
        </button>
      </div>
    );
  }

  const vulnerabilities = scanResults.vulnerabilities || [];

  const filtered = vulnerabilities.filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (owaspFilter !== "all" && f.owaspCategory !== owaspFilter) return false;
    return true;
  });

  const owaspCategories = [
    ...new Set(vulnerabilities.map((f) => f.owaspCategory)),
  ].sort();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          Vulnérabilités détaillées{" "}
          <span className="text-gray-400 text-lg font-normal">
            {filtered.length} resultat(s)
          </span>
        </h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-[#1a1f2e] border border-gray-600 text-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Toutes severites</option>
          <option value="critical">Critique</option>
          <option value="high">Elevee</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>

        <select
          value={owaspFilter}
          onChange={(e) => setOwaspFilter(e.target.value)}
          className="bg-[#1a1f2e] border border-gray-600 text-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Toutes categories OWASP</option>
          {owaspCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filtered.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            isApplied={appliedFixes.has(finding.id)}
            onApplyFix={onApplyFix}
            onCancelFix={onCancelFix}
            onRejectFix={onRejectFix}
          />
        ))}
      </div>

      {/* Push Button */}
      {appliedFixes.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          {pushMessage && (
            <div
              className={`px-4 py-2 rounded-lg text-sm ${
                pushMessage.type === "success"
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {pushMessage.text}
              {pushMessage.prUrl && (
                <a
                  href={pushMessage.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline hover:text-green-300"
                >
                  Voir la PR
                </a>
              )}
            </div>
          )}

          <button
            onClick={handlePushFixes}
            disabled={isPushing}
            className={`${
              githubConnected
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-orange-500 hover:bg-orange-600"
            } text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2`}
          >
            {isPushing ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Push en cours...
              </>
            ) : githubConnected ? (
              <>
                Push les corrections sur GitHub ({appliedFixes.size} fix
                {appliedFixes.size > 1 ? "s" : ""})
              </>
            ) : (
              <>
                Connecter GitHub pour push ({appliedFixes.size} fix
                {appliedFixes.size > 1 ? "s" : ""})
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default Findings;
