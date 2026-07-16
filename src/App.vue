<script setup lang="ts">
import { watch } from "vue";
import { RouterView, useRoute } from "vue-router";

import { useTema } from "@/composables/useTema";

const route = useRoute();
const { preferencia, esOscuroResuelto, rutaPermiteTemaOscuro } = useTema();

// Re-sincroniza al cambiar de ruta (landing siempre sin .dark).
watch(
  () => [route.path, preferencia.value, esOscuroResuelto.value] as const,
  ([ruta]) => {
    const activo =
      rutaPermiteTemaOscuro(ruta) && esOscuroResuelto.value;
    document.documentElement.classList.toggle("dark", activo);
  },
  { immediate: true },
);
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <RouterView />
  </div>
</template>
