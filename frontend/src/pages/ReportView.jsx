import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ReportView() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, [analysisId]);

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/reports/view/${analysisId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération du rapport");
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      console.error("Erreur:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Génération du rapport avec Claude...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">❌ {error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded"
          >
            Retour au Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { analysis, vulnerabilities, reportContent } = reportData;

  // Fonction pour télécharger le rapport en PDF
  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/reports/generate/${analysisId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la génération du PDF");
      }

      // Télécharger le PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `securescan-report-${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erreur téléchargement PDF:", error);
      alert("Erreur lors du téléchargement du rapport PDF");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barre d'outils en haut */}
      <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center print:hidden">
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          ← Retour
        </button>
        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded"
        >
          Télécharger PDF
        </button>
      </div>

      {/* Document PDF simulé */}
      <div className="max-w-4xl mx-auto my-8 bg-white shadow-2xl print:shadow-none print:my-0">
        <div
          className="p-16 print:p-12"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {/* En-tête */}
          <div className="text-center mb-12 pb-8 border-b-2 border-gray-300">
            <h1 className="text-4xl font-bold text-red-600 mb-2">SecureScan</h1>
            <h2 className="text-2xl text-gray-800">Rapport de Sécurité</h2>
          </div>

          {/* Informations du projet */}
          <div className="mb-12 text-gray-700">
            <p className="mb-2">
              <strong>Projet :</strong>{" "}
              {analysis.repositoryName || analysis.repositoryUrl}
            </p>
            <p className="mb-2">
              <strong>Date :</strong>{" "}
              {new Date(analysis.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mb-2">
              <strong>Score de sécurité :</strong> {analysis.securityScore}/100
              (Grade {analysis.scoreGrade})
            </p>
            <p className="mb-2">
              <strong>Langage :</strong> {analysis.language || "Non détecté"}
            </p>
            <p className="mb-2">
              <strong>Vulnérabilités détectées :</strong>{" "}
              {analysis.totalVulnerabilities} (
              <span className="text-red-600 font-semibold">
                {analysis.criticalCount} critiques
              </span>
              ,{" "}
              <span className="text-orange-600 font-semibold">
                {analysis.highCount} élevées
              </span>
              , {analysis.mediumCount} moyennes, {analysis.lowCount} basses)
            </p>
          </div>

          {/* Contenu du rapport généré par Claude */}
          <div
            className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
            style={{
              fontSize: "16px",
              lineHeight: "1.8",
              textAlign: "justify",
            }}
          >
            {reportContent.reportText.split("\n\n").map((paragraph, idx) => {
              // Détecter les titres (tout en majuscules)
              if (
                paragraph.trim() === paragraph.trim().toUpperCase() &&
                paragraph.trim().length < 50
              ) {
                return (
                  <h2
                    key={idx}
                    className="text-2xl font-bold text-gray-900 mt-8 mb-4"
                  >
                    {paragraph.trim()}
                  </h2>
                );
              }
              // Paragraphe normal
              return (
                <p key={idx} className="mb-4">
                  {paragraph.trim()}
                </p>
              );
            })}
          </div>

          {/* Annexe : Liste des vulnérabilités */}
          <div className="mt-16 pt-8 border-t-2 border-gray-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Annexe : Liste des Vulnérabilités
            </h2>
            <p className="text-gray-700 mb-6">
              Total : {vulnerabilities.length} vulnérabilité(s) détectée(s).
            </p>

            <div className="space-y-6">
              {vulnerabilities.slice(0, 30).map((vuln, idx) => (
                <div
                  key={vuln.id}
                  className="border-l-4 border-gray-400 pl-4 py-2"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {idx + 1}. {vuln.title}
                    </h3>
                    <span
                      className={`text-sm font-bold uppercase ml-4 ${
                        vuln.severity === "critical"
                          ? "text-red-600"
                          : vuln.severity === "high"
                            ? "text-orange-600"
                            : vuln.severity === "medium"
                              ? "text-yellow-600"
                              : "text-green-600"
                      }`}
                    >
                      {vuln.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    📁 Fichier : {vuln.filePath}:{vuln.lineNumber}
                  </p>
                  {vuln.description && (
                    <p className="text-sm text-gray-700 mt-2">
                      {vuln.description}
                    </p>
                  )}
                </div>
              ))}

              {vulnerabilities.length > 30 && (
                <p className="text-gray-500 italic text-center mt-8">
                  ... et {vulnerabilities.length - 30} autres vulnérabilité(s)
                </p>
              )}
            </div>
          </div>

          {/* Pied de page */}
          <div className="mt-16 pt-8 border-t border-gray-300 text-center text-sm text-gray-500">
            <p>
              Rapport généré par SecureScan -{" "}
              {new Date().toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
