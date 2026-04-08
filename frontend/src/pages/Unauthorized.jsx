import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

export default function Unauthorized() {
  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full glass rounded-3xl p-8 border border-white/10 text-center fade-in">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-5">
          <ShieldAlert size={32} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Không có quyền truy cập</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Tài khoản hiện tại không đủ quyền để xem trang này. Vui lòng đăng nhập đúng vai trò hoặc quay lại trang chủ.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-glow text-white px-5 py-3 rounded-xl font-semibold text-sm">Về trang chủ</Link>
          <Link to="/login" className="bg-slate-100 border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors">Đăng nhập</Link>
        </div>
      </div>
    </div>
  )
}