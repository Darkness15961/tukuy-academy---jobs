<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import AppHeader from '@/components/shared/AppHeader.vue'
import PortalPageSkeleton from '@/components/shared/PortalPageSkeleton.vue'
import SiteFooter from '@/components/shared/SiteFooter.vue'
import { useAuth } from '@/composables/useAuth'
import { useCart } from '@/composables/useCart'
import { useContent } from '@/composables/useContent'
import { useCourseFilter, useCourses } from '@/composables/useCourses'
import { useFavorites } from '@/composables/useFavorites'
import { useJobFilter } from '@/composables/useJobFilter'
import { useJobs } from '@/composables/useJobs'
import { useUser } from '@/composables/useUser'
import { buildCertificateData, downloadCertificatePdf, viewCourseCertificate } from '@/lib/certificate-pdf'
import { portalPathByView, resolvePortalView } from '@/lib/portal-routes'
import type { Course, ViewId } from '@/types/academy'
import { providePortalContext } from './composables/usePortalContext'

const route = useRoute()
const router = useRouter()
const { logout } = useAuth()
const { navItems, loading: contentLoading } = useContent()
const { courses, completedCourses, loading: coursesLoading } = useCourses()
const { searchTerm, filteredCourses } = useCourseFilter(() => courses.value)
const { jobs, loading: jobsLoading } = useJobs()
const { searchTerm: jobSearchTerm, scopeFilter, dateFilter, filteredJobs, forYouJobs } = useJobFilter(() => jobs.value)
const { user, workExperiences, loading: userLoading } = useUser()
const { cartCount, addToCart, isInCart } = useCart()
const { favoritesCount, isFavorite, toggleFavorite, favoriteCourseIds } = useFavorites()

const pricingFilter = ref<'all' | 'free' | 'paid'>('all')
const openingCertificateId = ref<string | null>(null)

const activeView = computed(() => resolvePortalView(route.meta.view))

const isPageLoading = computed(
  () => userLoading.value || coursesLoading.value || jobsLoading.value || contentLoading.value,
)

const enrolledCourses = computed(() =>
  courses.value.filter(
    (course) => course.status === 'En curso' || course.status === 'Completado' || course.progress > 0,
  ),
)

const catalogCourses = computed(() => {
  if (pricingFilter.value === 'free') {
    return filteredCourses.value.filter((course) => course.pricing === 'free')
  }
  if (pricingFilter.value === 'paid') {
    return filteredCourses.value.filter((course) => course.pricing === 'paid')
  }
  return filteredCourses.value
})

const featuredCourses = computed(() => courses.value.slice(0, 6))

const topCourses = computed(() => {
  const enriched = courses.value.map((course) => ({ ...course, _bestseller: course.bestseller ?? false }))
  const bestsellers = enriched.filter((course) => course._bestseller)
  return (bestsellers.length >= 3 ? bestsellers : enriched).slice(0, 5)
})

const favoriteCourses = computed(() =>
  courses.value.filter((course) => favoriteCourseIds.value.includes(course.id)),
)

function navigate(view: ViewId) {
  router.push(portalPathByView[view])
}

function handleAddToCart(courseId: string) {
  addToCart(courseId)
}

async function handleViewCertificate(course: Course) {
  if (!user.value) return

  openingCertificateId.value = course.id
  try {
    await viewCourseCertificate(course, user.value)
  } finally {
    openingCertificateId.value = null
  }
}

async function handleDownloadCertificate(course: Course) {
  if (!user.value) return

  openingCertificateId.value = course.id
  try {
    await downloadCertificatePdf(buildCertificateData(course, user.value))
  } finally {
    openingCertificateId.value = null
  }
}

providePortalContext({
  activeView,
  navItems,
  user,
  courses,
  completedCourses,
  enrolledCourses,
  featuredCourses,
  topCourses,
  catalogCourses,
  favoriteCourses,
  workExperiences,
  jobs,
  filteredJobs,
  forYouJobs,
  searchTerm,
  pricingFilter,
  jobSearchTerm,
  scopeFilter,
  dateFilter,
  coursesLoading,
  jobsLoading,
  contentLoading,
  openingCertificateId,
  cartCount,
  favoritesCount,
  navigate,
  logout,
  handleAddToCart,
  isInCart,
  isFavorite,
  toggleFavorite,
  handleViewCertificate,
  handleDownloadCertificate,
})
</script>

<template>
  <AppHeader
    v-if="user"
    mode="portal"
    :user="user"
    :nav-items="navItems"
    :active-view="activeView"
    :enrolled-courses="enrolledCourses"
    :favorite-courses="favoriteCourses"
    :cart-count="cartCount"
    :favorites-count="favoritesCount"
    :content-loading="contentLoading"
    @navigate="navigate"
    @logout="logout"
  />

  <PortalPageSkeleton v-if="isPageLoading" />

  <main v-else-if="user" class="bg-background">
    <RouterView />
    <SiteFooter variant="light" />
  </main>
</template>
