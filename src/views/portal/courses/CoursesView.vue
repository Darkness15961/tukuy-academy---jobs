<script setup lang="ts">
import { Search } from 'lucide-vue-next'

import CourseCarousel from '@/components/shared/CourseCarousel.vue'
import CourseHeroBanner from '@/components/shared/CourseHeroBanner.vue'
import CourseTrendCard from '@/components/shared/CourseTrendCard.vue'
import CourseTrendCardSkeleton from '@/components/shared/CourseTrendCardSkeleton.vue'
import PortalSection from '@/components/shared/PortalSection.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()
</script>

<template>
  <PortalSection wide>
    <CourseHeroBanner
      :courses="portal.topCourses.value"
      :interval-ms="5000"
      @add-to-cart="portal.handleAddToCart"
      @continue-course="portal.navigate('learning')"
    />

    <CourseCarousel title="Cursos Destacados">
      <template v-if="portal.coursesLoading.value">
        <CourseTrendCardSkeleton v-for="i in 6" :key="i" />
      </template>
      <CourseTrendCard
        v-for="course in portal.featuredCourses.value"
        v-else
        :key="course.id"
        :course="course"
        :in-cart="portal.isInCart(course.id)"
        :is-favorite="portal.isFavorite(course.id)"
        @add-to-cart="portal.handleAddToCart(course.id)"
        @continue-course="portal.navigate('learning')"
        @toggle-favorite="portal.toggleFavorite(course.id)"
      />
    </CourseCarousel>

    <section class="grid w-full gap-5 pt-2 text-left">
      <div class="max-w-3xl">
        <p class="text-xs font-bold uppercase text-secondary">Rutas formativas</p>
        <h2 class="text-2xl font-black tracking-normal text-foreground">
          Habilidades para transformar la gestión de obras y tu carrera profesional
        </h2>
      </div>

      <div class="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full flex-1 sm:max-w-md">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="portal.searchTerm.value"
            class="h-11 pl-10"
            type="search"
            placeholder="Buscar por título, categoría o nivel..."
          />
        </div>
        <div class="flex flex-wrap gap-2 sm:justify-end">
          <Button
            :variant="portal.pricingFilter.value === 'all' ? 'default' : 'outline'"
            size="sm"
            @click="portal.pricingFilter.value = 'all'"
          >
            Todos
          </Button>
          <Button
            :variant="portal.pricingFilter.value === 'free' ? 'default' : 'outline'"
            size="sm"
            @click="portal.pricingFilter.value = 'free'"
          >
            Gratis
          </Button>
          <Button
            :variant="portal.pricingFilter.value === 'paid' ? 'default' : 'outline'"
            size="sm"
            @click="portal.pricingFilter.value = 'paid'"
          >
            De pago
          </Button>
        </div>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <CourseTrendCard
          v-for="course in portal.catalogCourses.value"
          :key="`catalog-${course.id}`"
          fluid
          :course="course"
          :in-cart="portal.isInCart(course.id)"
          :is-favorite="portal.isFavorite(course.id)"
          @add-to-cart="portal.handleAddToCart(course.id)"
          @continue-course="portal.navigate('learning')"
          @toggle-favorite="portal.toggleFavorite(course.id)"
        />
      </div>

      <Card v-if="!portal.catalogCourses.value.length" class="shadow-none">
        <CardContent class="py-10 text-center text-sm text-muted-foreground">
          No encontramos cursos con ese filtro. Prueba con otra palabra o vuelve a mostrar todos.
        </CardContent>
      </Card>
    </section>
  </PortalSection>
</template>
