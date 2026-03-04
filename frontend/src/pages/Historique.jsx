import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Historique() {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterProject, setFilterProject] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:3000/api/analysis/history",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération de l'historique");
      }

      const data = await response.json();
      setScans(data.scans);
      setStats(data.stats);
    } catch (err) {
      console.error("Erreur fetchHistory:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Extraire les projets uniques pour le filtre
  const uniqueProjects = [...new Set(scans.map((scan) => scan.repositoryUrl))];

  // Filtrer les scans
  const filteredScans =
    filterProject === "all"
      ? scans
      : scans.filter((scan) => scan.repositoryUrl === filterProject);

  // Extraire le nom du repository depuis l'URL
  const getRepositoryName = (url) => {
    try {
      // Enlever .git à la fin si présent
      const cleanUrl = url.replace(/\.git$/, "");
      // Extraire seulement le nom du repo (dernière partie)
      const parts = cleanUrl.split("/");
      return parts[parts.length - 1] || url;
    } catch {
      return url;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: "bg-emerald-500/20 text-emerald-400",
      failed: "bg-red-500/20 text-red-400",
      in_progress: "bg-yellow-500/20 text-yellow-400",
    };
    return styles[status] || "bg-gray-500/20 text-gray-400";
  };

  const getStatusLabel = (status) => {
    const labels = {
      completed: "Terminé",
      failed: "Échoué",
      in_progress: "En cours",
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Chargement de l'historique...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">
        Historique des scans
      </h1>
      <p className="text-gray-400 mb-6">
        Retrouvez tous vos scans des 30 derniers jours
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total scans</p>
          <p className="text-3xl font-bold text-white mt-1">
            {stats.totalScans || 0}
          </p>
        </div>
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Vulnérabilités trouvées</p>
          <p className="text-3xl font-bold text-orange-400 mt-1">
            {stats.totalVulnerabilities || 0}
          </p>
        </div>
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Projets scannés</p>
          <p className="text-3xl font-bold text-cyan-400 mt-1">
            {stats.projectsScanned || 0}
          </p>
        </div>
      </div>

      {/* Filtre */}
      <div className="mb-4">
        <label className="text-gray-400 text-sm block mb-2">
          Filtrer par projet
        </label>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="bg-[#1a1f2e] border border-gray-700 rounded-lg px-4 py-2 text-white w-full md:w-auto"
        >
          <option value="all">Tous les projets</option>
          {uniqueProjects.map((project) => (
            <option key={project} value={project}>
              {getRepositoryName(project)}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau des scans */}
      {filteredScans.length === 0 ? (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-400">
            Aucun scan trouvé dans les 30 derniers jours
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f1419] border-b border-gray-700">
                <tr>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">
                    Date
                  </th>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">
                    Projet
                  </th>
                  <th className="text-left text-gray-400 text-sm font-medium px-4 py-3">
                    Repository
                  </th>
                  <th className="text-center text-gray-400 text-sm font-medium px-4 py-3">
                    Vulnérabilités
                  </th>
                  <th className="text-center text-gray-400 text-sm font-medium px-4 py-3">
                    Statut
                  </th>
                  <th className="text-center text-gray-400 text-sm font-medium px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredScans.map((scan) => (
                  <tr
                    key={scan.id}
                    className="border-b border-gray-700 hover:bg-[#1e2438] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {formatDate(scan.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {scan.projectName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                      {scan.repositoryUrl}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          scan.vulnerabilitiesCount > 0
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {scan.vulnerabilitiesCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(scan.status)}`}
                      >
                        {getStatusLabel(scan.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/dashboard/${scan.id}`)}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        Voir détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Historique;
