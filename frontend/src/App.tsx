import {
  BarChart3,
  ChevronDown,
  Clock3,
  FileText,
  Folder,
  Home,
  Layers3,
  Plus,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router'
import defaultAvatar from './assets/avatar/default-avatar.png'
import mindcraftLogo from './assets/brand/mindcraft-logo.png'
import RecentActivity from './components/dashboard/RecentActivity'
import RecentProjects from './components/dashboard/RecentProjects'
import ModelUsageChart from './components/dashboard/ModelUsageChart'
import QuickCreate from './components/dashboard/QuickCreate'
import StatCard from './components/dashboard/StatCard'
import UsageTrendChart from './components/dashboard/UsageTrendChart'
import { stats } from './data/dashboard'
import ProjectsPage from './pages/ProjectsPage'
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
        <span className="user-name">uwhhw</span>
        <ChevronDown size={16} />
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
  return (
    <>
      <DashboardHeader />
      <section className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = statIcons[stat.icon]
          return <StatCard key={stat.title} {...stat} tone={statTones[index]} icon={<Icon size={25} />} />
        })}
      </section>
      <div className="middle-grid"><RecentProjects /><UsageTrendChart /></div>
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
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
