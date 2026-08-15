import * as Sentry from '@sentry/react'

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

function filterSentryEvent<T>(event: T): T {
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

export function initializeSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: filterSentryEvent,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category?.startsWith('console')) {
        return null
      }

      const filtered = sanitizeValue(breadcrumb, new WeakSet()) as typeof breadcrumb
      if (typeof filtered.data?.url === 'string') {
        filtered.data.url = stripQuery(filtered.data.url)
      }
      return filtered
    },
  })
}
