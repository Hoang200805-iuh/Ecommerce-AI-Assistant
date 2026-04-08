import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

export default function CheckoutSuccessView({ orderId }) {
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
      <div className="flex gap-3 justify-center">
        <Link to="/orders" className="btn-glow text-white px-8 py-3 rounded-2xl font-semibold">Theo dõi đơn hàng</Link>
        <Link to="/" className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-white/10 transition-all">Mua tiếp</Link>
      </div>
    </div>
  )
}
