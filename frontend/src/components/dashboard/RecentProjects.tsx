import { ChevronRight, FileText } from 'lucide-react'
import { recentProjects } from '../../data/dashboard'

function RecentProjects() {
  return (
    <section className="dashboard-card recent-projects">
      <div className="card-heading">
        <h2>最近项目</h2>
        <button className="text-button" type="button">查看全部 <ChevronRight size={16} /></button>
      </div>
      <div className="project-table">
        <div className="project-row project-table-head">
          <span>项目名称</span><span>分类</span><span>最后更新</span><span>进度</span>
        </div>
        {recentProjects.map((project) => (
          <div className="project-row" key={project.name}>
            <div className="project-name"><span className={`mini-icon ${project.color}`}><FileText size={15} /></span>{project.name}</div>
            <div><span className={`category-tag ${project.color}`}>{project.category}</span></div>
            <span className="muted">{project.updatedAt}</span>
            <div className="progress-cell">
              <div className="progress-track"><span className={project.color} style={{ width: `${project.progress}%` }} /></div>
              <span>{project.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default RecentProjects
