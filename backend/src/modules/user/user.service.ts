import { prisma } from '../../db/prisma.js'
import { hashPassword, verifyPassword } from '../auth/auth.service.js'

const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const

export function updateCurrentUserName(userId: number, name: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { name },
    select: safeUserSelect,
  })
}

export async function changeCurrentUserPassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { status: 'not_found' } as const
  if (!await verifyPassword(currentPassword, user.passwordHash)) {
    return { status: 'invalid_current_password' } as const
  }
  if (await verifyPassword(newPassword, user.passwordHash)) {
    return { status: 'same_password' } as const
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  })
  return { status: 'updated' } as const
}
