import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type { NextFunction, Request, Response } from 'express'
import { logger } from '../lib/logger.js'

const MAX_REQUEST_ID_LENGTH = 128

function getRequestPath(req: Request) {
  return req.originalUrl.split('?')[0] || req.path
}

function getRequestId(req: Request) {
  const suppliedRequestId = req.get('x-request-id')?.trim()

  if (suppliedRequestId && suppliedRequestId.length <= MAX_REQUEST_ID_LENGTH) {
    return suppliedRequestId
  }

  return randomUUID()
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = getRequestId(req)
  req.requestId = requestId
  req.logger = logger.child({ requestId })
  res.setHeader('x-request-id', requestId)
  next()
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = performance.now()
  const request = { method: req.method, path: getRequestPath(req) }
  let logged = false

  logger.info({ requestId: req.requestId, ...request }, 'request started')

  const logCompletion = (message: string) => {
    if (logged) {
      return
    }
    logged = true
    logger.info(
      {
        requestId: req.requestId,
        ...request,
        statusCode: res.statusCode,
        durationMs: Number((performance.now() - startedAt).toFixed(2)),
      },
      message,
    )
  }

  res.once('finish', () => logCompletion('request completed'))
  res.once('close', () => logCompletion(res.writableEnded ? 'request completed' : 'request connection closed'))
  next()
}
