<script setup lang="ts">
import { Share2 } from "lucide-vue-next";

import {
  ETIQUETAS_RED_SOCIAL_SESION,
  copiarEnlaceCompartir,
  copiarEnlaceCompartirSesion,
  formatearFechaSesion,
  type RedSocialSesion,
} from "@/lib/compartir-sesion-en-vivo";
import { toast } from "@/lib/toast";
import { computed, ref, useId } from "vue";

const props = withDefaults(
  defineProps<{
    titulo: string;
    cursoTitulo?: string;
    urlMeet?: string;
    url?: string;
    fechaHoraInicio?: string;
    etiquetaEnlace?: string;
    /** Texto junto al icono (p. ej. «Compartir curso»). */
    etiqueta?: string;
    /** En hero oscuro de ficha pública. */
    tono?: "claro" | "oscuro";
  }>(),
  {
    etiqueta: "Compartir",
    tono: "claro",
  },
);

const copiando = ref<RedSocialSesion | null>(null);
const fechaTexto = computed(() =>
  props.fechaHoraInicio ? formatearFechaSesion(props.fechaHoraInicio) : undefined,
);
const urlCompartir = computed(
  () => props.url?.trim() || props.urlMeet?.trim() || "",
);
const esSesionMeet = computed(
  () => Boolean(props.urlMeet?.trim()) && !props.url?.trim(),
);

const gradientId = `ig-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
const redes: RedSocialSesion[] = ["whatsapp", "facebook", "x", "instagram"];

async function compartir(red: RedSocialSesion) {
  const url = urlCompartir.value;
  if (!url || copiando.value) return;

  copiando.value = red;
  try {
    if (esSesionMeet.value) {
      await copiarEnlaceCompartirSesion(red, {
        titulo: props.titulo,
        cursoTitulo: props.cursoTitulo,
        urlMeet: url,
        fechaTexto: fechaTexto.value,
      });
    } else {
      await copiarEnlaceCompartir(red, {
        titulo: props.titulo,
        contexto: props.cursoTitulo,
        url,
        fechaTexto: fechaTexto.value,
        etiquetaEnlace: props.etiquetaEnlace || "Ver curso e inscribirte",
      });
    }
    toast.success(ETIQUETAS_RED_SOCIAL_SESION[red].toastOk);
  } catch {
    toast.error("No se pudo copiar al portapapeles");
  } finally {
    copiando.value = null;
  }
}
</script>

<template>
  <div
    v-if="urlCompartir"
    class="mt-3 flex flex-wrap items-center gap-2.5"
  >
    <span
      class="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
      :class="
        tono === 'oscuro' ? 'text-white/65' : 'text-muted-foreground'
      "
    >
      <Share2 class="h-3.5 w-3.5 shrink-0" />
      {{ etiqueta }}
    </span>
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="red in redes"
        :key="red"
        type="button"
        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 disabled:opacity-50"
        :disabled="Boolean(copiando)"
        :aria-label="`Copiar enlace para ${ETIQUETAS_RED_SOCIAL_SESION[red].nombre}`"
        :title="`Copiar para ${ETIQUETAS_RED_SOCIAL_SESION[red].nombre}`"
        @click="compartir(red)"
      >
        <!-- Marcas a 36px (no miniaturas 16px dentro de otro círculo). -->
        <svg
          v-if="red === 'whatsapp'"
          class="h-9 w-9"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="#25D366"
        >
          <path
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
          />
        </svg>
        <svg
          v-else-if="red === 'facebook'"
          class="h-9 w-9"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="#1877F2"
        >
          <path
            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
          />
        </svg>
        <svg
          v-else-if="red === 'x'"
          class="h-9 w-9"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="12" fill="#000" />
          <path
            fill="#fff"
            d="M13.39 11.29 17.7 6.3h-1.02l-3.75 4.34L9.93 6.3H6.3l4.53 6.59L6.3 17.7h1.02l3.96-4.58 3.14 4.58h3.63l-4.66-6.41zm-1.4 1.62-.46-.66-3.65-5.22h1.57l2.34 3.35.46.66 3.83 5.48h-1.57l-2.52-3.61z"
          />
        </svg>
        <svg
          v-else
          class="h-9 w-9"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <defs>
            <radialGradient
              :id="gradientId"
              cx="30%"
              cy="107%"
              r="150%"
            >
              <stop offset="0%" stop-color="#fdf497" />
              <stop offset="5%" stop-color="#fdf497" />
              <stop offset="45%" stop-color="#fd5949" />
              <stop offset="60%" stop-color="#d6249f" />
              <stop offset="90%" stop-color="#285aeb" />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="12" :fill="`url(#${gradientId})`" />
          <path
            fill="#fff"
            d="M12 7.35A4.65 4.65 0 1 0 16.65 12 4.655 4.655 0 0 0 12 7.35Zm0 7.67A3.02 3.02 0 1 1 15.02 12 3.023 3.023 0 0 1 12 15.02Zm5.47-7.9a1.09 1.09 0 1 1-1.09-1.09 1.09 1.09 0 0 1 1.09 1.09Z"
          />
          <path
            fill="none"
            stroke="#fff"
            stroke-width="1.35"
            d="M12 5.4c-2.2 0-2.47.01-3.34.05a5.6 5.6 0 0 0-1.87.36 3.7 3.7 0 0 0-1.35.88 3.7 3.7 0 0 0-.88 1.35 5.6 5.6 0 0 0-.36 1.87c-.04.87-.05 1.14-.05 3.34s.01 2.47.05 3.34a5.6 5.6 0 0 0 .36 1.87 3.7 3.7 0 0 0 .88 1.35 3.7 3.7 0 0 0 1.35.88 5.6 5.6 0 0 0 1.87.36c.87.04 1.14.05 3.34.05s2.47-.01 3.34-.05a5.6 5.6 0 0 0 1.87-.36 3.7 3.7 0 0 0 1.35-.88 3.7 3.7 0 0 0 .88-1.35 5.6 5.6 0 0 0 .36-1.87c.04-.87.05-1.14.05-3.34s-.01-2.47-.05-3.34a5.6 5.6 0 0 0-.36-1.87 3.7 3.7 0 0 0-.88-1.35 3.7 3.7 0 0 0-1.35-.88 5.6 5.6 0 0 0-1.87-.36C14.47 5.41 14.2 5.4 12 5.4Z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
