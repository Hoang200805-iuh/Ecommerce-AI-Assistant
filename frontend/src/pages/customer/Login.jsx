import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Smartphone, Eye, EyeOff, Zap } from 'lucide-react'
import { getHomePath, useAuth } from '../../context/AuthContext'

export default function Login() {
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (user) {
      navigate(getHomePath(user.role), { replace: true })
    }
  }, [navigate, user])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const account = await login({ email: form.email, password: form.password })
      const nextPath = location.state?.from?.pathname || getHomePath(account.role)
      navigate(nextPath, { replace: true })
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 hero-bg">
      <div className="w-full max-w-md fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 btn-glow rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Chào mừng trở lại</h1>
          <p className="text-slate-400 mt-2">Đăng nhập để tiếp tục mua sắm</p>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/10">
          <form className="space-y-5" onSubmit={submit}>
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={show ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-600 bg-white/5" />
                Ghi nhớ đăng nhập
              </label>
              <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">Quên mật khẩu?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="block w-full btn-glow text-white py-3.5 rounded-2xl font-bold text-center text-base flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Zap size={18} /> {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-slate-600 text-sm">hoặc</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <div className="space-y-2">
              <Link to="/" className="block w-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 py-2.5 rounded-xl text-sm transition-all px-4 font-medium text-center">
                Tiếp tục với tư cách khách vãng lai
              </Link>
            </div>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
