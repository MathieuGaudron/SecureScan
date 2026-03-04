import { NavLink, Link } from "react-router-dom";

function Header({ user, onLogout }) {
  return (
    <header className="border-b border-gray-800 bg-[#0f1419]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
          <span className="text-white font-semibold text-lg">
            Secure<span className="text-emerald-400">Scan</span>
          </span>
        </div>

        <nav className="flex gap-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            Soumission
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/findings"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            Vulnérabilités
          </NavLink>
          <NavLink
            to="/historique"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            Historique
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-gray-400 text-sm">
                {user.username || user.email}
              </span>
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
