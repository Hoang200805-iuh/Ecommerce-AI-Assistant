import { useEffect, useMemo, useState } from 'react'
import { Package, Truck, Search, ChevronDown, ChevronUp, RefreshCw, XCircle, Loader2 } from 'lucide-react'
import { cancelUserOrder, fetchUserOrders } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext'

function fmt(n) {
  return Number(n || 0).toLocaleString('vi-VN') + ' VND'
}

const statusMap = {
  pending: { label: 'Chờ xử lý', cls: 'status-pending' },
  processing: { label: 'Đang xử lý', cls: 'status-processing' },
  shipped: { label: 'Đang giao', cls: 'status-shipped' },
  delivered: { label: 'Đã giao', cls: 'status-delivered' },
  cancelled: { label: 'Đã huỷ', cls: 'status-cancelled' },
}

export default function OrderTracking() {
  const [expanded, setExpanded] = useState(null)
  const [searchId, setSearchId] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState('')
  const [message, setMessage] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    let cancelled = false

    const loadOrders = async () => {
      if (!user?.email) {
        setLoading(false)
        return
      }

      try {
        const data = await fetchUserOrders(user.email)
        if (cancelled) return

        setOrders(Array.isArray(data) ? data : [])
        setMessage('')
        if (data?.length) {
          setExpanded(current => current ?? data[0].order_id)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load orders:', error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadOrders()
    const interval = window.setInterval(loadOrders, 15000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [user?.email])

  const handleCancelOrder = async (orderId) => {
    if (!user?.email) return
    if (!window.confirm('Bạn có chắc muốn huỷ đơn hàng này?')) return

    setCancellingId(orderId)
    setMessage('')

    try {
      await cancelUserOrder(orderId, user.email)
      setMessage('Đã huỷ đơn hàng thành công.')
      const data = await fetchUserOrders(user.email)
      setOrders(Array.isArray(data) ? data : [])
      if (data?.length) {
        setExpanded(current => current ?? data[0].order_id)
      }
    } catch (error) {
      setMessage(error.message || 'Không thể huỷ đơn hàng.')
    } finally {
      setCancellingId('')
    }
  }

  const filtered = useMemo(
    () => orders.filter(order => order.order_id.toLowerCase().includes(searchId.toLowerCase()) || !searchId),
    [orders, searchId]
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Package size={30} className="text-indigo-400" /> Theo dõi đơn hàng
        </h1>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={searchId}
          onChange={e => setSearchId(e.target.value)}
          placeholder="Tìm theo mã đơn hàng..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {message && (
        <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-600/10 px-4 py-3 text-sm text-indigo-200">
          {message}
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-10 border border-white/10 text-center text-slate-500">Đang tải đơn hàng...</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => {
            const st = statusMap[order.status] || statusMap.pending
            const isOpen = expanded === order.order_id
            const canCancel = order.status === 'pending'
            const firstItem = order.items?.[0]
            const productLabel = order.items?.length
              ? order.items.map(item => `${item.product_name} x${item.quantity}`).join(' • ')
              : 'Chưa có sản phẩm'

            return (
              <div key={order.order_id} className="glass rounded-2xl border border-white/10 overflow-hidden card-hover">
                <div className="flex items-center gap-4 p-5 cursor-pointer" onClick={() => setExpanded(isOpen ? null : order.order_id)}>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                    {firstItem?.image_url ? <img src={firstItem.image_url} alt={firstItem.product_name} className="w-full h-full object-cover" /> : '📱'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-mono font-bold text-sm">{order.order_id}</span>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-slate-400 text-xs truncate">{productLabel}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{order.created_at}</p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-white font-bold">{fmt(order.total_price)}</p>
                    <p className="text-slate-500 text-xs">{order.payment_method}</p>
                  </div>
                  {isOpen ? <ChevronUp size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />}
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-white/10 pt-5 fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/3 rounded-xl p-3">
                        <p className="text-slate-500 text-xs">Khách hàng</p>
                        <p className="text-white text-sm font-medium">{order.shipping_name}</p>
                        <p className="text-slate-400 text-xs">{order.shipping_email}</p>
                      </div>
                      <div className="bg-white/3 rounded-xl p-3">
                        <p className="text-slate-500 text-xs">Thanh toán</p>
                        <p className="text-white text-sm font-medium">{order.payment_method}</p>
                        <p className="text-slate-400 text-xs">{order.status}</p>
                      </div>
                      <div className="bg-white/3 rounded-xl p-3">
                        <p className="text-slate-500 text-xs">Địa chỉ</p>
                        <p className="text-white text-sm font-medium">{order.shipping_address}</p>
                        <p className="text-slate-400 text-xs">{order.shipping_city || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {order.items?.map(item => (
                        <div key={item.order_item_id} className="bg-white/3 rounded-xl p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{item.product_name}</p>
                            <p className="text-slate-500 text-xs">{item.brand} • x{item.quantity}</p>
                          </div>
                          <p className="text-white font-semibold text-sm">{fmt(item.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>

                    {canCancel && (
                      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex-wrap">
                        <div>
                          <p className="text-white text-sm font-semibold">Huỷ đơn hàng</p>
                          <p className="text-slate-400 text-xs mt-1">Chỉ huỷ được khi quản lý kho chưa duyệt đơn.</p>
                        </div>
                        <button
                          onClick={() => handleCancelOrder(order.order_id)}
                          disabled={cancellingId === order.order_id}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                        >
                          {cancellingId === order.order_id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          {cancellingId === order.order_id ? 'Đang huỷ...' : 'Huỷ đơn'}
                        </button>
                      </div>
                    )}

                    {order.status === 'shipped' && (
                      <div className="mt-4 bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
                        <Truck size={20} className="text-indigo-400 flex-shrink-0" />
                        <p className="text-indigo-300 text-sm">Đơn hàng đang trên đường đến bạn. Dự kiến giao trong <strong>1–2 giờ</strong>.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="glass rounded-2xl p-16 text-center border border-white/10 mt-4">
          <Package size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-500">Không có đơn hàng nào</p>
        </div>
      )}
    </div>
  )
}
