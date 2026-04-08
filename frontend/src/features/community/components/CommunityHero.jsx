import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export default function CommunityHero({ stats, user }) {
  return (
    <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#0ea5e9] p-6 shadow-[0_28px_80px_rgba(37,99,235,0.35)] md:p-8">
      <div className="absolute -left-20 top-8 h-44 w-44 rounded-full bg-slate-900/30 blur-3xl" />
      <div className="absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-cyan-100/25 blur-3xl" />

      <div className="relative z-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-[#1d4ed8] backdrop-blur">
            <Sparkles size={15} />
            Không gian thảo luận SmartMobile
          </div>
          <h1 className="force-white mt-4 text-3xl font-black leading-tight md:text-4xl">Cộng đồng hỏi đáp và chia sẻ kinh nghiệm mua máy</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/90 md:text-base">
            Tư vấn cấu hình, chia sẻ trải nghiệm thực tế, nhận mẹo sử dụng và cập nhật deal nhanh từ người dùng SmartMobile.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-bold text-slate-900">{stats.postCount} bài viết</span>
            <span className="rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-bold text-slate-900">{stats.commentCount} bình luận</span>
            <span className="rounded-full border border-white/30 bg-white px-4 py-2 text-sm font-bold text-slate-900">{stats.activeUsers} thành viên hoạt động</span>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-600">Lưu ý cộng đồng</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Đăng nội dung tôn trọng và hữu ích cho người khác.</li>
            <li>Không chia sẻ thông tin cá nhân nhạy cảm.</li>
            <li>Ưu tiên nêu rõ nhu cầu để được tư vấn chính xác.</li>
          </ul>
          {!user && (
            <p className="mt-4 rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Đăng nhập để hiển thị tên tài khoản chính thức khi đăng bài. <Link className="font-semibold text-[#2563eb] underline" to="/login">Đăng nhập ngay</Link>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
