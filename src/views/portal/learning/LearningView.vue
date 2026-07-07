<script setup lang="ts">
import CourseCarousel from '@/components/shared/CourseCarousel.vue'
import CourseTrendCard from '@/components/shared/CourseTrendCard.vue'
import CourseTrendCardSkeleton from '@/components/shared/CourseTrendCardSkeleton.vue'
import PageTitle from '@/components/shared/PageTitle.vue'
import PortalSection from '@/components/shared/PortalSection.vue'
import { usePortalContext } from '../composables/usePortalContext'

const portal = usePortalContext()
</script>

<template>
  <PortalSection>
    <PageTitle
      centered
      eyebrow="Mi aprendizaje"
      title="Continúa donde lo dejaste"
      description="Tus cursos activos y completados en un solo lugar."
    />
    <CourseCarousel title="Continúa aprendiendo">
      <template v-if="portal.coursesLoading.value">
        <CourseTrendCardSkeleton v-for="i in 4" :key="i" />
      </template>
      <CourseTrendCard
        v-for="course in portal.enrolledCourses.value"
        v-else
        :key="course.id"
        :course="course"
        :in-cart="portal.isInCart(course.id)"
        :is-favorite="portal.isFavorite(course.id)"
        @continue-course="() => {}"
        @toggle-favorite="portal.toggleFavorite(course.id)"
      />
    </CourseCarousel>
  </PortalSection>
</template>
