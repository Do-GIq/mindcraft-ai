import { performance } from 'node:perf_hooks'
import type { Request, Response } from 'express'
import { captureRequestException } from '../../lib/sentry.js'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import { getDashboardStats, getOverviewStats, type StatsRange } from './stats.service.js'

const VALID_RANGES = new Set<StatsRange>(['7d', '30d', '90d'])

export async function getOverviewStatsController(req: Request, res: Response) {
  const startedAt = performance.now()
  const userId = getAuthenticatedUserId(req)
  try {
    res.status(200).json(await getOverviewStats(userId))
    req.logger.info(
      { userId, durationMs: Number((performance.now() - startedAt).toFixed(2)) },
      'overview stats generated',
    )
  } catch (error) {
    req.logger.error({ err: error, userId }, 'failed to generate overview stats')
    captureRequestException(req, error, { userId })
    res.status(500).json({ message: 'Failed to load overview stats' })
  }
}

export async function getDashboardStatsController(
  req: Request<Record<string, never>, unknown, unknown, { range?: string }>,
  res: Response,
) {
  const range = req.query.range ?? '30d'
  if (!VALID_RANGES.has(range as StatsRange)) {
    res.status(400).json({ message: 'Range must be one of 7d, 30d, or 90d' })
    return
  }

  const startedAt = performance.now()
  const userId = getAuthenticatedUserId(req)
  try {
    res.status(200).json(await getDashboardStats(userId, range as StatsRange))
    req.logger.info(
      { userId, range, durationMs: Number((performance.now() - startedAt).toFixed(2)) },
      'dashboard stats generated',
    )
  } catch (error) {
    req.logger.error({ err: error, userId, range }, 'failed to generate dashboard stats')
    captureRequestException(req, error, { userId, range })
    res.status(500).json({ message: 'Failed to load dashboard stats' })
  }
}
