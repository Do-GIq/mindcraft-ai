import { authenticatedFetch } from './authenticatedFetch'
import type { AuthUser } from '../types/auth'

type ErrorPayload = { message?: unknown }

export class SettingsApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'SettingsApiError'
    this.status = status
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = '请求失败，请稍后重试'
    try {
      const payload = await response.json() as ErrorPayload
      if (typeof payload.message === 'string') message = payload.message
    } catch {
      // Keep the safe fallback for non-JSON responses.
    }
    throw new SettingsApiError(response.status, message)
  }
  return response.json() as Promise<T>
}

export async function updateCurrentUserName(name: string) {
  const response = await authenticatedFetch('/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return readResponse<AuthUser>(response)
}

export async function changeCurrentUserPassword(currentPassword: string, newPassword: string) {
  const response = await authenticatedFetch('/api/users/me/password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  return readResponse<{ message: string }>(response)
}
