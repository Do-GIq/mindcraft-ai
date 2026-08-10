import { List, Pencil, Tag, Type } from 'lucide-react'
import { quickActions } from '../../data/dashboard'

const icons = { type: Type, list: List, edit: Pencil, tag: Tag }

function QuickCreate() {
  return (
    <section className="dashboard-card bottom-card">
      <div className="card-heading"><h2>快速创作</h2></div>
      <div className="quick-actions">
        {quickActions.map((action) => {
          const Icon = icons[action.icon]
          return (
            <button className={`quick-action ${action.color}`} type="button" key={action.title}>
              <Icon size={28} />
              <strong>{action.title}</strong>
              <span>{action.description}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default QuickCreate
