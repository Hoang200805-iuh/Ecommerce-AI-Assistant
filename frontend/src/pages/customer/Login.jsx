import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, Smartphone, Eye, EyeOff, Zap } from 'lucide-react'
import { getHomePath, useAuth } from '../../context/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID ?? ''

export default function Login() {
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const [facebookReady, setFacebookReady] = useState(false)
  const [googleButtonWidth, setGoogleButtonWidth] = useState(320)
  const [form, setForm] = useState({ identifier: '', password: '' })
  const googleButtonContainerRef = useRef(null)
  const googleButtonRef = useRef(null)
  const { login, loginWithGoogle, loginWithFacebook, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (user) {
      navigate(getHomePath(user.role), { replace: true })
    }
  }, [navigate, user])

  const handleGoogleCredential = useCallback(async (response) => {
    const credential = String(response?.credential || '').trim()
    if (!credential) {
      setError('Không nhận được dữ liệu đăng nhập Google.')
      return
    }

    setError('')
    setGoogleLoading(true)

    try {
      const account = await loginWithGoogle({ idToken: credential })
      const nextPath = location.state?.from?.pathname || getHomePath(account.role)
      navigate(nextPath, { replace: true })
    } catch (err) {
      setError(err.message || 'Đăng nhập Google thất bại.')
    } finally {
      setGoogleLoading(false)
    }
  }, [location.state?.from?.pathname, loginWithGoogle, navigate])

  const handleFacebookCredential = useCallback(async (response) => {
    if (response.authResponse) {
      const accessToken = String(response.authResponse.accessToken || '').trim()
      if (!accessToken) {
        setError('Không nhận được dữ liệu đăng nhập Facebook.')
        return
      }

      setError('')
      const account = await loginWithFacebook({ accessToken })
      const nextPath = location.state?.from?.pathname || getHomePath(account.role)
      navigate(nextPath, { replace: true })
    } else {
      setError('Không thể xác thực với Facebook.')
    }
  }, [location.state?.from?.pathname, loginWithFacebook, navigate])

  const processFacebookLoginResponse = useCallback((response) => {
    Promise.resolve(handleFacebookCredential(response))
      .catch((err) => {
        console.error('[FB Login] handleFacebookCredential error:', err)
        setError('Lỗi xử lý đăng nhập Facebook: ' + (err?.message || 'Unknown'))
      })
      .finally(() => {
        setFacebookLoading(false)
      })
  }, [handleFacebookCredential])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === 'undefined' || !googleButtonContainerRef.current) return undefined

    const container = googleButtonContainerRef.current

    const updateGoogleButtonWidth = () => {
      const measuredWidth = Math.round(container.getBoundingClientRect().width)
      const nextWidth = Math.max(220, Math.min(420, measuredWidth))
      setGoogleButtonWidth(current => (current === nextWidth ? current : nextWidth))
    }

    updateGoogleButtonWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateGoogleButtonWidth)
      return () => {
        window.removeEventListener('resize', updateGoogleButtonWidth)
      }
    }

    const observer = new ResizeObserver(() => {
      updateGoogleButtonWidth()
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || typeof window === 'undefined') return undefined

    let cancelled = false

    const initializeGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return

      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        ux_mode: 'popup',
        auto_select: false,
      })
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: googleButtonWidth,
      })
      setGoogleReady(true)
    }

    if (window.google?.accounts?.id) {
      initializeGoogleButton()
      return () => {
        cancelled = true
      }
    }

    const scriptId = 'smartmobile-google-gsi'
    let script = document.getElementById(scriptId)
    const handleLoad = () => initializeGoogleButton()

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.addEventListener('load', handleLoad)
      document.head.appendChild(script)
    } else {
      script.addEventListener('load', handleLoad)
    }

    return () => {
      cancelled = true
      script?.removeEventListener('load', handleLoad)
    }
  }, [handleGoogleCredential, googleButtonWidth])

  const handleFacebookLoginClick = useCallback(() => {
    if (typeof window === 'undefined') {
      console.error('[FB Login] Window is undefined')
      setError('Trình duyệt không hỗ trợ.')
      return
    }

    if (!window.FB) {
      console.error('[FB Login] window.FB not available', { facebookReady, FACEBOOK_APP_ID })
      setError('Facebook SDK chưa sẵn sàng. Vui lòng thử lại sau.')
      return
    }

    const currentHost = window.location.hostname
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1'
    const isSecureOrigin = window.location.protocol === 'https:' || isLocalhost
    if (!isSecureOrigin) {
      setError('Facebook Login yêu cầu HTTPS (trừ localhost). Vui lòng chạy bằng HTTPS.')
      return
    }

    console.log('[FB Login] Starting Facebook login flow')
    setError('')
    setFacebookLoading(true)

    try {
      window.FB.login((resp) => {
        console.log('[FB Login] Callback received', { authResponse: !!resp?.authResponse })
        processFacebookLoginResponse(resp)
      }, { scope: 'email,public_profile' })
    } catch (err) {
      console.error('[FB Login] FB.login threw error:', err)
      setFacebookLoading(false)
      setError('Đăng nhập Facebook thất bại: ' + (err?.message || 'Unknown'))
    }
  }, [facebookReady, FACEBOOK_APP_ID, processFacebookLoginResponse])

  useEffect(() => {
    if (!FACEBOOK_APP_ID || typeof window === 'undefined') {
      console.warn('[FB SDK] Missing FACEBOOK_APP_ID or window undefined')
      return undefined
    }

    let cancelled = false
    const scriptId = 'smartmobile-facebook-sdk'
    let script = document.getElementById(scriptId)

    const handleLoad = () => {
      if (cancelled) return
      console.log('[FB SDK] SDK loaded, initializing...')
      try {
        if (!window.FB) {
          console.error('[FB SDK] window.FB not available after script load')
          return
        }
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: false,
          version: 'v20.0',
        })
        console.log('[FB SDK] Initialized successfully')
        setFacebookReady(true)
      } catch (e) {
        console.error('[FB SDK] Init error:', e)
      }
    }

    const handleError = () => {
      console.error('[FB SDK] Failed to load Facebook SDK')
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.addEventListener('load', handleLoad)
      script.addEventListener('error', handleError)
      console.log('[FB SDK] Creating and appending script')
      document.head.appendChild(script)
    } else {
      console.log('[FB SDK] Script already exists')
      script.addEventListener('load', handleLoad)
      script.addEventListener('error', handleError)
    }

    return () => {
      cancelled = true
      if (script) {
        try {
          script.removeEventListener('load', handleLoad)
          script.removeEventListener('error', handleError)
        } catch (e) {
          console.warn('[FB SDK] Cleanup error:', e)
        }
      }
    }
  }, [FACEBOOK_APP_ID])

  

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const account = await login({ identifier: form.identifier, password: form.password })
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
              <label className="block text-slate-400 text-sm mb-1.5">Email hoặc số điện thoại</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="email@example.com hoặc 0905xxxxxx"
                  value={form.identifier}
                  onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
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
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleButtonContainerRef} className="rounded-xl border border-white/10 bg-white/5 p-2 sm:p-3">
                  <div ref={googleButtonRef} className="w-full flex justify-center" />
                  {!googleReady && (
                    <p className="mt-2 text-xs text-slate-500 text-center">Đang tải đăng nhập Google...</p>
                  )}
                  {googleLoading && (
                    <p className="mt-2 text-xs text-indigo-300 text-center">Đang xác thực Google...</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center">Chưa cấu hình Google login (VITE_GOOGLE_CLIENT_ID).</p>
              )}

              {FACEBOOK_APP_ID ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-2 sm:p-3">
                  <button
                    type="button"
                    onClick={handleFacebookLoginClick}
                    disabled={!facebookReady || facebookLoading}
                    className="block w-full bg-[#1877F2] text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {facebookLoading ? 'Đang xác thực Facebook...' : 'Tiếp tục với Facebook'}
                  </button>
                  {!facebookReady && (
                    <p className="mt-2 text-xs text-slate-500 text-center">Đang tải Facebook SDK...</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center">Chưa cấu hình Facebook login (VITE_FACEBOOK_APP_ID).</p>
              )}

              <p className="text-[11px] leading-5 text-slate-500 text-center px-2">
                Bằng việc tiếp tục, bạn đồng ý với{' '}
                <Link to="/terms-of-service" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Điều khoản dịch vụ
                </Link>
                {' '}và{' '}
                <Link to="/privacy-policy" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Chính sách quyền riêng tư
                </Link>
                , bao gồm cả{' '}
                <Link to="/data-deletion" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  hướng dẫn xóa dữ liệu
                </Link>
                .
              </p>

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
