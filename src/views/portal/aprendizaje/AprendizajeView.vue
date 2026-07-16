<script setup lang="ts">
import { ChevronDown, Search } from "lucide-vue-next";
import { computed, ref } from "vue";

import TarjetaCursoTendencia from "@/components/shared/TarjetaCursoTendencia.vue";
import EsqueletoCursoTendencia from "@/components/shared/EsqueletoCursoTendencia.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { usePortalContext } from "../composables/usePortalContext";

const portal = usePortalContext();

const searchTerm = ref("");

const learningCourses = computed(() => {
  const base =
    portal.enrolledCourses.value.length >= 8
      ? portal.enrolledCourses.value
      : portal.courses.value;
  const term = searchTerm.value.trim().toLowerCase();
  return term
    ? base.filter((course) =>
        [course.title, course.category, course.level, course.mode].some(
          (value) => value.toLowerCase().includes(term),
        ),
      )
    : base;
});
</script>

<template>
  <PortalSection wide :centered="false">
    <section class="grid gap-7">
      <div
        class="border border-border border-l-4 border-l-[#F5B400] bg-[#F7F9FE] p-6 shadow-[0_14px_34px_-30px_rgba(7,31,82,0.65)] lg:p-8"
      >
        <div
          class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <Badge
              class="border-[#F5B400]/40 bg-[#F5B400]/15 text-primary"
              variant="outline"
            >
              Mi aprendizaje
            </Badge>
            <h1
              class="mt-4 text-3xl font-black tracking-normal text-foreground sm:text-4xl"
            >
              Continúa tus cursos y rutas de obra
            </h1>
            <p
              class="mt-3 max-w-3xl text-sm leading-7 text-[#41516A] sm:text-base"
            >
              Revisa tu progreso, retoma cursos activos y fortalece competencias
              conectadas a Tukuy Obra, CV inteligente y bolsa laboral.
            </p>
          </div>

          <div
            class="grid gap-2 border border-border border-t-2 border-t-[#0B3A78] bg-card p-4 shadow-sm sm:min-w-64"
          >
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-muted-foreground">Avance global</span>
              <strong>{{ portal.user.value?.profileProgress ?? 82 }}%</strong>
            </div>
            <Progress
              :model-value="portal.user.value?.profileProgress ?? 82"
              class="h-2.5"
            />
            <p class="text-xs text-muted-foreground">
              {{ portal.enrolledCourses.value.length }} cursos activos o
              completados
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-5">
        <div
          class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"
        >
          <div class="flex flex-wrap gap-2">
            <Button
              class="h-10 rounded-none border-border bg-card px-4 text-foreground"
              variant="outline"
              type="button"
            >
              Categorías
              <ChevronDown class="h-4 w-4" />
            </Button>
            <Button
              class="h-10 rounded-none border-border bg-card px-4 text-foreground"
              variant="outline"
              type="button"
            >
              Progreso
              <ChevronDown class="h-4 w-4" />
            </Button>
            <Button
              class="h-10 rounded-none border-border bg-card px-4 text-foreground"
              variant="outline"
              type="button"
            >
              Instructor
              <ChevronDown class="h-4 w-4" />
            </Button>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="relative w-full sm:w-[360px]">
              <Search
                class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                v-model="searchTerm"
                class="h-11 bg-background pl-10"
                type="search"
                placeholder="Buscar mis cursos"
              />
            </div>
            <Button
              class="h-11 rounded-none bg-[#D6C4F2] px-4 text-[#5A35A3] hover:bg-[#CBB5EC]"
              type="button"
            >
              <Search class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <strong class="text-sm text-foreground"
            >{{ learningCourses.length }} cursos</strong
          >
          <Button class="text-foreground" variant="ghost" type="button">
            Visitados recientemente
            <ChevronDown class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <template v-if="portal.coursesLoading.value">
          <EsqueletoCursoTendencia v-for="i in 6" :key="i" />
        </template>
        <TarjetaCursoTendencia
          v-for="course in learningCourses"
          v-else
          :key="course.id"
          fluid
          :course="course"
          :show-detail="false"
          :in-cart="portal.isInCart(course.id)"
          :is-favorite="portal.isFavorite(course.id)"
          @add-to-cart="portal.handleAddToCart(course.id)"
          @continue-course="portal.openSimuladorCurso(course)"
          @select="portal.openSimuladorCurso(course)"
          @toggle-favorite="portal.toggleFavorite(course.id)"
        />
      </div>

      <Card v-if="!learningCourses.length" class="border-border shadow-none">
        <CardContent class="py-10 text-center text-sm text-muted-foreground">
          No encontramos cursos con ese criterio. Prueba otra búsqueda o limpia
          los filtros.
        </CardContent>
      </Card>
    </section>
  </PortalSection>
</template>
