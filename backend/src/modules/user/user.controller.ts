import type { Request, Response } from 'express'
import { captureRequestException } from '../../lib/sentry.js'
import { getAuthenticatedUserId } from '../auth/auth.middleware.js'
import { MIN_PASSWORD_LENGTH } from '../auth/auth.service.js'
import { changeCurrentUserPassword, updateCurrentUserName } from './user.service.js'

type UpdateNameBody = { name?: unknown }
type ChangePasswordBody = { currentPassword?: unknown; newPassword?: unknown }

const MAX_NAME_LENGTH = 50

export async function updateCurrentUserController(
  req: Request<Record<string, never>, unknown, UpdateNameBody>,
  res: Response,
) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const invalidFields = Object.keys(req.body ?? {}).some((field) => field !== 'name')

  if (invalidFields || !name || name.length > MAX_NAME_LENGTH) {
    res.status(400).json({ message: `Name must be between 1 and ${MAX_NAME_LENGTH} characters` })
    return
  }

  const userId = getAuthenticatedUserId(req)
  try {
    res.status(200).json(await updateCurrentUserName(userId, name))
  } catch (error) {
    req.logger.error({ err: error, userId }, 'failed to update current user profile')
    captureRequestException(req, error, { userId })
    res.status(500).json({ message: 'Failed to update profile' })
  }
}

export async function changeCurrentUserPasswordController(
  req: Request<Record<string, never>, unknown, ChangePasswordBody>,
  res: Response,
) {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : ''
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : ''
  const allowedFields = new Set(['currentPassword', 'newPassword'])
  const invalidFields = Object.keys(req.body ?? {}).some((field) => !allowedFields.has(field))

  if (invalidFields || !currentPassword || !newPassword) {
    res.status(400).json({ message: 'Current password and new password are required' })
    return
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` })
    return
  }

  const userId = getAuthenticatedUserId(req)
  try {
    const result = await changeCurrentUserPassword(userId, currentPassword, newPassword)
    if (result.status === 'not_found') {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }
    if (result.status === 'invalid_current_password') {
      res.status(400).json({ message: 'Current password is incorrect' })
      return
    }
    if (result.status === 'same_password') {
      res.status(400).json({ message: 'New password must be different from current password' })
      return
    }
    res.status(200).json({ message: 'Password updated successfully' })
  } catch (error) {
    req.logger.error({ err: error, userId }, 'failed to change current user password')
    captureRequestException(req, error, { userId })
    res.status(500).json({ message: 'Failed to update password' })
  }
}
