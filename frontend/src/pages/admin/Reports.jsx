import { useEffect, useMemo, useState } from 'react'
import { BarChart2, TrendingUp, Users, ShoppingBag, Download, ArrowUpRight } from 'lucide-react'
import { fetchAdminReports } from '../../services/api.js'

function formatVnd(value) {
  return Number(value || 0).toLocaleString('vi-VN') + ' VND'
}

const statusMap = {
  pending: { label: 'Chờ', cls: 'status-pending' },
  processing: { label: 'Xử lý', cls: 'status-processing' },
  shipped: { label: 'Giao', cls: 'status-shipped' },
  delivered: { label: 'Xong', cls: 'status-delivered' },
  cancelled: { label: 'Huỷ', cls: 'status-cancelled' },
}

export default function AdminReports() {
  const [reportData, setReportData] = useState({ summary: {}, recentOrders: [], topProducts: [], monthlyData: [] })

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetchAdminReports()
        setReportData(response.data || { summary: {}, recentOrders: [], topProducts: [], monthlyData: [] })
      } catch (error) {
        console.error('Failed to load admin reports:', error)
      }
    }

    loadReports()
  }, [])

  const metrics = useMemo(() => [
    { label: 'Tổng doanh thu', value: formatVnd(reportData.summary?.totalRevenue || 0), sub: 'Tất cả thời gian', change: '+0%', color: 'from-green-500 to-emerald-600', bg: 'bg-green-500/10', icon: TrendingUp },
    { label: 'Tổng đơn hàng', value: String(reportData.summary?.totalOrders || 0), sub: 'Tất cả thời gian', change: '+0%', color: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-500/10', icon: ShoppingBag },
    { label: 'Người dùng', value: String(reportData.summary?.totalUsers || 0), sub: 'Trong hệ thống', change: '+0%', color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10', icon: Users },
    { label: 'Tồn kho', value: String(reportData.summary?.totalStock || 0), sub: 'Sản phẩm còn lại', change: '0%', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10', icon: BarChart2 },
  ], [reportData.summary])

  const monthlyData = reportData.monthlyData || []
  const topProducts = reportData.topProducts || []
  const recentOrders = reportData.recentOrders || []
  const maxRevenue = Math.max(...monthlyData.map(item => Number(item.revenue || 0)), 1)

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Báo cáo hệ thống</h1>
          <p className="text-slate-500 text-sm mt-1">Phân tích dữ liệu đơn hàng thật từ tài khoản người dùng</p>
        </div>
        <button className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-all">
          <Download size={16} /> Xuất báo cáo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {metrics.map(metric => (
          <div key={metric.label} className="glass rounded-2xl p-5 border border-white/10 card-hover">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 ${metric.bg} rounded-xl flex items-center justify-center`}>
                <metric.icon size={20} className="text-white opacity-80" />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
                <ArrowUpRight size={12} /> {metric.change}
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white">{metric.value}</p>
            <p className="text-slate-500 text-xs mt-1">{metric.label}</p>
            <p className="text-indigo-400 text-xs mt-0.5">{metric.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-semibold flex items-center gap-2"><BarChart2 size={18} className="text-indigo-400" /> Doanh thu theo tháng</h2>
            <span className="text-slate-500 text-xs">Đơn vị: tỷ đồng</span>
          </div>
          <div className="flex items-end gap-3 h-44">
            {monthlyData.map(item => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">{Number(item.revenue || 0).toFixed(1)}B</span>
                <div className="w-full rounded-t-xl bg-gradient-to-t from-indigo-600 to-purple-500 transition-all hover:opacity-80 cursor-pointer relative group" style={{ height: `${(Number(item.revenue || 0) / maxRevenue) * 100}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap">
                    {item.orders} đơn
                  </div>
                </div>
                <span className="text-slate-600 text-xs">{item.month}</span>
              </div>
            ))}
            {monthlyData.length === 0 && <p className="text-slate-500 text-sm">Chưa có dữ liệu đơn hàng</p>}
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-6">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2"><TrendingUp size={18} className="text-green-400" /> Sản phẩm doanh thu cao nhất</h2>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 w-5">#{index + 1}</span>
                    <span className="text-slate-300 text-sm font-medium">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-bold text-sm">{formatVnd(product.revenue)}</span>
                    <span className="text-slate-600 text-xs ml-2">({product.sold} cái)</span>
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${['bg-gradient-to-r from-indigo-500 to-purple-500', 'bg-gradient-to-r from-blue-500 to-indigo-500', 'bg-gradient-to-r from-green-500 to-teal-500', 'bg-gradient-to-r from-amber-500 to-orange-500', 'bg-gradient-to-r from-red-500 to-pink-500'][index % 5]}`} style={{ width: `${product.pct}%` }} />
                </div>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-slate-500 text-sm">Chưa có dữ liệu sản phẩm</p>}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2"><ShoppingBag size={18} className="text-indigo-400" /> Đơn hàng gần đây</h2>
          <span className="text-slate-500 text-xs">Dữ liệu thật từ tài khoản người dùng</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Mã đơn', 'Khách hàng', 'Sản phẩm', 'Số tiền', 'Trạng thái'].map(header => (
                  <th key={header} className="text-left px-5 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.order_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-3 font-mono text-indigo-400 text-xs">{order.order_id}</td>
                  <td className="px-5 py-3 text-white text-xs">{order.customer}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{order.products || 'Chưa có sản phẩm'}</td>
                  <td className="px-5 py-3 text-white font-semibold text-xs">{formatVnd(order.amount)}</td>
                  <td className="px-5 py-3">
                    <span className={`badge ${statusMap[order.status]?.cls || statusMap.pending.cls}`}>{statusMap[order.status]?.label || 'Chờ'}</span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-slate-500 text-sm" colSpan={5}>Chưa có đơn hàng nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
