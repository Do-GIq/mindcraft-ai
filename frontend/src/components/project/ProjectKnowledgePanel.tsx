import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  deleteKnowledgeFile,
  fetchKnowledgeFiles,
  knowledgeFilesQueryKey,
  uploadKnowledgeFile,
} from '../../api/knowledgeApi'
import { useAuthStore } from '../../stores/authStore'

type ProjectKnowledgePanelProps = {
  projectId: number
}

export default function ProjectKnowledgePanel({ projectId }: ProjectKnowledgePanelProps) {
  const userId = useAuthStore((state) => state.user?.id)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState('')
  const currentQueryKey = knowledgeFilesQueryKey(userId, projectId)
  const knowledgeQuery = useQuery({
    queryKey: currentQueryKey,
    queryFn: () => fetchKnowledgeFiles(projectId),
    enabled: userId !== undefined,
  })
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadKnowledgeFile(projectId, file),
    onSuccess: async (file) => {
      setFeedback(`“${file.filename}”已上传，共 ${file.chunkCount} 个片段`)
      await queryClient.invalidateQueries({ queryKey: currentQueryKey })
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : '知识文件上传失败'),
  })
  const deleteMutation = useMutation({
    mutationFn: (fileId: number) => deleteKnowledgeFile(projectId, fileId),
    onSuccess: async () => {
      setFeedback('知识文件已删除')
      await queryClient.invalidateQueries({ queryKey: currentQueryKey })
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : '知识文件删除失败'),
  })

  function selectFile() {
    if (!uploadMutation.isPending) fileInputRef.current?.click()
  }

  function removeFile(fileId: number, filename: string) {
    if (deleteMutation.isPending) return
    if (window.confirm(`确定删除知识文件“${filename}”吗？相关检索向量也会一并清理。`)) {
      setFeedback('')
      deleteMutation.mutate(fileId)
    }
  }

  return (
    <section className="project-knowledge-panel">
      <header className="project-tab-heading">
        <div>
          <h2>项目知识库</h2>
          <p>上传 Markdown 或 TXT 资料，为当前项目的 AI 问答提供上下文。</p>
        </div>
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt,text/plain,text/markdown"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                setFeedback('')
                uploadMutation.mutate(file)
              }
              event.currentTarget.value = ''
            }}
          />
          <button className="primary-button" type="button" onClick={selectFile} disabled={uploadMutation.isPending}>
            <Upload size={18} />{uploadMutation.isPending ? '处理中...' : '上传资料'}
          </button>
        </>
      </header>

      {feedback && (
        <p className={`knowledge-feedback${uploadMutation.isError || deleteMutation.isError ? ' is-error' : ''}`} role="status">
          {feedback}
        </p>
      )}
      {knowledgeQuery.isPending && <div className="documents-state">正在加载知识文件...</div>}
      {knowledgeQuery.isError && <div className="documents-state is-error">知识库加载失败，请稍后重试。</div>}
      {knowledgeQuery.data?.length === 0 && (
        <div className="documents-empty">
          <span><FileText size={25} /></span>
          <h3>当前项目还没有知识文件</h3>
          <p>上传项目资料后，项目问答将自动使用相关内容。</p>
        </div>
      )}
      {knowledgeQuery.data && knowledgeQuery.data.length > 0 && (
        <div className="knowledge-file-list">
          {knowledgeQuery.data.map((file) => {
            const isDeleting = deleteMutation.isPending && deleteMutation.variables === file.id
            return (
              <article className="knowledge-file-card" key={file.id}>
                <span className="document-icon"><FileText size={20} /></span>
                <div>
                  <h3>{file.filename}</h3>
                  <p>{file._count.chunks} 个知识片段 · 上传于 {new Date(file.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id, file.filename)}
                  disabled={deleteMutation.isPending}
                  aria-label={`删除${file.filename}`}
                >
                  <Trash2 size={17} />{isDeleting ? '删除中...' : '删除'}
                </button>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
