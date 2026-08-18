import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { createProject, projectsQueryKey } from '../../api/projectApi'
import { useAuthStore } from '../../stores/authStore'

type Props = { isOpen: boolean; onClose: () => void }

function CreateProjectModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState('')
  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
      ])
      setTitle(''); setType(''); setDescription(''); setValidationError(''); onClose()
    },
  })

  if (!isOpen) return null

  function close() {
    if (mutation.isPending) return
    mutation.reset(); setValidationError(''); onClose()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) { setValidationError('请输入项目标题'); return }
    const trimmedType = type.trim()
    const trimmedDescription = description.trim()
    setValidationError('')
    mutation.mutate({ title: trimmedTitle, ...(trimmedType ? { type: trimmedType } : {}), ...(trimmedDescription ? { description: trimmedDescription } : {}) })
  }

  return <div className="modal-backdrop" role="presentation">
    <div className="create-project-modal" role="dialog" aria-modal="true" aria-labelledby="create-project-title">
      <div className="modal-heading"><div><h2 id="create-project-title">新建项目</h2><p>填写基本信息以创建内容项目。</p></div><button className="modal-close" type="button" onClick={close} disabled={mutation.isPending} aria-label="关闭创建项目弹窗"><X size={20} /></button></div>
      <form className="create-project-form" onSubmit={submit}>
        <label><span>项目标题 <strong>*</strong></span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="请输入项目标题" autoFocus disabled={mutation.isPending} /></label>
        <label><span>项目类型</span><input value={type} onChange={(event) => setType(event.target.value)} placeholder="例如：旅游攻略" disabled={mutation.isPending} /></label>
        <label><span>项目描述</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="请输入项目描述" rows={4} disabled={mutation.isPending} /></label>
        {validationError && <p className="form-error">{validationError}</p>}
        {mutation.isError && <p className="form-error">项目创建失败，请稍后重试。</p>}
        <div className="modal-actions"><button className="secondary-button" type="button" onClick={close} disabled={mutation.isPending}>取消</button><button className="primary-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? '创建中...' : '创建项目'}</button></div>
      </form>
    </div>
  </div>
}

export default CreateProjectModal
