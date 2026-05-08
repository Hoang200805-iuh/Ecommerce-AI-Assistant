import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen retail-bg text-slate-900 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="retail-card rounded-[28px] p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2563eb]">SmartMobile</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Chính sách quyền riêng tư</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Trang này mô tả cách SmartMobile thu thập, sử dụng và bảo vệ thông tin của bạn khi đăng nhập hoặc mua sắm trên nền tảng.
          </p>

          <div className="mt-8 space-y-5 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="text-lg font-bold text-slate-900">1. Thông tin chúng tôi thu thập</h2>
              <p className="mt-2">Tên, email, ảnh đại diện công khai từ Facebook hoặc Google, cùng các thông tin cần thiết để xử lý đơn hàng và hỗ trợ khách hàng.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">2. Cách chúng tôi sử dụng dữ liệu</h2>
              <p className="mt-2">Dữ liệu được dùng để xác thực đăng nhập, quản lý tài khoản, xử lý thanh toán, theo dõi đơn hàng và cải thiện trải nghiệm mua sắm.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">3. Bảo mật</h2>
              <p className="mt-2">Chúng tôi áp dụng các biện pháp kỹ thuật và vận hành hợp lý để bảo vệ dữ liệu của bạn khỏi truy cập trái phép.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">4. Liên hệ</h2>
              <p className="mt-2">Nếu bạn cần yêu cầu chỉnh sửa hoặc xóa dữ liệu, hãy liên hệ với quản trị viên của hệ thống.</p>
            </section>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="rounded-xl btn-retail px-5 py-2.5 text-sm font-semibold text-white">Quay về trang chủ</Link>
            <Link to="/terms-of-service" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-[#2563eb]">Xem điều khoản dịch vụ</Link>
          </div>
        </div>
      </div>
    </div>
  )
}