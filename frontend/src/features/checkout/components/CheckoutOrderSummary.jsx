export default function CheckoutOrderSummary({ items, subtotal, formatCurrency }) {
  return (
    <div className="glass rounded-2xl p-5 border border-white/10 sticky top-24">
      <h3 className="text-white font-semibold mb-4">Đơn hàng</h3>

      <div className="space-y-3 mb-5 pb-4 border-b border-white/10 max-h-96 overflow-auto pr-1">
        {items.map(item => (
          <div key={item.id} className="flex gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
              {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <span>📱</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{item.name}</p>
              <p className="text-slate-500 text-xs">{item.brand} • SL {item.quantity}</p>
              <p className="text-indigo-400 font-semibold text-sm mt-1">
                {formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-slate-400">
          <span>Tạm tính</span>
          <span className="text-white">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Vận chuyển</span>
          <span className="text-green-400 font-medium">Miễn phí</span>
        </div>
        <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
          <span className="text-white">Tổng cộng</span>
          <span className="gradient-text text-xl">{formatCurrency(subtotal)}</span>
        </div>
      </div>
    </div>
  )
}
