<script setup lang="ts">
import { Heart, Search, Sparkles, Star, TrendingUp } from "lucide-vue-next";
import { computed, ref } from "vue";

import TarjetaCursoTendencia from "@/components/shared/TarjetaCursoTendencia.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePortalContext } from "../composables/usePortalContext";

const portal = usePortalContext();

const searchTerm = ref("");

const displayCourses = computed(() => {
  const base = portal.favoriteCourses.value;
  const term = searchTerm.value.trim().toLowerCase();
  return term
    ? base.filter((course) =>
        [course.title, course.category, course.level].some((v) =>
          v.toLowerCase().includes(term),
        ),
      )
    : base;
});

const metrics = computed(() => [
  {
    label: "Guardados",
    value: `${portal.favoriteCourses.value.length}`,
    detail: "cursos marcados",
    icon: Heart,
    cardClass: "border-rose-500/25 bg-card",
    iconClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  },
  {
    label: "Gratuitos",
    value: `${portal.favoriteCourses.value.filter((c) => c.pricing === "free").length}`,
    detail: "listos para iniciar",
    icon: Sparkles,
    cardClass: "border-teal-500/25 bg-card",
    iconClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  {
    label: "De pago",
    value: `${portal.favoriteCourses.value.filter((c) => c.pricing === "paid").length}`,
    detail: "pendientes de compra",
    icon: Star,
    cardClass: "border-amber-500/30 bg-card",
    iconClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    label: "En progreso",
    value: `${portal.favoriteCourses.value.filter((c) => c.progress > 0 && c.progress < 100).length}`,
    detail: "cursos iniciados",
    icon: TrendingUp,
    cardClass: "border-primary/30 bg-card",
    iconClass: "bg-primary/15 text-primary",
  },
]);
</script>

<template>
  <PortalSection wide :centered="false">
    <section class="grid gap-7">
      <!-- Hero header -->
      <div
        class="rounded-none border border-border bg-card p-6 shadow-sm lg:p-8"
      >
        <div
          class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <Badge
              class="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              variant="outline"
            >
              <Heart class="mr-1 h-3 w-3 fill-rose-500 text-rose-500 dark:fill-rose-300 dark:text-rose-300" />
              Favoritos
            </Badge>
            <h1
              class="mt-4 text-3xl font-black tracking-normal text-foreground sm:text-4xl"
            >
              Cursos de tu interés
            </h1>
            <p
              class="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base"
            >
              Guarda los cursos que te llaman la atención para revisarlos más
              adelante, comprar cuando estés listo o retomar tu aprendizaje.
            </p>
          </div>

          <div
            class="grid gap-2 rounded-none border border-border bg-muted/40 p-4 shadow-sm sm:min-w-56"
          >
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-muted-foreground">Total guardados</span>
              <strong class="text-foreground">{{
                portal.favoriteCourses.value.length
              }}</strong>
            </div>
            <div class="h-2.5 overflow-hidden rounded-none bg-muted">
              <div
                class="h-full rounded-none bg-rose-500 transition-all duration-500"
                :style="{
                  width: `${Math.min(portal.favoriteCourses.value.length * 20, 100)}%`,
                }"
              />
            </div>
            <p class="text-xs text-muted-foreground">
              {{
                portal.favoriteCourses.value.filter((c) => c.progress > 0)
                  .length
              }}
              ya iniciados
            </p>
          </div>
        </div>
      </div>

      <!-- Metric cards -->
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          v-for="metric in metrics"
          :key="metric.label"
          class="shadow-sm"
          :class="metric.cardClass"
        >
          <CardContent
            class="flex items-center gap-4 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div
              class="grid h-12 w-12 shrink-0 place-items-center rounded-none"
              :class="metric.iconClass"
            >
              <component :is="metric.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p
                class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {{ metric.label }}
              </p>
              <strong class="mt-1 block text-2xl font-black text-foreground">{{
                metric.value
              }}</strong>
              <span class="text-xs text-muted-foreground">{{
                metric.detail
              }}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Search and filter bar -->
      <div
        class="flex flex-col gap-4 rounded-none border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <p class="text-xs font-bold uppercase tracking-wide text-primary">
            Tu lista
          </p>
          <h2 class="mt-1 text-2xl font-black text-foreground">
            Cursos guardados
          </h2>
        </div>
        <div class="relative w-full lg:max-w-sm">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="searchTerm"
            class="h-11 pl-10"
            type="search"
            placeholder="Buscar en tus favoritos..."
          />
        </div>
      </div>

      <!-- Course grid -->
      <div
        v-if="displayCourses.length"
        class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        <TarjetaCursoTendencia
          v-for="course in displayCourses"
          :key="course.id"
          fluid
          :course="course"
          :show-detail="false"
          :in-cart="portal.isInCart(course.id)"
          :is-favorite="true"
          @add-to-cart="portal.handleAddToCart(course.id)"
          @continue-course="portal.openSimuladorCurso(course)"
          @select="portal.verDetalleCurso(course)"
          @toggle-favorite="portal.toggleFavorite(course.id)"
        />
      </div>

      <!-- Empty state -->
      <Card v-else class="border-border shadow-none">
        <CardContent class="grid place-items-center gap-4 py-16 text-center">
          <div
            class="grid h-16 w-16 place-items-center rounded-none bg-rose-500/10"
          >
            <Heart class="h-7 w-7 text-rose-500 dark:text-rose-300" />
          </div>
          <div>
            <h3 class="text-base font-bold text-foreground">
              {{ searchTerm ? "Sin resultados" : "Tu lista está vacía" }}
            </h3>
            <p class="mt-1 max-w-md text-sm text-muted-foreground">
              {{
                searchTerm
                  ? "No encontramos favoritos con ese criterio. Prueba otra búsqueda."
                  : "Marca cursos con el corazón desde la sección de cursos para verlos aquí."
              }}
            </p>
          </div>
          <Button
            v-if="!searchTerm"
            variant="outline"
            @click="portal.navigate('courses')"
          >
            Explorar cursos
          </Button>
        </CardContent>
      </Card>
    </section>
  </PortalSection>
</template>
