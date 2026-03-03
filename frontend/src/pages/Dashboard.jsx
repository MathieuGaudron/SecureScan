import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const owaspColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#8b5cf6',
]

const owaspNames = {
  A01: 'Broken Access Control',
  A02: 'Cryptographic Failures',
  A03: 'Injection',
  A04: 'Insecure Design',
  A05: 'Security Misconfiguration',
  A06: 'Vulnerable Components',
  A07: 'Auth Failures',
  A08: 'Data Integrity Failures',
  A09: 'Logging Failures',
  A10: 'SSRF',
}

const severityConfig = {
  critical: { label: 'CRITIQUE', color: '#ef4444' },
  high: { label: 'ELEVEE', color: '#f97316' },
  medium: { label: 'MOYENNE', color: '#eab308' },
  low: { label: 'BASSE', color: '#22c55e' },
}

function ScoreCircle({ score, grade }) {
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference
  const color =
    score >= 80
      ? '#22c55e'
      : score >= 60
        ? '#eab308'
        : score >= 40
          ? '#f97316'
          : '#ef4444'

  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle
          cx="65"
          cy="65"
          r="45"
          stroke="#1f2937"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="65"
          cy="65"
          r="45"
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute mt-6 flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color }}>
          {grade}
        </span>
        <span className="text-lg text-gray-300">{score}/100</span>
      </div>
      <p className="text-gray-400 text-sm mt-2">Score de securite</p>
    </div>
  )
}

function Dashboard({ scanResults }) {
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

  // Construire les données depuis la réponse API
  const score = scanResults.securityScore ?? 0
  const grade = scanResults.scoreGrade ?? 'F'
  const summary = {
    total: scanResults.totalVulnerabilities ?? 0,
    critical: scanResults.criticalCount ?? 0,
    high: scanResults.highCount ?? 0,
    medium: scanResults.mediumCount ?? 0,
    low: scanResults.lowCount ?? 0,
  }

  // Distribution OWASP depuis les vulnérabilités
  const vulns = scanResults.vulnerabilities || []
  const owaspCounts = {}
  vulns.forEach((v) => {
    const cat = v.owaspCategory || 'Other'
    owaspCounts[cat] = (owaspCounts[cat] || 0) + 1
  })

  const owaspDistribution = Object.keys(owaspNames).map((id) => ({
    id,
    name: owaspNames[id],
    count: owaspCounts[id] || 0,
  }))

  const owaspCovered = owaspDistribution.filter((d) => d.count > 0).length

  // Outils (pour l'instant que Semgrep)
  const tools = [
    { name: 'Semgrep (SAST)', icon: 'search', findings: summary.total },
    { name: 'npm audit', icon: 'package', findings: 0 },
    { name: 'ESLint Security', icon: 'check', findings: 0 },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Resultats d&apos;analyse
          </h1>
          <p className="text-gray-400">
            {scanResults.repositoryName} — {summary.total} vulnerabilites detectees
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/findings')}
            className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Voir les findings →
          </button>
          <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
            Generer rapport
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score + Severity */}
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-6">
          <div className="relative flex justify-center mb-6">
            <ScoreCircle score={score} grade={grade} />
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">
              Repartition par severite
            </h3>
            <div className="flex justify-center gap-4 flex-wrap">
              {Object.entries(severityConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm font-medium text-white">
                    {summary[key]}
                  </span>
                  <span className="text-xs text-gray-400">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* OWASP Chart */}
        <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Distribution OWASP Top 10 : 2025
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={owaspDistribution}
              layout="vertical"
              margin={{ left: 5, right: 15 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="id"
                type="category"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1f2e',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value, name, props) => [
                  value,
                  props.payload.name,
                ]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                {owaspDistribution.map((entry, index) => (
                  <Cell
                    key={entry.id}
                    fill={owaspColors[index % owaspColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tools + OWASP Coverage */}
        <div className="space-y-6">
          <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl p-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Outils executes
            </h3>
            <div className="space-y-3">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-sm">
                      {tool.icon === 'search'
                        ? '🔍'
                        : tool.icon === 'package'
                          ? '📦'
                          : '✅'}
                    </div>
                    <span className="text-white text-sm font-medium">
                      {tool.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 font-semibold text-sm">
                      {tool.findings}
                    </span>
                    <span className="text-gray-400 text-xs">findings</span>
                    <span className="text-emerald-400">●</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
            <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">
              Categories OWASP couvertes
            </p>
            <p className="text-3xl font-bold text-emerald-400">
              {owaspCovered}{' '}
              <span className="text-lg text-gray-400">/ 10</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
