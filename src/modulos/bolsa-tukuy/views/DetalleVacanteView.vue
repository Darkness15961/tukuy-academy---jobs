<script setup lang="ts">
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-vue-next";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { vacantesService } from "../services/vacantes.service";
import type { Vacante } from "../types/vacante.types";

const route = useRoute();
const router = useRouter();
const vacante = ref<Vacante | null>(null);
const cargando = ref(true);
const postulando = ref(false);
const postulada = ref(false);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const vacanteId = String(route.params.vacanteId);
    const [detalle, postulaciones] = await Promise.all([
      vacantesService.obtenerPorId(vacanteId),
      vacantesService.obtenerPostulaciones(),
    ]);
    vacante.value = detalle;
    postulada.value = postulaciones.some((item) => item.vacanteId === vacanteId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "No pudimos cargar la vacante.";
  } finally {
    cargando.value = false;
  }
});

async function postular() {
  if (!vacante.value || postulada.value) return;
  postulando.value = true;
  try {
    await vacantesService.postular(vacante.value.id);
    postulada.value = true;
  } finally {
    postulando.value = false;
  }
}
</script>

<template>
  <main class="mx-auto max-w-320 px-5 py-10 lg:px-8 lg:py-14">
    <template v-if="cargando">
      <Skeleton class="h-5 w-40" />
      <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div class="border bg-card p-8">
          <Skeleton class="h-5 w-36" />
          <Skeleton class="mt-5 h-12 w-4/5" />
          <Skeleton class="mt-4 h-6 w-2/3" />
          <Skeleton class="mt-10 h-40 w-full" />
        </div>
        <Skeleton class="h-[480px] w-full" />
      </div>
    </template>

    <template v-else-if="vacante">
      <button
        type="button"
        class="inline-flex items-center gap-2 text-sm font-black text-muted-foreground hover:text-foreground"
        @click="router.push('/bolsa-tukuy')"
      >
        <ArrowLeft class="h-4 w-4" />
        Volver a la bolsa
      </button>

      <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section class="border border-border bg-card">
          <div class="border-b border-border p-7 sm:p-9">
            <div class="flex flex-wrap items-center gap-3">
              <span class="bg-primary px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
                {{ vacante.empresa }}
              </span>
              <span class="inline-flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400">
                <Sparkles class="h-3.5 w-3.5" />
                {{ vacante.compatibilidad }}% compatible
              </span>
            </div>
            <h1 class="mt-5 text-4xl font-black leading-tight sm:text-5xl">
              {{ vacante.titulo }}
            </h1>
            <div class="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span class="flex items-center gap-2">
                <MapPin class="h-4 w-4 text-primary" />
                {{ vacante.ubicacion }} · {{ vacante.modalidad }}
              </span>
              <span class="flex items-center gap-2">
                <BriefcaseBusiness class="h-4 w-4 text-primary" />
                {{ vacante.tipoContrato }}
              </span>
              <span class="flex items-center gap-2">
                <CalendarDays class="h-4 w-4 text-primary" />
                Cierra {{ vacante.cierreTexto }}
              </span>
            </div>
          </div>

          <div class="grid gap-9 p-7 sm:p-9">
            <div>
              <h2 class="text-2xl font-black">Sobre la oportunidad</h2>
              <p class="mt-4 leading-7 text-muted-foreground">{{ vacante.descripcion }}</p>
            </div>
            <div>
              <h2 class="text-2xl font-black">Responsabilidades</h2>
              <ul class="mt-4 grid gap-3">
                <li
                  v-for="responsabilidad in vacante.responsabilidades"
                  :key="responsabilidad"
                  class="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                >
                  <Check class="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  {{ responsabilidad }}
                </li>
              </ul>
            </div>
            <div>
              <h2 class="text-2xl font-black">Lo que buscamos</h2>
              <ul class="mt-4 grid gap-3">
                <li
                  v-for="requisito in vacante.requisitos"
                  :key="requisito"
                  class="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                >
                  <Check class="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  {{ requisito }}
                </li>
              </ul>
            </div>
          </div>
        </section>

        <aside class="self-start border-t-4 border-accent bg-[#07152B] p-7 text-white lg:sticky lg:top-28">
          <p class="text-xs font-black uppercase tracking-[.2em] text-accent">
            Tu postulación
          </p>
          <p v-if="vacante.salario" class="mt-4 text-2xl font-black">{{ vacante.salario }}</p>
          <p class="mt-5 text-sm leading-6 text-white/65">
            Adjuntaremos tu perfil laboral, experiencia y certificados verificables.
          </p>

          <div class="mt-6 grid gap-3 border-y border-white/15 py-6">
            <p class="flex items-center gap-2 text-sm text-white/75">
              <Award class="h-4 w-4 text-accent" />
              Certificados conectados
            </p>
            <p class="flex items-center gap-2 text-sm text-white/75">
              <ShieldCheck class="h-4 w-4 text-accent" />
              Datos compartidos con tu autorización
            </p>
          </div>

          <Button
            class="mt-6 h-13 w-full bg-accent text-foreground hover:bg-amber-400"
            :disabled="postulando || postulada"
            @click="postular"
          >
            <LoaderCircle v-if="postulando" class="h-4 w-4 animate-spin" />
            <CheckCircle2 v-else-if="postulada" class="h-4 w-4" />
            {{ postulada ? "Postulación enviada" : "Postular con mi perfil" }}
          </Button>
        </aside>
      </div>
    </template>

    <div v-else class="border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 p-8 text-center">
      <p class="font-black text-red-800 dark:text-red-300">{{ error ?? "Vacante no encontrada." }}</p>
      <Button class="mt-5" @click="router.push('/bolsa-tukuy')">Volver a la bolsa</Button>
    </div>
  </main>
</template>

