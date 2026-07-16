<script setup lang="ts">
import { ArrowLeft, CalendarDays, MapPin, UsersRound } from "lucide-vue-next";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useComunidad } from "../composables/useComunidad";

const router = useRouter();
const { eventos, cargando } = useComunidad();
const inscritos = ref(new Set<string>());

function inscribirme(eventoId: string) {
  inscritos.value = new Set([...inscritos.value, eventoId]);
}
</script>

<template>
  <main class="mx-auto max-w-320 px-5 py-10 lg:px-8 lg:py-14">
    <button
      type="button"
      class="inline-flex items-center gap-2 text-sm font-black text-muted-foreground"
      @click="router.push('/comunidad')"
    >
      <ArrowLeft class="h-4 w-4" />
      Volver a Comunidad
    </button>
    <p class="mt-10 text-xs font-black uppercase tracking-[.22em] text-primary">
      Aprender en compañía
    </p>
    <h1 class="mt-3 text-4xl font-black sm:text-5xl">Eventos y encuentros</h1>
    <p class="mt-4 max-w-2xl leading-7 text-muted-foreground">
      Sesiones prácticas y espacios para conectar con personas del sector.
    </p>

    <div v-if="cargando" class="mt-10 grid gap-6 lg:grid-cols-2">
      <Skeleton v-for="item in 4" :key="item" class="h-[500px] w-full" />
    </div>
    <div v-else class="mt-10 grid gap-6 lg:grid-cols-2">
      <article v-for="evento in eventos" :key="evento.id" class="border border-border bg-card">
        <img :src="evento.imagen" :alt="evento.titulo" class="aspect-[16/8] w-full object-cover" />
        <div class="p-7">
          <p class="text-xs font-black uppercase tracking-wide text-primary">
            {{ evento.organizador }}
          </p>
          <h2 class="mt-3 text-2xl font-black">{{ evento.titulo }}</h2>
          <p class="mt-3 text-sm leading-6 text-muted-foreground">{{ evento.descripcion }}</p>
          <div class="mt-6 grid gap-3 border-y border-border py-5 text-sm text-muted-foreground">
            <p class="flex items-center gap-2">
              <CalendarDays class="h-4 w-4 text-primary" />
              {{ evento.fecha }} · {{ evento.hora }}
            </p>
            <p class="flex items-center gap-2">
              <MapPin class="h-4 w-4 text-primary" />
              {{ evento.modalidad }}
            </p>
            <p class="flex items-center gap-2">
              <UsersRound class="h-4 w-4 text-primary" />
              {{ evento.inscritos }} personas inscritas
            </p>
          </div>
          <Button
            class="mt-6 w-full"
            :disabled="inscritos.has(evento.id)"
            @click="inscribirme(evento.id)"
          >
            {{ inscritos.has(evento.id) ? "Inscripción confirmada" : "Inscribirme" }}
          </Button>
        </div>
      </article>
    </div>
  </main>
</template>

