import { Zap } from 'lucide-react'

export default function CheckoutConfirmStep({
  form,
  user,
  paymentLabel,
  payment,
  qrTransferContent,
  qrConfirmed,
  onQrConfirmedChange,
  error,
  submitting,
  onBack,
  onSubmit,
}) {
  return (
    <div className="glass rounded-3xl p-6 border border-white/10 fade-in">
      <h2 className="text-white font-semibold text-xl mb-5">Xác nhận đơn hàng</h2>

      {payment === 'qr' && (
        <div className="mb-4 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-4 py-3 text-sm text-indigo-200">
          Vui lòng quét mã QR và chuyển đúng số tiền trước khi đặt đơn. Nội dung chuyển khoản: <span className="font-semibold">{qrTransferContent}</span>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {[
          ['Họ tên', form.name || user?.name || 'Nguyễn Văn A'],
          ['Email', form.email || user?.email || 'test@email.com'],
          ['SĐT', form.phone || '0905 xxx xxx'],
          ['Địa chỉ', form.address || '123 Nguyễn Huệ, Q1'],
          ['Thanh toán', paymentLabel],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between py-2 border-b border-white/5 text-sm">
            <span className="text-slate-400">{label}</span>
            <span className="text-white font-medium">{value}</span>
          </div>
        ))}
      </div>

      {payment === 'qr' && (
        <label className="mb-4 flex items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={qrConfirmed}
            onChange={event => onQrConfirmedChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5"
          />
          <span>Tôi đã quét QR và chuyển khoản đúng thông tin.</span>
        </label>
      )}

      {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">{error}</div>}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-2xl hover:bg-white/10 transition-all font-medium">
          Quay lại
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting || (payment === 'qr' && !qrConfirmed)}
          className="flex-1 btn-glow text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <Zap size={18} /> {submitting ? 'Đang đặt hàng...' : 'Đặt hàng ngay'}
        </button>
      </div>
    </div>
  )
}
