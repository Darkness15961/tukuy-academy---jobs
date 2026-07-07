import { onMounted, ref } from 'vue'

import { userService } from '@/api/services/user.service'
import type { UserProfile, WorkExperience } from '@/types/academy'

export function useUser() {
  const user = ref<UserProfile | null>(null)
  const workExperiences = ref<WorkExperience[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUser() {
    loading.value = true
    error.value = null
    try {
      const [profile, experiences] = await Promise.all([
        userService.getProfile(),
        userService.getExperiences(),
      ])
      user.value = profile
      workExperiences.value = experiences
    } catch {
      error.value = 'No se pudo cargar el perfil'
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchUser)

  return {
    user,
    workExperiences,
    loading,
    error,
    refetch: fetchUser,
  }
}
