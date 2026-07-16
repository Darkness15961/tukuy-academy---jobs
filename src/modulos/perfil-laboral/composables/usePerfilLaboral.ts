import { computed } from "vue";
import { useRouter } from "vue-router";

import { useContextoSesion } from "@/composables/useContextoSesion";
import { useCursos } from "@/composables/useCursos";
import { useEmpleos } from "@/composables/useEmpleos";
import { useUsuario } from "@/composables/useUsuario";
import type { UserProfile, ViewId } from "@/types/academia";
import { usePortalContextOptional } from "@/views/portal/composables/usePortalContext";

export function usePerfilLaboral() {
  const router = useRouter();
  const { contextoActivo } = useContextoSesion();
  const contextoPortal = usePortalContextOptional();

  const rutaPrincipal = computed(() => "/perfil-profesional");
  const rutaEditor = computed(() => `${rutaPrincipal.value}/editar`);

  if (contextoPortal) {
    const cargando = computed(
      () =>
        contextoPortal.coursesLoading.value ||
        contextoPortal.jobsLoading.value ||
        contextoPortal.contentLoading.value,
    );

    return {
      user: contextoPortal.user,
      courses: contextoPortal.courses,
      completedCourses: contextoPortal.completedCourses,
      workExperiences: contextoPortal.workExperiences,
      forYouJobs: contextoPortal.forYouJobs,
      cargando,
      rutaPrincipal,
      rutaEditor,
      navigate: contextoPortal.navigate,
      updateUserProfile: contextoPortal.updateUserProfile,
    };
  }

  const {
    user,
    workExperiences,
    loading: usuarioCargando,
    updateProfile,
  } = useUsuario();
  const {
    courses,
    completedCourses,
    loading: cursosCargando,
  } = useCursos();
  const {
    recommendedJobs: forYouJobs,
    loading: empleosCargando,
  } = useEmpleos();

  const cargando = computed(
    () =>
      usuarioCargando.value ||
      cursosCargando.value ||
      empleosCargando.value ||
      !user.value,
  );

  function navigate(view: ViewId) {
    const portal = contextoActivo.value?.portal ?? "estudiante";
    const rutasPorPortal: Record<
      string,
      Partial<Record<ViewId, string>>
    > = {
      estudiante: {
        profile: "/tukuy-academy/perfil",
        jobs: "/bolsa-tukuy",
        courses: "/tukuy-academy/cursos",
        certificates: "/tukuy-academy/certificados",
      },
      docente: {
        profile: "/docente/configuracion",
        jobs: "/bolsa-tukuy",
        courses: "/docente/cursos",
        certificates: "/docente/certificados",
      },
      organizacion: {
        profile: "/organizacion/configuracion",
        jobs: "/bolsa-tukuy",
        courses: "/organizacion/cursos",
      },
      admin: {
        profile: "/admin/inicio",
        jobs: "/bolsa-tukuy",
        courses: "/admin/inicio",
      },
    };
    const rutasComunes: Partial<Record<ViewId, string>> = {
      jobs: "/bolsa-tukuy",
      cv: rutaPrincipal.value,
    };

    router.push(
      rutasPorPortal[portal]?.[view] ??
        rutasComunes[view] ??
        "/perfil-profesional",
    );
  }

  async function updateUserProfile(updates: Partial<UserProfile>) {
    await updateProfile(updates);
  }

  return {
    user,
    courses,
    completedCourses,
    workExperiences,
    forYouJobs,
    cargando,
    rutaPrincipal,
    rutaEditor,
    navigate,
    updateUserProfile,
  };
}
