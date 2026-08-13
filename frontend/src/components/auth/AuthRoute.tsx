import { useEffect, type ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuthStore } from '../../stores/authStore'

type AuthRouteProps = {
  children: ReactNode
  requireAuth?: boolean
}

export function AuthRoute({ children, requireAuth = false }: AuthRouteProps) {
  const user = useAuthStore((state) => state.user)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    if (!isInitialized) {
      void initialize()
    }
  }, [initialize, isInitialized])

  if (!isInitialized) {
    return <div className="auth-loading">正在恢复登录状态...</div>
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />
  }

  if (!requireAuth && user) {
    return <Navigate to="/" replace />
  }

  return children
}
