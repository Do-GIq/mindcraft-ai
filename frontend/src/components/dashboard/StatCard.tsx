import type { ReactNode } from 'react'

type StatCardProps = {
  title: string
  value: string
  trend: string
  trendLabel: string
  icon?: ReactNode
  tone?: string
}

function StatCard({ title, value, trend, trendLabel, icon, tone = 'blue' }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className={`icon-box ${tone}`}>{icon}</div>
      <div className="stat-card-content">
        <span className="stat-title">{title}</span>
        <strong>{value}</strong>
      </div>
      <div className="stat-trend">
        <span>{trend}</span>
        <small>{trendLabel}</small>
      </div>
    </article>
  )
}

export default StatCard
