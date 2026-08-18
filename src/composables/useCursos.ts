import { computed, onMounted, ref } from "vue";

import { cursosService } from "@/api/services/cursos.service";
import { toast } from "@/lib/toast";
import type { Course } from "@/types/academia";

/** Estado compartido: evita refetch al remount y permite pintar con datos previos. */
const courses = ref<Course[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const cargadoUnaVez = ref(false);
let fetchEnCurso: Promise<void> | null = null;

async function fetchCourses(
  opciones: { silencioso?: boolean; forzar?: boolean } = {},
) {
  if (fetchEnCurso) {
    if (!opciones.forzar) return fetchEnCurso;
    await fetchEnCurso.catch(() => undefined);
  }

  const mostrarLoading = !opciones.silencioso && !cargadoUnaVez.value;
  if (mostrarLoading) loading.value = true;
  error.value = null;

  fetchEnCurso = (async () => {
    try {
      courses.value = await cursosService.getAll();
      cargadoUnaVez.value = true;
    } catch (causa) {
      error.value = "No se pudieron cargar los cursos";
      toast.error(
        causa instanceof Error
          ? causa.message
          : "No se pudieron cargar los cursos",
      );
    } finally {
      loading.value = false;
      fetchEnCurso = null;
    }
  })();

  return fetchEnCurso;
}

/** Espera a que el catálogo esté disponible (útil en deep-link / F5). */
export function asegurarCursosCargados() {
  return fetchCourses({ silencioso: cargadoUnaVez.value });
}

export function useCursos() {
  onMounted(() => {
    // Si quedó vacío (p. ej. secundaria sin publicados), reintentar al entrar.
    const forzar = cargadoUnaVez.value && courses.value.length === 0;
    void fetchCourses({
      silencioso: cargadoUnaVez.value && !forzar,
      forzar,
    });
  });

  const completedCourses = computed(() =>
    courses.value.filter(
      (course) => course.progress === 100 || course.status === "Completado",
    ),
  );

  const activeCourses = computed(() =>
    courses.value.filter((course) => course.status === "En curso"),
  );

  return {
    courses,
    loading,
    error,
    completedCourses,
    activeCourses,
    refetch: (opciones?: { silencioso?: boolean; forzar?: boolean }) =>
      fetchCourses(opciones),
  };
}

export function useFiltroCursos(coursesSource: () => Course[]) {
  const searchTerm = ref("");

  const filteredCourses = computed(() => {
    const term = searchTerm.value.trim().toLowerCase();
    const list = coursesSource();
    if (!term) return list;
    return list.filter((course) =>
      [
        course.title,
        course.category,
        course.level,
        course.mode,
        course.organizacionNombre ?? "",
        course.instructor ?? "",
      ].some((value) => value.toLowerCase().includes(term)),
    );
  });

  return { searchTerm, filteredCourses };
}
