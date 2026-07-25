<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { computed } from "vue";

import CarruselCursos from "@/components/shared/CarruselCursos.vue";
import PortadaCurso from "@/components/shared/PortadaCurso.vue";
import SelectorFiltro from "@/components/shared/SelectorFiltro.vue";
import TarjetaCursoTendencia from "@/components/shared/TarjetaCursoTendencia.vue";
import EsqueletoCursoTendencia from "@/components/shared/EsqueletoCursoTendencia.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Input } from "@/components/ui/input";
import { usePortalContext } from "../composables/usePortalContext";
import type {
  AccesoCursoFilter,
  FuenteCursoFilter,
  PricingFilter,
} from "../composables/usePortalContext";

const portal = usePortalContext();

const opcionesFuente = computed(() => [
  {
    valor: "all" as FuenteCursoFilter,
    etiqueta: `Toda la fuente (${portal.contadoresCatalogo.value.total})`,
  },
  {
    valor: "tukuy" as FuenteCursoFilter,
    etiqueta: `Tukuy Academy (${portal.contadoresCatalogo.value.tukuy})`,
  },
  {
    valor: "entidad" as FuenteCursoFilter,
    etiqueta: `Entidades (${portal.contadoresCatalogo.value.entidad})`,
  },
]);

const opcionesAcceso = computed(() => [
  {
    valor: "all" as AccesoCursoFilter,
    etiqueta: "Todo el acceso",
  },
  {
    valor: "publico" as AccesoCursoFilter,
    etiqueta: `Públicos (${portal.contadoresCatalogo.value.publico})`,
  },
  {
    valor: "restringido" as AccesoCursoFilter,
    etiqueta: `Restringidos (${portal.contadoresCatalogo.value.restringido})`,
  },
]);

const opcionesPrecio = computed(() => [
  { valor: "all" as PricingFilter, etiqueta: "Cualquier precio" },
  { valor: "free" as PricingFilter, etiqueta: "Gratis" },
  { valor: "paid" as PricingFilter, etiqueta: "De pago" },
]);

const resumenFiltros = computed(() => {
  const partes: string[] = [];
  if (portal.fuenteFilter.value === "tukuy") partes.push("Tukuy Academy");
  if (portal.fuenteFilter.value === "entidad") partes.push("Entidades");
  if (portal.accesoFilter.value === "publico") partes.push("Públicos");
  if (portal.accesoFilter.value === "restringido") partes.push("Restringidos");
  if (portal.pricingFilter.value === "free") partes.push("Gratis");
  if (portal.pricingFilter.value === "paid") partes.push("De pago");
  return partes.length ? partes.join(" · ") : "Catálogo completo";
});
</script>

<template>
  <PortalSection wide>
    <PortadaCurso
      :courses="portal.topCourses.value"
      :interval-ms="5000"
      @add-to-cart="portal.handleAddToCart"
      @continue-course="
        (id) => {
          const c = portal.courses.value.find((x) => x.id === id);
          if (c) portal.openSimuladorCurso(c);
        }
      "
    />

    <div
      v-if="portal.mensajeAccesoCurso.value"
      class="flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-accent bg-accent/10 px-5 py-4 text-sm font-semibold text-foreground"
      role="status"
    >
      <span>{{ portal.mensajeAccesoCurso.value }}</span>
      <button
        type="button"
        class="text-primary underline-offset-2 hover:underline"
        @click="portal.irAlCarrito()"
      >
        Ver carrito
      </button>
    </div>

    <CarruselCursos
      subtitle="Formación especializada"
      title="Cursos destacados"
    >
      <template v-if="portal.coursesLoading.value">
        <EsqueletoCursoTendencia v-for="i in 6" :key="i" />
      </template>
      <TarjetaCursoTendencia
        v-for="course in portal.featuredCourses.value"
        v-else
        :key="course.id"
        :course="course"
        :show-detail="false"
        :in-cart="portal.isInCart(course.id)"
        :is-favorite="portal.isFavorite(course.id)"
        @add-to-cart="portal.handleAddToCart(course.id)"
        @continue-course="portal.openSimuladorCurso(course)"
        @select="portal.verDetalleCurso(course)"
        @toggle-favorite="portal.toggleFavorite(course.id)"
      />
    </CarruselCursos>

    <section class="grid w-full gap-6 text-left">
      <div
        class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="max-w-3xl">
          <p
            class="text-sm font-black uppercase tracking-[.25em] text-primary"
          >
            Rutas formativas
          </p>
          <h2 class="mt-3 text-3xl font-black text-foreground sm:text-4xl">
            Catálogo Tukuy y cursos de entidades
          </h2>
          <p class="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Oferta de Tukuy Academy, cursos públicos de organizaciones y
            formaciones con acceso restringido.
          </p>
        </div>
        <p class="shrink-0 text-sm font-semibold text-muted-foreground">
          {{ portal.contadoresCatalogo.value.total }} cursos ·
          {{ portal.contadoresCatalogo.value.entidad }} de entidades ·
          {{ portal.contadoresCatalogo.value.restringido }} restringidos
        </p>
      </div>

      <div
        class="flex flex-col gap-3 border border-border bg-card p-3 sm:p-4 lg:flex-row lg:items-center"
      >
        <label class="relative min-w-0 flex-1">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="portal.searchTerm.value"
            class="h-11 rounded-none border-border bg-background pl-10"
            type="search"
            placeholder="Buscar curso, entidad o categoría..."
            aria-label="Buscar cursos"
          />
        </label>

        <div
          class="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[min(36rem,100%)] lg:shrink-0"
        >
          <SelectorFiltro
            v-model="portal.fuenteFilter.value"
            :opciones="opcionesFuente"
            ariaLabel="Filtrar por fuente"
          />
          <SelectorFiltro
            v-model="portal.accesoFilter.value"
            :opciones="opcionesAcceso"
            ariaLabel="Filtrar por acceso"
          />
          <SelectorFiltro
            v-model="portal.pricingFilter.value"
            :opciones="opcionesPrecio"
            ariaLabel="Filtrar por precio"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">
          <span class="font-bold text-foreground">{{
            portal.catalogCourses.value.length
          }}</span>
          resultado(s) · {{ resumenFiltros }}
        </p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaCursoTendencia
          v-for="course in portal.catalogCourses.value"
          :key="`catalog-${course.id}`"
          fluid
          :course="course"
          :in-cart="portal.isInCart(course.id)"
          :is-favorite="portal.isFavorite(course.id)"
          @add-to-cart="portal.handleAddToCart(course.id)"
          @continue-course="portal.openSimuladorCurso(course)"
          @select="portal.verDetalleCurso(course)"
          @toggle-favorite="portal.toggleFavorite(course.id)"
        />
      </div>

      <div
        v-if="!portal.catalogCourses.value.length"
        class="border border-border bg-card py-12 text-center text-sm text-muted-foreground"
      >
        No encontramos cursos con ese filtro. Prueba otra combinación.
      </div>
    </section>
  </PortalSection>
</template>
