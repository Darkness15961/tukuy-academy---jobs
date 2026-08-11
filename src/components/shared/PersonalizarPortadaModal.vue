<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Button } from "@/components/ui/button";

const props = defineProps<{
  abierto: boolean;
  fuente: string;
  nombreArchivo?: string;
  tipoMime?: string;
}>();

const emit = defineEmits<{
  cancelar: [];
  listo: [archivo: File];
}>();

const RELACION = 16 / 9;
const MIN_ANCHO_PX = 80;

const lienzo = ref<HTMLElement | null>(null);
const imagenEl = ref<HTMLImageElement | null>(null);
const procesando = ref(false);
const error = ref("");

type Rect = { x: number; y: number; w: number; h: number };
const imagenRect = ref<Rect>({ x: 0, y: 0, w: 0, h: 0 });
const marco = ref<Rect>({ x: 0, y: 0, w: 0, h: 0 });

type ModoArrastre =
  | null
  | "mover"
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "e"
  | "w";

const modo = ref<ModoArrastre>(null);
let inicioPuntero = { x: 0, y: 0 };
let marcoInicio: Rect = { x: 0, y: 0, w: 0, h: 0 };
let natural = { w: 0, h: 0 };

function clamp(valor: number, min: number, max: number) {
  return Math.min(max, Math.max(min, valor));
}

function medirImagen() {
  const host = lienzo.value;
  const img = imagenEl.value;
  if (!host || !img || !img.naturalWidth) return;

  natural = { w: img.naturalWidth, h: img.naturalHeight };
  const box = host.getBoundingClientRect();
  const pad = 24;
  const maxW = Math.max(120, box.width - pad * 2);
  const maxH = Math.max(120, box.height - pad * 2);
  const escala = Math.min(maxW / natural.w, maxH / natural.h);
  const w = natural.w * escala;
  const h = natural.h * escala;
  const x = (box.width - w) / 2;
  const y = (box.height - h) / 2;
  imagenRect.value = { x, y, w, h };

  // Marco inicial: el mayor 16:9 dentro de la imagen.
  let marcoW = w;
  let marcoH = marcoW / RELACION;
  if (marcoH > h) {
    marcoH = h;
    marcoW = marcoH * RELACION;
  }
  marco.value = {
    x: x + (w - marcoW) / 2,
    y: y + (h - marcoH) / 2,
    w: marcoW,
    h: marcoH,
  };
}

function contenerMarco(siguiente: Rect): Rect {
  const img = imagenRect.value;
  let { x, y, w, h } = siguiente;
  w = clamp(w, MIN_ANCHO_PX, img.w);
  h = w / RELACION;
  if (h > img.h) {
    h = img.h;
    w = h * RELACION;
  }
  x = clamp(x, img.x, img.x + img.w - w);
  y = clamp(y, img.y, img.y + img.h - h);
  return { x, y, w, h };
}

function iniciarArrastre(evento: PointerEvent, nuevoModo: ModoArrastre) {
  evento.preventDefault();
  evento.stopPropagation();
  modo.value = nuevoModo;
  inicioPuntero = { x: evento.clientX, y: evento.clientY };
  marcoInicio = { ...marco.value };
  (evento.currentTarget as HTMLElement).setPointerCapture?.(evento.pointerId);
}

function moverArrastre(evento: PointerEvent) {
  if (!modo.value) return;
  const dx = evento.clientX - inicioPuntero.x;
  const dy = evento.clientY - inicioPuntero.y;
  const base = marcoInicio;

  if (modo.value === "mover") {
    marco.value = contenerMarco({
      x: base.x + dx,
      y: base.y + dy,
      w: base.w,
      h: base.h,
    });
    return;
  }

  const ancla = {
    x: base.x,
    y: base.y,
    r: base.x + base.w,
    b: base.y + base.h,
  };

  let left = ancla.x;
  let top = ancla.y;
  let right = ancla.r;
  let bottom = ancla.b;

  if (modo.value.includes("e")) right = ancla.r + dx;
  if (modo.value.includes("w")) left = ancla.x + dx;
  if (modo.value.includes("s")) bottom = ancla.b + dy;
  if (modo.value.includes("n")) top = ancla.y + dy;

  // Mantener 16:9 tomando el eje dominante del gesto.
  let w = Math.abs(right - left);
  let h = Math.abs(bottom - top);
  const desdeAncho =
    modo.value === "e" ||
    modo.value === "w" ||
    Math.abs(dx) * RELACION >= Math.abs(dy);

  if (desdeAncho) {
    w = Math.max(MIN_ANCHO_PX, w);
    h = w / RELACION;
  } else {
    h = Math.max(MIN_ANCHO_PX / RELACION, h);
    w = h * RELACION;
  }

  let x = left;
  let y = top;
  if (modo.value.includes("w")) x = ancla.r - w;
  if (modo.value.includes("n")) y = ancla.b - h;
  if (modo.value === "n" || modo.value === "s") {
    x = ancla.x + (base.w - w) / 2;
  }
  if (modo.value === "e" || modo.value === "w") {
    y = ancla.y + (base.h - h) / 2;
  }

  marco.value = contenerMarco({ x, y, w, h });
}

function terminarArrastre() {
  modo.value = null;
}

