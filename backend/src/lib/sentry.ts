import * as Sentry from '@sentry/node'
import type { Request } from 'express'

type SafeContext = Record<string, string | number | boolean | null>

const sensitiveKeys = new Set([
  'authorization',
  'cookie',
  'setcookie',
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'databaseurl',
  'prompt',
  'aiprompt',
  'airesponse',
  'responsebody',
])

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function sanitizeString(value: string) {
  return value
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [Filtered]')
    .replace(/\bmysql:\/\/[^\s"']+/gi, '[Filtered database URL]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[Filtered JWT]')
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  if (seen.has(value)) {
    return '[Circular]'
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen))
  }

  const sanitized: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = sensitiveKeys.has(normalizeKey(key))
      ? '[Filtered]'
      : sanitizeValue(nestedValue, seen)
  }
  return sanitized
}

function stripQuery(url: string | undefined) {
  return url?.split('?')[0]
}

export function filterSentryEvent<T>(event: T): T {
  const sanitized = sanitizeValue(event, new WeakSet()) as T
  const filteredEvent = sanitized as T & {
    request?: { data?: unknown; url?: string }
    user?: { id?: string | number }
  }

  if (filteredEvent.request) {
    delete filteredEvent.request.data
    const requestUrl = stripQuery(filteredEvent.request.url)
    if (requestUrl) {
      filteredEvent.request.url = requestUrl
    } else {
      delete filteredEvent.request.url
    }
  }

  if (filteredEvent.user?.id === undefined) {
    delete filteredEvent.user
  } else {
    filteredEvent.user = { id: String(filteredEvent.user.id) }
  }

  return sanitized
}

export function captureRequestException(
  req: Request,
  error: unknown,
  context?: SafeContext,
) {
  if (!Sentry.isInitialized()) {
    return
  }

  Sentry.withScope((scope) => {
    scope.setTag('requestId', req.requestId)
    scope.setContext('request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0] || req.path,
    })

    const authUserId = (req as Request & { authUserId?: unknown }).authUserId
    if (typeof authUserId === 'number' && Number.isInteger(authUserId)) {
      scope.setUser({ id: String(authUserId) })
    }

    if (context) {
      scope.setContext('application', context)
    }

    Sentry.captureException(error)
  })
}

export function shouldCaptureExpressError(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (typeof status === 'number' && status < 500) {
      return false
    }
  }

  return true
}
