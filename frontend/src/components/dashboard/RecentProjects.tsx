import { ChevronRight, FileText } from 'lucide-react'
import { Link } from 'react-router'
import type { Project } from '../../types/project'

type RecentProjectsProps = {
  projects?: Project[]
  isPending: boolean
  isError: boolean
}

function RecentProjects({ projects, isPending, isError }: RecentProjectsProps) {
  const recentProjects = projects?.slice(0, 4) ?? []

  return (
    <section className="dashboard-card recent-projects">
      <div className="card-heading">
        <h2>最近项目</h2>
        <Link className="text-button" to="/projects">查看全部 <ChevronRight size={16} /></Link>
      </div>
      <div className="project-table">
        <div className="project-row project-table-head">
          <span>项目名称</span><span>分类</span><span>最后更新</span><span>进度</span>
        </div>
        {isPending && <div className="dashboard-project-state">正在加载项目...</div>}
        {isError && <div className="dashboard-project-state is-error">项目加载失败</div>}
        {!isPending && !isError && recentProjects.length === 0 && <div className="dashboard-project-state">暂无项目</div>}
        {recentProjects.map((project, index) => {
          const color = ['blue', 'green', 'purple', 'orange'][index]
          return (
          <div className="project-row" key={project.id}>
            <div className="project-name"><span className={`mini-icon ${color}`}><FileText size={15} /></span>{project.title}</div>
            <div><span className={`category-tag ${color}`}>{project.type}</span></div>
            <span className="muted">{new Date(project.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <div className="progress-cell">
              <div className="progress-track"><span className={color} style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} /></div>
              <span>{project.progress}%</span>
            </div>
          </div>
          )
        })}
      </div>
    </section>
  )
}

export default RecentProjects
