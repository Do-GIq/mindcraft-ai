import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('Disconnected')

  useEffect(() => {
    fetch('http://localhost:3000/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Health check failed')
        }

        return response.json()
      })
      .then((data) => {
        setBackendStatus(data.status === 'ok' ? 'Connected' : 'Disconnected')
      })
      .catch(() => {
        setBackendStatus('Disconnected')
      })
  }, [])

  return (
    <main>
      <h1>MindCraft AI</h1>
      <p>Backend Status</p>
      <p>{backendStatus}</p>
    </main>
  )
}

export default App
