<script setup lang="ts">
import { computed } from "vue";

import { capasFiltroBanner } from "@/lib/filtro-banner";

const props = defineProps<{
  estilo?: string | null;
}>();

const capas = computed(() => capasFiltroBanner(props.estilo));
</script>

<template>
  <div
    v-for="(capa, i) in capas"
    :key="`${estilo ?? 'filtro'}-${i}`"
    class="pointer-events-none absolute inset-0"
    :class="capa"
    aria-hidden="true"
  />
</template>
