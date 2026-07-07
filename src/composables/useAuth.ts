import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { authService } from '@/api/services/auth.service'
import { AUTH_TOKEN_KEY } from '@/lib/constants'
import { portalPathByView } from '@/lib/portal-routes'
import type { UserProfile } from '@/types/academy'

const isAuthenticated = ref(!!localStorage.getItem(AUTH_TOKEN_KEY))
const currentUser = ref<UserProfile | null>(null)

export function useAuth() {
  const router = useRouter()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function login(dni: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const response = await authService.login({ dni, password })
      localStorage.setItem(AUTH_TOKEN_KEY, response.token)
      currentUser.value = response.user
      isAuthenticated.value = true
      await router.push(portalPathByView.courses)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'No se pudo iniciar sesión'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      currentUser.value = null
      isAuthenticated.value = false
      await router.push('/')
    }
  }

  return {
    isAuthenticated,
    currentUser,
    loading,
    error,
    login,
    logout,
  }
}
