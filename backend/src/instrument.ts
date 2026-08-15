import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { filterSentryEvent } from './lib/sentry.js'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: filterSentryEvent,
  })
}
