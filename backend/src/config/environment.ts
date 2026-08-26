import 'dotenv/config'

const REQUIRED_ENVIRONMENT_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'AI_API_KEY',
  'AI_BASE_URL',
  'AI_MODEL',
  'AI_EMBEDDING_MODEL',
  'QDRANT_URL',
] as const

function requireValidUrl(name: 'AI_BASE_URL' | 'QDRANT_URL' | 'FRONTEND_URL') {
  const value = process.env[name]
  if (!value) return

  try {
    new URL(value)
  } catch {
    throw new Error(`${name} must be a valid URL`)
  }
}

export function validateEnvironment() {
  const missing: string[] = REQUIRED_ENVIRONMENT_VARIABLES.filter((name) => !process.env[name]?.trim())
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction && !process.env.QDRANT_API_KEY?.trim()) missing.push('QDRANT_API_KEY')
  if (isProduction && !process.env.FRONTEND_URL?.trim()) missing.push('FRONTEND_URL')

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  requireValidUrl('AI_BASE_URL')
  requireValidUrl('QDRANT_URL')
  requireValidUrl('FRONTEND_URL')
}

export function getCorsOrigins() {
  if (process.env.NODE_ENV === 'production') return [process.env.FRONTEND_URL!]
  return [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(
    (origin): origin is string => Boolean(origin),
  )
}
