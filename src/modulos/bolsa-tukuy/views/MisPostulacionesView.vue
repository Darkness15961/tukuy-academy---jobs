<script setup lang="ts">
import { ArrowLeft, BriefcaseBusiness, CalendarDays } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { vacantesService } from "../services/vacantes.service";
import type { Postulacion, Vacante } from "../types/vacante.types";

const router = useRouter();
const postulaciones = ref<Postulacion[]>([]);
const vacantes = ref<Vacante[]>([]);
const cargando = ref(true);

const filas = computed(() =>
  postulaciones.value.map((postulacion) => ({
    postulacion,
    vacante: vacantes.value.find((item) => item.id === postulacion.vacanteId),
  })),
);

const textosEstado: Record<Postulacion["estado"], string> = {
  enviada: "Enviada",
  en_revision: "En revisión",
  preseleccionada: "Preseleccionada",
  entrevista: "Entrevista",
  finalizada: "Finalizada",
  no_seleccionada: "No seleccionada",
};

onMounted(async () => {
  [postulaciones.value, vacantes.value] = await Promise.all([
    vacantesService.obtenerPostulaciones(),
    vacantesService.obtenerTodas(),
  ]);
  cargando.value = false;
});
</script>

<template>
  <main class="mx-auto max-w-295 px-5 py-10 lg:px-8 lg:py-14">
    <button
      type="button"
      class="inline-flex items-center gap-2 text-sm font-black text-muted-foreground"
      @click="router.push('/bolsa-tukuy')"
    >
      <ArrowLeft class="h-4 w-4" />
      Volver a la bolsa
    </button>

    <p class="mt-10 text-xs font-black uppercase tracking-[.22em] text-primary">
      Seguimiento personal
    </p>
    <h1 class="mt-3 text-4xl font-black sm:text-5xl">Mis postulaciones</h1>
    <p class="mt-4 text-muted-foreground">
      Revisa el avance de cada oportunidad desde un solo lugar.
    </p>

    <div v-if="cargando" class="mt-9 grid gap-3">
      <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
    </div>

    <div v-else-if="filas.length" class="mt-9 grid gap-3">
      <article
        v-for="fila in filas"
        :key="fila.postulacion.id"
        class="grid gap-5 border border-border bg-card p-6 md:grid-cols-[auto_1fr_auto] md:items-center"
      >
        <span class="grid h-12 w-12 place-items-center bg-primary/10 text-primary">
          <BriefcaseBusiness class="h-5 w-5" />
        </span>
        <div>
          <p class="text-xs font-black uppercase tracking-wide text-primary">
            {{ fila.vacante?.empresa ?? "Empresa" }}
          </p>
          <h2 class="mt-1 text-lg font-black">
            {{ fila.vacante?.titulo ?? "Vacante" }}
          </h2>
          <p class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays class="h-3.5 w-3.5" />
            Postulación {{ new Date(fila.postulacion.fecha).toLocaleDateString("es-PE") }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="bg-accent/20 px-3 py-1.5 text-xs font-black text-amber-800 dark:text-amber-300">
            {{ textosEstado[fila.postulacion.estado] }}
          </span>
          <Button
            variant="outline"
            size="sm"
            @click="router.push(`/bolsa-tukuy/vacantes/${fila.postulacion.vacanteId}`)"
          >
            Ver
          </Button>
        </div>
      </article>
    </div>

    <div v-else class="mt-9 border border-border bg-card p-12 text-center">
      <BriefcaseBusiness class="mx-auto h-10 w-10 text-primary" />
      <h2 class="mt-5 text-2xl font-black">Aún no tienes postulaciones</h2>
      <p class="mt-2 text-muted-foreground">Explora oportunidades compatibles con tu perfil.</p>
      <Button class="mt-6" @click="router.push('/bolsa-tukuy')">Explorar vacantes</Button>
    </div>
  </main>
</template>

