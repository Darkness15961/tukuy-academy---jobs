<script setup lang="ts">
import { Search } from "lucide-vue-next";

import CarruselCursos from "@/components/shared/CarruselCursos.vue";
import PortadaCurso from "@/components/shared/PortadaCurso.vue";
import TarjetaCursoTendencia from "@/components/shared/TarjetaCursoTendencia.vue";
import EsqueletoCursoTendencia from "@/components/shared/EsqueletoCursoTendencia.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortalContext } from "../composables/usePortalContext";

const portal = usePortalContext();
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
        @select="portal.openSimuladorCurso(course)"
        @toggle-favorite="portal.toggleFavorite(course.id)"
      />
    </CarruselCursos>

    <section class="grid w-full gap-6 text-left">
      <div class="max-w-4xl">
        <p
          class="text-sm font-black uppercase tracking-[.25em] text-primary"
        >
          Rutas formativas
        </p>
        <h2 class="mt-3 text-3xl font-black text-foreground sm:text-4xl">
          Habilidades para transformar la gestión de obras y tu carrera
          profesional
        </h2>
        <p class="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Explora el catálogo completo, filtra por modalidad de acceso y
          continúa tu formación conectada a Tukuy Obra.
        </p>
      </div>

      <div
        class="flex w-full flex-col items-stretch gap-4 border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div class="relative w-full flex-1 sm:max-w-md">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="portal.searchTerm.value"
            class="h-11 rounded-none border-border bg-background pl-10"
            type="search"
            placeholder="Buscar por título, categoría o nivel..."
          />
        </div>
        <div class="flex flex-wrap gap-2 sm:justify-end">
          <Button
            class="rounded-none"
            :class="
              portal.pricingFilter.value === 'all'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border bg-card text-foreground'
            "
            :variant="
              portal.pricingFilter.value === 'all' ? 'default' : 'outline'
            "
            size="sm"
            @click="portal.pricingFilter.value = 'all'"
          >
            Todos
          </Button>
          <Button
            class="rounded-none"
            :class="
              portal.pricingFilter.value === 'free'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border bg-card text-foreground'
            "
            :variant="
              portal.pricingFilter.value === 'free' ? 'default' : 'outline'
            "
            size="sm"
            @click="portal.pricingFilter.value = 'free'"
          >
            Gratis
          </Button>
          <Button
            class="rounded-none"
            :class="
              portal.pricingFilter.value === 'paid'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border bg-card text-foreground'
            "
            :variant="
              portal.pricingFilter.value === 'paid' ? 'default' : 'outline'
            "
            size="sm"
            @click="portal.pricingFilter.value = 'paid'"
          >
            De pago
          </Button>
        </div>
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
          @select="portal.openSimuladorCurso(course)"
          @toggle-favorite="portal.toggleFavorite(course.id)"
        />
      </div>

      <div
        v-if="!portal.catalogCourses.value.length"
        class="border border-border bg-card py-12 text-center text-sm text-muted-foreground"
      >
        No encontramos cursos con ese filtro. Prueba con otra palabra o vuelve
        a mostrar todos.
      </div>
    </section>
  </PortalSection>
</template>
