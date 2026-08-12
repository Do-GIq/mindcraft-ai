import { useQuery } from '@tanstack/react-query'
import { FolderOpen } from 'lucide-react'
import type { Project } from '../types/project'

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects')

  if (!response.ok) {
    throw new Error('项目加载失败')
  }

  return response.json() as Promise<Project[]>
}

function ProjectsPage() {
  const { data: projects, isPending, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })

  return (
    <section className="projects-page">
      <header className="page-header">
        <h1>我的项目</h1>
        <p>查看和管理您的内容创作项目。</p>
      </header>

      {isPending && <div className="projects-state">正在加载项目...</div>}
      {isError && <div className="projects-state is-error">项目加载失败，请稍后重试。</div>}
      {projects?.length === 0 && <div className="projects-state">暂无项目</div>}

      {projects && projects.length > 0 && (
        <div className="projects-list">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-card-icon"><FolderOpen size={22} /></div>
              <div className="project-card-content">
                <div className="project-card-heading">
                  <h2>{project.title}</h2>
                  <span className="project-type">{project.type}</span>
                </div>
                <p>{project.description || '暂无项目描述'}</p>
                <div className="project-card-footer">
                  <div className="project-progress">
                    <span style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
                  </div>
                  <span>{project.progress}%</span>
                  <time dateTime={project.updatedAt}>更新于 {new Date(project.updatedAt).toLocaleString('zh-CN')}</time>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default ProjectsPage
