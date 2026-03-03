import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Soumission from './pages/Soumission'
import Dashboard from './pages/Dashboard'
import Findings from './pages/Findings'
import Login from './pages/Login'
import Register from './pages/Register'
import { useState } from 'react'

function App() {
  const [scanResults, setScanResults] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState([])
  const [appliedFixes, setAppliedFixes] = useState(new Set())
  const [scanError, setScanError] = useState(null)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const handleStartScan = async (projectInfo) => {
    // Vérifier que l'utilisateur est connecté
    const token = localStorage.getItem('token')
    if (!user || !token) {
      setScanError('Vous devez être connecté pour lancer un scan')
      return
    }

    setIsScanning(true)
    setScanProgress([])
    setAppliedFixes(new Set())
    setScanError(null)

    // Animation de progression pendant que le backend scanne
    const tools = ['Semgrep', 'npm audit', 'ESLint Security']
    const timers = tools.map((tool, i) =>
      setTimeout(() => setScanProgress(prev => [...prev, tool]), (i + 1) * 1000)
    )

    try {
      // Appel au vrai backend avec token JWT
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ repoUrl: projectInfo.url, branch: 'main' }),
      })

      const data = await res.json()

      if (!res.ok) {
        setScanError(data.error || data.message || 'Erreur lors du scan')
        setIsScanning(false)
        return
      }

      // Récupérer les détails de l'analyse avec les vulnérabilités
      const detailRes = await fetch(`/analyses/${data.analysisId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const analysisDetail = await detailRes.json()

      setScanResults(analysisDetail)
    } catch {
      setScanError('Erreur de connexion au serveur')
    } finally {
      timers.forEach(clearTimeout)
      setScanProgress(tools)
      setIsScanning(false)
    }
  }

  const handleApplyFix = (findingId) => {
    setAppliedFixes(prev => new Set([...prev, findingId]))
  }

  const handleRejectFix = (findingId) => {
    setAppliedFixes(prev => {
      const next = new Set(prev)
      next.delete(findingId)
      return next
    })
  }

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
              path="/findings"
              element={
                <Findings
                  scanResults={scanResults}
                  appliedFixes={appliedFixes}
                  onApplyFix={handleApplyFix}
                  onRejectFix={handleRejectFix}
                />
              }
            />
            <Route
              path="/login"
              element={<Login onLogin={handleLogin} />}
            />
            <Route
              path="/register"
              element={<Register onLogin={handleLogin} />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
