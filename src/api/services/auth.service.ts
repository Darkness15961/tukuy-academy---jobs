import { api } from '@/api/client'
import { apiConfig } from '@/api/config'
import { API } from '@/api/endpoints'
import { resolveMock } from '@/api/mock'
import { user as userMock } from '@/data/academy.mock'
import { MOCK_CREDENTIALS } from '@/lib/constants'
import type { LoginRequestDto, LoginResponseDto } from '@/types/api'

export const authService = {
  async login(credentials: LoginRequestDto): Promise<LoginResponseDto> {
    if (apiConfig.useMock) {
      const username = credentials.dni.trim()
      const password = credentials.password.trim()

      if (!username || !password) {
        throw new Error('Ingresa tu usuario y clave')
      }

      if (username !== MOCK_CREDENTIALS.username || password !== MOCK_CREDENTIALS.password) {
        throw new Error('Usuario o clave incorrectos')
      }

      return resolveMock({ token: 'mock-token', user: userMock })
    }

    const { data } = await api.post<LoginResponseDto>(API.auth.login, credentials)
    return data
  },

  async logout(): Promise<void> {
    if (apiConfig.useMock) return
    await api.post(API.auth.logout)
  },
}
