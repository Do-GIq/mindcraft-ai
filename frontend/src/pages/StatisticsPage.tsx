import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as echarts from 'echarts'
import { Activity, FileClock, FileText, FolderOpen, Type } from 'lucide-react'
import { Link } from 'react-router'
import TrendChart from '../components/stats/TrendChart'
import {
  dashboardStatsQueryKey,
  fetchDashboardStats,
  type DashboardStats,
  type StatsRange,
} from '../api/statsApi'
import { useAuthStore } from '../stores/authStore'

const rangeOptions: Array<{ value: StatsRange; label: string }> = [
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
  { value: '90d', label: '最近 90 天' },
]

function ProjectBreakdownChart({ data }: { data: DashboardStats['projectBreakdown'] }) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return
    const chart = echarts.init(chartRef.current)
    const ordered = [...data].reverse()
    chart.setOption({
      animationDuration: 300,
      color: ['#5a86dc'],
      grid: { left: 110, right: 28, top: 18, bottom: 28 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#7b8494' },
        splitLine: { lineStyle: { color: '#edf0f4' } },
      },
      yAxis: {
        type: 'category',
        data: ordered.map(({ title }) => title),
        axisLabel: { color: '#4a5568', width: 94, overflow: 'truncate' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        name: '字符数',
        type: 'bar',
        barMaxWidth: 22,
        data: ordered.map(({ characterCount }) => characterCount),
        itemStyle: { borderRadius: [0, 5, 5, 0] },
      }],
    })
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(chartRef.current)
    return () => { observer.disconnect(); chart.dispose() }
  }, [data])

  return data.length === 0
    ? <div className="statistics-chart-empty">暂无项目内容数据</div>
    : <div className="statistics-chart breakdown-chart" ref={chartRef} />
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function StatisticsPage() {
  const [range, setRange] = useState<StatsRange>('30d')
  const userId = useAuthStore((state) => state.user?.id)
  const statsQuery = useQuery({
    queryKey: dashboardStatsQueryKey(userId, range),
    queryFn: () => fetchDashboardStats(range),
    enabled: userId !== undefined,
  })

  if (statsQuery.isPending) {
    return <section className="statistics-page"><div className="stats-page-loading">正在加载统计数据...</div></section>
  }
  if (statsQuery.isError) {
    return <section className="statistics-page"><div className="stats-page-state is-error">统计数据加载失败，请稍后重试。</div></section>
  }

  const data = statsQuery.data
  const summaryCards = [
    { label: '项目', value: data.summary.projectCount, icon: FolderOpen, tone: 'blue' },
    { label: '文档', value: data.summary.documentCount, icon: FileText, tone: 'green' },
    { label: '总字符数', value: data.summary.characterCount, icon: Type, tone: 'purple' },
    { label: '历史版本', value: data.summary.versionCount, icon: FileClock, tone: 'orange' },
  ]

  return (
    <section className="statistics-page">
      <header className="statistics-header">
        <div><h1>数据统计</h1><p>查看你的项目和文档创作情况。</p></div>
        <div className="statistics-range" aria-label="统计时间范围">
          {rangeOptions.map((option) => <button type="button" className={range === option.value ? 'is-active' : ''} key={option.value} onClick={() => setRange(option.value)}>{option.label}</button>)}
        </div>
      </header>

      <section className="statistics-creation-overview">
        <div className="statistics-section-heading"><div><h2>创作概览</h2><p>项目与内容的全量数据。</p></div></div>
        <div className="statistics-summary-grid">
          {summaryCards.map(({ label, value, icon: Icon, tone }) => (
            <article className="statistics-summary-card" key={label}>
              <span className={`overview-summary-icon ${tone}`}><Icon size={21} /></span>
              <div><span>{label}</span><strong>{value.toLocaleString('zh-CN')}</strong></div>
            </article>
          ))}
        </div>
      </section>

      {data.summary.projectCount === 0 ? (
        <div className="statistics-empty"><FolderOpen size={28} /><h2>暂无创作数据</h2><p>创建项目和文档后，这里会展示真实统计结果。</p><Link className="primary-button" to="/projects">前往我的项目</Link></div>
      ) : (
        <>
          <section className="statistics-ai-overview">
            <div className="statistics-section-heading"><div><h2>AI 使用概览</h2><p>所选时间范围内的真实生成表现。</p></div><span>累计生成 {data.aiSummary.generatedCharacterCount.toLocaleString('zh-CN')} 字符</span></div>
            <div className="ai-summary-grid">
              <article><span>AI 生成次数</span><strong>{data.aiSummary.generationCount.toLocaleString('zh-CN')}</strong><small>成功 {data.aiSummary.successCount} · 失败 {data.aiSummary.failedCount}</small></article>
              <article><span>成功率</span><strong>{data.aiSummary.successRate.toFixed(1)}%</strong><small>按全部生成请求计算</small></article>
              <article><span>平均首 Token</span><strong>{data.aiSummary.averageFirstTokenMs.toLocaleString('zh-CN')} ms</strong><small>首段有效内容到达时间</small></article>
              <article><span>平均生成耗时</span><strong>{data.aiSummary.averageDurationMs.toLocaleString('zh-CN')} ms</strong><small>请求开始至结束</small></article>
            </div>
          </section>

          <section className="statistics-card">
            <div className="statistics-card-heading"><div><Activity size={19} /><h2>AI 使用趋势</h2></div><span>按 AI generation 请求统计</span></div>
            <TrendChart data={data.aiUsageTrend} seriesName="AI 生成次数" color="#13a08c" />
          </section>

          <div className="statistics-lower-grid">
            <section className="statistics-card">
              <div className="statistics-card-heading"><div><Activity size={19} /><h2>版本活动趋势</h2></div><span>按历史版本快照统计</span></div>
              <TrendChart data={data.activityTrend} seriesName="版本活动" />
            </section>

            <section className="statistics-card">
              <div className="statistics-card-heading"><div><FolderOpen size={19} /><h2>项目内容分布</h2></div><span>按字符数排序，最多展示 8 个项目</span></div>
              <ProjectBreakdownChart data={data.projectBreakdown} />
            </section>

          </div>

          <section className="statistics-card top-documents-card">
            <div className="statistics-card-heading"><div><FileText size={19} /><h2>内容量较高的文档</h2></div></div>
            {data.topDocuments.length === 0 ? <div className="statistics-chart-empty">当前项目还没有文档</div> : (
              <div className="top-documents-list">
                {data.topDocuments.map((document, index) => (
                  <Link key={document.id} to={`/projects/${document.projectId}/documents/${document.id}`}>
                    <span className="document-rank">{index + 1}</span>
                    <div><strong>{document.title}</strong><small>{document.projectTitle}</small></div>
                    <span>{document.characterCount.toLocaleString('zh-CN')} 字符</span>
                    <time dateTime={document.updatedAt}>{formatDate(document.updatedAt)}</time>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}
