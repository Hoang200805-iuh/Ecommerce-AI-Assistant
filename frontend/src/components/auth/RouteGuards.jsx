import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getHomePath, useAuth } from '../../context/AuthContext'

function GuardOutlet({ children }) {
  return children ?? <Outlet />
}

export function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <GuardOutlet>{children}</GuardOutlet>
}

export function RequireRole({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <GuardOutlet>{children}</GuardOutlet>
}

export function GuestOnly({ children }) {
  const { user } = useAuth()

  if (user) {
    return <Navigate to={getHomePath(user.role)} replace />
  }

  return <GuardOutlet>{children}</GuardOutlet>
}