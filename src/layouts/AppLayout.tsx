import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Tag,
  TrendingUp,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Wallet,
  RefreshCw,
  ClipboardList,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/wallet', label: 'Carteira', icon: <Wallet size={20} /> },
  { to: '/transactions', label: 'Movimentações', icon: <ArrowUpDown size={20} /> },
  { to: '/recurrents', label: 'Recorrentes', icon: <RefreshCw size={20} /> },
  { to: '/bills', label: 'Contas', icon: <ClipboardList size={20} /> },
  { to: '/categories', label: 'Categorias', icon: <Tag size={20} /> },
]

export function AppLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false) // Mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // Desktop collapse

  function handleUserClick() {
    navigate('/settings')
    setSidebarOpen(false)
  }

  return (
    <div className="app-layout">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <TrendingUp size={22} className="brand-icon" />
            <span className="brand-text">Money Manager</span>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu mobile"
          >
            <X size={20} />
          </button>
        </div>

        <button
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {item.icon}
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-user sidebar-user-btn"
            onClick={handleUserClick}
            title="Abrir configurações"
          >
            <div className="sidebar-user-avatar" title={user?.email}>
              {(user?.user_metadata?.first_name?.[0] ?? user?.email?.[0])?.toUpperCase() ?? 'U'}
            </div>
            <div className="sidebar-user-info">
              {user?.user_metadata?.first_name ? (
                <span className="sidebar-user-name">
                  {user.user_metadata.first_name}{user.user_metadata.last_name ? ` ${user.user_metadata.last_name}` : ''}
                </span>
              ) : null}
              <span className="sidebar-user-email">{user?.email}</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="main-content">
        {/* Topbar mobile */}
        <header className="topbar">
          <button
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <span className="topbar-title">Money Manager</span>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
