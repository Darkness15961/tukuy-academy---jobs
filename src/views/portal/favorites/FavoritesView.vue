<script setup lang="ts">
import { Heart, Search, Sparkles, Star, TrendingUp } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import CourseTrendCard from '@/components/shared/CourseTrendCard.vue'
import PortalSection from '@/components/shared/PortalSection.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()

const searchTerm = ref('')

const displayCourses = computed(() => {
  const base = portal.favoriteCourses.value
  const term = searchTerm.value.trim().toLowerCase()
  return term
    ? base.filter((course) =>
        [course.title, course.category, course.level].some((v) => v.toLowerCase().includes(term)),
      )
    : base
})

const metrics = computed(() => [
  {
    label: 'Guardados',
    value: `${portal.favoriteCourses.value.length}`,
    detail: 'cursos marcados',
    icon: Heart,
    cardClass: 'border-rose-100 bg-rose-50/70',
    iconClass: 'bg-rose-500 text-white',
  },
  {
    label: 'Gratuitos',
    value: `${portal.favoriteCourses.value.filter((c) => c.pricing === 'free').length}`,
    detail: 'listos para iniciar',
    icon: Sparkles,
    cardClass: 'border-teal-100 bg-teal-50/70',
    iconClass: 'bg-teal-600 text-white',
  },
  {
    label: 'De pago',
    value: `${portal.favoriteCourses.value.filter((c) => c.pricing === 'paid').length}`,
    detail: 'pendientes de compra',
    icon: Star,
    cardClass: 'border-amber-100 bg-amber-50/70',
    iconClass: 'bg-[#F5B400] text-[#07152B]',
  },
  {
    label: 'En progreso',
    value: `${portal.favoriteCourses.value.filter((c) => c.progress > 0 && c.progress < 100).length}`,
    detail: 'cursos iniciados',
    icon: TrendingUp,
    cardClass: 'border-blue-100 bg-blue-50/70',
    iconClass: 'bg-[#0B3A78] text-white',
  },
])
</script>

<template>
  <PortalSection wide :centered="false">
    <section class="grid gap-7">
      <!-- Hero header -->
      <div class="rounded-xl border border-[#DDE7F4] bg-[#F7F9FE] p-6 shadow-sm lg:p-8">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge class="border-rose-200/60 bg-rose-50 text-rose-700" variant="outline">
              <Heart class="mr-1 h-3 w-3 fill-rose-400 text-rose-400" />
              Favoritos
            </Badge>
            <h1 class="mt-4 text-3xl font-black tracking-normal text-[#07152B] sm:text-4xl">
              Cursos de tu interés
            </h1>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-[#41516A] sm:text-base">
              Guarda los cursos que te llaman la atención para revisarlos más adelante, comprar cuando estés listo o retomar tu aprendizaje.
            </p>
          </div>

          <div class="grid gap-2 rounded-lg border border-rose-100 bg-white p-4 shadow-sm sm:min-w-56">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-muted-foreground">Total guardados</span>
              <strong>{{ portal.favoriteCourses.value.length }}</strong>
            </div>
            <div class="h-2.5 rounded-full bg-rose-100 overflow-hidden">
              <div
                class="h-full rounded-full bg-rose-500 transition-all duration-500"
                :style="{ width: `${Math.min(portal.favoriteCourses.value.length * 20, 100)}%` }"
              />
            </div>
            <p class="text-xs text-muted-foreground">
              {{ portal.favoriteCourses.value.filter((c) => c.progress > 0).length }} ya iniciados
            </p>
          </div>
        </div>
      </div>

      <!-- Metric cards -->
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card v-for="metric in metrics" :key="metric.label" class="shadow-sm" :class="metric.cardClass">
          <CardContent class="flex items-center gap-4 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div class="grid h-12 w-12 shrink-0 place-items-center rounded-md shadow-sm" :class="metric.iconClass">
              <component :is="metric.icon" class="h-5 w-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-muted-foreground">{{ metric.label }}</p>
              <strong class="mt-1 block text-2xl font-black text-slate-950">{{ metric.value }}</strong>
              <span class="text-xs text-muted-foreground">{{ metric.detail }}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Search and filter bar -->
      <div class="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-bold uppercase text-secondary">Tu lista</p>
          <h2 class="mt-1 text-2xl font-black">Cursos guardados</h2>
        </div>
        <div class="relative w-full lg:max-w-sm">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="searchTerm"
            class="h-11 pl-10"
            type="search"
            placeholder="Buscar en tus favoritos..."
          />
        </div>
      </div>

      <!-- Course grid -->
      <div v-if="displayCourses.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <CourseTrendCard
          v-for="course in displayCourses"
          :key="course.id"
          fluid
          :course="course"
          :show-detail="false"
          :in-cart="portal.isInCart(course.id)"
          :is-favorite="true"
          @add-to-cart="portal.handleAddToCart(course.id)"
          @continue-course="portal.openCourseSimulator(course)"
          @select="portal.openCourseSimulator(course)"
          @toggle-favorite="portal.toggleFavorite(course.id)"
        />
      </div>

      <!-- Empty state -->
      <Card v-else class="border-slate-200 shadow-none">
        <CardContent class="grid place-items-center gap-4 py-16 text-center">
          <div class="grid h-16 w-16 place-items-center rounded-full bg-rose-50">
            <Heart class="h-7 w-7 text-rose-400" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-800">
              {{ searchTerm ? 'Sin resultados' : 'Tu lista está vacía' }}
            </h3>
            <p class="mt-1 max-w-md text-sm text-muted-foreground">
              {{ searchTerm
                ? 'No encontramos favoritos con ese criterio. Prueba otra búsqueda.'
                : 'Marca cursos con el corazón desde la sección de cursos para verlos aquí.'
              }}
            </p>
          </div>
          <Button v-if="!searchTerm" variant="outline" @click="portal.navigate('courses')">
            Explorar cursos
          </Button>
        </CardContent>
      </Card>
    </section>
  </PortalSection>
</template>
