import {
  BarChart3,
  Clock3,
  FileText,
  Folder,
  Home,
  Layers3,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router'
import defaultAvatar from './assets/avatar/default-avatar.png'
import mindcraftLogo from './assets/brand/mindcraft-logo.png'
import RecentActivity from './components/dashboard/RecentActivity'
import RecentProjects from './components/dashboard/RecentProjects'
import ModelUsageChart from './components/dashboard/ModelUsageChart'
import QuickCreate from './components/dashboard/QuickCreate'
import StatCard from './components/dashboard/StatCard'
import UsageTrendChart from './components/dashboard/UsageTrendChart'
import { fetchProjects, projectsQueryKey } from './api/projectApi'
import { stats } from './data/dashboard'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import DocumentEditorPage from './pages/DocumentEditorPage'
import AuthPage from './pages/AuthPage'
import { AuthRoute } from './components/auth/AuthRoute'
import { useAuthStore } from './stores/authStore'
import './App.css'

const navigationItems = [
  { label: '概览', icon: Home, to: '/' },
  { label: '我的项目', icon: Folder, to: '/projects' },
  { label: 'AI 创作', icon: Sparkles },
  { label: '文档', icon: FileText },
  { label: '历史版本', icon: Clock3 },
  { label: '数据统计', icon: BarChart3 },
  { label: '设置', icon: Settings },
]

const statIcons = { layers: Layers3, sparkles: Sparkles, file: FileText, clock: Clock3 }
const statTones = ['blue', 'green', 'purple', 'orange']

function Sidebar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const displayName = user?.name || user?.email.split('@')[0] || '用户'

  function logout() {
    clearAuth()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-logo" src={mindcraftLogo} alt="MindCraft AI" />
      </div>
      <nav aria-label="主导航">
        <ul className="navigation-list">
          {navigationItems.map(({ label, icon: Icon, to }) => (
            <li key={label}>
              {to ? (
                <NavLink className={({ isActive }) => `navigation-item${isActive ? ' is-active' : ''}`} to={to} end={to === '/'}>
                  <Icon size={21} />{label}
                </NavLink>
              ) : (
                <span className="navigation-item"><Icon size={21} />{label}</span>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="sidebar-user">
        <span className="avatar-frame">
          <img className="avatar-image" src={defaultAvatar} alt="默认用户头像" />
        </span>
        <span className="user-name" title={user?.email}>{displayName}</span>
        <button className="logout-button" type="button" onClick={logout} aria-label="退出登录" title="退出登录"><LogOut size={17} /></button>
      </div>
    </aside>
  )
}

function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <div>
        <h1>欢迎回来</h1>
        <p>这是您的 AI 内容创作工作空间，助力高效创作与管理。</p>
      </div>
      <div className="header-actions">
        <label className="search-box">
          <Search size={20} />
          <input type="search" placeholder="搜索项目、文档或内容..." aria-label="搜索" />
        </label>
        <button className="primary-button" type="button"><Plus size={20} />新建项目</button>
      </div>
    </header>
  )
}

function DashboardPage() {
  const userId = useAuthStore((state) => state.user?.id)
  const projectsQuery = useQuery({
    queryKey: projectsQueryKey(userId),
    queryFn: fetchProjects,
    enabled: userId !== undefined,
  })

  return (
    <>
      <DashboardHeader />
      <section className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = statIcons[stat.icon]
          const value = index === 0
            ? projectsQuery.isPending ? '...' : projectsQuery.isError ? '--' : String(projectsQuery.data.length)
            : stat.value
          return <StatCard key={stat.title} {...stat} value={value} tone={statTones[index]} icon={<Icon size={25} />} />
        })}
      </section>
      <div className="middle-grid"><RecentProjects projects={projectsQuery.data} isPending={projectsQuery.isPending} isError={projectsQuery.isError} /><UsageTrendChart /></div>
      <div className="bottom-grid"><QuickCreate /><ModelUsageChart /><RecentActivity /></div>
    </>
  )
}

function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="login" element={<AuthRoute><AuthPage mode="login" /></AuthRoute>} />
      <Route path="register" element={<AuthRoute><AuthPage mode="register" /></AuthRoute>} />
      <Route element={<AuthRoute requireAuth><DashboardLayout /></AuthRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="projects/:projectId/documents/:documentId" element={<DocumentEditorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
