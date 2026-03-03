import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Register({ onLogin }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Veuillez remplir tous les champs')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Erreur lors de l\'inscription')
        setLoading(false)
        return
      }

      // Connexion automatique après inscription
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      if (onLogin) onLogin(data.user)
      navigate('/')
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
      <h1 className="text-3xl font-bold text-white mb-2">
        Créer un <span className="text-emerald-400">compte</span>
      </h1>
      <p className="text-gray-400 mb-8 text-center">
        Inscrivez-vous pour commencer à sécuriser vos projets
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-[#1a1f2e] border border-gray-700 rounded-xl p-8"
      >
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Nom d'utilisateur */}
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Nom d'utilisateur
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="johndoe"
          className="w-full bg-[#0f1419] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors mb-6"
        />

        {/* Email */}
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Adresse email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="w-full bg-[#0f1419] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors mb-6"
        />

        {/* Mot de passe */}
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-[#0f1419] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors mb-6"
        />

        {/* Confirmer mot de passe */}
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Confirmer le mot de passe
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-[#0f1419] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors mb-8"
        />

        {/* Bouton inscription */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
            loading
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98]'
          }`}
        >
          {loading ? 'Inscription en cours...' : 'Créer mon compte'}
        </button>

        {/* Lien vers connexion */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  )
}

export default Register
