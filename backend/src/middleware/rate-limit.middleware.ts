import { rateLimit } from 'express-rate-limit'
import { getAuthenticatedUserId } from '../modules/auth/auth.middleware.js'

const rateLimitResponse = { message: 'Too many requests, please try again later' }

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitResponse,
})

export const aiRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `user:${getAuthenticatedUserId(req)}`,
  message: rateLimitResponse,
})

export const knowledgeUploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => `user:${getAuthenticatedUserId(req)}`,
  message: rateLimitResponse,
})
