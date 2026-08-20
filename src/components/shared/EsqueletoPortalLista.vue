<script setup lang="ts">
import EsqueletoCursoTendencia from "@/components/shared/EsqueletoCursoTendencia.vue";
import { Skeleton } from "@/components/ui/skeleton";

withDefaults(
  defineProps<{
    /** Cuatro métricas como en Favoritos. */
    metricas?: boolean;
    columnas?: "tres" | "dos";
  }>(),
  {
    metricas: false,
    columnas: "tres",
  },
);
</script>

<template>
  <section
    class="mx-auto w-full max-w-360 px-5 py-8 lg:px-8 lg:py-10"
    aria-busy="true"
    aria-label="Cargando vista"
  >
    <div class="grid gap-7">
      <div class="border border-border bg-card p-6 lg:p-8">
        <div
          class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div class="grid max-w-3xl gap-3">
            <Skeleton class="h-6 w-32 rounded-full" />
            <Skeleton class="h-10 w-full max-w-xl" />
            <Skeleton class="h-16 w-full max-w-2xl" />
          </div>
          <Skeleton class="h-28 w-full sm:min-w-64 sm:max-w-xs" />
        </div>
      </div>

      <div
        v-if="metricas"
        class="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <Skeleton v-for="i in 4" :key="`metric-${i}`" class="h-24 w-full" />
      </div>

      <div
        class="flex flex-col gap-4 border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="grid gap-2">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-8 w-48" />
        </div>
        <Skeleton class="h-11 w-full lg:max-w-sm" />
      </div>

      <div class="flex flex-wrap gap-2">
        <Skeleton v-for="i in 3" :key="`tab-${i}`" class="h-10 w-24" />
      </div>

      <div
        class="grid gap-5"
        :class="
          columnas === 'dos'
            ? 'sm:grid-cols-2'
            : 'sm:grid-cols-2 xl:grid-cols-3'
        "
      >
        <EsqueletoCursoTendencia
          v-for="i in 6"
          :key="`card-${i}`"
          fluid
        />
      </div>
    </div>
  </section>
</template>
