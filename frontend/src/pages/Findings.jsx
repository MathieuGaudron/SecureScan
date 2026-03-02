import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const severityStyles = {
  critical: { label: 'Critique', bg: 'bg-red-500', text: 'text-white' },
  high: { label: 'Elevee', bg: 'bg-orange-500', text: 'text-white' },
  medium: { label: 'Moyenne', bg: 'bg-yellow-500', text: 'text-black' },
  low: { label: 'Basse', bg: 'bg-green-500', text: 'text-white' },
}

function FindingCard({ finding, isApplied, onApplyFix, onRejectFix }) {
  const [expanded, setExpanded] = useState(false)
  const style = severityStyles[finding.severity]

  return (
    <div
      className={`bg-[#1a1f2e] border rounded-xl overflow-hidden transition-colors ${
        isApplied ? 'border-emerald-500/50' : 'border-gray-700'
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
            {finding.owasp}
          </span>
          <span className="text-xs text-gray-500">{finding.tool}</span>
          {isApplied && (
            <span className="ml-auto text-xs text-emerald-400 font-medium">
              ✓ Fix applique
            </span>
          )}
          <span className="ml-auto text-gray-500 text-lg">
            {expanded ? '▾' : '▸'}
          </span>
        </div>
        <p className="text-white text-sm font-medium">{finding.title}</p>
        <p className="text-gray-500 text-xs mt-1">
          {finding.file}:{finding.line}
        </p>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700/50 pt-3">
          <p className="text-gray-400 text-sm mb-3">{finding.description}</p>

          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">
            Correction proposee
          </p>
          <div className="bg-[#0f1419] rounded-lg p-3 mb-4">
            <p className="text-gray-400 text-xs mb-1">
              {finding.fix.description}
            </p>
            <pre className="text-emerald-400 text-sm font-mono whitespace-pre-wrap">
              {finding.fix.code}
            </pre>
          </div>

          {!isApplied ? (
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onApplyFix(finding.id)
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                ✓ Appliquer le fix
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                }}
                className="border border-gray-600 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                ✕ Rejeter
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <span className="text-emerald-400 text-sm font-medium py-2">
                ✓ Correction appliquee
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRejectFix(finding.id)
                }}
                className="text-gray-500 text-sm hover:text-red-400 transition-colors"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Findings({ scanResults, appliedFixes, onApplyFix, onRejectFix }) {
  const [severityFilter, setSeverityFilter] = useState('all')
  const [owaspFilter, setOwaspFilter] = useState('all')
  const navigate = useNavigate()

  if (!scanResults) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-400 text-lg mb-4">
          Aucune analyse disponible
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Lancer une analyse
        </button>
      </div>
    )
  }

  const { findings } = scanResults

  const filtered = findings.filter((f) => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false
    if (owaspFilter !== 'all' && f.owasp !== owaspFilter) return false
    return true
  })

  const owaspCategories = [...new Set(findings.map((f) => f.owasp))].sort()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          Findings detailles{' '}
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
            onRejectFix={onRejectFix}
          />
        ))}
      </div>

      {/* Push Button */}
      {appliedFixes.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105">
            Push les corrections sur GitHub ({appliedFixes.size} fix
            {appliedFixes.size > 1 ? 's' : ''})
          </button>
        </div>
      )}
    </div>
  )
}

export default Findings
