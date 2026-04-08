import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpDown, Check, Loader2, Package, Plus, RefreshCw, Search, ShieldAlert, X } from 'lucide-react'
import { fetchWarehouseInventory, updateWarehouseInventory } from '../../services/api.js'

const statusMap = {
  in_stock: { label: 'Còn hàng', cls: 'status-delivered' },
  low_stock: { label: 'Gần hết', cls: 'status-pending' },
  out_stock: { label: 'Hết hàng', cls: 'status-cancelled' },
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`
}

function normalizeSku(item) {
  return item.sku || `SKU-${String(item.id).padStart(4, '0')}`
}

export default function Inventory() {
  const [inventory, setInventory] = useState([])
  const [summary, setSummary] = useState({ totalProducts: 0, totalStock: 0, inStock: 0, lowStock: 0, outStock: 0 })
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('Tất cả')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ stock: '', minStock: '' })

  const loadInventory = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetchWarehouseInventory()
      setInventory(Array.isArray(response.data) ? response.data : [])
      setSummary(response.summary || { totalProducts: 0, totalStock: 0, inStock: 0, lowStock: 0, outStock: 0 })
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu kho.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventory()
  }, [])

  const brands = useMemo(() => ['Tất cả', ...Array.from(new Set(inventory.map(item => item.brand))).filter(Boolean)], [inventory])

  const filtered = useMemo(() => inventory.filter(item => {
    const matchBrand = brand === 'Tất cả' || item.brand === brand
    const searchText = `${item.name} ${normalizeSku(item)} ${item.brand}`.toLowerCase()
    const matchQuery = searchText.includes(query.toLowerCase())
    return matchBrand && matchQuery
  }), [brand, inventory, query])

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ stock: String(item.stock ?? 0), minStock: String(item.minStock ?? 10) })
  }

  const closeEdit = () => {
    setEditItem(null)
    setForm({ stock: '', minStock: '' })
  }

  const saveEdit = async () => {
    if (!editItem) return

    setSaving(true)
    setError('')

    try {
      await updateWarehouseInventory(editItem.id, {
        stock: Number(form.stock),
        minStock: Number(form.minStock),
      })
      await loadInventory()
      closeEdit()
    } catch (err) {
      setError(err.message || 'Không thể cập nhật tồn kho.')
    } finally {
      setSaving(false)
    }
  }

  const lowStockCount = summary.lowStock + summary.outStock

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý kho hàng</h1>
          <p className="text-slate-500 text-sm mt-1">{summary.totalProducts} sản phẩm • Tổng SKU</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link to="/warehouse/upload" className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-4 py-2 rounded-xl text-sm hover:bg-indigo-500/15 transition-all">
            <Plus size={16} /> Upload sản phẩm
          </Link>
          <Link to="/warehouse/reports" className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-sm hover:bg-amber-500/15 transition-all">
            <ShieldAlert size={16} /> Báo cáo hệ thống
          </Link>
          <button onClick={loadInventory} className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition-all">
            <RefreshCw size={16} /> Đồng bộ
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Còn hàng', count: summary.inStock, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Gần hết', count: summary.lowStock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Hết hàng', count: summary.outStock, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Tổng tồn kho', count: summary.totalStock, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
        ].map(item => (
          <div key={item.label} className={`glass rounded-xl p-4 border ${item.bg} text-center`}>
            <p className={`text-3xl font-extrabold ${item.color}`}>{item.count}</p>
            <p className="text-slate-400 text-xs mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-sm">
            <AlertTriangle size={16} /> {lowStockCount} sản phẩm cần nhập thêm
          </div>
        )}
        <div className="relative flex-1 min-w-60">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm tên hoặc SKU..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {brands.map(item => (
            <button
              key={item}
              onClick={() => setBrand(item)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${brand === item ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                {['Sản phẩm', 'SKU', 'Tồn kho', 'Tối thiểu', 'Trạng thái', 'Đơn giá', 'Cập nhật tồn kho'].map(header => (
                  <th key={header} className="text-left px-4 py-3.5 text-slate-500 font-medium text-xs uppercase tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.map(item => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-lg">📦</div>
                      <div>
                        <p className="text-white font-medium text-sm">{item.name}</p>
                        <p className="text-slate-500 text-xs">{item.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400 text-xs">{normalizeSku(item)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-lg font-bold ${item.status === 'out_stock' ? 'text-red-400' : item.status === 'low_stock' ? 'text-amber-400' : 'text-white'}`}>
                      {item.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{item.minStock}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusMap[item.status]?.cls || statusMap.low_stock.cls}`}>{statusMap[item.status]?.label || 'Gần hết'}</span>
                  </td>
                  <td className="px-4 py-3 text-white font-semibold text-xs">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all text-xs font-medium"
                    >
                      <ArrowUpDown size={12} /> Cập nhật
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>Không tìm thấy sản phẩm phù hợp</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500" colSpan={7}>
                    <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tải dữ liệu kho...</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="glass rounded-3xl p-6 border border-amber-500/30 w-full max-w-md fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">Cập nhật tồn kho</h2>
              <button onClick={closeEdit} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-white font-medium text-sm">{editItem.name}</p>
                <p className="text-slate-500 text-xs mt-1">{editItem.brand} • {normalizeSku(editItem)}</p>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1.5">Tồn kho hiện tại</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={e => setForm(current => ({ ...current, stock: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1.5">Mức tối thiểu</label>
                <input
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={e => setForm(current => ({ ...current, minStock: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={closeEdit} className="flex-1 bg-white/5 border border-white/10 text-white py-2.5 rounded-xl hover:bg-white/10 transition-all text-sm font-medium">Huỷ</button>
                <button onClick={saveEdit} disabled={saving} className="flex-1 btn-glow text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
