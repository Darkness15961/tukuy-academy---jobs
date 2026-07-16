<script setup lang="ts">
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
</script>

<template>
  <Card class="shadow-none">
    <CardContent class="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
      <div class="grid gap-3">
        <Skeleton class="h-6 w-28" />
        <Skeleton class="h-7 w-4/5" />
        <Skeleton class="h-4 w-3/5" />
        <div class="flex flex-wrap gap-2">
          <Skeleton class="h-6 w-20 rounded-full" />
          <Skeleton class="h-6 w-24 rounded-full" />
          <Skeleton class="h-6 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton class="h-10 w-32" />
    </CardContent>
  </Card>
</template>
