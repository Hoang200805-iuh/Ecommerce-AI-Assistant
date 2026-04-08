import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, Smartphone, MapPin, User, Mail, Phone, CheckCircle, ChevronRight, Zap } from 'lucide-react'
import { createOrder } from '../../services/api.js'
import { clearCart, getCart, useCartSync } from '../../store/cartStore.js'
import { useAuth } from '../../context/AuthContext'

function fmt(n) { return Number(n || 0).toLocaleString('vi-VN') + ' VND' }

const paymentMethods = [
  { id: 'momo', label: 'MoMo', icon: '💜', desc: 'Ví điện tử MoMo' },
  { id: 'vnpay', label: 'VNPay', icon: '🔵', desc: 'Cổng thanh toán VNPay' },
  { id: 'card', label: 'Thẻ tín dụng', icon: '💳', desc: 'Visa / Mastercard / JCB' },
  { id: 'cod', label: 'Tiền mặt', icon: '💵', desc: 'Thanh toán khi nhận hàng' },
]

export default function Checkout() {
  const [step, setStep] = useState(1)
  const [payment, setPayment] = useState('momo')
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', note: '' })
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState(() => getCart())
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => useCartSync(setItems), [])

  useEffect(() => {
    if (user) {
      setForm(current => ({
        ...current,
        name: current.name || user.name || '',
        email: current.email || user.email || '',
      }))
    }
  }, [user])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0), [items])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleOrder = async () => {
    setError('')
    setSubmitting(true)

    try {
      const response = await createOrder({
        customer: form,
        paymentMethod: payment,
        items,
        user,
      })

      const result = response.data || response
      setOrderId(result.orderId)
      setSuccess(true)
      clearCart()
      setItems([])
    } catch (err) {
      setError(err.message || 'Không thể tạo đơn hàng.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center fade-in">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} className="text-green-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Đặt hàng thành công!</h1>
        <p className="text-slate-400 mb-2">Mã đơn hàng: <span className="text-indigo-400 font-mono font-bold">{orderId || '#SM000000'}</span></p>
        <p className="text-slate-500 text-sm mb-8">Chúng tôi sẽ xử lý và giao hàng trong 2–4 giờ. Email xác nhận đã được gửi.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/orders" className="btn-glow text-white px-8 py-3 rounded-2xl font-semibold">Theo dõi đơn hàng</Link>
          <Link to="/" className="bg-white/5 border border-white/10 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-white/10 transition-all">Mua tiếp</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Thanh toán đơn hàng</h1>

      {items.length === 0 ? (
        <div className="glass rounded-3xl p-10 border border-white/10 text-center">
          <p className="text-slate-400 mb-4">Giỏ hàng đang trống. Hãy thêm sản phẩm trước khi thanh toán.</p>
          <Link to="/" className="btn-glow text-white px-6 py-3 rounded-2xl font-semibold inline-block">Về trang chủ</Link>
        </div>
      ) : (
        <>

      <div className="flex items-center gap-0 mb-10">
        {['Thông tin', 'Thanh toán', 'Xác nhận'].map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${i + 1 <= step ? 'text-indigo-400' : 'text-slate-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${i + 1 < step ? 'bg-indigo-600 border-indigo-600 text-white' : i + 1 === step ? 'border-indigo-500 text-indigo-400' : 'border-slate-700 text-slate-600'}`}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:block">{s}</span>
            </div>
            {i < 2 && <div className={`flex-1 h-px mx-3 ${i + 1 < step ? 'bg-indigo-500' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="glass rounded-3xl p-6 border border-white/10 space-y-4 fade-in">
              <h2 className="text-white font-semibold text-xl mb-2 flex items-center gap-2">
                <MapPin size={20} className="text-indigo-400" /> Thông tin giao hàng
              </h2>
              {[
                { name: 'name', label: 'Họ và tên', icon: User, placeholder: 'Nguyễn Văn A' },
                { name: 'email', label: 'Email', icon: Mail, placeholder: 'email@example.com' },
                { name: 'phone', label: 'Số điện thoại', icon: Phone, placeholder: '0905 xxx xxx' },
                { name: 'address', label: 'Địa chỉ', icon: MapPin, placeholder: '123 Nguyễn Huệ, Quận 1' },
                { name: 'city', label: 'Thành phố', icon: MapPin, placeholder: 'TP. Hồ Chí Minh' },
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-slate-400 text-sm mb-1.5">{field.label}</label>
                  <div className="relative">
                    <field.icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">Ghi chú (tuỳ chọn)</label>
                <textarea
                  name="note"
                  value={form.note}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Ghi chú cho người giao hàng..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
              <button onClick={() => setStep(2)} className="w-full btn-glow text-white py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2">
                Tiếp theo <ChevronRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="glass rounded-3xl p-6 border border-white/10 fade-in">
              <h2 className="text-white font-semibold text-xl mb-5 flex items-center gap-2">
                <CreditCard size={20} className="text-indigo-400" /> Phương thức thanh toán
              </h2>
              <div className="space-y-3 mb-6">
                {paymentMethods.map(method => (
                  <label key={method.id} className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all ${payment === method.id ? 'border-indigo-500 bg-indigo-600/10' : 'border-white/10 bg-white/3 hover:border-white/20'}`}>
                    <input type="radio" name="payment" value={method.id} checked={payment === method.id} onChange={() => setPayment(method.id)} className="hidden" />
                    <span className="text-3xl">{method.icon}</span>
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
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-2xl hover:bg-white/10 transition-all font-medium">Quay lại</button>
                <button onClick={() => setStep(3)} className="flex-1 btn-glow text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                  Tiếp theo <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="glass rounded-3xl p-6 border border-white/10 fade-in">
              <h2 className="text-white font-semibold text-xl mb-5">Xác nhận đơn hàng</h2>
              <div className="space-y-3 mb-6">
                {[
                  ['Họ tên', form.name || user?.name || 'Nguyễn Văn A'],
                  ['Email', form.email || user?.email || 'test@email.com'],
                  ['SĐT', form.phone || '0905 xxx xxx'],
                  ['Địa chỉ', form.address || '123 Nguyễn Huệ, Q1'],
                  ['Thanh toán', paymentMethods.find(method => method.id === payment)?.label || 'MoMo'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-white/5 text-sm">
                    <span className="text-slate-400">{k}</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
              {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">{error}</div>}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 bg-white/5 border border-white/10 text-white py-3 rounded-2xl hover:bg-white/10 transition-all font-medium">Quay lại</button>
                <button onClick={handleOrder} disabled={submitting} className="flex-1 btn-glow text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-70">
                  <Zap size={18} /> {submitting ? 'Đang đặt hàng...' : 'Đặt hàng ngay'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
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
                    <p className="text-indigo-400 font-semibold text-sm mt-1">{fmt(Number(item.price || 0) * Number(item.quantity || 1))}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400"><span>Tạm tính</span><span className="text-white">{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Vận chuyển</span><span className="text-green-400 font-medium">Miễn phí</span></div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                <span className="text-white">Tổng cộng</span>
                <span className="gradient-text text-xl">{fmt(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  )
}
