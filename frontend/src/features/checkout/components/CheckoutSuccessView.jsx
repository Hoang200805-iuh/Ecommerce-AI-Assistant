import { Link } from 'react-router-dom'
import { CheckCircle, Printer } from 'lucide-react'

function fmt(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`
}

function fmtDate(value) {
  if (!value) return '--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleString('vi-VN')
}

export default function CheckoutSuccessView({ orderId, receipt }) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center fade-in">
      <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={48} className="text-green-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">Đặt hàng thành công!</h1>
      <p className="text-slate-400 mb-2">
        Mã đơn hàng: <span className="text-indigo-400 font-mono font-bold">{orderId || '#SM000000'}</span>
      </p>
      <p className="text-slate-500 text-sm mb-8">Chúng tôi sẽ xử lý và giao hàng trong 2-4 giờ. Email xác nhận đã được gửi.</p>

      {receipt && (
        <div className="receipt-print-area text-left glass rounded-3xl border border-white/10 p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4 mb-4">
            <div>
              <h2 className="text-white text-xl font-bold">SmartPhone E-comere</h2>
              <p className="text-slate-400 text-sm">Biên lai thanh toán đơn hàng</p>
            </div>

            <div className="text-sm">
              <p className="text-slate-400">Mã đơn: <span className="text-white font-mono font-semibold">{receipt.orderId || orderId}</span></p>
              <p className="text-slate-400">Thời gian: <span className="text-white">{fmtDate(receipt.createdAt)}</span></p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
            <p className="text-slate-400">Khách hàng: <span className="text-white">{receipt.customerName || '--'}</span></p>
            <p className="text-slate-400">Email: <span className="text-white break-all">{receipt.customerEmail || '--'}</span></p>
            <p className="text-slate-400">Số điện thoại: <span className="text-white">{receipt.customerPhone || '--'}</span></p>
            <p className="text-slate-400">Thanh toán: <span className="text-white">{receipt.paymentLabel || '--'}</span></p>
          </div>

          <p className="text-slate-400 text-sm mb-3">
            Địa chỉ giao hàng: <span className="text-white">{receipt.shippingAddress || '--'}</span>
          </p>

          <div className="rounded-2xl border border-white/10 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Sản phẩm</th>
                  <th className="text-right px-3 py-2 font-medium">SL</th>
                  <th className="text-right px-3 py-2 font-medium">Đơn giá</th>
                  <th className="text-right px-3 py-2 font-medium">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {(receipt.items || []).map(item => (
                  <tr key={`${item.id}-${item.name}`} className="border-t border-white/10">
                    <td className="px-3 py-2 text-white">{item.name}</td>
                    <td className="px-3 py-2 text-right text-white">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-white">{fmt(item.price)}</td>
                    <td className="px-3 py-2 text-right text-white">{fmt(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {receipt.note && (
            <p className="text-slate-400 text-sm mb-3">Ghi chú: <span className="text-white">{receipt.note}</span></p>
          )}

          <div className="flex justify-end border-t border-white/10 pt-4">
            <p className="text-lg font-bold text-indigo-300">Tổng thanh toán: {fmt(receipt.total)}</p>
          </div>
        </div>
      )}

      <div className="receipt-actions flex gap-3 justify-center flex-wrap">
        <button type="button" onClick={handlePrint} className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-white/10 transition-all inline-flex items-center gap-2">
          <Printer size={18} /> In biên lai
        </button>
        <Link to="/orders" className="btn-glow text-white px-8 py-3 rounded-2xl font-semibold">Theo dõi đơn hàng</Link>
        <Link to="/" className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-white/10 transition-all">Mua tiếp</Link>
      </div>
    </div>
  )
}
