import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { registerCustomerAccount } from '../services/api.js'

const STORAGE_KEYS = {
  session: 'smartmobile_session',
  users: 'smartmobile_custom_users',
}

const seedUsers = [
  { name: 'Nguyễn Văn Khách', email: 'customer@smartmobile.vn', password: 'customer123', role: 'customer' },
  { name: 'Nguyễn Văn Admin', email: 'admin@smartmobile.vn', password: 'admin123', role: 'admin' },
  { name: 'Lê Minh Kho', email: 'kho@smartmobile.vn', password: 'kho123', role: 'warehouse' },
]

const roleLabels = {
  guest: 'Khách vãng lai',
  customer: 'Khách hàng',
  admin: 'Quản trị viên',
  warehouse: 'Quản lý kho',
}

const homePaths = {
  customer: '/',
  admin: '/admin/dashboard',
  warehouse: '/warehouse/inventory',
  guest: '/',
}

const AuthContext = createContext(null)

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function readStoredValue(key, fallback) {
  if (typeof window === 'undefined') return fallback
  return safeParse(window.localStorage.getItem(key), fallback)
}

function writeStoredValue(key, value) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function getRoleLabel(role) {
  return roleLabels[role] ?? 'Khách hàng'
}

export function getHomePath(role) {
  return homePaths[role] ?? '/'
}

export function AuthProvider({ children }) {
  const [sessionUser, setSessionUser] = useState(() => readStoredValue(STORAGE_KEYS.session, null))
  const [customUsers, setCustomUsers] = useState(() => readStoredValue(STORAGE_KEYS.users, []))

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.session, sessionUser)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('smartmobile-session-change'))
    }
  }, [sessionUser])

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.users, customUsers)
  }, [customUsers])

  const allUsers = useMemo(() => [...seedUsers, ...customUsers], [customUsers])

  const login = useCallback(async ({ email, password, role }) => {
    const targetEmail = normalizeEmail(email)
    const matched = allUsers.find(user => {
      const sameEmail = normalizeEmail(user.email) === targetEmail
      const samePassword = user.password === password
      const sameRole = !role || user.role === role
      return sameEmail && samePassword && sameRole
    })

    if (!matched) {
      throw new Error('Email, mật khẩu hoặc vai trò không đúng.')
    }

    const safeUser = { name: matched.name, email: matched.email, role: matched.role }
    setSessionUser(safeUser)
    return safeUser
  }, [allUsers])

  const registerCustomer = useCallback(async ({ name, email, phone, password, confirmPassword }) => {
    const trimmedName = String(name || '').trim()
    const trimmedEmail = normalizeEmail(email)
    const trimmedPhone = String(phone || '').trim()

    if (!trimmedName || !trimmedEmail || !password) {
      throw new Error('Vui lòng nhập đầy đủ thông tin.')
    }

    if (password !== confirmPassword) {
      throw new Error('Mật khẩu xác nhận không khớp.')
    }

    if (allUsers.some(user => normalizeEmail(user.email) === trimmedEmail)) {
      throw new Error('Email này đã được sử dụng.')
    }

    const newUser = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      password,
      role: 'customer',
    }

    await registerCustomerAccount({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
    })

    setCustomUsers(prev => [...prev, newUser])
    const safeUser = { name: newUser.name, email: newUser.email, role: newUser.role }
    setSessionUser(safeUser)
    return safeUser
  }, [allUsers])

  const logout = useCallback(() => {
    setSessionUser(null)
  }, [])

  const value = useMemo(() => ({
    user: sessionUser,
    isAuthenticated: Boolean(sessionUser),
    login,
    registerCustomer,
    logout,
    getHomePath,
    getRoleLabel,
  }), [sessionUser, login, registerCustomer, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}