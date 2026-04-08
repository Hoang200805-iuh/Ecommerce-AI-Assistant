import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, Users, Bot, BarChart2, ChevronLeft, ChevronRight, Smartphone, LogOut } from 'lucide-react'
import { getRoleLabel, useAuth } from '../context/AuthContext'

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/ai-config', label: 'Cấu hình AI', icon: Bot },
  { to: '/admin/reports', label: 'Báo cáo', icon: BarChart2 },
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-transparent text-slate-900">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-20' : 'w-64'} transition-all duration-300 glass border-r border-slate-200 flex flex-col`}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 btn-retail rounded-lg flex items-center justify-center">
                <Smartphone size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">SmartMobile</p>
                <p className="text-xs text-slate-500">Admin Panel</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all ml-auto"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                title={collapsed ? label : ''}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  active
                    ? 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon size={20} className={active ? 'text-[#2563eb]' : 'group-hover:text-[#2563eb] transition-colors'} />
                {!collapsed && <span className="text-sm font-medium">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: role badge + logout */}
        <div className="p-3 border-t border-slate-200">
          {!collapsed && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#eff6ff] rounded-full flex items-center justify-center text-[#2563eb] text-sm font-bold">A</div>
              <div>
                <p className="text-sm font-medium text-slate-900">{user?.name ?? 'Quản trị viên'}</p>
                <p className="text-xs text-slate-500">{user?.email ?? 'admin@smartmobile.vn'}</p>
                <p className="text-[11px] text-[#2563eb] mt-0.5">{getRoleLabel(user?.role ?? 'admin')}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-red-500 hover:bg-red-50 transition-all text-sm">
            <LogOut size={18} />
            {!collapsed && 'Thoát'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
