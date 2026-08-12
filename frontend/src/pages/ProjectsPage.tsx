import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderOpen, Plus, X } from 'lucide-react'
import type { CreateProjectInput, Project } from '../types/project'

const projectsQueryKey = ['projects'] as const

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects')

  if (!response.ok) {
    throw new Error('项目加载失败')
  }

  return response.json() as Promise<Project[]>
}

async function createProject(input: CreateProjectInput): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('项目创建失败')
  }

  return response.json() as Promise<Project>
}

function ProjectsPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState('')
  const { data: projects, isPending, isError } = useQuery({
    queryKey: projectsQueryKey,
    queryFn: fetchProjects,
  })
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey })
      setTitle('')
      setType('')
      setDescription('')
      setValidationError('')
      setIsCreateOpen(false)
    },
  })

  function openCreateForm() {
    createMutation.reset()
    setValidationError('')
    setIsCreateOpen(true)
  }

  function closeCreateForm() {
    if (!createMutation.isPending) {
      setIsCreateOpen(false)
      createMutation.reset()
      setValidationError('')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle) {
      setValidationError('请输入项目标题')
      return
    }

    setValidationError('')
    const trimmedType = type.trim()
    const trimmedDescription = description.trim()
    createMutation.mutate({
      title: trimmedTitle,
      ...(trimmedType ? { type: trimmedType } : {}),
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    })
  }

  return (
    <section className="projects-page">
      <header className="page-header">
        <div>
          <h1>我的项目</h1>
          <p>查看和管理您的内容创作项目。</p>
        </div>
        <button className="primary-button" type="button" onClick={openCreateForm}>
          <Plus size={20} />新建项目
        </button>
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

      {isCreateOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="create-project-modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
            <div className="modal-heading">
              <div>
                <h2 id="create-project-title">新建项目</h2>
                <p>填写基本信息以创建内容项目。</p>
              </div>
              <button className="modal-close" type="button" onClick={closeCreateForm} aria-label="关闭创建项目弹窗" disabled={createMutation.isPending}>
                <X size={20} />
              </button>
            </div>
            <form className="create-project-form" onSubmit={handleSubmit}>
              <label>
                <span>项目标题 <strong>*</strong></span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="请输入项目标题" autoFocus disabled={createMutation.isPending} />
              </label>
              <label>
                <span>项目类型</span>
                <input value={type} onChange={(event) => setType(event.target.value)} placeholder="例如：旅游攻略" disabled={createMutation.isPending} />
              </label>
              <label>
                <span>项目描述</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="请输入项目描述" rows={4} disabled={createMutation.isPending} />
              </label>
              {validationError && <p className="form-error">{validationError}</p>}
              {createMutation.isError && <p className="form-error">项目创建失败，请稍后重试。</p>}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={closeCreateForm} disabled={createMutation.isPending}>取消</button>
                <button className="primary-button" type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? '创建中...' : '创建项目'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default ProjectsPage
