import { createRouter, createWebHistory } from 'vue-router'

import { AUTH_TOKEN_KEY } from '@/lib/constants'
import { portalPathByView } from '@/lib/portal-routes'

const portalLayout = () => import('@/views/portal/PortalLayout.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/PublicLanding.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/app',
      redirect: portalPathByView.courses,
      meta: { requiresAuth: true },
    },
    {
      path: '/app/:pathMatch(.*)*',
      redirect: (to) => `/tukuy-academy/${to.params.pathMatch || 'cursos'}`,
      meta: { requiresAuth: true },
    },
    {
      path: '/tukuy-academy',
      component: portalLayout,
      redirect: portalPathByView.courses,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'aprendizaje/:courseId',
          name: 'portal-learning-player',
          component: () => import('@/views/portal/course-player/CoursePlayerView.vue'),
          meta: { requiresAuth: true, hideHeaderFooter: true },
        },
        {
          path: 'cursos',
          name: 'portal-courses',
          component: () => import('@/views/portal/courses/CoursesView.vue'),
          meta: { requiresAuth: true, view: 'courses' },
        },
        {
          path: 'mi-aprendizaje',
          name: 'portal-learning',
          component: () => import('@/views/portal/learning/LearningView.vue'),
          meta: { requiresAuth: true, view: 'learning' },
        },
        {
          path: 'favoritos',
          name: 'portal-favorites',
          component: () => import('@/views/portal/favorites/FavoritesView.vue'),
          meta: { requiresAuth: true, view: 'favorites' },
        },
        {
          path: 'bolsa-tukuy',
          name: 'portal-jobs',
          component: () => import('@/views/portal/jobs/JobsView.vue'),
          meta: { requiresAuth: true, view: 'jobs' },
        },
        {
          path: 'cv-inteligente',
          redirect: portalPathByView.cv,
        },
        {
          path: 'cv',
          name: 'portal-cv',
          component: () => import('@/views/portal/cv/CvView.vue'),
          meta: { requiresAuth: true, view: 'cv' },
        },
        {
          path: 'certificados',
          name: 'portal-certificates',
          component: () => import('@/views/portal/certificates/CertificatesView.vue'),
          meta: { requiresAuth: true, view: 'certificates' },
        },
        {
          path: 'perfil',
          name: 'portal-profile',
          component: () => import('@/views/portal/profile/ProfileView.vue'),
          meta: { requiresAuth: true, view: 'profile' },
        },
        {
          path: 'configuracion',
          name: 'portal-settings',
          component: () => import('@/views/portal/settings/SettingsView.vue'),
          meta: { requiresAuth: true, view: 'settings' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth', top: 88 }
    }
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (to.meta.requiresAuth && !token) {
    return { name: 'login' }
  }
  if (to.name === 'login' && token) {
    return { name: 'portal-courses' }
  }
})

export default router
