import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, Edit2, Trash2, X, Check, Shield, User, Loader2 } from 'lucide-react'
import { createAdminUser, deleteAdminUser, fetchAdminUsers, updateAdminUser } from '../../services/api.js'

const roleOptions = [
  { value: 'customer', label: 'Khách hàng' },
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'warehouse', label: 'Quản lý kho' },
]

const roleFilterOptions = ['Tất cả', ...roleOptions.map(option => option.label)]

const roleLabels = {
  customer: 'Khách hàng',
  admin: 'Quản trị viên',
  warehouse: 'Quản lý kho',
}

const roleColors = {
  customer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  admin: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  warehouse: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

const statusLabels = {
  active: 'Hoạt động',
  inactive: 'Tạm khóa',
}

const statusColors = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  inactive: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  role: 'customer',
  status: 'active',
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN')
}

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('Tất cả')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    setError('')

    try {
      const data = await fetchAdminUsers()
      setUsers(data || [])
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách người dùng.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filtered = useMemo(() => users.filter(user => {
    const displayRole = roleLabels[user.role] || user.role
    const matchRole = roleFilter === 'Tất cả' || displayRole === roleFilter
    const matchQuery = [user.name, user.email, user.phone, displayRole]
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase())
    return matchRole && matchQuery
  }), [query, roleFilter, users])

  const openAdd = () => {
    setEditUser(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (user) => {
    setEditUser(user)
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'customer',
      status: user.status || 'active',
    })
    setShowModal(true)
  }

  const saveUser = async () => {
    setSaving(true)
    setError('')

    try {
      if (editUser) {
        await updateAdminUser(editUser.id, form)
      } else {
        await createAdminUser(form)
      }

      await loadUsers()
      setShowModal(false)
    } catch (err) {
      setError(err.message || 'Không thể lưu người dùng.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (user) => {
    setSaving(true)
    setError('')

    try {
      await updateAdminUser(user.id, { status: user.status === 'active' ? 'inactive' : 'active' })
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Không thể cập nhật trạng thái.')
    } finally {
      setSaving(false)
    }
  }

  const removeUser = async (user) => {
    const confirmed = window.confirm(`Xóa người dùng ${user.name}?`)
    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await deleteAdminUser(user.id)
      await loadUsers()
    } catch (err) {
      setError(err.message || 'Không thể xóa người dùng.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản lý người dùng</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} người dùng trong hệ thống</p>
        </div>
        <button onClick={openAdd} className="btn-glow text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Plus size={18} /> Thêm người dùng
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm kiếm người dùng..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {roleFilterOptions.map(option => (
            <button
              key={option}
              onClick={() => setRoleFilter(option)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-1 ${roleFilter === option ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="glass rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/3">
                {['Người dùng', 'Vai trò', 'Trạng thái', 'Ngày tham gia', 'Đơn hàng', 'Thao tác'].map(header => (
                  <th key={header} className="text-left px-5 py-3.5 text-slate-500 font-medium text-xs uppercase tracking-wide">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.map(user => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {user.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{user.name}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge border ${roleColors[user.role] || roleColors.customer}`}>{roleLabels[user.role] || user.role}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      disabled={saving}
                      onClick={() => toggleStatus(user)}
                      className={`badge border cursor-pointer transition-all disabled:opacity-60 ${statusColors[user.status] || statusColors.active}`}
                    >
                      {user.status === 'active' ? '● Hoạt động' : '○ Tạm khóa'}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-xs">{formatDate(user.created_at)}</td>
                  <td className="px-5 py-4 text-white font-semibold text-sm">{Number(user.orders || 0)}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        disabled={saving}
                        className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-all disabled:opacity-60"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => removeUser(user)}
                        disabled={saving}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-60"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="text-center py-12 text-slate-500" colSpan={6}>Không tìm thấy người dùng</td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="text-center py-12 text-slate-500" colSpan={6}>
                    <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tải dữ liệu người dùng...</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="glass rounded-3xl p-6 border border-indigo-500/30 w-full max-w-md fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">{editUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {[
                ['name', 'Họ và tên', 'Nguyễn Văn A', User],
                ['email', 'Email', 'email@example.com', Shield],
                ['phone', 'Số điện thoại', '0905 xxx xxx', User],
              ].map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="block text-slate-400 text-sm mb-1.5">{label}</label>
                  <input
                    value={form[key]}
                    onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              ))}

              <div>
                <label className="block text-slate-400 text-sm mb-1.5">Vai trò</label>
                <select
                  value={form.role}
                  onChange={e => setForm(current => ({ ...current, role: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {roleOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-slate-800">{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1.5">Trạng thái</label>
                <select
                  value={form.status}
                  onChange={e => setForm(current => ({ ...current, status: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value} className="bg-slate-800">{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 bg-white/5 border border-white/10 text-white py-2.5 rounded-xl hover:bg-white/10 transition-all text-sm font-medium">Huỷ</button>
                <button onClick={saveUser} disabled={saving} className="flex-1 btn-glow text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editUser ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
