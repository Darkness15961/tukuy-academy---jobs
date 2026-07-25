<script setup lang="ts">
import { computed, ref } from "vue";

import {
  inicialesEmpleador,
  type EmpleadorVacante,
} from "../types/vacante.types";

const props = withDefaults(
  defineProps<{
    empleador: EmpleadorVacante;
    size?: "sm" | "md" | "lg";
  }>(),
  { size: "md" },
);

const falloLogo = ref(false);

const tamanio = computed(() => {
  if (props.size === "sm") return "h-10 w-10";
  if (props.size === "lg") return "h-16 w-16";
  return "h-12 w-12";
});

const textoIniciales = computed(() => {
  if (props.size === "sm") return "text-xs";
  if (props.size === "lg") return "text-lg";
  return "text-sm";
});

const mostrarImagen = computed(
  () => Boolean(props.empleador.logoUrl) && !falloLogo.value,
);

const colorFondo = computed(
  () => props.empleador.colorMarca ?? "#0B3A78",
);
</script>

<template>
  <span
    class="relative grid shrink-0 place-items-center overflow-hidden border border-border bg-card"
    :class="tamanio"
    :title="empleador.nombre"
  >
    <img
      v-if="mostrarImagen"
      :src="empleador.logoUrl"
      :alt="`Logo de ${empleador.nombre}`"
      class="h-full w-full object-contain p-1"
      @error="falloLogo = true"
    />
    <span
      v-else
      class="grid h-full w-full place-items-center font-black text-white"
      :class="textoIniciales"
      :style="{ backgroundColor: colorFondo }"
    >
      {{ inicialesEmpleador(empleador.nombre) }}
    </span>
  </span>
</template>
