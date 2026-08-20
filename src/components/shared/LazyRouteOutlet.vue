<script setup lang="ts">
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";

import CargaPerezosaCurso from "@/components/shared/CargaPerezosaCurso.vue";
import EsqueletoPortalCursos from "@/components/shared/EsqueletoPortalCursos.vue";
import EsqueletoPortalGenerico from "@/components/shared/EsqueletoPortalGenerico.vue";
import EsqueletoPortalLista from "@/components/shared/EsqueletoPortalLista.vue";

const route = useRoute();

const varianteEsqueleto = computed(() => {
  const nombre = String(route.name ?? "");

  if (
    nombre === "portal-course-detail" ||
    nombre === "portal-learning-player"
  ) {
    return "curso";
  }

  if (nombre === "portal-courses" || nombre === "portal-cart") {
    return "cursos";
  }

  if (nombre === "portal-learning") {
    return "aprendizaje";
  }

  if (nombre === "portal-favorites") {
    return "favoritos";
  }

  if (
    nombre === "portal-certificates" ||
    nombre === "portal-profile" ||
    nombre === "portal-settings" ||
    nombre === "portal-calendar"
  ) {
    return "generico";
  }

  return "generico";
});
</script>

<template>
  <RouterView v-slot="{ Component, route: rutaActiva }">
    <Suspense timeout="0">
      <component :is="Component" :key="rutaActiva.fullPath" />
      <template #fallback>
        <CargaPerezosaCurso
          v-if="varianteEsqueleto === 'curso'"
          pantalla-completa
          :mensajes="[
            'Cargando curso…',
            'Alistando recursos…',
            'Preparando materiales…',
            'Organizando módulos…',
            'Cargando avance…',
          ]"
        />
        <EsqueletoPortalCursos v-else-if="varianteEsqueleto === 'cursos'" />
        <EsqueletoPortalLista
          v-else-if="varianteEsqueleto === 'aprendizaje'"
        />
        <EsqueletoPortalLista
          v-else-if="varianteEsqueleto === 'favoritos'"
          metricas
        />
        <EsqueletoPortalGenerico v-else />
      </template>
    </Suspense>
  </RouterView>
</template>
