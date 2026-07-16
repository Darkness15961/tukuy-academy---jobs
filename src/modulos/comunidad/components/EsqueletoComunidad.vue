<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<template>
  <div class="grid gap-5">
    <article v-for="item in 3" :key="item" class="border border-border bg-card p-6">
      <div class="flex gap-4">
        <Skeleton class="h-12 w-12 shrink-0" />
        <div class="flex-1">
          <Skeleton class="h-5 w-44" />
          <Skeleton class="mt-2 h-4 w-64" />
        </div>
      </div>
      <Skeleton class="mt-6 h-5 w-full" />
      <Skeleton class="mt-3 h-5 w-5/6" />
      <Skeleton class="mt-5 aspect-[16/7] w-full" />
    </article>
  </div>
</template>

