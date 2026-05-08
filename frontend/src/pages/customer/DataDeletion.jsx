import { Link } from 'react-router-dom'

export default function DataDeletion() {
  return (
    <div className="min-h-screen retail-bg text-slate-900 py-10 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="retail-card rounded-[28px] p-6 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2563eb]">SmartMobile</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Hướng dẫn xóa dữ liệu người dùng</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Nếu bạn muốn yêu cầu xóa dữ liệu liên quan đến tài khoản SmartMobile đã tạo qua Facebook Login hoặc các kênh khác, hãy gửi yêu cầu theo hướng dẫn dưới đây.
          </p>

          <div className="mt-8 space-y-5 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="text-lg font-bold text-slate-900">1. Cách gửi yêu cầu</h2>
              <p className="mt-2">Gửi email đến quản trị viên hệ thống với tiêu đề: “Yêu cầu xóa dữ liệu tài khoản”.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">2. Thông tin cần cung cấp</h2>
              <p className="mt-2">Vui lòng cung cấp email đăng nhập hoặc ID tài khoản để chúng tôi xác định đúng dữ liệu cần xóa.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">3. Thời gian xử lý</h2>
              <p className="mt-2">Chúng tôi sẽ xem xét và xử lý yêu cầu trong thời gian hợp lý sau khi xác minh thông tin người dùng.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">4. Dữ liệu được xóa</h2>
              <p className="mt-2">Bao gồm thông tin hồ sơ người dùng, dữ liệu đăng nhập liên kết và các dữ liệu cá nhân mà hệ thống lưu trữ cho tài khoản đó, trong phạm vi pháp luật cho phép.</p>
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