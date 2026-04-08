import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone, Smartphone, Eye, EyeOff, Zap } from 'lucide-react'
import { getHomePath, useAuth } from '../../context/AuthContext'

export default function Register() {
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const { registerCustomer, user } = useAuth()
  const navigate = useNavigate()

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
      const account = await registerCustomer({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirm,
      })
      navigate(getHomePath(account.role), { replace: true })
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 hero-bg">
      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-10">
          <div className="w-16 h-16 btn-glow rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Tạo tài khoản</h1>
          <p className="text-slate-400 mt-2">Tham gia SmartMobile ngay hôm nay</p>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/10">
          <form className="space-y-4" onSubmit={submit}>
            {[
              { key: 'name', label: 'Họ và tên', icon: User, type: 'text', ph: 'Nguyễn Văn A' },
              { key: 'email', label: 'Email', icon: Mail, type: 'email', ph: 'email@example.com' },
              { key: 'phone', label: 'Số điện thoại', icon: Phone, type: 'tel', ph: '0905 xxx xxx' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-slate-400 text-sm mb-1.5">{f.label}</label>
                <div className="relative">
                  <f.icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={f.type}
                    placeholder={f.ph}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            ))}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-slate-400 text-sm mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type={show ? 'text' : 'password'} placeholder="Tối thiểu 8 ký tự"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-10 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-1.5">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" placeholder="Nhập lại mật khẩu"
                  value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
            </div>

            <label className="flex items-start gap-2 text-slate-400 text-sm cursor-pointer">
              <input type="checkbox" className="mt-0.5" />
              <span>Tôi đồng ý với <a href="#" className="text-indigo-400">Điều khoản sử dụng</a> và <a href="#" className="text-indigo-400">Chính sách bảo mật</a></span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="block w-full btn-glow text-white py-3.5 rounded-2xl font-bold text-center text-base flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Zap size={18} /> {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
