import { onMounted, ref } from "vue";

import { usuarioService } from "@/api/services/usuario.service";
import type { UserProfile, WorkExperience } from "@/types/academia";

export function useUsuario() {
  const user = ref<UserProfile | null>(null);
  const workExperiences = ref<WorkExperience[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchUser() {
    loading.value = true;
    error.value = null;
    try {
      const [profile, experiences] = await Promise.all([
        usuarioService.getProfile(),
        usuarioService.getExperiences(),
      ]);
      user.value = profile;
      workExperiences.value = experiences;
    } catch {
      error.value = "No se pudo cargar el perfil";
    } finally {
      loading.value = false;
    }
  }

  onMounted(fetchUser);

  async function updateProfile(updates: Partial<UserProfile>) {
    user.value = await usuarioService.updateProfile(updates);
    return user.value;
  }

  async function updateExperiences(experiences: WorkExperience[]) {
    workExperiences.value = await usuarioService.updateExperiences(experiences);
    return workExperiences.value;
  }

  return {
    user,
    workExperiences,
    loading,
    error,
    refetch: fetchUser,
    updateProfile,
    updateExperiences,
  };
}