async function confirmar() {
  if (procesando.value) return;
  error.value = "";
  procesando.value = true;
  try {
    const img = imagenEl.value;
    if (!img || !natural.w) throw new Error("La imagen aún no cargó.");

    const escalaX = natural.w / imagenRect.value.w;
    const escalaY = natural.h / imagenRect.value.h;
    const sx = (marco.value.x - imagenRect.value.x) * escalaX;
    const sy = (marco.value.y - imagenRect.value.y) * escalaY;
    const sw = marco.value.w * escalaX;
    const sh = marco.value.h * escalaY;

    const salidaW = Math.min(1920, Math.max(640, Math.round(sw)));
    const salidaH = Math.round(salidaW / RELACION);
    const canvas = document.createElement("canvas");
    canvas.width = salidaW;
    canvas.height = salidaH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo recortar la imagen.");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, salidaW, salidaH);

    const tipo =
      props.tipoMime && props.tipoMime !== "image/png"
        ? "image/jpeg"
        : props.tipoMime || "image/jpeg";
    const calidad = tipo === "image/jpeg" ? 0.92 : undefined;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (resultado) =>
          resultado
            ? resolve(resultado)
            : reject(new Error("No se pudo generar el recorte.")),
        tipo,
        calidad,
      );
    });

    const base = (props.nombreArchivo || "portada").replace(/\.[^.]+$/, "");
    const extension = tipo === "image/png" ? "png" : "jpg";
    emit(
      "listo",
      new File([blob], `${base}-portada.${extension}`, { type: tipo }),
    );
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo recortar.";
  } finally {
    procesando.value = false;
  }
}

function alCargarImagen() {
  nextTick(() => medirImagen());
}

watch(
  () => props.abierto,
  async (abierto) => {
    if (!abierto) return;
    error.value = "";
    await nextTick();
    medirImagen();
  },
);

onMounted(() => {
  window.addEventListener("resize", medirImagen);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", medirImagen);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="abierto"
      class="fixed inset-0 z-[80] grid place-items-center bg-slate-950/80 p-4"
      @click.self="emit('cancelar')"
    >
      <div
        class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1b1f23] text-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-personalizar-portada"
      >
        <header class="border-b border-white/10 px-5 py-4">
          <h2 id="titulo-personalizar-portada" class="text-lg font-semibold">
            Personalizar imagen
          </h2>
          <p class="mt-1 text-xs text-white/60">
            Arrastra el marco o usa las esquinas para ampliar / reducir. Solo lo
            que queda dentro (16:9) será la portada.
          </p>
        </header>

        <div
          ref="lienzo"
          class="relative min-h-[320px] flex-1 touch-none select-none overflow-hidden bg-[#111418]"
          @pointermove="moverArrastre"
          @pointerup="terminarArrastre"
          @pointercancel="terminarArrastre"
        >
          <img
            ref="imagenEl"
            :src="fuente"
            alt="Imagen a recortar"
            class="pointer-events-none absolute max-w-none"
            :style="{
              left: `${imagenRect.x}px`,
              top: `${imagenRect.y}px`,
              width: `${imagenRect.w}px`,
              height: `${imagenRect.h}px`,
            }"
            draggable="false"
            @load="alCargarImagen"
          />

          <!-- Oscurece fuera del marco -->
          <div
            class="pointer-events-none absolute border-2 border-white"
            :style="{
              left: `${marco.x}px`,
              top: `${marco.y}px`,
              width: `${marco.w}px`,
              height: `${marco.h}px`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.62)',
            }"
          />

          <div
            class="absolute"
            :class="modo === 'mover' ? 'cursor-grabbing' : 'cursor-grab'"
            :style="{
              left: `${marco.x}px`,
              top: `${marco.y}px`,
              width: `${marco.w}px`,
              height: `${marco.h}px`,
            }"
            @pointerdown="iniciarArrastre($event, 'mover')"
          >
            <!-- Regla de tercios -->
            <div
              class="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3"
            >
              <div
                v-for="celda in 9"
                :key="celda"
                class="border border-white/25"
              />
            </div>

            <button
              v-for="asa in [
                { modo: 'nw', clase: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
                { modo: 'ne', clase: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
                { modo: 'sw', clase: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
                { modo: 'se', clase: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
                { modo: 'n', clase: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
                { modo: 's', clase: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize' },
                { modo: 'w', clase: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
                { modo: 'e', clase: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize' },
              ] as const"
              :key="asa.modo"
              type="button"
              class="absolute z-10 h-3.5 w-3.5 rounded-sm border border-slate-900 bg-white"
              :class="asa.clase"
              aria-label="Redimensionar"
              @pointerdown="iniciarArrastre($event, asa.modo)"
            />
          </div>
        </div>

        <footer
          class="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4"
        >
          <p v-if="error" class="text-xs font-semibold text-red-300">
            {{ error }}
          </p>
          <p v-else class="text-xs text-white/50">Proporción fija 16:9</p>
          <div class="ml-auto flex gap-2">
            <Button
              type="button"
              class="border-white/20 bg-white/10 text-white hover:bg-white/15"
              variant="outline"
              :disabled="procesando"
              @click="emit('cancelar')"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              class="bg-white text-slate-900 hover:bg-slate-100"
              :disabled="procesando"
              @click="confirmar"
            >
              {{ procesando ? "Procesando…" : "Hecho" }}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
