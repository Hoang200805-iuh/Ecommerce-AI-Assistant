import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ShoppingCart, Search, Menu, X, Smartphone, Bot } from 'lucide-react'
import { getRoleLabel, useAuth } from '../../context/AuthContext'

const homeQuickLinks = [
  { to: '/?q=iphone', label: 'iPhone' },
  { to: '/?q=samsung', label: 'Samsung' },
  { to: '/?q=laptop', label: 'Laptop' },
  { to: '/?q=xiaomi', label: 'Xiaomi' },
  { to: '/?q=oppo', label: 'OPPO' },
]

export default function CustomerLayout() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isHome = location.pathname === '/'

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const currentQuery = params.get('q') ?? ''
    setSearchQuery(currentQuery)
  }, [location.search])

  const runSearch = (event) => {
    event.preventDefault()
    const trimmedQuery = searchQuery.trim()
    navigate(trimmedQuery ? `/?q=${encodeURIComponent(trimmedQuery)}` : '/', { replace: false })
    setMobileMenu(false)
  }

  const navLinks = [
    { to: '/', label: 'Trang chủ' },
    { to: '/orders', label: 'Đơn hàng' },
  ]

  const shellClass = 'min-h-screen bg-transparent text-slate-900'

  const navClass = 'sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-sm'

  const searchInputClass = 'w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] transition-colors'

  const searchButtonClass = 'btn-retail text-white px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap'

  const navLinkClass = (to) => {
    const isActive = location.pathname === to
    return `px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-700 hover:text-[#2563eb] hover:bg-slate-100'}`
  }

  return (
    <div className={shellClass}>
        {isHome && (
        <div className="bg-[#2563eb] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <span className="font-bold uppercase tracking-[0.22em]">SmartMobile</span>
              <span className="opacity-90">Mua sắm điện thoại, laptop và phụ kiện chính hãng</span>
            </div>
            <div className="flex items-center gap-4 opacity-95">
              <span>Hotline 1800 1234</span>
              <span>Giao nhanh 2-4 giờ</span>
            </div>
          </div>
        </div>
      )}

      <nav className={navClass}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 py-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-[#2563eb] flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Smartphone size={20} className="text-white" />
              </div>
              <div className="leading-tight">
                <span className="block text-[1.15rem] font-black text-slate-900">SmartMobile</span>
                {isHome && <span className="block text-[11px] text-slate-500">CellphoneS style retail demo</span>}
              </div>
            </Link>

            {/* Search */}
            <form onSubmit={runSearch} className="hidden md:flex flex-1 max-w-2xl mx-6 gap-2">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm điện thoại..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={searchInputClass}
                />
              </div>
              <button type="submit" className={searchButtonClass}>
                Tìm
              </button>
            </form>

            {/* Links */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              {navLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={navLinkClass(l.to)}
                >
                  {l.label}
                </Link>
              ))}
              <Link to="/cart" className="relative ml-2 p-2 rounded-lg transition-all text-slate-600 hover:text-[#2563eb] hover:bg-slate-100">
                <ShoppingCart size={20} />
                <span className="absolute top-0 right-0 w-4 h-4 rounded-full text-xs text-white flex items-center justify-center bg-[#2563eb]">3</span>
              </Link>
              {user ? (
                <div className="ml-3 flex items-center gap-3">
                  <div className="text-right hidden xl:block">
                    <p className="text-xs font-medium text-slate-900">{user.name}</p>
                    <p className="text-[11px] text-slate-500">{getRoleLabel(user.role)}</p>
                  </div>
                  <button onClick={handleLogout} className="ml-2 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-slate-100 border border-slate-200 text-slate-700 hover:text-[#2563eb] hover:border-[#2563eb]/30">
                    Đăng xuất
                  </button>
                </div>
              ) : (
                  <Link to="/login" className="ml-2 px-4 py-2 rounded-xl text-sm font-medium btn-retail text-white">
                  Đăng nhập
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-slate-700">
              {mobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isHome && (
          <div className="border-t border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap gap-2">
              {homeQuickLinks.map(item => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 hover:text-[#2563eb] transition-all"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden px-4 pb-4 pt-3 space-y-2 border-t border-slate-200 bg-white">
            <form onSubmit={runSearch} className="relative mb-3 flex gap-2 items-stretch">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button type="submit" className="btn-retail text-white px-4 rounded-xl text-sm font-medium">
                Tìm
              </button>
            </form>
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:text-[#2563eb] hover:bg-slate-100">
                {l.label}
              </Link>
            ))}
            <Link to="/cart" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm text-slate-700 hover:text-[#2563eb] hover:bg-slate-100">Giỏ hàng</Link>
            {user ? (
              <button onClick={handleLogout} className="block w-full px-3 py-2 rounded-lg border text-sm text-center font-medium bg-slate-100 border-slate-200 text-slate-700">
                Đăng xuất
              </button>
            ) : (
              <Link to="/login" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm text-center font-medium btn-retail text-white">Đăng nhập</Link>
            )}
          </div>
        )}
      </nav>

      {/* Page content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-14">
        <div className="max-w-7xl mx-auto px-4 text-center py-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Smartphone size={20} className="text-[#2563eb]" />
            <span className="text-lg font-bold text-slate-900">SmartMobile Agent</span>
          </div>
          <p className="text-slate-500 text-sm">Hệ thống thương mại điện thoại thông minh với AI</p>
          <div className="flex justify-center gap-6 mt-4 text-sm text-slate-600">
            <Link to="/admin/dashboard" className="transition-colors hover:text-[#2563eb]">Admin</Link>
            <Link to="/warehouse/inventory" className="transition-colors hover:text-[#2563eb]">Kho hàng</Link>
          </div>
          <p className="text-slate-500 text-xs mt-4">© 2024 SmartMobile. All rights reserved.</p>
        </div>
      </footer>

      {/* AI Chat Widget */}
      <AIFloatingChat light />
    </div>
  )
}

function AIFloatingChat({ light = false }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Xin chào! Tôi là AI Agent của SmartMobile. Bạn cần tư vấn sản phẩm gì không?' }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  const send = () => {
    if (!input.trim()) return
    setMessages(p => [...p, { role: 'user', text: input }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMessages(p => [...p, { role: 'ai', text: 'Cảm ơn bạn đã hỏi! Tôi đang phân tích nhu cầu của bạn. Với ngân sách đó, tôi gợi ý iPhone 15 Pro hoặc Samsung S24 Ultra.' }])
      setTyping(false)
    }, 1500)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className={`mb-4 w-80 rounded-2xl shadow-2xl border flex flex-col overflow-hidden ${light ? 'bg-white border-slate-200' : 'glass border-indigo-500/30'}`} style={{ height: 420 }}>
          <div className={`p-4 border-b flex items-center gap-3 ${light ? 'border-slate-200 bg-slate-50' : 'border-indigo-500/20'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${light ? 'btn-retail' : 'btn-glow'}`}>
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${light ? 'text-slate-900' : 'text-white'}`}>AI Tư vấn</p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"></span> Online
              </p>
            </div>
            <button onClick={() => setOpen(false)} className={`ml-auto ${light ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'}`}><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${m.role === 'user' ? 'bg-[#2563eb] text-white' : light ? 'bg-slate-100 text-slate-700' : 'bg-white/8 text-slate-200'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className={`px-3 py-2 rounded-xl flex gap-1 ${light ? 'bg-slate-100' : 'bg-white/8'}`}>
                  <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full"></span>
                  <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full"></span>
                  <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full"></span>
                </div>
              </div>
            )}
          </div>
          <div className={`p-3 border-t flex gap-2 ${light ? 'border-slate-200 bg-white' : 'border-indigo-500/20'}`}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Nhập câu hỏi..."
              className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none ${light ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#2563eb]' : 'bg-white/5 border border-indigo-500/30 text-white placeholder-slate-500 focus:border-indigo-400'}`}
            />
            <button onClick={send} className={`px-3 py-2 rounded-lg text-white text-sm font-medium ${light ? 'btn-retail' : 'btn-glow'}`}>Gửi</button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl ${light ? 'btn-retail' : 'btn-glow'}`}
      >
        <Bot size={26} />
      </button>
    </div>
  )
}
