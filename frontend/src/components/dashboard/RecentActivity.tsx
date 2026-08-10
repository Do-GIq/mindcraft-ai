import { Cloud, FileText, Sparkles } from 'lucide-react'
import { recentActivities } from '../../data/dashboard'

const icons = { file: FileText, sparkles: Sparkles, cloud: Cloud }

function RecentActivity() {
  return (
    <section className="dashboard-card bottom-card">
      <div className="card-heading"><h2>最近活动</h2><button className="text-button" type="button">查看全部</button></div>
      <div className="activity-list">
        {recentActivities.map((activity) => {
          const Icon = icons[activity.icon]
          return (
            <div className="activity-item" key={activity.text}>
              <span className={`mini-icon ${activity.color}`}><Icon size={15} /></span>
              <span className="activity-text">{activity.text}</span>
              <time>{activity.time}</time>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default RecentActivity
