import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileText, FolderOpen, Plus, Sparkles, Type } from 'lucide-react'
import { Link } from 'react-router'
import { fetchOverviewStats, overviewStatsQueryKey } from '../api/statsApi'
import CreateProjectModal from '../components/project/CreateProjectModal'
import { useAuthStore } from '../stores/authStore'
import TrendChart from '../components/stats/TrendChart'

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function OverviewPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const user = useAuthStore((state) => state.user)
  const userId = user?.id
  const statsQuery = useQuery({
    queryKey: overviewStatsQueryKey(userId),
    queryFn: fetchOverviewStats,
    enabled: userId !== undefined,
  })

  if (statsQuery.isPending) {
    return <section className="overview-page"><div className="stats-page-loading">正在加载概览数据...</div></section>
  }
  if (statsQuery.isError) {
    return <section className="overview-page"><div className="stats-page-state is-error">概览数据加载失败，请稍后重试。</div></section>
  }

  const data = statsQuery.data
  const displayName = user?.name || user?.email.split('@')[0]
  const continueDocument = data.recentDocuments[0]
  const summaryCards = [
    { label: '项目', value: data.summary.projectCount, icon: FolderOpen, tone: 'blue' },
    { label: '文档', value: data.summary.documentCount, icon: FileText, tone: 'green' },
    { label: '总字符数', value: data.summary.characterCount, icon: Type, tone: 'purple' },
    { label: '近 30 天 AI 生成', value: data.summary.aiGenerationCount30d, icon: Sparkles, tone: 'orange' },
  ]

  return (
    <section className="overview-page">
      <header className="overview-header">
        <div><h1>{displayName ? `${displayName}，欢迎回来` : '概览'}</h1><p>快速继续最近的创作工作。</p></div>
        <button className="primary-button" type="button" onClick={() => setIsCreateOpen(true)}><Plus size={19} />新建项目</button>
      </header>

      <div className="overview-summary-strip">
        {summaryCards.map(({ label, value, icon: Icon, tone }) => (
          <article className="overview-summary-item" key={label}>
            <span className={`overview-summary-icon ${tone}`}><Icon size={22} /></span>
            <div><span>{label}</span><strong>{value.toLocaleString('zh-CN')}</strong></div>
          </article>
        ))}
      </div>

      {data.summary.projectCount === 0 ? (
        <div className="overview-empty">
          <span><FolderOpen size={28} /></span>
          <h2>开始你的第一个创作项目</h2>
          <p>创建项目后，可以管理文档并使用 AI 辅助创作。</p>
          <button className="primary-button" type="button" onClick={() => setIsCreateOpen(true)}><Plus size={18} />新建项目</button>
        </div>
      ) : (
        <>
          <div className="overview-work-grid">
            <section className="overview-card">
              <div className="overview-card-heading"><div><h2>最近项目</h2><p>按项目更新时间排序。</p></div><Link to="/projects">查看全部</Link></div>
              <div className="overview-list">
                {data.recentProjects.map((project) => (
                  <Link className="overview-list-item" key={project.id} to={`/projects/${project.id}`}>
                    <span className="overview-list-icon"><FolderOpen size={18} /></span>
                    <div><strong>{project.title}</strong><small>{project.documentCount} 篇文档 · {project.characterCount.toLocaleString('zh-CN')} 字符</small></div>
                    <time dateTime={project.updatedAt}>{formatDate(project.updatedAt)}</time>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </section>

            <section className="overview-card overview-ai-card">
              <div className="overview-card-heading"><div><h2>AI 使用趋势</h2><p>最近 7 天生成次数。</p></div><span className="overview-period-badge">近 7 天</span></div>
              {data.aiUsageTrend.every(({ count }) => count === 0)
                ? <div className="overview-chart-empty"><Sparkles size={24} /><span>最近 7 天还没有 AI 生成记录</span></div>
                : <TrendChart data={data.aiUsageTrend} seriesName="AI 生成次数" color="#13a08c" compact />}
            </section>
          </div>

          <div className="overview-work-grid overview-bottom-grid">
            <section className="continue-work-card">
              {continueDocument ? (
                <>
                  <div className="continue-work-copy">
                    <span className="continue-work-label">继续编辑</span>
                    <h2>{continueDocument.title}</h2>
                    <p>{continueDocument.projectTitle} · {continueDocument.characterCount.toLocaleString('zh-CN')} 字符 · 更新于 {formatDate(continueDocument.updatedAt)}</p>
                  </div>
                  <Link className="primary-button" to={`/projects/${continueDocument.projectId}/documents/${continueDocument.id}`}>继续编辑<ArrowRight size={17} /></Link>
                </>
              ) : (
                <div className="continue-work-copy"><span className="continue-work-label">继续编辑</span><h2>还没有文档</h2><p>进入最近项目，创建第一篇文档开始创作。</p></div>
              )}
            </section>

            <section className="overview-card">
              <div className="overview-card-heading"><div><h2>最近文档</h2><p>最近编辑过的其他内容。</p></div></div>
              {data.recentDocuments.slice(1).length === 0 ? <p className="overview-list-empty">暂无更多最近文档。</p> : (
                <div className="overview-list">
                  {data.recentDocuments.slice(1).map((document) => (
                    <Link className="overview-list-item" key={document.id} to={`/projects/${document.projectId}/documents/${document.id}`}>
                      <span className="overview-list-icon"><FileText size={18} /></span>
                      <div><strong>{document.title}</strong><small>{document.projectTitle} · {document.characterCount.toLocaleString('zh-CN')} 字符</small></div>
                      <time dateTime={document.updatedAt}>{formatDate(document.updatedAt)}</time>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      <CreateProjectModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </section>
  )
}
