import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Soumission from './pages/Soumission'
import Dashboard from './pages/Dashboard'
import Findings from './pages/Findings'
import { useState } from 'react'
import { mockScanResults } from './data/mockData'

function App() {
  const [scanResults, setScanResults] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState([])
  const [appliedFixes, setAppliedFixes] = useState(new Set())

  const handleStartScan = (projectInfo) => {
    setIsScanning(true)
    setScanProgress([])
    setAppliedFixes(new Set())

    const tools = ['Semgrep', 'npm audit', 'ESLint Security']
    tools.forEach((tool, i) => {
      setTimeout(() => {
        setScanProgress(prev => [...prev, tool])
      }, (i + 1) * 1000)
    })

    setTimeout(() => {
      setScanResults(mockScanResults)
      setIsScanning(false)
    }, 3500)
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
        <Header />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route
              path="/"
              element={
                <Soumission
                  onStartScan={handleStartScan}
                  isScanning={isScanning}
                  scanProgress={scanProgress}
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
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
