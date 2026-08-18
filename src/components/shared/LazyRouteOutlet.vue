<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";

import CargaPerezosaCurso from "@/components/shared/CargaPerezosaCurso.vue";
import { Skeleton } from "@/components/ui/skeleton";

const route = useRoute();

const esDetalleOReproductor = computed(() => {
  const nombre = String(route.name ?? "");
  return (
    nombre === "portal-course-detail" ||
    nombre.includes("aprendizaje") ||
    /cursos\/[^/]+$/.test(route.path) ||
    /aprendizaje\//.test(route.path)
  );
});
</script>

<template>
  <RouterView v-slot="{ Component, route: rutaActiva }">
    <Suspense timeout="0">
      <component :is="Component" :key="rutaActiva.fullPath" />
      <template #fallback>
        <CargaPerezosaCurso
          v-if="esDetalleOReproductor"
          :mensajes="[
            'Cargando curso…',
            'Alistando recursos…',
            'Preparando materiales…',
            'Organizando módulos…',
            'Cargando avance…',
          ]"
        />
        <div
          v-else
          class="grid gap-4"
          aria-busy="true"
          aria-label="Cargando vista"
        >
          <Skeleton class="h-10 w-64 max-w-full" />
          <Skeleton class="h-24 w-full" />
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton v-for="n in 4" :key="n" class="h-24 w-full" />
          </div>
          <Skeleton class="h-64 w-full" />
        </div>
      </template>
    </Suspense>
  </RouterView>
</template>
