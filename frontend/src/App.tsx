import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('连接中...')

  useEffect(() => {
    fetch('http://localhost:3000/api/health')
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'ok') {
          setBackendStatus('Connected')
        }
      })
      .catch(() => {
        setBackendStatus('Disconnected')
      })
  }, [])

  return (
    <div>
      <h1>MindCraft AI</h1>

      <p>
        Backend Status：{backendStatus}
      </p>
    </div>
  )
}

export default App