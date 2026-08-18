import { compare, hash } from 'bcryptjs'
import { SignJWT } from 'jose'
import { prisma } from '../../db/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'

type RegisterInput = {
  email: string
  password: string
  name?: string
}

export const MIN_PASSWORD_LENGTH = 8

export function hashPassword(password: string) {
  return hash(password, 12)
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash)
}

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured')
  }

  return new TextEncoder().encode(jwtSecret)
}

async function createAccessToken(userId: number) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } })

  if (existingUser) {
    return null
  }

  const passwordHash = await hashPassword(input.password)
  let user

  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        ...(input.name ? { name: input.name } : {}),
      },
      select: safeUserSelect,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return null
    }

    throw error
  }

  return { accessToken: await createAccessToken(user.id), user }
}

export async function loginUser(email: string, password: string) {
  const userWithPassword = await prisma.user.findUnique({ where: { email } })

  if (!userWithPassword || !await verifyPassword(password, userWithPassword.passwordHash)) {
    return null
  }

  const { passwordHash: _passwordHash, ...user } = userWithPassword
  return { accessToken: await createAccessToken(user.id), user }
}

export function getUserById(id: number) {
  return prisma.user.findUnique({ where: { id }, select: safeUserSelect })
}
