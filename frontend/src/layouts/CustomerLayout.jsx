import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, Search, Menu, X, Smartphone } from 'lucide-react'
import { getRoleLabel, useAuth } from '../context/AuthContext'
import { getCart, useCartSync } from '../store/cartStore'
import ChatbotWidget from '../components/ai/ChatbotWidget'

export default function CustomerLayout() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [cartItems, setCartItems] = useState(() => getCart())
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isHome = location.pathname === '/'
  const cartQuantity = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems]
  )

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const currentQuery = params.get('q') ?? ''
    setSearchQuery(currentQuery)
  }, [location.search])

  useEffect(() => useCartSync(setCartItems), [])

  const runSearch = (event) => {
    event.preventDefault()
    const trimmedQuery = searchQuery.trim()
    navigate(trimmedQuery ? `/?q=${encodeURIComponent(trimmedQuery)}` : '/', { replace: false })
    setMobileMenu(false)
  }

  const navLinks = [
    { to: '/', label: 'Trang chủ' },
    { to: '/community', label: 'Cộng đồng' },
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
                {isHome && <span className="block text-[11px] text-slate-500"></span>}
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
                {cartQuantity > 0 && (
                  <span className="absolute top-0 right-0 min-w-4 h-4 px-1 rounded-full text-[10px] text-white flex items-center justify-center bg-[#2563eb]">
                    {cartQuantity > 99 ? '99+' : cartQuantity}
                  </span>
                )}
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
            <Link to="/cart" onClick={() => setMobileMenu(false)} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-700 hover:text-[#2563eb] hover:bg-slate-100">
              <span>Giỏ hàng</span>
              {cartQuantity > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full text-[10px] text-white bg-[#2563eb] flex items-center justify-center">
                  {cartQuantity > 99 ? '99+' : cartQuantity}
                </span>
              )}
            </Link>
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
            <Link to="/community" className="transition-colors hover:text-[#2563eb]">Cộng đồng</Link>
            <Link to="/admin/dashboard" className="transition-colors hover:text-[#2563eb]">Admin</Link>
            <Link to="/warehouse/inventory" className="transition-colors hover:text-[#2563eb]">Kho hàng</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-slate-600">
            <Link to="/privacy-policy" className="transition-colors hover:text-[#2563eb]">Chính sách quyền riêng tư</Link>
            <Link to="/terms-of-service" className="transition-colors hover:text-[#2563eb]">Điều khoản dịch vụ</Link>
            <Link to="/data-deletion" className="transition-colors hover:text-[#2563eb]">Xóa dữ liệu người dùng</Link>
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
  return <ChatbotWidget light={light} />
}
