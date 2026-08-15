import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function AppErrorFallback() {
  return (
    <main className="app-error-page">
      <section className="app-error-card">
        <span className="app-error-icon"><AlertTriangle size={26} /></span>
        <h1>页面发生了一些问题</h1>
        <p>请刷新页面后重试。如果问题持续出现，我们会尽快处理。</p>
        <button type="button" onClick={() => window.location.reload()}>
          <RefreshCw size={17} />刷新页面
        </button>
      </section>
    </main>
  )
}
