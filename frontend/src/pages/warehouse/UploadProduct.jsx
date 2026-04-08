import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Plus, Upload, X, XCircle } from 'lucide-react'
import { createWarehouseProduct } from '../../services/api.js'

const initialForm = {
  name: '',
  brand: '',
  category: '',
  price: '',
  stock: '0',
  minStock: '10',
  imageUrl: '',
  description: '',
  ram: '',
  rom: '',
  battery: '',
  rating: '0',
  reviewCount: '0',
}

const initialSpecRows = [{ key: '', value: '' }]

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export default function WarehouseUploadProduct() {
  const [form, setForm] = useState(initialForm)
  const [specRows, setSpecRows] = useState(initialSpecRows)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const specs = useMemo(() => {
    return specRows.reduce((acc, row) => {
      const key = row.key.trim()
      const value = row.value.trim()
      if (key && value) {
        acc[key] = value
      }
      return acc
    }, {})
  }, [specRows])

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const updateSpec = (index, field, value) => {
    setSpecRows(current => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      return { ...row, [field]: value }
    }))
  }

  const addSpecRow = () => {
    setSpecRows(current => [...current, { key: '', value: '' }])
  }

  const removeSpecRow = (index) => {
    setSpecRows(current => {
      if (current.length === 1) {
        return initialSpecRows
      }
      return current.filter((_, rowIndex) => rowIndex !== index)
    })
  }

  const resetForm = () => {
    setForm(initialForm)
    setSpecRows(initialSpecRows)
  }

  const submitProduct = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim() || !form.brand.trim()) {
      setError('Vui lòng nhập tên sản phẩm và thương hiệu.')
      return
    }

    if (form.price === '' || toNumber(form.price) <= 0) {
      setError('Giá sản phẩm phải lớn hơn 0.')
      return
    }

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category.trim(),
      price: toNumber(form.price),
      stock: Math.max(0, toNumber(form.stock)),
      minStock: Math.max(0, toNumber(form.minStock, 10)),
      imageUrl: form.imageUrl.trim(),
      description: form.description.trim(),
      ram: form.ram.trim(),
      rom: form.rom.trim(),
      battery: form.battery.trim(),
      rating: Math.min(5, Math.max(0, toNumber(form.rating))),
      reviewCount: Math.max(0, toNumber(form.reviewCount)),
      specs,
    }

    setSaving(true)
    try {
      const response = await createWarehouseProduct(payload)
      setSuccess(`Đã tải sản phẩm lên thành công: ${response?.data?.name || payload.name}`)
      resetForm()
    } catch (err) {
      setError(err.message || 'Không thể tải sản phẩm lên kho.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Upload sản phẩm mới</h1>
          <p className="text-slate-500 text-sm mt-1">Thêm sản phẩm trực tiếp vào kho để bán và theo dõi tồn kho ngay.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3 flex items-center gap-2">
          <XCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 text-sm px-4 py-3 flex items-center gap-2">
          <CheckCircle2 size={16} className="flex-shrink-0" /> {success}
        </div>
      )}

      <form onSubmit={submitProduct} className="glass rounded-2xl border border-white/10 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-slate-400 text-sm mb-1.5">Tên sản phẩm *</label>
            <input
              value={form.name}
              onChange={event => updateField('name', event.target.value)}
              placeholder="Ví dụ: iPhone 16 Pro Max"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Thương hiệu *</label>
            <input
              value={form.brand}
              onChange={event => updateField('brand', event.target.value)}
              placeholder="Apple"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Giá (VND) *</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={event => updateField('price', event.target.value)}
              placeholder="29990000"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Tồn kho ban đầu</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={event => updateField('stock', event.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Mức tồn kho tối thiểu</label>
            <input
              type="number"
              min="0"
              value={form.minStock}
              onChange={event => updateField('minStock', event.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Danh mục</label>
            <input
              value={form.category}
              onChange={event => updateField('category', event.target.value)}
              placeholder="Flagship"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">RAM</label>
            <input
              value={form.ram}
              onChange={event => updateField('ram', event.target.value)}
              placeholder="12GB"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">ROM</label>
            <input
              value={form.rom}
              onChange={event => updateField('rom', event.target.value)}
              placeholder="256GB"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Pin</label>
            <input
              value={form.battery}
              onChange={event => updateField('battery', event.target.value)}
              placeholder="5000mAh"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Đánh giá ban đầu (0 - 5)</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={event => updateField('rating', event.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Số lượt đánh giá</label>
            <input
              type="number"
              min="0"
              value={form.reviewCount}
              onChange={event => updateField('reviewCount', event.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-slate-400 text-sm mb-1.5">URL ảnh sản phẩm</label>
            <input
              value={form.imageUrl}
              onChange={event => updateField('imageUrl', event.target.value)}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-slate-400 text-sm mb-1.5">Mô tả sản phẩm</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={event => updateField('description', event.target.value)}
              placeholder="Mô tả nhanh về điểm nổi bật của sản phẩm"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-sm font-semibold">Thông số kỹ thuật</h2>
            <button
              type="button"
              onClick={addSpecRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-all text-xs font-medium"
            >
              <Plus size={14} /> Thêm thông số
            </button>
          </div>

          <div className="space-y-2">
            {specRows.map((row, index) => (
              <div key={`${index}-${row.key}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                <input
                  value={row.key}
                  onChange={event => updateSpec(index, 'key', event.target.value)}
                  placeholder="Ví dụ: Camera"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <input
                  value={row.value}
                  onChange={event => updateSpec(index, 'value', event.target.value)}
                  placeholder="Ví dụ: 48MP + 12MP"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeSpecRow(index)}
                  className="px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all"
                  title="Xoá thông số"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-glow text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-70"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Tải sản phẩm lên
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={saving}
            className="bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-all"
          >
            Làm mới form
          </button>
        </div>
      </form>
    </div>
  )
}
