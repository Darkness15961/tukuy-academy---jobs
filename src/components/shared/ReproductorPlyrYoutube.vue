<script setup lang="ts">
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";

import { idVideoYoutube } from "@/lib/youtube";
import {
  aplicarCalidadInicial720,
  etiquetaCalidadYoutube,
  establecerCalidadYoutube,
  listarCalidadesYoutube,
  obtenerCalidadActualYoutube,
  programarCalidadInicial720,
  type OpcionCalidadYoutube,
} from "@/lib/youtube-calidad";

const props = withDefaults(
  defineProps<{
    url: string;
    titulo?: string;
    /** Segundos desde los que reanudar (progreso local). */
    startSeconds?: number;
  }>(),
  {
    titulo: "Video del curso",
    startSeconds: 0,
  },
);

const emit = defineEmits<{
  progreso: [segundos: number];
  finalizado: [];
  duracion: [segundos: number];
}>();

const contenedor = ref<HTMLElement | null>(null);
const menuCalidadRef = ref<HTMLElement | null>(null);
const hostCalidad = ref<HTMLElement | null>(null);
/** Fuerza un nodo DOM fresco: Plyr.destroy() deja el markup inutilizable. */
const hostKey = ref(0);
const visible = ref(true);
const finalizadoUi = ref(false);
const player = ref<Plyr | null>(null);
const calidadesDisponibles = ref<OpcionCalidadYoutube[]>([]);
const calidadActual = ref("hd720");
const menuCalidadAbierto = ref(false);
const calidadManual = ref<string | null>(null);

let ultimoProgresoEmitido = 0;
let montajeSeq = 0;
let cancelarCalidad: (() => void) | null = null;
let intervaloCalidad: ReturnType<typeof setInterval> | null = null;

const etiquetaCalidadActiva = computed(() =>
  etiquetaCalidadYoutube(calidadManual.value || calidadActual.value),
);

const mostrarSelectorCalidad = computed(
  () => visible.value && !!videoId.value && !!hostCalidad.value && !finalizadoUi.value,
);

const videoId = computed(() => idVideoYoutube(props.url));

const embedSrc = computed(() => {
  const id = videoId.value;
  if (!id) return "";
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://tukuyacademy.edu.pe";
  const params = new URLSearchParams({
    origin,
    controls: "0",
    disablekb: "1",
    fs: "0",
    iv_load_policy: "3",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
    enablejsapi: "1",
  });
  const start = Math.max(0, Math.floor(props.startSeconds ?? 0));
  if (start > 5) params.set("start", String(start));
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
});

function limpiarCalidadProgramada() {
  cancelarCalidad?.();
  cancelarCalidad = null;
}

function limpiarIntervaloCalidad() {
  if (intervaloCalidad) {
    clearInterval(intervaloCalidad);
    intervaloCalidad = null;
  }
}

function insertarHostCalidad() {
  const raiz =
    (contenedor.value?.closest(".plyr") as HTMLElement | null) ??
    (contenedor.value?.querySelector(".plyr") as HTMLElement | null);
  const barra = raiz?.querySelector(".plyr__controls") as HTMLElement | null;
  if (!barra) return;

  let host = barra.querySelector(".tukuy-calidad-host") as HTMLElement | null;
  if (!host) {
    host = document.createElement("span");
    host.className = "tukuy-calidad-host";
    const fullscreen = barra.querySelector('[data-plyr="fullscreen"]');
    if (fullscreen) fullscreen.before(host);
    else barra.appendChild(host);
  }
  hostCalidad.value = host;
}

function actualizarEstadoCalidad(instancia: Plyr) {
  const opciones = listarCalidadesYoutube(instancia.embed);
  if (opciones.length) calidadesDisponibles.value = opciones;
  const actual = obtenerCalidadActualYoutube(instancia.embed);
  if (actual && actual !== "unknown") calidadActual.value = actual;
}

function solicitarCalidad720(instancia: Plyr) {
  if (calidadManual.value) return;
  limpiarCalidadProgramada();
  cancelarCalidad = programarCalidadInicial720(instancia.embed);
}

function sincronizarCalidad(instancia: Plyr) {
  actualizarEstadoCalidad(instancia);
  if (calidadManual.value) {
    establecerCalidadYoutube(instancia.embed, calidadManual.value);
    calidadActual.value = calidadManual.value;
    return;
  }
  aplicarCalidadInicial720(instancia.embed);
  actualizarEstadoCalidad(instancia);
}

