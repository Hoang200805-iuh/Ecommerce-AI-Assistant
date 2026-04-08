import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Search, Truck, ChevronDown, ChevronUp, RefreshCw, Loader2 } from 'lucide-react'
import { fetchWarehouseOrders, updateWarehouseOrderStatus } from '../../services/api.js'

const statuses = ['Tất cả', 'pending', 'processing', 'shipped', 'delivered', 'cancelled']

const statusConfig = {
  pending: { label: 'Chờ xử lý', cls: 'status-pending', action: 'Xác nhận', next: 'processing', actionCls: 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border-indigo-500/30' },
  processing: { label: 'Đang xử lý', cls: 'status-processing', action: 'Xuất kho', next: 'shipped', actionCls: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/30' },
  shipped: { label: 'Đang giao', cls: 'status-shipped', action: 'Hoàn thành', next: 'delivered', actionCls: 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30' },
  delivered: { label: 'Đã giao', cls: 'status-delivered', action: null, next: null, actionCls: '' },
  cancelled: { label: 'Đã huỷ', cls: 'status-cancelled', action: null, next: null, actionCls: '' },
}

function fmt(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`
}

function joinProducts(order) {
  return order.items?.length
    ? order.items.map(item => `${item.product_name} x${item.quantity}`).join(' • ')
    : 'Chưa có sản phẩm'
}

export default function WarehouseOrders() {
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({ totalOrders: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 })
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tất cả')
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadOrders = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetchWarehouseOrders({ status: statusFilter })
      setOrders(Array.isArray(response.orders) ? response.orders : [])
      setSummary(response.summary || { totalOrders: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 })
      if (response.orders?.length && !expanded) {
        setExpanded(response.orders[0].order_id)
      }
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const filtered = useMemo(() => orders.filter(order => {
    const matchQ = [order.order_id, order.customer, order.email, order.phone, joinProducts(order)]
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase())
    return matchQ
  }), [orders, query])

  const advanceStatus = async (orderId, nextStatus) => {
    setSaving(true)
    setError('')

    try {
      await updateWarehouseOrderStatus(orderId, nextStatus)
      await loadOrders()
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái đơn hàng.')
    } finally {
      setSaving(false)
    }
  }

  const cancelOrder = async (orderId) => {
    setSaving(true)
    setError('')

    try {
      await updateWarehouseOrderStatus(orderId, 'cancelled')
      await loadOrders()
    } catch (err) {
      setError(err.message || 'Không thể huỷ đơn hàng.')
    } finally {
      setSaving(false)
    }
  }

  const counts = {
    pending: summary.pending || 0,
    processing: summary.processing || 0,
    shipped: summary.shipped || 0,
    delivered: summary.delivered || 0,
    cancelled: summary.cancelled || 0,
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Xử lý đơn hàng</h1>
          <p className="text-slate-500 text-sm mt-1">{summary.totalOrders} đơn hàng • {counts.pending || 0} chờ xử lý</p>
        </div>
        <button onClick={loadOrders} className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition-all">
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key === statusFilter ? 'Tất cả' : key)}
            className={`glass rounded-xl p-3 text-center border transition-all ${statusFilter === key ? 'border-indigo-500/50 bg-indigo-600/10' : 'border-white/8 hover:border-white/20'}`}
          >
            <p className={`text-2xl font-bold ${key === statusFilter ? 'gradient-text' : 'text-white'}`}>{counts[key] || 0}</p>
            <span className={`badge ${cfg.cls} mt-1 inline-block`}>{cfg.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm mã đơn, tên khách hàng..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      <div className="space-y-3">
        {!loading && filtered.map(order => {
          const cfg = statusConfig[order.status] || statusConfig.pending
          const isOpen = expanded === order.order_id
          const canCancel = ['pending', 'processing'].includes(order.status)

          return (
            <div key={order.order_id} className="glass rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : order.order_id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <span className="font-mono text-indigo-400 text-sm font-bold">{order.order_id}</span>
                    <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                    <span className="text-xs text-slate-500">{order.date}</span>
                  </div>
                  <p className="text-white text-sm font-medium truncate">{order.customer}</p>
                  <p className="text-slate-500 text-xs truncate">{joinProducts(order)}</p>
                </div>
                <div className="text-right mr-2 flex-shrink-0">
                  <p className="text-white font-bold">{fmt(order.total)}</p>
                  <p className="text-slate-500 text-xs">{order.payment}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {cfg.action && (
                    <button
                      disabled={saving}
                      onClick={() => advanceStatus(order.order_id, cfg.next)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all disabled:opacity-60 ${cfg.actionCls}`}
                    >
                      {cfg.action}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      disabled={saving}
                      onClick={() => cancelOrder(order.order_id)}
                      className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-60"
                    >
                      Huỷ
                    </button>
                  )}
                </div>
                {isOpen ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />}
              </div>

              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t border-white/8 fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    {[
                      { label: 'Địa chỉ giao hàng', value: order.address, icon: '📍' },
                      { label: 'Số điện thoại', value: order.phone, icon: '📞' },
                      { label: 'Phương thức thanh toán', value: order.payment, icon: '💳' },
                    ].map(detail => (
                      <div key={detail.label} className="bg-white/3 rounded-xl p-3">
                        <span className="text-slate-500 text-xs">{detail.label}</span>
                        <p className="text-white text-sm font-medium mt-0.5">{detail.icon} {detail.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 bg-white/3 rounded-xl p-3">
                    <span className="text-slate-500 text-xs">Chi tiết đơn hàng</span>
                    <div className="space-y-2 mt-2">
                      {order.items?.map(item => (
                        <div key={item.order_item_id} className="flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <p className="text-white truncate">{item.product_name}</p>
                            <p className="text-slate-500 text-xs">{item.brand} • x{item.quantity}</p>
                          </div>
                          <p className="text-white font-semibold">{fmt(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.status === 'shipped' && (
                    <div className="mt-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
                      <Truck size={20} className="text-indigo-400 flex-shrink-0" />
                      <p className="text-indigo-300 text-sm">Đơn hàng đã xuất kho và đồng bộ sang trang theo dõi của khách hàng.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="glass rounded-2xl p-10 border border-white/10 text-center text-slate-500">
            <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tải đơn hàng...</span>
          </div>
        )}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="glass rounded-2xl p-16 text-center border border-white/10">
          <ClipboardList size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-500">Không có đơn hàng nào</p>
        </div>
      )}
    </div>
  )
}
