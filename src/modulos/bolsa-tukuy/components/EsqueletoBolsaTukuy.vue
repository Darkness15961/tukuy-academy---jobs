<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<template>
  <div class="mx-auto max-w-360 px-5 py-10 lg:px-8">
    <Skeleton class="h-5 w-36" />
    <Skeleton class="mt-4 h-14 max-w-3xl" />
    <Skeleton class="mt-4 h-6 max-w-2xl" />
    <div class="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="item in 6" :key="item" class="border border-border bg-card p-6">
        <div class="flex justify-between">
          <Skeleton class="h-12 w-12" />
          <Skeleton class="h-7 w-32" />
        </div>
        <Skeleton class="mt-6 h-4 w-36" />
        <Skeleton class="mt-3 h-7 w-full" />
        <Skeleton class="mt-2 h-7 w-4/5" />
        <Skeleton class="mt-6 h-5 w-52" />
        <Skeleton class="mt-3 h-5 w-44" />
        <Skeleton class="mt-8 h-10 w-full" />
      </div>
    </div>
  </div>
</template>

