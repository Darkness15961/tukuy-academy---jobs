<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<template>
  <main class="min-h-screen bg-[#EEF3F9]">
    <header class="border-b border-border bg-card">
      <div class="mx-auto flex h-20 max-w-320 items-center px-5 lg:px-8">
        <Skeleton class="h-12 w-48" />
      </div>
    </header>

    <div
      class="mx-auto grid max-w-320 gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_410px] lg:px-8 lg:py-14"
    >
      <section class="border border-border bg-card p-7 sm:p-10">
        <Skeleton class="h-4 w-28" />
        <Skeleton class="mt-5 h-11 w-3/4" />
        <Skeleton class="mt-3 h-5 w-1/2" />

        <div class="mt-10 grid gap-3 sm:grid-cols-2">
          <Skeleton v-for="item in 4" :key="item" class="h-24 w-full" />
        </div>

        <Skeleton class="mt-10 h-14 w-full" />
      </section>

      <aside class="border border-border bg-card">
        <Skeleton class="aspect-video w-full" />
        <div class="p-7">
          <Skeleton class="h-7 w-4/5" />
          <Skeleton class="mt-3 h-4 w-2/5" />
          <Skeleton class="mt-8 h-px w-full" />
          <Skeleton class="mt-6 h-10 w-1/2" />
        </div>
      </aside>
    </div>
  </main>
</template>
