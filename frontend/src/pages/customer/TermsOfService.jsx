import { Link } from 'react-router-dom'

export default function TermsOfService() {
  return (
    <div className="min-h-screen retail-bg text-slate-900 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="retail-card rounded-[28px] p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2563eb]">SmartMobile</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Điều khoản dịch vụ</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Khi sử dụng SmartMobile, bạn đồng ý tuân thủ các điều khoản dưới đây để đảm bảo trải nghiệm an toàn và minh bạch.
          </p>

          <div className="mt-8 space-y-5 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="text-lg font-bold text-slate-900">1. Tài khoản</h2>
              <p className="mt-2">Bạn chịu trách nhiệm về thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">2. Đặt hàng</h2>
              <p className="mt-2">Giá sản phẩm, tình trạng tồn kho và thời gian giao hàng có thể thay đổi theo thực tế và được xác nhận tại thời điểm đặt hàng.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">3. Hành vi bị cấm</h2>
              <p className="mt-2">Không được dùng hệ thống cho mục đích gian lận, xâm nhập trái phép, gây rối hoặc vi phạm pháp luật hiện hành.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">4. Thay đổi dịch vụ</h2>
              <p className="mt-2">SmartMobile có thể cập nhật giao diện, tính năng hoặc điều khoản để phù hợp với nhu cầu vận hành và quy định pháp luật.</p>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="rounded-xl btn-retail px-5 py-2.5 text-sm font-semibold text-white">Quay về trang chủ</Link>
            <Link to="/privacy-policy" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-[#2563eb]">Xem chính sách quyền riêng tư</Link>
          </div>
        </div>
      </div>
    </div>
  )
}