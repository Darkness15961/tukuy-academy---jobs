<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<template>
  <section
    class="mx-auto grid w-full max-w-5xl gap-6 px-5 py-8 lg:px-8 lg:py-10"
    aria-busy="true"
    aria-label="Cargando vista"
  >
    <div class="grid gap-3">
      <Skeleton class="h-4 w-28" />
      <Skeleton class="h-10 w-full max-w-lg" />
      <Skeleton class="h-5 w-full max-w-2xl" />
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <Skeleton v-for="i in 4" :key="i" class="h-36 w-full" />
    </div>
    <Skeleton class="h-64 w-full" />
  </section>
</template>
