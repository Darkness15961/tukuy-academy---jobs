import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import {
  PREFIJOS_RUTA_CON_TEMA,
  TEMA_KEY,
  type PreferenciaTema,
} from "@/lib/constants";

const preferencia = ref<PreferenciaTema>("system");
const sistemaEsOscuro = ref(false);
let mediaQuery: MediaQueryList | null = null;
let listenerSistema: ((event: MediaQueryListEvent) => void) | null = null;
let listenerRegistrado = false;

function leerPreferencia(): PreferenciaTema {
  if (typeof window === "undefined") return "system";
  const guardada = localStorage.getItem(TEMA_KEY);
  if (guardada === "light" || guardada === "dark" || guardada === "system") {
    return guardada;
  }
  return "system";
}

export function rutaPermiteTemaOscuro(ruta: string): boolean {
  return PREFIJOS_RUTA_CON_TEMA.some(
    (prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`),
  );
}

function resolverOscuro(pref: PreferenciaTema, sistema: boolean): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return sistema;
}

function aplicarClaseDark(activo: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", activo);
}

function sincronizarTema(rutaActual: string) {
  const oscuroDeseado = resolverOscuro(
    preferencia.value,
    sistemaEsOscuro.value,
  );
  const permitido = rutaPermiteTemaOscuro(rutaActual);
  aplicarClaseDark(permitido && oscuroDeseado);
}

function asegurarListenerSistema() {
  if (typeof window === "undefined" || listenerRegistrado) return;
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  sistemaEsOscuro.value = mediaQuery.matches;
  listenerSistema = (event: MediaQueryListEvent) => {
    sistemaEsOscuro.value = event.matches;
    sincronizarTema(window.location.pathname);
  };
  mediaQuery.addEventListener("change", listenerSistema);
  listenerRegistrado = true;
}

/** Inicializa el tema antes del mount de Vue (evita flash). */
export function inicializarTema() {
  preferencia.value = leerPreferencia();
  asegurarListenerSistema();
  if (typeof window !== "undefined") {
    sincronizarTema(window.location.pathname);
  }
}

export function useTema() {
  const route = useRoute();

  const esOscuroResuelto = computed(() =>
    resolverOscuro(preferencia.value, sistemaEsOscuro.value),
  );

  const temaActivoEnRuta = computed(
    () => rutaPermiteTemaOscuro(route.path) && esOscuroResuelto.value,
  );

  function setPreferencia(valor: PreferenciaTema) {
    preferencia.value = valor;
    localStorage.setItem(TEMA_KEY, valor);
    sincronizarTema(route.path);
  }

  function ciclarPreferencia() {
    // La UI solo ofrece claro/oscuro; el default "system" queda por detrás.
    setPreferencia(esOscuroResuelto.value ? "light" : "dark");
  }

  onMounted(() => {
    preferencia.value = leerPreferencia();
    asegurarListenerSistema();
    sincronizarTema(route.path);
  });

  watch(
    () => route.path,
    (ruta) => sincronizarTema(ruta),
  );

  watch([preferencia, sistemaEsOscuro], () => {
    sincronizarTema(route.path);
  });

  return {
    preferencia,
    esOscuroResuelto,
    temaActivoEnRuta,
    setPreferencia,
    ciclarPreferencia,
    rutaPermiteTemaOscuro,
  };
}
