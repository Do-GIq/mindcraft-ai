import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, FileText, MessageSquareText, Pencil, Plus, X } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { createDocument, documentsQueryKey, fetchDocuments } from '../api/documentApi'
import { fetchProject, projectQueryKey, projectsQueryKey, updateProject } from '../api/projectApi'
import ScopedConversationChat from '../components/ai/ScopedConversationChat'
import ProjectKnowledgePanel from '../components/project/ProjectKnowledgePanel'
import { useAuthStore } from '../stores/authStore'
import type { Project, ProjectType } from '../types/project'

type ProjectWorkspaceTab = 'documents' | 'knowledge' | 'chat'

function ProjectDetailPage() {
  const { projectId: projectIdParam } = useParams()
  const projectId = Number(projectIdParam)
  const isValidProjectId = Number.isInteger(projectId) && projectId > 0
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [activeTab, setActiveTab] = useState<ProjectWorkspaceTab>('documents')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState<ProjectType | ''>('GENERAL')
  const [originalProjectType, setOriginalProjectType] = useState('GENERAL')
  const [editDescription, setEditDescription] = useState('')
  const [editValidationError, setEditValidationError] = useState('')
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
  const updateMutation = useMutation({
    mutationFn: (input: { title: string; type: ProjectType; description: string }) => updateProject(projectId, input),
    onSuccess: async (updatedProject) => {
      queryClient.setQueryData(projectQueryKey(userId, projectId), updatedProject)
      queryClient.setQueryData<Project[]>(projectsQueryKey(userId), (current) => current?.map((item) => (
        item.id === updatedProject.id ? updatedProject : item
      )))
      setIsEditOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectQueryKey(userId, projectId) }),
        queryClient.invalidateQueries({ queryKey: projectsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ])
    },
  })

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    createMutation.mutate(trimmedTitle ? { title: trimmedTitle } : {})
  }

  function openEdit(project: Project) {
    updateMutation.reset()
    setEditValidationError('')
    setEditTitle(project.title)
    setOriginalProjectType(project.type)
    setEditType(project.type === 'GENERAL' || project.type === 'RAG' ? project.type : '')
    setEditDescription(project.description ?? '')
    setIsEditOpen(true)
  }

  function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = editTitle.trim()
    if (!trimmedTitle) {
      setEditValidationError('请输入项目名称')
      return
    }
    if (!editType) {
      setEditValidationError('请选择 GENERAL 或 RAG 项目类型')
      return
    }
    setEditValidationError('')
    updateMutation.mutate({ title: trimmedTitle, type: editType, description: editDescription.trim() })
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
    <section className={`project-detail-page${activeTab === 'chat' ? ' is-chat-active' : ''}`}>
      <Link className="back-link" to="/projects"><ArrowLeft size={17} />返回我的项目</Link>
      <header className="project-detail-header">
        <div>
          <div className="project-detail-title-row">
            <h1>{project.title}</h1>
            <span className="project-type">{project.type}</span>
          </div>
          <p className={project.description ? undefined : 'is-empty'}>{project.description || '暂无项目描述'}</p>
        </div>
        <button className="secondary-button project-edit-button" type="button" onClick={() => openEdit(project)}>
          <Pencil size={15} />编辑项目
        </button>
      </header>

      <nav className="project-workspace-tabs" aria-label="项目工作区">
        <button type="button" className={activeTab === 'documents' ? 'is-active' : ''} onClick={() => setActiveTab('documents')}><FileText size={17} />文档</button>
        <button type="button" className={activeTab === 'knowledge' ? 'is-active' : ''} onClick={() => setActiveTab('knowledge')}><BookOpen size={17} />知识库</button>
        <button type="button" className={activeTab === 'chat' ? 'is-active' : ''} onClick={() => setActiveTab('chat')}><MessageSquareText size={17} />项目问答</button>
      </nav>

      {activeTab === 'documents' && <section className="documents-panel project-workspace-panel">
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
              <Link className="document-card" key={document.id} to={`/projects/${projectId}/documents/${document.id}`}>
                <span className="document-icon"><FileText size={20} /></span>
                <div>
                  <h3>{document.title}</h3>
                  <time dateTime={document.updatedAt}>更新于 {new Date(document.updatedAt).toLocaleString('zh-CN')}</time>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>}

      {activeTab === 'knowledge' && (
        <div className="project-workspace-panel"><ProjectKnowledgePanel projectId={projectId} /></div>
      )}

      {activeTab === 'chat' && (
        <div className="project-workspace-chat">
          <ScopedConversationChat key={`project-chat-${projectId}`} projectId={projectId} documentId={null} onOpenKnowledge={() => setActiveTab('knowledge')} />
        </div>
      )}

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

      {isEditOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="create-project-modal" role="dialog" aria-modal="true" aria-labelledby="edit-project-title">
            <div className="modal-heading">
              <div><h2 id="edit-project-title">编辑项目</h2><p>更新项目名称、类型和描述。</p></div>
              <button className="modal-close" type="button" onClick={() => setIsEditOpen(false)} disabled={updateMutation.isPending} aria-label="关闭编辑项目弹窗"><X size={20} /></button>
            </div>
            <form className="create-project-form" onSubmit={handleEdit}>
              <label><span>项目名称 <strong>*</strong></span><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={191} autoFocus disabled={updateMutation.isPending} /></label>
              <label><span>项目类型</span><select value={editType} onChange={(event) => setEditType(event.target.value as ProjectType)} disabled={updateMutation.isPending}>{!editType && <option value="" disabled>当前：{originalProjectType}（请选择新类型）</option>}<option value="GENERAL">GENERAL</option><option value="RAG">RAG</option></select></label>
              <label><span>项目描述</span><textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={191} rows={4} placeholder="暂无项目描述" disabled={updateMutation.isPending} /></label>
              {editValidationError && <p className="form-error">{editValidationError}</p>}
              {updateMutation.isError && <p className="form-error">项目更新失败，请检查输入后重试。</p>}
              <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsEditOpen(false)} disabled={updateMutation.isPending}>取消</button><button className="primary-button" type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? '保存中...' : '保存修改'}</button></div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default ProjectDetailPage
