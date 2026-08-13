import { create } from 'zustand'
import { authTokenKey, getCurrentUser } from '../api/authApi'
import type { AuthResponse, AuthUser } from '../types/auth'

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  isInitialized: boolean
  setAuth: (auth: AuthResponse) => void
  clearAuth: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  setAuth: ({ accessToken, user }) => {
    localStorage.setItem(authTokenKey, accessToken)
    set({ accessToken, user, isInitialized: true })
  },
  clearAuth: () => {
    localStorage.removeItem(authTokenKey)
    set({ accessToken: null, user: null, isInitialized: true })
  },
  initialize: async () => {
    const accessToken = localStorage.getItem(authTokenKey)

    if (!accessToken) {
      set({ isInitialized: true })
      return
    }

    try {
      const user = await getCurrentUser(accessToken)
      set({ accessToken, user, isInitialized: true })
    } catch {
      localStorage.removeItem(authTokenKey)
      set({ accessToken: null, user: null, isInitialized: true })
    }
  },
}))