function iniciarMonitoreoCalidad(instancia: Plyr) {
  limpiarIntervaloCalidad();
  intervaloCalidad = setInterval(() => {
    if (!player.value) return;
    actualizarEstadoCalidad(instancia);
    insertarHostCalidad();
  }, 2000);
}

function alternarMenuCalidad() {
  menuCalidadAbierto.value = !menuCalidadAbierto.value;
  if (menuCalidadAbierto.value && player.value) {
    actualizarEstadoCalidad(player.value);
  }
}

function elegirCalidad(id: string) {
  const instancia = player.value;
  if (!instancia) return;
  calidadManual.value = id;
  calidadActual.value = id;
  limpiarCalidadProgramada();
  establecerCalidadYoutube(instancia.embed, id);
  menuCalidadAbierto.value = false;
}

function cerrarMenuCalidadExterno(event: MouseEvent) {
  if (!menuCalidadAbierto.value) return;
  const target = event.target as Node | null;
  if (target && menuCalidadRef.value?.contains(target)) return;
  menuCalidadAbierto.value = false;
}

function destruir() {
  limpiarCalidadProgramada();
  limpiarIntervaloCalidad();
  menuCalidadAbierto.value = false;
  hostCalidad.value = null;
  const actual = player.value;
  player.value = null;
  if (!actual) return;
  try {
    actual.destroy();
  } catch {
    /* noop */
  }
}

async function remontar() {
  const seq = ++montajeSeq;
  destruir();
  ultimoProgresoEmitido = 0;
  finalizadoUi.value = false;
  calidadesDisponibles.value = [];
  calidadActual.value = "hd720";
  calidadManual.value = null;

  if (!videoId.value) {
    visible.value = false;
    return;
  }

  visible.value = false;
  await nextTick();
  if (seq !== montajeSeq) return;

  hostKey.value += 1;
  visible.value = true;
  await nextTick();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  if (seq !== montajeSeq) return;

  const el = contenedor.value;
  if (!el || !videoId.value) return;

  const instancia = new Plyr(el, {
    controls: [
      "play-large",
      "play",
      "progress",
      "current-time",
      "mute",
      "volume",
      "settings",
      "fullscreen",
    ],
    youtube: {
      noCookie: true,
      rel: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
    },
    clickToPlay: true,
    storage: { enabled: false },
    ratio: "16:9",
    hideControls: false,
  });

  if (seq !== montajeSeq) {
    try {
      instancia.destroy();
    } catch {
      /* noop */
    }
    return;
  }

  instancia.on("ready", () => {
    if (seq !== montajeSeq) return;
    window.setTimeout(() => {
      if (seq !== montajeSeq) return;
      insertarHostCalidad();
      sincronizarCalidad(instancia);
      solicitarCalidad720(instancia);
      iniciarMonitoreoCalidad(instancia);
    }, 80);
    const duracion = instancia.duration;
    if (Number.isFinite(duracion) && duracion > 1) {
      emit("duracion", Math.round(duracion));
    }
    const start = Math.max(0, Math.floor(props.startSeconds ?? 0));
    if (start > 5 && start < (duracion || Number.POSITIVE_INFINITY)) {
      try {
        instancia.currentTime = start;
      } catch {
        /* YouTube a veces aún no acepta seek */
      }
    }
  });

  instancia.on("play", () => {
    if (seq !== montajeSeq) return;
    finalizadoUi.value = false;
    insertarHostCalidad();
    sincronizarCalidad(instancia);
  });

  instancia.on("timeupdate", () => {
    if (seq !== montajeSeq) return;
    const t = instancia.currentTime;
    if (typeof t !== "number" || !Number.isFinite(t) || t <= 0) return;
    if (t - ultimoProgresoEmitido < 4 && t > ultimoProgresoEmitido) return;
    ultimoProgresoEmitido = t;
    emit("progreso", t);
  });

  instancia.on("ended", () => {
    if (seq !== montajeSeq) return;
    finalizadoUi.value = true;
    emit("finalizado");
  });

  instancia.on("loadeddata", () => {
    if (seq !== montajeSeq) return;
    insertarHostCalidad();
    sincronizarCalidad(instancia);
    const duracion = instancia.duration;
    if (Number.isFinite(duracion) && duracion > 1) {
      emit("duracion", Math.round(duracion));
    }
  });

  player.value = instancia;
}

