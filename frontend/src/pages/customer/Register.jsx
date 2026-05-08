import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone, Smartphone, Eye, EyeOff, Zap, KeyRound } from 'lucide-react'
import { getHomePath, useAuth } from '../../context/AuthContext'

export default function Register() {
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [registerMethod, setRegisterMethod] = useState('email')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const { registerCustomer, requestEmailSignupOtp, verifyEmailSignupOtp, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate(getHomePath(user.role), { replace: true })
    }
  }, [navigate, user])

  useEffect(() => {
    setError('')
    setInfo('')
    setOtpSent(false)
    setOtp('')
  }, [registerMethod])

  const resendOtp = async () => {
    if (loading) return

    setError('')
    setInfo('')
    setLoading(true)

    try {
      const message = await requestEmailSignupOtp({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirm,
      })
      setOtpSent(true)
      setInfo(message || 'Đã gửi lại OTP vào Gmail của bạn.')
    } catch (err) {
      setError(err.message || 'Không thể gửi lại OTP.')
    } finally {
      setLoading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (registerMethod === 'phone') {
        const account = await registerCustomer({
          name: form.name,
          phone: form.phone,
          password: form.password,
          confirmPassword: form.confirm,
          method: 'phone',
        })
        navigate(getHomePath(account.role), { replace: true })
      } else if (!otpSent) {
        const message = await requestEmailSignupOtp({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          confirmPassword: form.confirm,
        })
        setOtpSent(true)
        setInfo(message || 'Mã OTP đã được gửi tới Gmail của bạn.')
      } else {
        const account = await verifyEmailSignupOtp({
          email: form.email,
          otp,
        })
        navigate(getHomePath(account.role), { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const submitLabel = registerMethod === 'phone'
    ? 'Đăng ký bằng số điện thoại'
    : otpSent
      ? 'Xác thực OTP và đăng ký'
      : 'Gửi mã OTP Gmail'

  const lockProfileFields = registerMethod === 'email' && otpSent

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
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              disabled={loading}
              onClick={() => setRegisterMethod('email')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${registerMethod === 'email' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}
            >
              Đăng ký bằng Email
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setRegisterMethod('phone')}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${registerMethod === 'phone' ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}
            >
              Đăng ký bằng SĐT
            </button>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">Họ và tên</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  disabled={lockProfileFields || loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {registerMethod === 'email' && (
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    disabled={lockProfileFields || loading}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-400 text-sm mb-1.5">
                {registerMethod === 'phone' ? 'Số điện thoại' : 'Số điện thoại (không bắt buộc)'}
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="tel"
                  placeholder="0905 xxx xxx"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  disabled={lockProfileFields || loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">
                {error}
              </div>
            )}

            {info && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 text-sm px-4 py-3">
                {info}
              </div>
            )}

            <div>
              <label className="block text-slate-400 text-sm mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type={show ? 'text' : 'password'} placeholder="Tối thiểu 8 ký tự"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  disabled={lockProfileFields || loading}
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
                  disabled={lockProfileFields || loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
            </div>

            {registerMethod === 'email' && otpSent && (
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">Mã OTP Gmail</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Nhập mã OTP 6 số"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={resendOtp}
                  disabled={loading}
                  className="mt-2 text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
                >
                  Gửi lại OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    setInfo('Bạn có thể chỉnh sửa thông tin rồi gửi OTP mới.')
                  }}
                  disabled={loading}
                  className="ml-4 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Đổi thông tin đăng ký
                </button>
              </div>
            )}

            <label className="flex items-start gap-2 text-slate-400 text-sm cursor-pointer">
              <input type="checkbox" className="mt-0.5" />
              <span>Tôi đồng ý với <a href="#" className="text-indigo-400">Điều khoản sử dụng</a> và <a href="#" className="text-indigo-400">Chính sách bảo mật</a></span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="block w-full btn-glow text-white py-3.5 rounded-2xl font-bold text-center text-base flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Zap size={18} /> {loading ? 'Đang xử lý...' : submitLabel}
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
