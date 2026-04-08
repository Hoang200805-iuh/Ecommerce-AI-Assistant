import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, Users, Package, ShoppingBag, ArrowUpRight, ArrowDownRight, BarChart2, Activity } from 'lucide-react'
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

export default function AdminDashboard() {
  const [reportData, setReportData] = useState({ summary: {}, recentOrders: [], topProducts: [], monthlyData: [] })

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetchAdminReports()
        setReportData(response.data || { summary: {}, recentOrders: [], topProducts: [], monthlyData: [] })
      } catch (error) {
        console.error('Failed to load admin dashboard:', error)
      }
    }

    loadReports()
  }, [])

  const metrics = useMemo(() => [
    { label: 'Doanh thu tháng', value: formatVnd(reportData.summary?.monthRevenue || 0), change: reportData.summary?.monthRevenue ? '+100%' : '0%', up: true, icon: TrendingUp, color: 'from-green-500 to-emerald-600', bg: 'bg-green-500/10' },
    { label: 'Đơn hàng mới', value: String(reportData.summary?.monthOrders || 0), change: reportData.summary?.monthOrders ? '+100%' : '0%', up: true, icon: ShoppingBag, color: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-500/10' },
    { label: 'Người dùng', value: String(reportData.summary?.totalUsers || 0), change: '+0%', up: true, icon: Users, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10' },
    { label: 'Tồn kho', value: String(reportData.summary?.totalStock || 0), change: '-0%', up: false, icon: Package, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10' },
  ], [reportData.summary])

  const recentOrders = reportData.recentOrders || []
  const topProducts = reportData.topProducts || []
  const monthlyData = reportData.monthlyData || []

  const maxRevenue = Math.max(...monthlyData.map(item => Number(item.revenue || 0)), 1)

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Tổng quan hệ thống SmartMobile Agent</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {metrics.map(metric => (
          <div key={metric.label} className="glass rounded-2xl p-5 border border-white/10 card-hover">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 ${metric.bg} rounded-xl flex items-center justify-center`}>
                <metric.icon size={22} className={`bg-gradient-to-br ${metric.color} text-transparent`} style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }} />
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold ${metric.up ? 'text-green-400' : 'text-red-400'}`}>
                {metric.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {metric.change}
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white">{metric.value}</p>
            <p className="text-slate-500 text-xs mt-1">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2"><Activity size={18} className="text-indigo-400" /> Đơn hàng gần đây</h2>
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
                    <td className="px-5 py-8 text-slate-500 text-sm" colSpan={5}>Chưa có đơn hàng nào được ghi nhận</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
            <BarChart2 size={18} className="text-purple-400" /> Top sản phẩm
          </h2>
          <div className="space-y-4">
            {topProducts.map(product => (
              <div key={product.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium truncate max-w-[60%]">{product.name}</span>
                  <span className="text-slate-500">{product.sold} bán</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${product.pct}%` }} />
                </div>
                <p className="text-xs text-slate-600 mt-1">{formatVnd(product.revenue)}</p>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-slate-500 text-sm">Chưa có dữ liệu sản phẩm bán ra</p>}
          </div>

          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-slate-500 text-xs mb-3">Doanh thu 6 tháng gần nhất</p>
            <div className="flex items-end gap-2 h-20">
              {monthlyData.map((month, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-purple-500" style={{ height: `${Math.max((Number(month.revenue || 0) / maxRevenue) * 100, 12)}%` }} />
                  <span className="text-slate-600 text-xs">{month.month}</span>
                </div>
              ))}
              {monthlyData.length === 0 && <p className="text-slate-500 text-sm">Chưa có dữ liệu tháng</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
