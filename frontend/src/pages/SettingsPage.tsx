import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { LockKeyhole, UserRound } from 'lucide-react'
import {
  changeCurrentUserPassword,
  SettingsApiError,
  updateCurrentUserName,
} from '../api/settingsApi'
import { useAuthStore } from '../stores/authStore'

const MAX_NAME_LENGTH = 50
const MIN_PASSWORD_LENGTH = 8

function getPasswordError(error: unknown) {
  if (!(error instanceof SettingsApiError)) return '请求失败，请稍后重试'
  if (error.message === 'Current password is incorrect') return '当前密码不正确'
  if (error.message === 'New password must be different from current password') return '新密码不能与当前密码相同'
  if (error.message.includes('at least')) return `新密码至少需要 ${MIN_PASSWORD_LENGTH} 位`
  return '请求失败，请稍后重试'
}

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [name, setName] = useState(user?.name ?? '')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const profileMutation = useMutation({
    mutationFn: updateCurrentUserName,
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      setName(updatedUser.name ?? '')
      setProfileError('')
      setProfileSuccess('已保存')
    },
    onError: () => {
      setProfileSuccess('')
      setProfileError('保存失败，请稍后重试')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      changeCurrentUserPassword(current, next),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
      setPasswordSuccess('密码修改成功')
    },
    onError: (error) => {
      setPasswordSuccess('')
      setPasswordError(getPasswordError(error))
    },
  })

  if (!user) return <section className="settings-page"><div className="settings-loading">正在加载用户信息...</div></section>

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    setProfileSuccess('')
    if (!trimmedName) {
      setProfileError('昵称不能为空')
      return
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setProfileError(`昵称不能超过 ${MAX_NAME_LENGTH} 个字符`)
      return
    }
    setProfileError('')
    profileMutation.mutate(trimmedName)
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordSuccess('')
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('请完整填写密码信息')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`新密码至少需要 ${MIN_PASSWORD_LENGTH} 位`)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致')
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError('新密码不能与当前密码相同')
      return
    }
    setPasswordError('')
    passwordMutation.mutate({ current: currentPassword, next: newPassword })
  }

  return (
    <section className="settings-page">
      <header className="settings-header"><h1>设置</h1><p>管理你的个人资料和账号安全。</p></header>

      <form className="settings-card" onSubmit={submitProfile}>
        <div className="settings-card-heading"><span><UserRound size={20} /></span><div><h2>个人资料</h2><p>更新在工作区中显示的昵称。</p></div></div>
        <div className="settings-form-grid">
          <label><span>昵称</span><input value={name} onChange={(event) => { setName(event.target.value); setProfileSuccess('') }} maxLength={MAX_NAME_LENGTH + 1} disabled={profileMutation.isPending} /></label>
          <label><span>邮箱</span><input value={user.email} readOnly aria-readonly="true" /><small>邮箱暂不支持修改</small></label>
        </div>
        <div className="settings-form-footer">
          <div>{profileError && <p className="settings-message is-error">{profileError}</p>}{profileSuccess && <p className="settings-message is-success">{profileSuccess}</p>}</div>
          <button className="primary-button" type="submit" disabled={profileMutation.isPending}>{profileMutation.isPending ? '保存中...' : profileSuccess ? '已保存' : '保存修改'}</button>
        </div>
      </form>

      <form className="settings-card" onSubmit={submitPassword}>
        <div className="settings-card-heading"><span><LockKeyhole size={20} /></span><div><h2>账号安全</h2><p>修改用于登录 MindCraft AI 的密码。</p></div></div>
        <div className="settings-form-grid">
          <label><span>当前密码</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" disabled={passwordMutation.isPending} /></label>
          <label><span>新密码</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" placeholder={`至少 ${MIN_PASSWORD_LENGTH} 位`} disabled={passwordMutation.isPending} /></label>
          <label><span>确认新密码</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={passwordMutation.isPending} /></label>
        </div>
        <div className="settings-form-footer">
          <div>{passwordError && <p className="settings-message is-error">{passwordError}</p>}{passwordSuccess && <p className="settings-message is-success">{passwordSuccess}</p>}</div>
          <button className="primary-button" type="submit" disabled={passwordMutation.isPending}>{passwordMutation.isPending ? '修改中...' : '修改密码'}</button>
        </div>
      </form>
    </section>
  )
}
