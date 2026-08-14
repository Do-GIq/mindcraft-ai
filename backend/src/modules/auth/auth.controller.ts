import type { Request, Response } from 'express'
import type { AuthenticatedRequest } from './auth.middleware.js'
import { getUserById, loginUser, registerUser } from './auth.service.js'

type AuthBody = {
  email?: unknown
  password?: unknown
  name?: unknown
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseCredentials(body: AuthBody) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  return { email, password }
}

export async function registerController(
  req: Request<Record<string, never>, unknown, AuthBody>,
  res: Response,
) {
  const { email, password } = parseCredentials(req.body)
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' })
    return
  }

  if (!emailPattern.test(email)) {
    res.status(400).json({ message: 'Invalid email' })
    return
  }

  if (password.length < 8) {
    res.status(400).json({ message: 'Password must be at least 8 characters' })
    return
  }

  try {
    const result = await registerUser({ email, password, ...(name ? { name } : {}) })

    if (!result) {
      res.status(409).json({ message: 'Email already registered' })
      return
    }

    res.status(201).json(result)
  } catch (error) {
    console.error('Failed to register user:', error)
    res.status(500).json({ message: 'Failed to register user' })
  }
}

export async function loginController(
  req: Request<Record<string, never>, unknown, AuthBody>,
  res: Response,
) {
  const { email, password } = parseCredentials(req.body)

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' })
    return
  }

  try {
    const result = await loginUser(email, password)

    if (!result) {
      res.status(401).json({ message: 'Invalid email or password' })
      return
    }

    res.status(200).json(result)
  } catch (error) {
    console.error('Failed to log in:', error)
    console.dir(error, { depth: null });
    res.status(500).json({ message: 'Failed to log in' })
  }
}

export async function meController(req: Request, res: Response) {
  try {
    const user = await getUserById((req as AuthenticatedRequest).authUserId)

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    res.status(200).json(user)
  } catch (error) {
    console.error('Failed to get current user:', error)
    res.status(500).json({ message: 'Failed to get current user' })
  }
}
