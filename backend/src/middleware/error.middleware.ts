import type { ErrorRequestHandler, RequestHandler } from 'express'

function getRequestPath(originalUrl: string) {
  return originalUrl.split('?')[0] || originalUrl
}

function getSafeStatus(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return status
    }
  }

  return 500
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: 'Route not found', requestId: req.requestId })
}

export const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  const status = getSafeStatus(error)
  req.logger.error(
    {
      err: error,
      method: req.method,
      path: getRequestPath(req.originalUrl),
    },
    'unhandled request error',
  )

  if (res.headersSent) {
    next(error)
    return
  }

  res.status(status).json({
    message: status === 400 ? 'Invalid request' : 'Internal server error',
    requestId: req.requestId,
  })
}
