import { useAuthStore } from '../stores/authStore'

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const { accessToken, clearAuth } = useAuthStore.getState()
  const headers = new Headers(init?.headers)

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(input, { ...init, headers })

  if (response.status === 401) {
    clearAuth()
  }

  return response
}
