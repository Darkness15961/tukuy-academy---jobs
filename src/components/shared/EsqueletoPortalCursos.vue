<script setup lang="ts">
import EsqueletoCursoTendencia from "@/components/shared/EsqueletoCursoTendencia.vue";
import { Skeleton } from "@/components/ui/skeleton";
</script>

<template>
  <section
    class="mx-auto w-full max-w-360 px-5 py-8 lg:px-8 lg:py-10"
    aria-busy="true"
    aria-label="Cargando catálogo de cursos"
  >
    <div class="grid gap-8">
      <div class="grid gap-3">
        <Skeleton class="aspect-[16/7] w-full min-h-[240px] max-h-[420px]" />
        <div class="flex justify-center gap-2">
          <Skeleton v-for="i in 3" :key="i" class="h-1.5 w-8 rounded-full" />
        </div>
      </div>

      <div class="grid gap-5">
        <div class="grid gap-2">
          <Skeleton class="h-4 w-44" />
          <Skeleton class="h-10 w-72 max-w-full" />
        </div>
        <div
          class="flex gap-4 overflow-hidden pb-1"
          aria-hidden="true"
        >
          <EsqueletoCursoTendencia v-for="i in 4" :key="`dest-${i}`" />
        </div>
      </div>

      <div class="relative py-2" aria-hidden="true">
        <Skeleton class="h-px w-full" />
      </div>

      <section
        class="grid w-full gap-6 rounded-none border border-border bg-card/40 p-4 sm:p-6 lg:p-8"
      >
        <div
          class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div class="grid max-w-3xl gap-3">
            <Skeleton class="h-4 w-24" />
            <Skeleton class="h-10 w-full max-w-md" />
          </div>
          <Skeleton class="h-5 w-20" />
        </div>

        <div
          class="flex flex-col gap-3 border border-border bg-background p-3 sm:p-4 lg:flex-row lg:items-center"
        >
          <Skeleton class="h-11 w-full flex-1" />
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[min(36rem,100%)]">
            <Skeleton v-for="i in 3" :key="`filtro-${i}`" class="h-11 w-full" />
          </div>
        </div>

        <Skeleton class="h-5 w-48" />

        <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <EsqueletoCursoTendencia
            v-for="i in 8"
            :key="`cat-${i}`"
            fluid
          />
        </div>
      </section>
    </div>
  </section>
</template>
