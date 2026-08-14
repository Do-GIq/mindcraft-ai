import pino from 'pino'

const sensitivePaths = [
  'authorization',
  'cookie',
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'headers.authorization',
  'headers.cookie',
  'req.headers.authorization',
  'req.headers.cookie',
  'body.password',
  'body.passwordHash',
  '*.authorization',
  '*.cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.apiKey',
]

const isProduction = process.env.NODE_ENV === 'production'

const options: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: sensitivePaths,
    censor: '[REDACTED]',
  },
  ...(!isProduction
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
}

export const logger = pino(options)
