<script setup lang="ts">
import Skeleton from "primevue/skeleton";
import { RouterView } from "vue-router";
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <Suspense timeout="0">
      <!-- key fuerza remount limpio al cambiar de ruta -->
      <component :is="Component" :key="route.fullPath" />
      <template #fallback>
        <div class="grid gap-4" aria-busy="true" aria-label="Cargando vista">
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
