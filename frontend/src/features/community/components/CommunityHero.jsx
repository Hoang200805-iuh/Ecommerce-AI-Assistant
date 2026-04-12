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
      </div>
    </section>
  )
}
