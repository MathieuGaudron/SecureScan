import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const languages = ['JavaScript', 'Python', 'PHP', 'Auto-detect']

function Soumission({ onStartScan, isScanning, scanProgress, scanError, user }) {
  const [repoUrl, setRepoUrl] = useState('')
  const [selectedLang, setSelectedLang] = useState('JavaScript')
  const [dragActive, setDragActive] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onStartScan({ url: repoUrl, language: selectedLang })
    if (!scanError) {
      navigate('/dashboard')
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold text-white mt-8 mb-2">
        Analysez votre <span className="text-emerald-400">code source</span>
      </h1>
      <p className="text-gray-400 mb-10 text-center">
        Soumettez un repository Git ou une archive ZIP pour detecter les vulnerabilites
      </p>

      {!user && (
        <div className="w-full max-w-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg px-4 py-3 mb-6 text-sm text-center">
          Vous devez être <Link to="/login" className="underline font-medium">connecté</Link> pour lancer une analyse.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-[#1a1f2e] border border-gray-700 rounded-xl p-8"
      >
        {/* URL Input */}
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          URL du Repository Git
        </label>
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/user/project"
          className="w-full bg-[#0f1419] border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors mb-6"
        />

        {/* ZIP Upload Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors cursor-pointer ${
            dragActive
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <div className="text-3xl mb-2">📁</div>
          <p className="text-gray-400 text-sm">ou glissez une archive ZIP ici</p>
        </div>

        {/* Language Selection */}
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Langage detecte
        </label>
        <div className="flex gap-2 mb-8">
          {languages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setSelectedLang(lang)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLang === lang
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#0f1419] text-gray-400 border border-gray-600 hover:border-gray-400'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Error */}
        {scanError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
            {scanError}
          </div>
        )}

        {/* Scan Progress */}
        {isScanning && (
          <div className="mb-6 space-y-2">
            {['Semgrep', 'npm audit', 'ESLint Security'].map((tool) => {
              const isDone = scanProgress.includes(tool)
              const isActive =
                !isDone &&
                scanProgress.length ===
                  ['Semgrep', 'npm audit', 'ESLint Security'].indexOf(tool)
              return (
                <div key={tool} className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'border-2 border-emerald-500 animate-pulse'
                          : 'border-2 border-gray-600'
                    }`}
                  >
                    {isDone && '✓'}
                  </div>
                  <span
                    className={`text-sm ${isDone ? 'text-emerald-400' : isActive ? 'text-white' : 'text-gray-500'}`}
                  >
                    {tool}
                  </span>
                  {isActive && (
                    <span className="text-xs text-yellow-400">En cours...</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isScanning || !repoUrl.trim() || !user}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
            isScanning || !repoUrl.trim()
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98]'
          }`}
        >
          {isScanning ? 'Analyse en cours...' : "🔍 Lancer l'analyse"}
        </button>
      </form>
    </div>
  )
}

export default Soumission
