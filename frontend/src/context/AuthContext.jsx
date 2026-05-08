import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  loginWithGoogleAccount,
  loginWithFacebookAccount,
  loginUserAccount,
  registerCustomerAccount,
  requestRegisterEmailOtp,
  verifyRegisterEmailOtp,
} from '../services/api.js'

const STORAGE_KEYS = {
  session: 'smartmobile_session',
}

const PHONE_REGEX = /^(0|\+84)\d{8,10}$/
const VIRTUAL_EMAIL_SUFFIX = '@phone.smartmobile.local'

const seedUsers = [
  { name: 'Nguyễn Văn Khách', email: 'customer@smartmobile.vn', phone: '0905000001', password: 'customer123', role: 'customer' },
  { name: 'Nguyễn Văn Admin', email: 'admin@smartmobile.vn', phone: '0905000002', password: 'admin123', role: 'admin' },
  { name: 'Lê Minh Kho', email: 'kho@smartmobile.vn', phone: '0905000003', password: 'kho123', role: 'warehouse' },
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

function normalizePhone(phone) {
  const digits = String(phone || '').trim().replace(/\D/g, '')
  if (digits.startsWith('84')) {
    return `0${digits.slice(2)}`
  }
  return digits
}

function isVirtualEmail(email) {
  return normalizeEmail(email).endsWith(VIRTUAL_EMAIL_SUFFIX)
}

function toSafeSessionUser(user) {
  const email = normalizeEmail(user?.email)
  const rawDisplayEmail = String(user?.display_email ?? '').trim()
  const displayEmail = rawDisplayEmail || (isVirtualEmail(email) ? '' : email)

  return {
    name: String(user?.name || '').trim(),
    email,
    displayEmail,
    phone: normalizePhone(user?.phone),
    role: String(user?.role || 'customer').trim() || 'customer',
  }
}

export function getRoleLabel(role) {
  return roleLabels[role] ?? 'Khách hàng'
}

export function getHomePath(role) {
  return homePaths[role] ?? '/'
}

export function AuthProvider({ children }) {
  const [sessionUser, setSessionUser] = useState(() => readStoredValue(STORAGE_KEYS.session, null))

  useEffect(() => {
    writeStoredValue(STORAGE_KEYS.session, sessionUser)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('smartmobile-session-change'))
    }
  }, [sessionUser])

  const login = useCallback(async ({ identifier, password, role }) => {
    const targetIdentifier = String(identifier || '').trim()
    const targetEmail = normalizeEmail(targetIdentifier)
    const targetPhone = normalizePhone(targetIdentifier)
    const localSeedUser = seedUsers.find(user => {
      const sameEmail = normalizeEmail(user.email) === targetEmail
      const samePhone = normalizePhone(user.phone) === targetPhone
      const samePassword = user.password === password
      const sameRole = !role || user.role === role
      return (sameEmail || samePhone) && samePassword && sameRole
    })

    try {
      const payload = await loginUserAccount({ identifier: targetIdentifier, password })
      const remoteUser = payload?.data
      if (!remoteUser) {
        throw new Error('Không nhận được dữ liệu người dùng từ máy chủ.')
      }

      const safeUser = toSafeSessionUser(remoteUser)
      setSessionUser(safeUser)
      return safeUser
    } catch (error) {
      if (!localSeedUser) {
        throw error
      }

      const safeUser = toSafeSessionUser(localSeedUser)
      setSessionUser(safeUser)
      return safeUser
    }
  }, [])

  const registerCustomer = useCallback(async ({ name, phone, password, confirmPassword, method = 'phone' }) => {
    const trimmedName = String(name || '').trim()
    const normalizedPhone = normalizePhone(phone)

    if (method !== 'phone') {
      throw new Error('Phương thức đăng ký không hợp lệ.')
    }

    if (!trimmedName || !normalizedPhone || !password) {
      throw new Error('Vui lòng nhập đầy đủ thông tin.')
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      throw new Error('Số điện thoại không hợp lệ.')
    }

    if (String(password).trim().length < 8) {
      throw new Error('Mật khẩu phải có ít nhất 8 ký tự.')
    }

    if (password !== confirmPassword) {
      throw new Error('Mật khẩu xác nhận không khớp.')
    }

    const result = await registerCustomerAccount({
      name: trimmedName,
      phone: normalizedPhone,
      password,
      registerMethod: 'phone',
    })

    const createdUser = result?.data
    const safeUser = toSafeSessionUser(createdUser || {
      name: trimmedName,
      email: '',
      display_email: '',
      phone: normalizedPhone,
      role: 'customer',
    })
    setSessionUser(safeUser)
    return safeUser
  }, [])

  const requestEmailSignupOtp = useCallback(async ({ name, email, phone, password, confirmPassword }) => {
    const trimmedName = String(name || '').trim()
    const trimmedEmail = normalizeEmail(email)
    const normalizedPhone = normalizePhone(phone)

    if (!trimmedName || !trimmedEmail || !password) {
      throw new Error('Vui lòng nhập đầy đủ họ tên, email và mật khẩu.')
    }

    if (String(password).trim().length < 8) {
      throw new Error('Mật khẩu phải có ít nhất 8 ký tự.')
    }

    if (password !== confirmPassword) {
      throw new Error('Mật khẩu xác nhận không khớp.')
    }

    if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
      throw new Error('Số điện thoại không hợp lệ.')
    }

    const result = await requestRegisterEmailOtp({
      name: trimmedName,
      email: trimmedEmail,
      phone: normalizedPhone || undefined,
      password,
    })

    return result?.message || `Đã gửi OTP tới ${trimmedEmail}`
  }, [])

  const verifyEmailSignupOtp = useCallback(async ({ email, otp }) => {
    const trimmedEmail = normalizeEmail(email)
    const trimmedOtp = String(otp || '').trim()

    if (!trimmedEmail || !trimmedOtp) {
      throw new Error('Vui lòng nhập email và mã OTP.')
    }

    const result = await verifyRegisterEmailOtp({
      email: trimmedEmail,
      otp: trimmedOtp,
    })

    const createdUser = result?.data
    const safeUser = toSafeSessionUser(createdUser || {
      name: '',
      email: trimmedEmail,
      display_email: trimmedEmail,
      phone: '',
      role: 'customer',
    })
    setSessionUser(safeUser)
    return safeUser
  }, [])

  const loginWithGoogle = useCallback(async ({ idToken }) => {
    const token = String(idToken || '').trim()
    if (!token) {
      throw new Error('Thiếu Google token đăng nhập.')
    }

    const payload = await loginWithGoogleAccount({ idToken: token })
    const remoteUser = payload?.data
    if (!remoteUser) {
      throw new Error('Không nhận được dữ liệu người dùng từ máy chủ.')
    }

    const safeUser = toSafeSessionUser(remoteUser)
    setSessionUser(safeUser)
    return safeUser
  }, [])

  const loginWithFacebook = useCallback(async ({ accessToken }) => {
    const token = String(accessToken || '').trim()
    if (!token) {
      throw new Error('Thiếu Facebook token đăng nhập.')
    }

    const payload = await loginWithFacebookAccount({ accessToken: token })
    const remoteUser = payload?.data
    if (!remoteUser) {
      throw new Error('Không nhận được dữ liệu người dùng từ máy chủ.')
    }

    const safeUser = toSafeSessionUser(remoteUser)
    setSessionUser(safeUser)
    return safeUser
  }, [])

  

  const logout = useCallback(() => {
    setSessionUser(null)
  }, [])

  const value = useMemo(() => ({
    user: sessionUser,
    isAuthenticated: Boolean(sessionUser),
    login,
    loginWithGoogle,
    loginWithFacebook,
    registerCustomer,
    requestEmailSignupOtp,
    verifyEmailSignupOtp,
    logout,
    getHomePath,
    getRoleLabel,
  }), [sessionUser, login, loginWithGoogle, loginWithFacebook, registerCustomer, requestEmailSignupOtp, verifyEmailSignupOtp, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}