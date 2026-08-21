import {
  BarChart3,
  Bot,
  Folder,
  Home,
  LogOut,
  Settings,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router'
import defaultAvatar from './assets/avatar/default-avatar.png'
import mindcraftLogo from './assets/brand/mindcraft-logo.png'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import DocumentEditorPage from './pages/DocumentEditorPage'
import AuthPage from './pages/AuthPage'
import AiCreatePage from './pages/AiCreatePage'
import OverviewPage from './pages/OverviewPage'
import StatisticsPage from './pages/StatisticsPage'
import SettingsPage from './pages/SettingsPage'
import { AuthRoute } from './components/auth/AuthRoute'
import { useAuthStore } from './stores/authStore'
import './App.css'

const navigationItems = [
  { label: '概览', icon: Home, to: '/' },
  { label: '我的项目', icon: Folder, to: '/projects' },
  { label: 'AI 助手', icon: Bot, to: '/ai' },
  { label: '数据统计', icon: BarChart3, to: '/stats' },
  { label: '设置', icon: Settings, to: '/settings' },
]

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
        <Route index element={<OverviewPage />} />
        <Route path="stats" element={<StatisticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="projects/:projectId/documents/:documentId" element={<DocumentEditorPage />} />
        <Route path="ai" element={<AiCreatePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
