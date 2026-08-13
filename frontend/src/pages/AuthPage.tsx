import { useState, type FormEvent } from 'react'
import { BrainCircuit, CircleUserRound, Eye, EyeOff, FileText, Lightbulb, PenLine, Shapes, Sparkles, LayoutDashboard, WandSparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { AuthApiError, login, register } from '../api/authApi'
import mindcraftLogo from '../assets/brand/mindcraft-logo.png'
import { useAuthStore } from '../stores/authStore'
import './AuthPage.css'

type AuthPageProps = {
  mode: 'login' | 'register'
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function AuthPage({ mode }: AuthPageProps) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setError('请填写邮箱和密码')
      return
    }
    if (!emailPattern.test(normalizedEmail)) {
      setError('请输入有效的邮箱地址')
      return
    }
    if (isRegister && password.length < 8) {
      setError('密码至少需要 8 位')
      return
    }
    if (isRegister && password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setError('')
    setIsPending(true)
    try {
      const result = isRegister
        ? await register({ email: normalizedEmail, password, ...(name.trim() ? { name: name.trim() } : {}) })
        : await login({ email: normalizedEmail, password })
      setAuth(result)
      navigate('/', { replace: true })
    } catch (requestError) {
      if (requestError instanceof AuthApiError && requestError.status === 401) {
        setError('邮箱或密码错误')
      } else if (requestError instanceof AuthApiError && requestError.status === 409) {
        setError('该邮箱已注册')
      } else {
        setError('请求失败，请稍后重试')
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-logo"><img src={mindcraftLogo} alt="MindCraft AI" /></div>
        <div className={`auth-brand-content${isRegister ? ' is-register' : ''}`} key={mode}>
          <span className="auth-eyebrow"><Sparkles size={16} /> AI 内容工作空间</span>
          {isRegister ? (
            <>
              <h1>从一个账号，开启完整创作流程。</h1>
              <p className="auth-brand-description">创建您的 MindCraft AI 工作空间，让内容、项目与创作进度始终清晰有序。</p>
              <div className="register-workflow" aria-label="创建账号后进入 AI 创作工作空间">
                <div className="workflow-track" aria-hidden="true"><span /></div>
                <div className="workflow-step">
                  <span className="workflow-icon"><CircleUserRound size={22} /></span>
                  <strong>创建账号</strong><small>建立个人空间</small>
                </div>
                <div className="workflow-step">
                  <span className="workflow-icon"><WandSparkles size={22} /></span>
                  <strong>开始创作</strong><small>释放内容灵感</small>
                </div>
                <div className="workflow-step">
                  <span className="workflow-icon"><LayoutDashboard size={22} /></span>
                  <strong>统一管理</strong><small>沉淀项目成果</small>
                </div>
              </div>
              <p className="register-workflow-caption"><Sparkles size={15} /> 您的创作进度，将从这里持续生长。</p>
            </>
          ) : (
            <>
              <div className="login-constellation" aria-label="从灵感到内容的 AI 创作过程">
                <span className="constellation-line line-one" aria-hidden="true" />
                <span className="constellation-line line-two" aria-hidden="true" />
                <span className="constellation-line line-three" aria-hidden="true" />
                <span className="constellation-line line-four" aria-hidden="true" />
                <div className="constellation-core"><BrainCircuit size={25} /><span /></div>
                <div className="constellation-node node-idea"><Lightbulb size={18} /><span>捕捉灵感</span></div>
                <div className="constellation-node node-write"><PenLine size={18} /><span>辅助创作</span></div>
                <div className="constellation-node node-content"><FileText size={18} /><span>沉淀内容</span></div>
                <div className="constellation-node node-structure"><Shapes size={18} /><span>组织结构</span></div>
              </div>
              <p className="auth-brand-description login-description">在统一工作空间中整理灵感、管理项目，让每一步创作都更从容。</p>
              <h1 className="login-title">专注创作，灵感自然成形。</h1>
            </>
          )}
        </div>
      </section>

      <section className="auth-form-panel">
        <div className={`auth-form-card${isRegister ? ' is-register' : ''}`}>
          <div className="auth-form-heading">
            <span>{isRegister ? '创建您的工作空间' : '欢迎回来'}</span>
            <h2>{isRegister ? '注册 MindCraft AI' : '登录 MindCraft AI'}</h2>
            <p>{isRegister ? '填写信息，开始您的 AI 内容创作之旅。' : '输入您的账号信息以继续访问工作空间。'}</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && <label><span>姓名 <small>可选</small></span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入姓名" disabled={isPending} /></label>}
            <label><span>邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" disabled={isPending} /></label>
            <label><span>密码</span><div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? '至少 8 位密码' : '请输入密码'} autoComplete={isRegister ? 'new-password' : 'current-password'} disabled={isPending} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? '隐藏密码' : '显示密码'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {isRegister && <label><span>确认密码</span><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="请再次输入密码" autoComplete="new-password" disabled={isPending} /></label>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={isPending}>{isPending ? (isRegister ? '注册中...' : '登录中...') : (isRegister ? '创建账号' : '登录')}</button>
          </form>
          <p className="auth-switch">{isRegister ? '已有账号？' : '还没有账号？'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? '立即登录' : '立即注册'}</Link></p>
        </div>
      </section>
    </main>
  )
}

export default AuthPage
