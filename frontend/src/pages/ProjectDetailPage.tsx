import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, Plus, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { createDocument, documentsQueryKey, fetchDocuments } from '../api/documentApi'
import { fetchProject, projectQueryKey } from '../api/projectApi'
import { useAuthStore } from '../stores/authStore'

function ProjectDetailPage() {
  const { projectId: projectIdParam } = useParams()
  const projectId = Number(projectIdParam)
  const isValidProjectId = Number.isInteger(projectId) && projectId > 0
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const projectQuery = useQuery({
    queryKey: projectQueryKey(userId, projectId),
    queryFn: () => fetchProject(projectId),
    enabled: userId !== undefined && isValidProjectId,
  })
  const currentDocumentsQueryKey = documentsQueryKey(userId, projectId)
  const documentsQuery = useQuery({
    queryKey: currentDocumentsQueryKey,
    queryFn: () => fetchDocuments(projectId),
    enabled: userId !== undefined && isValidProjectId,
  })
  const createMutation = useMutation({
    mutationFn: (input: { title?: string }) => createDocument(projectId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: currentDocumentsQueryKey })
      setTitle('')
      setIsCreateOpen(false)
    },
  })

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    createMutation.mutate(trimmedTitle ? { title: trimmedTitle } : {})
  }

  if (!isValidProjectId) {
    return <div className="projects-state is-error">无效的项目地址</div>
  }

  if (projectQuery.isPending) {
    return <div className="projects-state">正在加载项目...</div>
  }

  if (projectQuery.isError) {
    return <div className="projects-state is-error">项目不存在或暂时无法访问。</div>
  }

  const project = projectQuery.data

  return (
    <section className="project-detail-page">
      <Link className="back-link" to="/projects"><ArrowLeft size={17} />返回我的项目</Link>
      <header className="project-detail-header">
        <div>
          <div className="project-detail-title-row">
            <h1>{project.title}</h1>
            <span className="project-type">{project.type}</span>
          </div>
          <p>{project.description || '暂无项目描述'}</p>
        </div>
      </header>

      <section className="documents-panel">
        <div className="documents-heading">
          <div>
            <h2>文档</h2>
            <p>管理该项目中的创作文档。</p>
          </div>
          <button className="primary-button" type="button" onClick={() => { createMutation.reset(); setIsCreateOpen(true) }}>
            <Plus size={19} />新建文档
          </button>
        </div>

        {documentsQuery.isPending && <div className="documents-state">正在加载文档...</div>}
        {documentsQuery.isError && <div className="documents-state is-error">文档加载失败，请稍后重试。</div>}
        {documentsQuery.data?.length === 0 && (
          <div className="documents-empty">
            <span><FileText size={25} /></span>
            <h3>还没有文档</h3>
            <p>创建第一篇文档开始创作</p>
          </div>
        )}
        {documentsQuery.data && documentsQuery.data.length > 0 && (
          <div className="documents-list">
            {documentsQuery.data.map((document) => (
              <article className="document-card" key={document.id}>
                <span className="document-icon"><FileText size={20} /></span>
                <div>
                  <h3>{document.title}</h3>
                  <time dateTime={document.updatedAt}>更新于 {new Date(document.updatedAt).toLocaleString('zh-CN')}</time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isCreateOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="create-project-modal" role="dialog" aria-modal="true" aria-labelledby="create-document-title">
            <div className="modal-heading">
              <div><h2 id="create-document-title">新建文档</h2><p>标题可以稍后在编辑阶段完善。</p></div>
              <button className="modal-close" type="button" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending} aria-label="关闭新建文档弹窗"><X size={20} /></button>
            </div>
            <form className="create-project-form" onSubmit={handleCreate}>
              <label><span>文档标题</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="未命名文档" autoFocus disabled={createMutation.isPending} /></label>
              {createMutation.isError && <p className="form-error">文档创建失败，请稍后重试。</p>}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setIsCreateOpen(false)} disabled={createMutation.isPending}>取消</button>
                <button className="primary-button" type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? '创建中...' : '创建文档'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default ProjectDetailPage
