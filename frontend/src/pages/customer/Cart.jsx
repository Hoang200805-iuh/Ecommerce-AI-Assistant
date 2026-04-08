import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingCart, ChevronRight, Tag } from 'lucide-react'
import { getCart, removeFromCart, setCart, useCartSync } from '../../store/cartStore.js'

const backendOrigin = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api').replace(/\/api\/?$/, '')

function toProxyImageUrl(url) {
  if (!url) return ''
  return `${backendOrigin}/api/proxy-image?url=${encodeURIComponent(url)}`
}

function fmt(n) {
  return Number(n || 0).toLocaleString('vi-VN') + ' VND'
}

export default function Cart() {
  const [items, setItems] = useState(() => getCart())
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)

  useEffect(() => useCartSync(setItems), [])

  const updateQty = (id, delta) => {
    setCart(items.map(item => item.id === id ? { ...item, quantity: Math.max(1, Number(item.quantity || 1) + delta) } : item))
  }

  const remove = (id) => {
    removeFromCart(id)
  }

  const clearCoupon = () => {
    setCoupon('')
    setCouponApplied(false)
  }

  const applyCoupon = () => {
    setCouponApplied(coupon.trim().toUpperCase() === 'SMART10')
  }

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0), [items])
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0
  const total = subtotal - discount
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 1), 0), [items])

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <ShoppingCart size={30} className="text-indigo-400" />
        Giỏ hàng
        <span className="text-lg font-normal text-slate-400">({totalQuantity} sản phẩm)</span>
      </h1>

      {items.length === 0 ? (
        <div className="glass rounded-3xl p-20 text-center border border-white/10">
          <ShoppingCart size={64} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 text-xl mb-6">Giỏ hàng của bạn đang trống</p>
          <Link to="/" className="btn-glow text-white px-8 py-3 rounded-2xl font-semibold inline-block">Tiếp tục mua sắm</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.id} className="glass rounded-2xl p-5 border border-white/10 card-hover">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.image_url ? (
                      <img src={toProxyImageUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">📱</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-indigo-400 text-xs font-medium mb-1">{item.brand}</p>
                    <h3 className="text-white font-semibold text-base mb-1 truncate">{item.name}</h3>
                    <p className="text-slate-500 text-xs mb-3">Số lượng: {item.quantity}</p>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-0 bg-white/5 rounded-xl border border-white/10">
                        <button onClick={() => updateQty(item.id, -1)} className="p-2 hover:text-white text-slate-400 transition-colors"><Minus size={14} /></button>
                        <span className="text-white font-semibold px-3 text-sm min-w-[2rem] text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="p-2 hover:text-white text-slate-400 transition-colors"><Plus size={14} /></button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-white font-bold text-lg">{fmt(Number(item.price || 0) * Number(item.quantity || 1))}</span>
                        <button onClick={() => remove(item.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Link to="/" className="block text-center text-indigo-400 hover:text-indigo-300 text-sm py-2 transition-colors">
              ← Tiếp tục mua sắm
            </Link>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/10">
              <p className="text-white font-semibold mb-3 flex items-center gap-2"><Tag size={16} className="text-amber-400" /> Mã giảm giá</p>
              <div className="flex gap-2">
                <input
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                  placeholder="Nhập mã..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button onClick={applyCoupon} className="px-4 py-2 btn-glow text-white rounded-xl text-sm font-medium">Áp dụng</button>
              </div>
              {couponApplied && <p className="text-green-400 text-xs mt-2">✓ Giảm 10% đã được áp dụng!</p>}
              {!couponApplied && <p className="text-slate-600 text-xs mt-2">Thử mã: SMART10</p>}
            </div>

            <div className="glass rounded-2xl p-5 border border-white/10">
              <h3 className="text-white font-semibold text-lg mb-4">Tổng đơn hàng</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Tạm tính ({totalQuantity} sp)</span>
                  <span className="text-white">{fmt(subtotal)}</span>
                </div>
                {couponApplied && (
                  <div className="flex justify-between text-green-400">
                    <span>Giảm giá (SMART10)</span>
                    <span>-{fmt(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Phí vận chuyển</span>
                  <span className="text-green-400 font-medium">Miễn phí</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="text-white font-semibold text-base">Tổng cộng</span>
                  <span className="text-2xl font-extrabold gradient-text">{fmt(total)}</span>
                </div>
              </div>
              <Link to="/checkout" className="block mt-5 btn-glow text-white text-center py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2">
                Thanh toán <ChevronRight size={18} />
              </Link>
              <button onClick={() => { clearCoupon(); setCart([]) }} className="mt-3 w-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 py-3 rounded-2xl text-sm font-medium transition-colors">
                Xoá toàn bộ giỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
