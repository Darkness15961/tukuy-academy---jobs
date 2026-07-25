<script setup lang="ts">
import {
  BadgeCheck,
  Building2,
  MapPin,
  Search,
  UsersRound,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { entidadesComunidadService } from "../services/entidades.service";
import type {
  EntidadPublicaComunidad,
  TipoEntidadPublica,
} from "../types/entidad-publica.types";

const router = useRouter();
const cargando = ref(true);
const error = ref<string | null>(null);
const entidades = ref<EntidadPublicaComunidad[]>([]);
const buscar = ref("");
const tipoFiltro = ref<TipoEntidadPublica | "TODAS">("TODAS");
const regionFiltro = ref("TODAS");

const opcionesTipo: { valor: TipoEntidadPublica | "TODAS"; etiqueta: string }[] =
  [
    { valor: "TODAS", etiqueta: "Todas" },
    { valor: "COLEGIO", etiqueta: "Colegios" },
    { valor: "EMPRESA", etiqueta: "Empresas" },
    { valor: "ACADEMIA", etiqueta: "Academias" },
    { valor: "INSTITUCION", etiqueta: "Instituciones" },
    { valor: "ONG", etiqueta: "ONG" },
  ];

const regiones = computed(() => {
  const set = new Set(entidades.value.map((item) => item.region));
  return ["TODAS", ...[...set].sort((a, b) => a.localeCompare(b, "es"))];
});

const visibles = computed(() => {
  const texto = buscar.value.trim().toLowerCase();
  return entidades.value.filter((entidad) => {
    const coincideTipo =
      tipoFiltro.value === "TODAS" || entidad.tipo === tipoFiltro.value;
    const coincideRegion =
      regionFiltro.value === "TODAS" || entidad.region === regionFiltro.value;
    const coincideTexto =
      !texto ||
      [
        entidad.nombre,
        entidad.descripcionCorta,
        entidad.sector,
        entidad.ciudad,
        ...entidad.etiquetas,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    return coincideTipo && coincideRegion && coincideTexto;
  });
});

function etiquetaTipo(tipo: TipoEntidadPublica) {
  return (
    opcionesTipo.find((item) => item.valor === tipo)?.etiqueta ?? tipo
  );
}

onMounted(async () => {
  try {
    entidades.value = await entidadesComunidadService.listar();
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No pudimos cargar las entidades.";
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <main>
    <section class="bg-[#07152B] text-white">
      <div class="mx-auto max-w-360 px-5 py-12 lg:px-8 lg:py-16">
        <p class="text-xs font-black uppercase tracking-[.25em] text-accent">
          Ecosistema Tukuy · Comunidad
        </p>
        <h1 class="mt-4 max-w-4xl text-4xl font-black leading-tight sm:text-5xl">
          Explorar entidades
        </h1>
        <p class="mt-5 max-w-2xl text-base leading-7 text-blue-100">
          Descubre colegios, empresas, academias e instituciones que publican en
          Comunidad. Entra a su perfil para unirte o contactarlas.
        </p>
      </div>
    </section>

    <div class="mx-auto max-w-360 px-5 py-10 lg:px-8 lg:py-14">
      <div class="grid gap-3 border border-border bg-card p-4 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
        <label class="grid gap-1.5">
          <span class="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
            Buscar
          </span>
          <div class="relative">
            <Search class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              v-model="buscar"
              class="filtro-control h-11 w-full border border-border bg-background pr-3 pl-10 text-sm outline-none"
              placeholder="Nombre, sector o ciudad"
            />
          </div>
        </label>
        <label class="grid gap-1.5">
          <span class="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
            Tipo
          </span>
          <select
            v-model="tipoFiltro"
            class="filtro-control h-11 w-full border border-border bg-background px-3 text-sm"
          >
            <option
              v-for="opcion in opcionesTipo"
              :key="opcion.valor"
              :value="opcion.valor"
            >
              {{ opcion.etiqueta }}
            </option>
          </select>
        </label>
        <label class="grid gap-1.5">
          <span class="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
            Región
          </span>
          <select
            v-model="regionFiltro"
            class="filtro-control h-11 w-full border border-border bg-background px-3 text-sm"
          >
            <option v-for="region in regiones" :key="region" :value="region">
              {{ region === "TODAS" ? "Todas las regiones" : region }}
            </option>
          </select>
        </label>
      </div>

      <p class="mt-4 text-sm text-muted-foreground">
        {{ visibles.length }} entidades encontradas
      </p>

      <div v-if="cargando" class="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton v-for="item in 6" :key="item" class="h-80 w-full" />
      </div>
      <div
        v-else-if="error"
        class="mt-8 border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
      >
        {{ error }}
      </div>
      <div v-else-if="!visibles.length" class="mt-8 border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
        <Building2 class="mx-auto h-8 w-8 text-muted-foreground" />
        <p class="mt-4 font-black">No hay entidades con esos filtros</p>
        <p class="mt-2 text-sm text-muted-foreground">Prueba otra búsqueda o limpia los filtros.</p>
      </div>
      <div v-else class="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="entidad in visibles"
          :key="entidad.id"
          class="flex flex-col border border-border bg-card"
        >
          <div class="relative aspect-[16/7] overflow-hidden bg-muted">
            <img
              :src="entidad.portada"
              :alt="entidad.nombre"
              class="h-full w-full object-cover"
            />
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07152B]/90 to-transparent p-4 pt-12">
              <span class="inline-flex items-center gap-1 bg-accent px-2 py-1 text-[10px] font-black tracking-wide text-[#07152B] uppercase">
                {{ etiquetaTipo(entidad.tipo) }}
              </span>
            </div>
          </div>
          <div class="flex flex-1 flex-col p-5">
            <div class="flex items-start gap-3">
              <img
                :src="entidad.logo"
                :alt="`Logo ${entidad.nombre}`"
                class="h-12 w-12 shrink-0 border border-border bg-white object-contain p-1"
              />
              <div class="min-w-0">
                <h2 class="flex items-center gap-1.5 text-lg font-black leading-snug">
                  <span class="truncate">{{ entidad.nombre }}</span>
                  <BadgeCheck
                    v-if="entidad.verificada"
                    class="h-4 w-4 shrink-0 text-primary"
                    aria-label="Verificada"
                  />
                </h2>
                <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin class="h-3.5 w-3.5" />
                  {{ entidad.ciudad }} · {{ entidad.sector }}
                </p>
              </div>
            </div>
            <p class="mt-4 min-h-16 text-sm leading-6 text-muted-foreground">
              {{ entidad.descripcionCorta }}
            </p>
            <p class="mt-4 flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <UsersRound class="h-4 w-4 text-primary" />
              {{ entidad.miembros.toLocaleString("es-PE") }} miembros ·
              {{ entidad.publicaciones }} publicaciones
            </p>
            <div class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-for="etiqueta in entidad.etiquetas.slice(0, 3)"
                :key="etiqueta"
                class="bg-primary/8 px-2 py-1 text-[10px] font-bold text-primary"
              >
                {{ etiqueta }}
              </span>
            </div>
            <Button
              class="mt-5 w-full"
              @click="router.push(`/comunidad/entidades/${entidad.id}`)"
            >
              Ver perfil
            </Button>
          </div>
        </article>
      </div>
    </div>
  </main>
</template>
