import { CreditCard, ChevronRight, QrCode, Copy } from 'lucide-react'

function QrPaymentPanel({ bank, qrImageUrl, qrAmountLabel, transferContent, copiedField, onCopy }) {
  return (
    <div className="mb-6 rounded-2xl border border-indigo-500/30 bg-indigo-600/10 p-4">
      <p className="text-indigo-300 text-sm font-semibold mb-3 inline-flex items-center gap-2">
        <QrCode size={16} /> Quét mã QR để thanh toán
      </p>

      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
        <div className="rounded-xl bg-white p-2">
          <img src={qrImageUrl} alt="QR thanh toán SmartMobile" className="w-full h-auto rounded-lg" />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <div>
              <p className="text-slate-500 text-xs">Ngân hàng</p>
              <p className="text-white font-semibold">{bank.bankName}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <div>
              <p className="text-slate-500 text-xs">Số tài khoản</p>
              <p className="text-white font-semibold">{bank.accountNo}</p>
            </div>
            <button
              type="button"
              onClick={() => onCopy(bank.accountNo, 'account')}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-white hover:bg-white/10"
            >
              <Copy size={13} /> {copiedField === 'account' ? 'Đã sao chép' : 'Sao chép'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <div>
              <p className="text-slate-500 text-xs">Nội dung chuyển khoản</p>
              <p className="text-white font-semibold">{transferContent}</p>
            </div>
            <button
              type="button"
              onClick={() => onCopy(transferContent, 'content')}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs text-white hover:bg-white/10"
            >
              <Copy size={13} /> {copiedField === 'content' ? 'Đã sao chép' : 'Sao chép'}
            </button>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <p className="text-slate-500 text-xs">Số tiền</p>
            <p className="text-indigo-300 font-bold">{qrAmountLabel}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPaymentStep({
  paymentMethods,
  payment,
  onPaymentChange,
  onBack,
  onNext,
  qrInfo,
  onCopy,
}) {
  return (
    <div className="glass rounded-3xl p-6 border border-white/10 fade-in">
      <h2 className="text-white font-semibold text-xl mb-5 flex items-center gap-2">
        <CreditCard size={20} className="text-indigo-400" /> Phương thức thanh toán
      </h2>

      <div className="space-y-3 mb-6">
        {paymentMethods.map(method => (
          <label key={method.id} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all ${payment === method.id ? 'border-indigo-500 bg-indigo-600/10' : 'border-white/10 bg-white/3 hover:border-white/20'}`}>
            <input
              type="radio"
              name="payment"
              value={method.id}
              checked={payment === method.id}
              onChange={() => onPaymentChange(method.id)}
              className="hidden"
            />
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              {method.icon.endsWith('.svg') ? (
                <img src={method.icon} alt={method.label} className="w-full h-full object-contain" />
              ) : (
                <span className="text-3xl">{method.icon}</span>
              )}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{method.label}</p>
              <p className="text-slate-500 text-xs">{method.desc}</p>
            </div>
            <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${payment === method.id ? 'border-indigo-500' : 'border-slate-600'}`}>
              {payment === method.id && <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full" />}
            </div>
          </label>
        ))}
      </div>

      {payment === 'qr' && (
        <QrPaymentPanel
          bank={qrInfo.bank}
          qrImageUrl={qrInfo.qrImageUrl}
          qrAmountLabel={qrInfo.qrAmountLabel}
          transferContent={qrInfo.transferContent}
          copiedField={qrInfo.copiedField}
          onCopy={onCopy}
        />
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-2xl hover:bg-white/10 transition-all font-medium">
          Quay lại
        </button>
        <button onClick={onNext} className="flex-1 btn-glow text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
          Tiếp theo <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
