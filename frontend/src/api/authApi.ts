import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '../types/auth'

export const authTokenKey = 'mindcraft_access_token'

export class AuthApiError extends Error {
  status: number

  constructor(status: number) {
    super('Auth request failed')
    this.status = status
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new AuthApiError(response.status)
  }

  return response.json() as Promise<T>
}

export function login(input: LoginInput) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function register(input: RegisterInput) {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function getCurrentUser(accessToken: string) {
  return request<AuthUser>('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
