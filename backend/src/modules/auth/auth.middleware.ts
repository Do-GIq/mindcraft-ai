import type { NextFunction, Request, Response } from 'express'
import { jwtVerify } from 'jose'

export type AuthenticatedRequest = Request & {
  authUserId: number
}

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured')
  }

  return new TextEncoder().encode(jwtSecret)
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  try {
    const token = authorization.slice('Bearer '.length).trim()
    const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ['HS256'] })
    const userId = Number(payload.sub)

    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    ;(req as AuthenticatedRequest).authUserId = userId
    next()
  } catch {
    res.status(401).json({ message: 'Unauthorized' })
  }
}
