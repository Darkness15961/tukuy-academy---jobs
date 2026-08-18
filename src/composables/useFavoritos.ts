import { computed, ref, watch } from "vue";

import { useContextoSesion } from "@/composables/useContextoSesion";

const STORAGE_PREFIX = "tukuy:favoritos-cursos:";

/** IDs de demo del mock antiguo (c-002…); no coinciden con UUIDs reales. */
const ID_MOCK_RE = /^c-\d+$/i;

const favoriteCourseIds = ref<string[]>([]);
let claveCargada = "";

function claveStorage(): string {
  const { contextoActivo } = useContextoSesion();
  const usuarioId = contextoActivo.value?.usuarioId?.trim() || "anon";
  return `${STORAGE_PREFIX}${usuarioId}`;
}

function leerFavoritos(clave: string): string[] {
  try {
    const raw = localStorage.getItem(clave);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((id) => String(id ?? "").trim())
      .filter((id) => id && !ID_MOCK_RE.test(id));
  } catch {
    return [];
  }
}

function persistir() {
  try {
    localStorage.setItem(claveStorage(), JSON.stringify(favoriteCourseIds.value));
  } catch {
    /* ignore quota / private mode */
  }
}

function asegurarCarga() {
  const clave = claveStorage();
  if (clave === claveCargada) return;
  claveCargada = clave;
  favoriteCourseIds.value = leerFavoritos(clave);
}

export function useFavoritos() {
  asegurarCarga();

  const { contextoActivo } = useContextoSesion();
  watch(
    () => contextoActivo.value?.usuarioId,
    () => {
      asegurarCarga();
    },
  );

  const favoritesCount = computed(() => {
    asegurarCarga();
    return favoriteCourseIds.value.length;
  });

  function isFavorite(courseId: string) {
    asegurarCarga();
    return favoriteCourseIds.value.includes(courseId);
  }

  function toggleFavorite(courseId: string) {
    const id = courseId.trim();
    if (!id || ID_MOCK_RE.test(id)) return;
    asegurarCarga();
    if (isFavorite(id)) {
      favoriteCourseIds.value = favoriteCourseIds.value.filter((x) => x !== id);
    } else {
      favoriteCourseIds.value = [...favoriteCourseIds.value, id];
    }
    persistir();
  }

  function addFavorite(courseId: string) {
    const id = courseId.trim();
    if (!id || ID_MOCK_RE.test(id) || isFavorite(id)) return;
    favoriteCourseIds.value = [...favoriteCourseIds.value, id];
    persistir();
  }

  function removeFavorite(courseId: string) {
    favoriteCourseIds.value = favoriteCourseIds.value.filter(
      (id) => id !== courseId,
    );
    persistir();
  }

  /** Quita favoritos que ya no existen en el catálogo cargado. */
  function sincronizarConCatalogo(idsExistentes: string[]) {
    asegurarCarga();
    const vivos = new Set(idsExistentes);
    const siguiente = favoriteCourseIds.value.filter((id) => vivos.has(id));
    if (siguiente.length !== favoriteCourseIds.value.length) {
      favoriteCourseIds.value = siguiente;
      persistir();
    }
  }

  return {
    favoriteCourseIds,
    favoritesCount,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    sincronizarConCatalogo,
  };
}
