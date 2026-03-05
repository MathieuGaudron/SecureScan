import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Soumission from "./pages/Soumission";
import Dashboard from "./pages/Dashboard";
import Findings from "./pages/Findings";
import Historique from "./pages/Historique";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ReportView from "./pages/ReportView";
import { useState } from "react";

function App() {
  const [scanResults, setScanResults] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState([]);
  const [appliedFixes, setAppliedFixes] = useState(new Set());
  const [scanError, setScanError] = useState(null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const handleStartScan = async (projectInfo) => {
    // Vérifier que l'utilisateur est connecté
    const token = localStorage.getItem("token");
    if (!user || !token) {
      setScanError("Vous devez être connecté pour lancer un scan");
      return false;
    }

    setIsScanning(true);
    setScanProgress([]);
    setAppliedFixes(new Set());
    setScanError(null);

    // Animation de progression pendant que le backend scanne
    const tools = ["Semgrep", "npm audit", "ESLint Security"];
    const timers = tools.map((tool, i) =>
      setTimeout(
        () => setScanProgress((prev) => [...prev, tool]),
        (i + 1) * 1000,
      ),
    );

    try {
      let res;

      if (projectInfo.zipFile) {
        // Mode ZIP : envoi du fichier via FormData
        const formData = new FormData();
        formData.append("zipFile", projectInfo.zipFile);

        res = await fetch("/api/scan/zip", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      } else {
        // Mode Git URL (existant)
        res = await fetch("/api/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ repoUrl: projectInfo.url, branch: "main" }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setScanError(data.error || data.message || "Erreur lors du scan");
        setIsScanning(false);
        timers.forEach(clearTimeout);
        return false;
      }

      // Récupérer les détails de l'analyse avec les vulnérabilités
      const detailRes = await fetch(`/api/analysis/${data.analysisId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const analysisDetail = await detailRes.json();

      if (!detailRes.ok) {
        setScanError("Erreur lors de la récupération des résultats");
        setIsScanning(false);
        timers.forEach(clearTimeout);
        return false;
      }

      setScanResults(analysisDetail);
      timers.forEach(clearTimeout);
      setScanProgress(tools);
      setIsScanning(false);
      return true;
    } catch (error) {
      console.error("Erreur scan:", error);
      setScanError("Erreur de connexion au serveur");
      timers.forEach(clearTimeout);
      setIsScanning(false);
      return false;
    }
  };

  const handleApplyFix = (findingId) => {
    setAppliedFixes((prev) => new Set([...prev, findingId]));
  };

  const handleCancelFix = (findingId) => {
    setAppliedFixes((prev) => {
      const newSet = new Set(prev);
      newSet.delete(findingId);
      return newSet;
    });
  };

  const handleRejectFix = async (fixId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/fixes/${fixId}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Erreur lors du rejet du fix");
      }

      console.log("Fix rejeté avec succès");
      // Rafraîchir les résultats si nécessaire
    } catch (error) {
      console.error("Erreur handleRejectFix:", error);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#0f1419]">
        <Header user={user} onLogout={handleLogout} />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route
              path="/"
              element={
                <Soumission
                  onStartScan={handleStartScan}
                  isScanning={isScanning}
                  scanProgress={scanProgress}
                  scanError={scanError}
                  user={user}
                />
              }
            />
            <Route
              path="/dashboard"
              element={<Dashboard scanResults={scanResults} />}
            />
            <Route
              path="/dashboard/:id"
              element={<Dashboard scanResults={scanResults} />}
            />
            <Route
              path="/findings"
              element={
                <Findings
                  scanResults={scanResults}
                  appliedFixes={appliedFixes}
                  onApplyFix={handleApplyFix}
                  onCancelFix={handleCancelFix}
                  onRejectFix={handleRejectFix}
                />
              }
            />
            <Route path="/historique" element={<Historique />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/report/:analysisId" element={<ReportView />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route
              path="/register"
              element={<Register onLogin={handleLogin} />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
