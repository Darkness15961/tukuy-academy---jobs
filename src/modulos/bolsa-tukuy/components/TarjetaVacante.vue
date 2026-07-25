<script setup lang="ts">
import {
  ArrowRight,
  CalendarDays,
  Building2,
  Globe2,
  MapPin,
  Sparkles,
} from "lucide-vue-next";

import { Button } from "@/components/ui/button";
import LogoEmpleador from "./LogoEmpleador.vue";
import { etiquetaOrigen, type Vacante } from "../types/vacante.types";

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
    <div
      class="h-1.5"
      :class="
        vacante.empleador.origen === 'plataforma' ? 'bg-primary' : 'bg-accent'
      "
    />
    <div class="flex flex-1 flex-col p-6">
      <div class="flex items-start justify-between gap-4">
        <LogoEmpleador :empleador="vacante.empleador" />
        <span
          class="inline-flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400"
        >
          <Sparkles class="h-3.5 w-3.5" />
          {{ vacante.compatibilidad }}% compatible
        </span>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <p class="text-xs font-black uppercase tracking-[.16em] text-primary">
          {{ vacante.empleador.nombre }}
        </p>
        <span
          class="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          :class="
            vacante.empleador.origen === 'plataforma'
              ? 'border-primary/25 bg-primary/10 text-primary'
              : 'border-border bg-muted text-muted-foreground'
          "
        >
          <Building2
            v-if="vacante.empleador.origen === 'plataforma'"
            class="h-3 w-3"
          />
          <Globe2 v-else class="h-3 w-3" />
          {{
            vacante.empleador.origen === "plataforma"
              ? "Interna"
              : vacante.empleador.fuenteExterna ?? "Externa"
          }}
        </span>
      </div>
      <h2 class="mt-2 text-xl font-black leading-7 text-foreground">
        {{ vacante.titulo }}
      </h2>
      <p class="mt-2 text-xs text-muted-foreground">
        {{ etiquetaOrigen(vacante.empleador.origen) }}
        <template v-if="vacante.empleador.fuenteExterna">
          · vía {{ vacante.empleador.fuenteExterna }}
        </template>
      </p>

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
