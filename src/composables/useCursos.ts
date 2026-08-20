import { computed, onMounted, ref, watch } from "vue";

import { cursosService } from "@/api/services/cursos.service";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { AUTH_TOKEN_KEY } from "@/lib/constants";
import { toast } from "@/lib/toast";
import type { Course } from "@/types/academia";

const { contextoActivo } = useContextoSesion();

/** Estado compartido: evita refetch al remount y permite pintar con datos previos. */
const courses = ref<Course[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const cargadoUnaVez = ref(false);
let fetchEnCurso: Promise<void> | null = null;
/** Descarta respuestas viejas tras invalidar / forzar (p. ej. post-onboarding). */
let generacionFetch = 0;

/** Tras login o cambio de perfil: evita reutilizar un catálogo vacío obsoleto. */
export function invalidarCacheCursos() {
  generacionFetch += 1;
  courses.value = [];
  cargadoUnaVez.value = false;
  error.value = null;
  fetchEnCurso = null;
}

async function fetchCourses(
  opciones: { silencioso?: boolean; forzar?: boolean } = {},
) {
  if (fetchEnCurso) {
    if (!opciones.forzar) return fetchEnCurso;
    await fetchEnCurso.catch(() => undefined);
  }

  const generacion = ++generacionFetch;
  const portalAlInicio = contextoActivo.value?.portal;
  const mostrarLoading = !opciones.silencioso && !cargadoUnaVez.value;
  if (mostrarLoading) loading.value = true;
  error.value = null;

  fetchEnCurso = (async () => {
    try {
      // Sin contexto alumno aún: no marcar como cargado (evita catálogo vacío pegado).
      if (
        !!localStorage.getItem(AUTH_TOKEN_KEY) &&
        portalAlInicio !== "estudiante"
      ) {
        return;
      }

      const lista = await cursosService.getAll();
      if (generacion !== generacionFetch) return;

      const portal = contextoActivo.value?.portal;
      const autenticado = !!localStorage.getItem(AUTH_TOKEN_KEY);

      if (lista.length === 0 && autenticado && portal !== "estudiante") {
        return;
      }

      courses.value = lista;
      cargadoUnaVez.value = true;
    } catch (causa) {
      if (generacion !== generacionFetch) return;
      error.value = "No se pudieron cargar los cursos";
      toast.error(
        causa instanceof Error
          ? causa.message
          : "No se pudieron cargar los cursos",
      );
    } finally {
      if (generacion === generacionFetch) {
        loading.value = false;
        fetchEnCurso = null;
      }
    }
  })();

  return fetchEnCurso;
}

watch(
  () =>
    [
      contextoActivo.value?.portal,
      contextoActivo.value?.organizacionId,
    ] as const,
  ([portal], [portalAnterior]) => {
    if (portal === "estudiante" && portal !== portalAnterior) {
      void fetchCourses({
        forzar: true,
        silencioso: cargadoUnaVez.value,
      });
    }
  },
);

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
