import { MapPin, User, Mail, Phone, ChevronRight } from 'lucide-react'

const shippingFields = [
  { name: 'name', label: 'Họ và tên', icon: User, placeholder: 'Nguyễn Văn A' },
  { name: 'email', label: 'Email', icon: Mail, placeholder: 'email@example.com' },
  { name: 'phone', label: 'Số điện thoại', icon: Phone, placeholder: '0905 xxx xxx' },
  { name: 'address', label: 'Địa chỉ', icon: MapPin, placeholder: '123 Nguyễn Huệ, Quận 1' },
  { name: 'city', label: 'Thành phố', icon: MapPin, placeholder: 'TP. Hồ Chí Minh' },
]

export default function CheckoutShippingStep({ form, onChange, onNext }) {
  return (
    <div className="glass rounded-3xl p-6 border border-white/10 space-y-4 fade-in">
      <h2 className="text-white font-semibold text-xl mb-2 flex items-center gap-2">
        <MapPin size={20} className="text-indigo-400" /> Thông tin giao hàng
      </h2>

      {shippingFields.map(field => {
        const Icon = field.icon

        return (
          <div key={field.name}>
            <label className="block text-slate-400 text-sm mb-1.5">{field.label}</label>
            <div className="relative">
              <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                name={field.name}
                value={form[field.name]}
                onChange={onChange}
                placeholder={field.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        )
      })}

      <div>
        <label className="block text-slate-400 text-sm mb-1.5">Ghi chú (tuỳ chọn)</label>
        <textarea
          name="note"
          value={form.note}
          onChange={onChange}
          rows={3}
          placeholder="Ghi chú cho người giao hàng..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
        />
      </div>

      <button onClick={onNext} className="w-full btn-glow text-white py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2">
        Tiếp theo <ChevronRight size={18} />
      </button>
    </div>
  )
}