watch(
  () => [props.url, videoId.value] as const,
  () => {
    void remontar();
  },
  { immediate: true },
);

onMounted(() => {
  document.addEventListener("click", cerrarMenuCalidadExterno);
});

onBeforeUnmount(() => {
  montajeSeq += 1;
  document.removeEventListener("click", cerrarMenuCalidadExterno);
  destruir();
});
</script>

<template>
  <div class="tukuy-plyr relative h-full w-full overflow-hidden bg-black">
    <div
      v-if="visible && videoId"
      :key="hostKey"
      ref="contenedor"
      class="plyr__video-embed h-full w-full"
    >
      <iframe
        :src="embedSrc"
        :title="titulo"
        allowfullscreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        tabindex="-1"
      />
    </div>
    <div
      v-else-if="!videoId"
      class="grid h-full w-full place-items-center px-6 text-center text-sm text-slate-300"
    >
      El enlace de YouTube no es válido.
    </div>

    <Teleport v-if="mostrarSelectorCalidad && hostCalidad" :to="hostCalidad">
      <span ref="menuCalidadRef" class="tukuy-calidad">
        <button
          type="button"
          class="plyr__control tukuy-calidad__boton"
          :aria-expanded="menuCalidadAbierto"
          aria-haspopup="listbox"
          aria-label="Calidad del video"
          @click.stop="alternarMenuCalidad"
        >
          {{ etiquetaCalidadActiva }}
        </button>
        <span
          v-if="menuCalidadAbierto"
          class="tukuy-calidad__menu"
          role="listbox"
          aria-label="Opciones de calidad"
          @click.stop
        >
          <button
            v-for="opcion in calidadesDisponibles.length
              ? calidadesDisponibles
              : [{ id: 'hd720', etiqueta: '720p' }]"
            :key="opcion.id"
            type="button"
            role="option"
            class="tukuy-calidad__opcion"
            :class="{
              'tukuy-calidad__opcion--activa':
                (calidadManual ?? calidadActual) === opcion.id,
            }"
            :aria-selected="(calidadManual ?? calidadActual) === opcion.id"
            @click="elegirCalidad(opcion.id)"
          >
            {{ opcion.etiqueta }}
          </button>
        </span>
      </span>
    </Teleport>

    <div
      v-if="finalizadoUi"
      class="absolute inset-0 z-[6] flex flex-col items-center justify-center gap-2 bg-black px-6 text-center"
    >
      <p class="text-sm font-semibold text-white">Clase finalizada</p>
      <p class="text-xs text-slate-400">
        Puedes continuar con la siguiente actividad del curso.
      </p>
    </div>
  </div>
</template>

<style scoped>
.tukuy-plyr :deep(.plyr) {
  height: 100%;
  width: 100%;
  --plyr-color-main: #0b3a78;
  --plyr-video-background: #000;
}
.tukuy-plyr :deep(.plyr__video-wrapper) {
  height: 100%;
  overflow: hidden;
}
.tukuy-plyr :deep(.plyr__video-embed),
.tukuy-plyr :deep(.plyr__poster) {
  height: 100%;
}
.tukuy-plyr :deep(.plyr__video-embed iframe) {
  pointer-events: none !important;
  transform: scale(1.45);
  transform-origin: center center;
}
.tukuy-plyr :deep(.plyr__controls) {
  overflow: visible;
}
.tukuy-plyr :deep(.tukuy-calidad-host) {
  display: inline-flex;
  align-items: center;
  position: relative;
}
.tukuy-calidad {
  display: inline-flex;
  align-items: center;
  position: relative;
}
.tukuy-calidad__boton {
  min-width: 2.75rem;
  padding: 0 0.45rem !important;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1;
}
.tukuy-calidad__menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  min-width: 6.5rem;
  overflow: hidden;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.92);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  padding: 4px 0;
  z-index: 20;
}
.tukuy-calidad__opcion {
  display: block;
  width: 100%;
  padding: 6px 12px;
  text-align: left;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.88);
  background: transparent;
}
.tukuy-calidad__opcion:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.tukuy-calidad__opcion--activa {
  color: #fff;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.12);
}
</style>
