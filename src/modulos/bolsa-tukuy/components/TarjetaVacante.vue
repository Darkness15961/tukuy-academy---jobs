<script setup lang="ts">
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  Sparkles,
} from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import type { Vacante } from "../types/vacante.types";

defineProps<{
  vacante: Vacante;
  postulada?: boolean;
}>();

const emit = defineEmits<{
  ver: [vacanteId: string];
  postular: [vacanteId: string];
}>();
</script>

<template>
  <article
    class="group flex h-full flex-col border border-border bg-card transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_50px_rgba(7,21,43,.10)]"
  >
    <div class="h-1.5 bg-primary" />
    <div class="flex flex-1 flex-col p-6">
      <div class="flex items-start justify-between gap-4">
        <span class="grid h-12 w-12 shrink-0 place-items-center bg-primary/10 text-primary">
          <BriefcaseBusiness class="h-5 w-5" />
        </span>
        <span
          class="inline-flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400"
        >
          <Sparkles class="h-3.5 w-3.5" />
          {{ vacante.compatibilidad }}% compatible
        </span>
      </div>

      <p class="mt-5 text-xs font-black uppercase tracking-[.16em] text-primary">
        {{ vacante.empresa }}
      </p>
      <h2 class="mt-2 text-xl font-black leading-7 text-foreground">
        {{ vacante.titulo }}
      </h2>

      <div class="mt-5 grid gap-2 text-sm text-muted-foreground">
        <p class="flex items-center gap-2">
          <MapPin class="h-4 w-4 text-primary" />
          {{ vacante.ubicacion }} · {{ vacante.modalidad }}
        </p>
        <p class="flex items-center gap-2">
          <CalendarDays class="h-4 w-4 text-primary" />
          Cierra {{ vacante.cierreTexto }}
        </p>
      </div>

      <div class="mt-5 flex flex-wrap gap-2">
        <span
          v-for="etiqueta in vacante.etiquetas.slice(0, 3)"
          :key="etiqueta"
          class="border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
        >
          {{ etiqueta }}
        </span>
      </div>

      <div class="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-7">
        <Button
          class="justify-between bg-accent text-accent-foreground hover:bg-accent/90"
          @click="emit('ver', vacante.id)"
        >
          Ver oportunidad
          <ArrowRight class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          :disabled="postulada"
          @click="emit('postular', vacante.id)"
        >
          {{ postulada ? "Postulado" : "Postular" }}
        </Button>
      </div>
    </div>
  </article>
</template>

