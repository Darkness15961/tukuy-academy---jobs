<script setup lang="ts">
import CourseCarousel from '@/components/shared/CourseCarousel.vue'
import CourseTrendCard from '@/components/shared/CourseTrendCard.vue'
import PageTitle from '@/components/shared/PageTitle.vue'
import PortalSection from '@/components/shared/PortalSection.vue'
import { Card, CardContent } from '@/components/ui/card'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()
</script>

<template>
  <PortalSection>
    <PageTitle
      centered
      eyebrow="Favoritos"
      title="Cursos de tu interés"
      description="Guarda cursos que quieres tomar, comprar o retomar más adelante."
    />
    <CourseCarousel v-if="portal.favoriteCourses.value.length" title="Tus cursos guardados">
      <CourseTrendCard
        v-for="course in portal.favoriteCourses.value"
        :key="course.id"
        :course="course"
        :in-cart="portal.isInCart(course.id)"
        :is-favorite="true"
        @add-to-cart="portal.handleAddToCart(course.id)"
        @continue-course="portal.navigate('learning')"
        @toggle-favorite="portal.toggleFavorite(course.id)"
      />
    </CourseCarousel>
    <Card v-else class="w-full shadow-none">
      <CardContent class="py-10 text-center text-sm text-muted-foreground">
        Marca cursos con el corazón para verlos aquí como pendientes.
      </CardContent>
    </Card>
  </PortalSection>
</template>
