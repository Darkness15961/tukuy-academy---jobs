<script setup lang="ts">
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import EsqueletoTarjetaCurso from "@/components/shared/EsqueletoTarjetaCurso.vue";
</script>

<template>
  <div class="mx-auto grid max-w-7xl gap-8 px-5 py-7 lg:py-10">
    <Card class="overflow-hidden shadow-sm">
      <div class="grid lg:grid-cols-[1.05fr_0.95fr]">
        <CardContent class="grid gap-6 p-6 sm:p-9 lg:p-12">
          <div class="flex gap-2">
            <Skeleton class="h-6 w-28 rounded-full" />
            <Skeleton class="h-6 w-36 rounded-full" />
          </div>
          <Skeleton class="h-12 w-full" />
          <Skeleton class="h-20 w-4/5" />
          <Skeleton class="h-12 w-full max-w-2xl" />
          <div class="flex gap-3">
            <Skeleton class="h-11 w-40" />
            <Skeleton class="h-11 w-44" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <Skeleton class="h-16 w-full" />
            <Skeleton class="h-16 w-full" />
            <Skeleton class="h-16 w-full" />
          </div>
        </CardContent>
        <CardContent class="hidden p-6 lg:grid">
          <Skeleton class="h-full min-h-[420px] w-full rounded-lg" />
        </CardContent>
      </div>
    </Card>

    <div class="grid gap-4 md:grid-cols-3">
      <Card v-for="i in 3" :key="i" class="shadow-none">
        <CardContent class="grid gap-3 p-6">
          <Skeleton class="h-5 w-5" />
          <Skeleton class="h-6 w-2/3" />
          <Skeleton class="h-16 w-full" />
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="grid gap-4">
        <Skeleton class="h-8 w-48" />
        <div class="grid gap-4 md:grid-cols-2">
          <EsqueletoTarjetaCurso v-for="i in 4" :key="i" />
        </div>
      </div>
      <div class="grid gap-4">
        <Card class="shadow-none">
          <CardContent class="grid gap-4 p-6">
            <Skeleton class="h-6 w-1/3" />
            <Skeleton class="h-4 w-2/3" />
            <Skeleton class="h-3 w-full" />
            <Skeleton class="h-3 w-full" />
            <Skeleton class="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
