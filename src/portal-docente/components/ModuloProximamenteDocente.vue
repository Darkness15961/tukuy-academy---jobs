<script setup lang="ts">
import type { Component } from "vue";
import { Construction } from "lucide-vue-next";
import { Card, CardContent } from "@/components/ui/card";

withDefaults(
  defineProps<{
    titulo: string;
    descripcion?: string;
    icono?: Component;
  }>(),
  {
    descripcion:
      "Este módulo aún no está conectado a datos reales. Lo habilitaremos en una siguiente fase (sin datos de demostración).",
    icono: Construction,
  },
);
</script>

<template>
  <section class="mx-auto grid max-w-3xl gap-6 py-6">
    <Card class="border-dashed">
      <CardContent class="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div
          class="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground"
        >
          <component :is="icono" class="h-7 w-7" />
        </div>
        <div class="grid gap-2">
          <h1 class="text-2xl font-black text-foreground">{{ titulo }}</h1>
          <p class="mx-auto max-w-lg text-sm text-muted-foreground">
            {{ descripcion }}
          </p>
        </div>
        <p
          class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300"
        >
          Próximamente
        </p>
      </CardContent>
    </Card>
  </section>
</template>
