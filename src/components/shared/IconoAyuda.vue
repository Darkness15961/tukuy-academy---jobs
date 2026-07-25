<script setup lang="ts">
import { CircleHelp } from "lucide-vue-next";

withDefaults(
  defineProps<{
    texto: string;
    /** Posición del tooltip relativo al icono */
    lado?: "arriba" | "abajo" | "izquierda" | "derecha";
  }>(),
  { lado: "abajo" },
);
</script>

<template>
  <span class="icono-ayuda group relative inline-flex shrink-0 align-middle">
    <button
      type="button"
      class="icono-ayuda__boton"
      :aria-label="texto"
    >
      <CircleHelp class="icono-ayuda__svg" aria-hidden="true" />
    </button>
    <span
      role="tooltip"
      class="icono-ayuda__tooltip"
      :class="`icono-ayuda__tooltip--${lado}`"
    >
      {{ texto }}
    </span>
  </span>
</template>
