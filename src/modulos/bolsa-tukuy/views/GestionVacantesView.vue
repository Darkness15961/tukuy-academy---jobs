<script setup lang="ts">
import { BriefcaseBusiness, Eye, FileEdit, Plus, UsersRound } from "lucide-vue-next";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import EsqueletoBolsaTukuy from "../components/EsqueletoBolsaTukuy.vue";
import { useVacantes } from "../composables/useVacantes";

const router = useRouter();
const { vacantes, cargando } = useVacantes();
</script>

<template>
  <EsqueletoBolsaTukuy v-if="cargando" />
  <main v-else class="mx-auto max-w-320 px-5 py-10 lg:px-8 lg:py-14">
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="text-xs font-black uppercase tracking-[.22em] text-primary">
          Herramientas empresariales
        </p>
        <h1 class="mt-3 text-4xl font-black sm:text-5xl">Gestión de vacantes</h1>
        <p class="mt-4 text-muted-foreground">
          Publica oportunidades y revisa el interés generado en la comunidad.
        </p>
      </div>
      <Button class="bg-primary text-white" disabled>
        <Plus class="h-4 w-4" />
        Nueva vacante
      </Button>
    </div>

    <div class="mt-10 grid gap-4 sm:grid-cols-3">
      <div class="border-l-4 border-primary bg-card p-6">
        <BriefcaseBusiness class="h-5 w-5 text-primary" />
        <strong class="mt-4 block text-3xl font-black">{{ vacantes.length }}</strong>
        <span class="text-sm text-muted-foreground">Vacantes publicadas</span>
      </div>
      <div class="border-l-4 border-accent bg-card p-6">
        <UsersRound class="h-5 w-5 text-primary" />
        <strong class="mt-4 block text-3xl font-black">186</strong>
        <span class="text-sm text-muted-foreground">Postulaciones recibidas</span>
      </div>
      <div class="border-l-4 border-emerald-600 bg-card p-6">
        <Eye class="h-5 w-5 text-primary" />
        <strong class="mt-4 block text-3xl font-black">2 840</strong>
        <span class="text-sm text-muted-foreground">Visualizaciones</span>
      </div>
    </div>

    <section class="mt-8 border border-border bg-card">
      <div class="border-b border-border p-6">
        <h2 class="text-xl font-black">Vacantes de la organización</h2>
      </div>
      <div class="divide-y divide-border">
        <article
          v-for="vacante in vacantes.slice(0, 8)"
          :key="vacante.id"
          class="grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-center"
        >
          <div>
            <p class="font-black">{{ vacante.titulo }}</p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ vacante.ubicacion }} · cierra {{ vacante.cierreTexto }}
            </p>
          </div>
          <span class="bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            Publicada
          </span>
          <div class="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              @click="router.push(`/bolsa-tukuy/vacantes/${vacante.id}`)"
            >
              <Eye class="h-4 w-4" />
              Ver
            </Button>
            <Button size="sm" variant="ghost" disabled>
              <FileEdit class="h-4 w-4" />
            </Button>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

