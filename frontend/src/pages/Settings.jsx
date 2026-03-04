import { useState, useEffect } from "react";

function Settings() {
  const [githubToken, setGithubToken] = useState("");
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/github/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          setConnection(data);
        }
      }
    } catch (err) {
      console.error("Erreur fetchConnectionStatus:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToken = async (e) => {
    e.preventDefault();

    if (!githubToken.trim()) {
      setMessage({ type: "error", text: "Veuillez entrer un token GitHub" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/github/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: githubToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'enregistrement");
      }

      setMessage({
        type: "success",
        text: "Token GitHub enregistré avec succès !",
      });
      setGithubToken("");

      // Rafraîchir le statut
      await fetchConnectionStatus();
    } catch (err) {
      console.error("Erreur handleSaveToken:", err);
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm("Êtes-vous sûr de vouloir déconnecter votre compte GitHub ?")
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:3000/api/github/connection",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        setMessage({ type: "success", text: "Connexion GitHub supprimée" });
        setConnection(null);
      }
    } catch (err) {
      console.error("Erreur handleDisconnect:", err);
      setMessage({ type: "error", text: "Erreur lors de la déconnexion" });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">⚙️ Paramètres</h1>
          <p className="text-gray-400">
            Configurez vos intégrations et préférences
          </p>
        </div>

        {/* Message de feedback */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Section GitHub */}
        <div className="bg-[#1a1f2e] rounded-lg p-6 border border-gray-700/50">
          <div className="flex items-center mb-4">
            <svg
              className="w-8 h-8 mr-3"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <div>
              <h2 className="text-xl font-semibold">Connexion GitHub</h2>
              <p className="text-sm text-gray-400">
                Connectez votre compte GitHub pour pousser des corrections
              </p>
            </div>
          </div>

          {connection ? (
            // Connecté
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-400 font-medium mb-2">
                      ✓ Compte connecté
                    </p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-gray-400">Utilisateur:</span>{" "}
                        <span className="text-white font-mono">
                          {connection.githubUsername}
                        </span>
                      </p>
                      {connection.githubEmail && (
                        <p>
                          <span className="text-gray-400">Email:</span>{" "}
                          <span className="text-white">
                            {connection.githubEmail}
                          </span>
                        </p>
                      )}
                      <p>
                        <span className="text-gray-400">Connecté le:</span>{" "}
                        <span className="text-white">
                          {formatDate(connection.createdAt)}
                        </span>
                      </p>
                      {connection.lastUsed && (
                        <p>
                          <span className="text-gray-400">
                            Dernière utilisation:
                          </span>{" "}
                          <span className="text-white">
                            {formatDate(connection.lastUsed)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg transition-colors"
              >
                Déconnecter GitHub
              </button>
            </div>
          ) : (
            // Non connecté - formulaire
            <div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p className="text-blue-400 text-sm mb-2">
                  ℹ️ Pour générer un token GitHub:
                </p>
                <ol className="text-sm text-gray-300 space-y-1 ml-4 list-decimal">
                  <li>
                    Allez sur{" "}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      GitHub Settings → Developer Settings → Personal Access
                      Tokens
                    </a>
                  </li>
                  <li>Cliquez sur "Generate new token (classic)"</li>
                  <li>
                    Sélectionnez les scopes:{" "}
                    <code className="text-cyan-400">repo</code> et{" "}
                    <code className="text-cyan-400">workflow</code>
                  </li>
                  <li>Copiez le token généré et collez-le ci-dessous</li>
                </ol>
              </div>

              <form onSubmit={handleSaveToken} className="space-y-4">
                <div>
                  <label
                    htmlFor="github-token"
                    className="block text-sm font-medium mb-2"
                  >
                    Token GitHub (Personal Access Token)
                  </label>
                  <input
                    id="github-token"
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#0f1419] border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Enregistrement..." : "Enregistrer le token"}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Section future: Préférences */}
        <div className="bg-[#1a1f2e] rounded-lg p-6 border border-gray-700/50 mt-6 opacity-50">
          <h2 className="text-xl font-semibold mb-2">🔔 Notifications</h2>
          <p className="text-sm text-gray-400 mb-4">Prochainement...</p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
