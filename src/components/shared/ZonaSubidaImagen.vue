<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ImagePlus, Loader2, Upload } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  peekUrlMediaCacheada,
  urlVisualizableMedia,
} from "@/lib/storage-academia";
import {
  PORTADA_CURSO_AYUDA_BREVE,
} from "@/lib/portada-curso";

const props = withDefaults(
  defineProps<{
    src?: string;
    objectPosition?: string;
    titulo?: string;
    ayuda?: string;
    etiquetaBoton?: string;
    etiquetaBotonCambiar?: string;
    cargando?: boolean;
    disabled?: boolean;
    error?: string;
    accept?: string;
    aspecto?: "video" | "cuadrado" | "auto";
    /** `natural` muestra la imagen completa sin recortar (portada del curso). */
    ajustePreview?: "recorte" | "natural";
    compacto?: boolean;
  }>(),
  {
    src: "",
    objectPosition: "50% 50%",
    titulo: "Subir imagen",
    ayuda: "JPG, PNG o WebP · máximo 8 MB",
    etiquetaBoton: "Seleccionar imagen",
    etiquetaBotonCambiar: "Cambiar imagen",
    accept: "image/png,image/jpeg,image/webp",
    aspecto: "video",
    ajustePreview: "recorte",
  },
);

const emit = defineEmits<{
  archivo: [File];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const urlVisible = ref("");
const imagenRota = ref(false);
const arrastrando = ref(false);
const resolviendo = ref(false);
const dimensionesImagen = ref<{ ancho: number; alto: number } | null>(null);

const previewNatural = computed(() => props.ajustePreview === "natural");

const tienePreview = computed(
  () => Boolean(urlVisible.value) && !imagenRota.value,
);

const claseAspecto = computed(() => {
  if (props.compacto) return "min-h-[9rem]";
  if (props.aspecto === "cuadrado") return "aspect-square max-h-56";
  if (props.aspecto === "auto") return "min-h-[10rem]";
  return "aspect-video max-h-64 w-full";
});

async function resolverUrl(raw: string) {
  const valor = raw.trim();
  if (!valor) {
    urlVisible.value = "";
    imagenRota.value = false;
    resolviendo.value = false;
    dimensionesImagen.value = null;
    return;
  }

  imagenRota.value = false;
  const peek = peekUrlMediaCacheada(valor);
  if (peek) {
    urlVisible.value = peek;
    resolviendo.value = false;
    return;
  }

  if (
    valor.startsWith("http://") ||
    valor.startsWith("https://") ||
    valor.startsWith("data:") ||
    valor.startsWith("blob:")
  ) {
    urlVisible.value = valor;
    resolviendo.value = false;
    return;
  }

  resolviendo.value = true;
  try {
    urlVisible.value = await urlVisualizableMedia(valor, "");
    if (!urlVisible.value) imagenRota.value = true;
  } catch {
    urlVisible.value = "";
    imagenRota.value = true;
  } finally {
    resolviendo.value = false;
  }
}

watch(
  () => props.src,
  (valor) => {
    void resolverUrl(valor ?? "");
  },
  { immediate: true },
);

function abrirSelector() {
  if (props.disabled || props.cargando) return;
  inputRef.value?.click();
}

function alElegirArchivo(evento: Event) {
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  (evento.target as HTMLInputElement).value = "";
  if (!archivo) return;
  emit("archivo", archivo);
}

function alErrorImagen() {
  imagenRota.value = true;
  urlVisible.value = "";
  dimensionesImagen.value = null;
}

function alCargarImagen(evento: Event) {
  const img = evento.target as HTMLImageElement;
  if (!img.naturalWidth || !img.naturalHeight) return;
  dimensionesImagen.value = {
    ancho: img.naturalWidth,
    alto: img.naturalHeight,
  };
}

function alArrastrar(evento: DragEvent) {
  evento.preventDefault();
  if (props.disabled || props.cargando) return;
  arrastrando.value = evento.type === "dragover";
}

function alSoltar(evento: DragEvent) {
  evento.preventDefault();
  arrastrando.value = false;
  if (props.disabled || props.cargando) return;
  const archivo = evento.dataTransfer?.files?.[0];
  if (archivo?.type.startsWith("image/")) emit("archivo", archivo);
}
</script>

<template>
  <div class="grid gap-2">
    <button
      type="button"
      class="group relative w-full overflow-hidden border-2 border-dashed text-left transition"
      :class="[
        compacto ? 'p-3' : 'p-0',
        arrastrando
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/60',
        disabled || cargando ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ]"
      :disabled="disabled || cargando"
      @click="abrirSelector"
      @dragover="alArrastrar"
      @dragleave="alArrastrar"
      @drop="alSoltar"
    >
      <input
        ref="inputRef"
        class="sr-only"
        type="file"
        :accept="accept"
        :disabled="disabled || cargando"
        @change="alElegirArchivo"
      />

      <div
        v-if="tienePreview"
        class="relative overflow-hidden"
        :class="
          previewNatural
            ? 'w-full bg-muted/25 p-3 sm:p-4'
            : claseAspecto
        "
      >
        <img
          :src="urlVisible"
          :alt="titulo"
          class="mx-auto block"
          :class="
            previewNatural
              ? 'h-auto max-h-[min(70vh,540px)] w-full object-contain'
              : 'h-full w-full object-cover'
          "
          :style="previewNatural ? undefined : { objectPosition }"
          @error="alErrorImagen"
          @load="alCargarImagen"
        />
        <div
          class="pointer-events-none absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100"
        />
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 opacity-0 transition group-hover:opacity-100"
        >
          <span
            class="inline-flex items-center gap-1.5 border border-border bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
          >
            <Upload class="h-3.5 w-3.5" />
            {{ etiquetaBotonCambiar }}
          </span>
        </div>
      </div>

      <div
        v-else
        class="relative grid place-items-center overflow-hidden text-center"
        :class="[claseAspecto, compacto ? 'px-4 py-5' : 'px-6 py-8']"
      >
        <div
          class="zona-subida-imagen__fondo pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
        <div
          class="zona-subida-imagen__patron pointer-events-none absolute inset-0"
          aria-hidden="true"
        />

        <div class="relative z-10 grid max-w-sm justify-items-center gap-2">
          <span
            class="grid h-12 w-12 place-items-center border border-primary/25 bg-primary/10 text-primary"
          >
            <Loader2
              v-if="cargando || resolviendo"
              class="h-5 w-5 animate-spin"
            />
            <ImagePlus v-else class="h-5 w-5" />
          </span>
          <p class="text-sm font-bold text-foreground">{{ titulo }}</p>
          <p class="text-xs text-muted-foreground">{{ ayuda }}</p>
          <p
            v-if="!compacto"
            class="text-[11px] font-semibold uppercase tracking-wide text-primary/80"
          >
            Haz clic o arrastra aquí
          </p>
        </div>
      </div>
    </button>

    <div
      v-if="!compacto"
      class="flex flex-wrap items-center justify-between gap-2"
    >
      <p class="text-xs text-muted-foreground">
        <template v-if="dimensionesImagen">
          Vista previa · {{ dimensionesImagen.ancho }} ×
          {{ dimensionesImagen.alto }} px
          <span v-if="previewNatural">
            · proporción real de la imagen
          </span>
        </template>
        <template v-else>
          {{
            aspecto === "cuadrado"
              ? "Recomendado: 800 × 800 px (1:1)"
              : aspecto === "video"
                ? PORTADA_CURSO_AYUDA_BREVE
                : "Proporción libre"
          }}
        </template>
      </p>
      <Button
        size="sm"
        variant="outline"
        type="button"
        :disabled="disabled || cargando"
        @click.stop="abrirSelector"
      >
        <Upload class="h-4 w-4" />
        {{
          cargando
            ? "Subiendo…"
            : tienePreview
              ? etiquetaBotonCambiar
              : etiquetaBoton
        }}
      </Button>
    </div>

    <p v-if="error" class="text-xs font-semibold text-destructive">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.zona-subida-imagen__fondo {
  background:
    radial-gradient(
      ellipse 85% 70% at 50% 0%,
      color-mix(in srgb, var(--color-primary) 22%, transparent),
      transparent 62%
    ),
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--color-primary) 10%, var(--color-muted)) 0%,
      var(--color-muted) 48%,
      color-mix(in srgb, var(--color-primary) 6%, var(--color-background)) 100%
    );
}

.zona-subida-imagen__patron {
  background-image:
    linear-gradient(
      color-mix(in srgb, var(--color-border) 70%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-border) 70%, transparent) 1px,
      transparent 1px
    );
  background-size: 22px 22px;
  mask-image: radial-gradient(circle at center, black 35%, transparent 92%);
  opacity: 0.55;
}
</style>
