<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Loader2 } from "lucide-vue-next";

import { cn } from "@/lib/utils";
import {
  normalizarPosicionPortada,
  peekUrlMediaCacheada,
  urlVisualizableMedia,
} from "@/lib/storage-academia";

const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    objectPosition?: string;
    contenedorClass?: string;
    imagenClass?: string;
    hoverEscala?: boolean;
    opacidad?: number;
  }>(),
  {
    src: "",
    alt: "",
    objectPosition: "50% 50%",
    contenedorClass: "",
    imagenClass: "",
    hoverEscala: false,
    opacidad: 1,
  },
);

const urlVisible = ref("");
const imagenRota = ref(false);
const resolviendo = ref(false);

const posicion = computed(() => normalizarPosicionPortada(props.objectPosition));

async function resolverUrl(raw: string) {
  const valor = raw.trim();
  if (!valor) {
    urlVisible.value = "";
    imagenRota.value = false;
    resolviendo.value = false;
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

watch(() => props.src, resolverUrl, { immediate: true });
</script>

<template>
  <div
    class="relative flex w-full items-center justify-center overflow-hidden bg-muted"
    :class="contenedorClass"
  >
    <Loader2
      v-if="resolviendo"
      class="h-6 w-6 animate-spin text-muted-foreground"
      aria-hidden="true"
    />
    <img
      v-else-if="urlVisible && !imagenRota"
      :src="urlVisible"
      :alt="alt"
      class="block h-full w-full object-contain object-center"
      :class="
        cn(
          imagenClass,
          hoverEscala && 'transition duration-500 group-hover:scale-105',
        )
      "
      :style="{ objectPosition: posicion, opacity: opacidad }"
    />
  </div>
</template>
