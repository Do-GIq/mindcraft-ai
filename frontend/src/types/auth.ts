export type AuthUser = {
  id: number
  email: string
  name: string | null
  createdAt: string
  updatedAt: string
}

export type AuthResponse = {
  accessToken: string
  user: AuthUser
}

export type LoginInput = {
  email: string
  password: string
}

export type RegisterInput = LoginInput & {
  name?: string
}
