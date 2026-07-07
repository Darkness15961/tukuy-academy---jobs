<script setup lang="ts">
import { Check, Heart, ShoppingCart, Star } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { enrichCourse, formatCoursePrice, formatCourseRating, formatReviewCount } from '@/lib/course-display'
import type { Course } from '@/types/academy'

const props = withDefaults(
  defineProps<{
    course: Course
    variant?: 'light' | 'dark'
    inCart?: boolean
    isFavorite?: boolean
    showActions?: boolean
    showDetail?: boolean
    fluid?: boolean
  }>(),
  {
    variant: 'light',
    inCart: false,
    isFavorite: false,
    showActions: true,
    showDetail: true,
    fluid: false,
  },
)

const emit = defineEmits<{
  toggleFavorite: []
  addToCart: []
  continueCourse: []
  select: []
}>()

const displayCourse = computed(() => enrichCourse(props.course))

const statusBadge = computed(() => {
  if (displayCourse.value.status === 'Completado') return 'Completado'
  if (displayCourse.value.progress > 0 || displayCourse.value.status === 'En curso') return 'En curso'
  if (displayCourse.value.bestseller) return 'Lo más vendido'
  if (displayCourse.value.pricing === 'free') return 'Gratis'
  return null
})

const statusBadgeClass = computed(() => {
  if (displayCourse.value.status === 'Completado') return 'border-slate-200 bg-slate-50 text-slate-700'
  if (displayCourse.value.progress > 0 || displayCourse.value.status === 'En curso') {
    return 'border-blue-100 bg-blue-50/60 text-blue-900'
  }
  if (displayCourse.value.bestseller) return 'border-teal-100 bg-teal-50/60 text-teal-900'
  return 'border-slate-200 bg-white text-slate-700'
})

const detailBullets = computed(() => [
  `Aprende a aplicar ${displayCourse.value.category.toLowerCase()} en flujos reales de obra.`,
  `Refuerza criterios para trabajo de campo, oficina técnica y control operativo.`,
  `Suma evidencias para tu CV inteligente y recomendaciones laborales.`,
])

const isDark = computed(() => props.variant === 'dark')

/* ── Hover detail panel: dynamic positioning ── */
const cardRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const panelSide = ref<'right' | 'left'>('right')
const panelVerticalOffset = ref(0)

const PANEL_WIDTH = 340
const PANEL_GAP = 14 // 0.875rem

let hoverTimeout: ReturnType<typeof setTimeout> | undefined

function onCardEnter() {
  if (!props.showDetail) return
  // Small delay to prevent flicker on fast mouse passes
  hoverTimeout = setTimeout(() => {
    calculatePanelPosition()
    isHovered.value = true
  }, 80)
}

function onCardLeave() {
  clearTimeout(hoverTimeout)
  isHovered.value = false
}

function calculatePanelPosition() {
  if (!cardRef.value) return

  const rect = cardRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Check if there's enough space on the right
  const spaceRight = viewportWidth - rect.right
  const spaceLeft = rect.left

  if (spaceRight >= PANEL_WIDTH + PANEL_GAP + 16) {
    panelSide.value = 'right'
  } else if (spaceLeft >= PANEL_WIDTH + PANEL_GAP + 16) {
    panelSide.value = 'left'
  } else {
    // Default to the side with more space
    panelSide.value = spaceRight >= spaceLeft ? 'right' : 'left'
  }

  // Vertical adjustment: prevent the panel from going off-screen bottom
  const panelEstimatedHeight = 380
  const panelBottom = rect.top + panelEstimatedHeight
  if (panelBottom > viewportHeight - 16) {
    panelVerticalOffset.value = Math.min(
      rect.top - 16, // Don't push higher than the top of viewport
      panelBottom - viewportHeight + 16,
    )
  } else {
    panelVerticalOffset.value = 0
  }
}
</script>

<template>
  <article
    ref="cardRef"
    class="course-trend-card group relative flex snap-start flex-col rounded-lg border p-3 shadow-sm transition duration-300"
    :class="[
      isDark ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-card text-foreground',
      fluid ? 'w-full shrink' : 'w-[280px] shrink-0',
      isHovered ? 'course-trend-card--active' : '',
    ]"
    @mouseenter="onCardEnter"
    @mouseleave="onCardLeave"
  >
    <button
      type="button"
      class="relative aspect-video w-full overflow-hidden rounded-md border text-left transition"
      :class="isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-muted'"
      @click="emit('select')"
    >
      <img
        :src="displayCourse.image"
        :alt="displayCourse.title"
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div
        v-if="isDark"
        :class="['absolute inset-0 bg-gradient-to-br opacity-35', displayCourse.imageTone]"
      />

      <Button
        v-if="showActions"
        class="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/95 shadow-sm hover:bg-white"
        size="icon"
        variant="outline"
        type="button"
        aria-label="Agregar a favoritos"
        @click.stop="emit('toggleFavorite')"
      >
        <Heart class="h-4 w-4" :class="isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-700'" />
      </Button>
    </button>

    <div class="flex flex-1 flex-col gap-2 pt-3">
      <button type="button" class="text-left" @click="emit('select')">
        <h3
          class="line-clamp-2 text-base font-bold leading-snug transition group-hover:text-primary"
          :class="isDark ? 'text-white' : 'text-slate-900'"
        >
          {{ displayCourse.title }}
        </h3>
      </button>

      <p class="text-sm" :class="isDark ? 'text-white/65' : 'text-muted-foreground'">
        {{ displayCourse.instructor }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <Badge
          v-if="statusBadge"
          :class="
            cn(
              'rounded-md px-2.5 py-0.5 text-[11px] font-semibold leading-5 shadow-none',
              isDark ? 'border-white/10 bg-white/90 text-slate-950' : statusBadgeClass,
            )
          "
          variant="outline"
        >
          {{ statusBadge }}
        </Badge>

        <div class="flex items-center gap-1 text-sm font-bold" :class="isDark ? 'text-amber-300' : 'text-amber-400'">
          <Star class="h-3.5 w-3.5 fill-current" />
          <span>{{ formatCourseRating(displayCourse.rating!) }}</span>
        </div>

        <span class="text-xs" :class="isDark ? 'text-white/55' : 'text-muted-foreground'">
          ({{ formatReviewCount(displayCourse.reviewCount!) }} valoraciones)
        </span>
      </div>

      <div class="mt-auto flex items-end justify-between gap-2 pt-1">
        <strong class="text-lg font-black" :class="isDark ? 'text-white' : 'text-slate-900'">
          {{ formatCoursePrice(displayCourse) }}
        </strong>

        <Button
          v-if="showActions && (displayCourse.progress > 0 || displayCourse.status === 'En curso')"
          size="sm"
          @click="emit('continueCourse')"
        >
          Continuar
        </Button>
        <Button
          v-else-if="showActions && displayCourse.pricing === 'paid'"
          size="sm"
          :variant="inCart ? 'outline' : 'default'"
          @click="emit('addToCart')"
        >
          <ShoppingCart class="h-4 w-4" />
          {{ inCart ? 'En carrito' : 'Comprar' }}
        </Button>
        <Button
          v-else-if="showActions"
          size="sm"
          variant="outline"
          @click="emit('continueCourse')"
        >
          Inscribirme
        </Button>
      </div>
    </div>

    <!-- Hover detail panel (desktop ≥ 1024px) -->
    <Transition name="course-detail">
      <div
        v-if="isHovered"
        class="course-detail-panel pointer-events-auto absolute hidden lg:block"
        :class="[
          panelSide === 'right'
            ? 'left-[calc(100%+0.875rem)]'
            : 'right-[calc(100%+0.875rem)]',
        ]"
        :style="{ top: `-${panelVerticalOffset}px` }"
        aria-hidden="true"
        @mouseenter="isHovered = true"
        @mouseleave="onCardLeave"
      >
        <!-- Arrow -->
        <span
          class="absolute top-20 h-4 w-4 rotate-45 border-slate-200 bg-white"
          :class="[
            panelSide === 'right'
              ? '-left-2 border-b border-l'
              : '-right-2 border-t border-r',
          ]"
        />

        <h4 class="text-base font-bold leading-snug">{{ displayCourse.title }}</h4>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            v-if="statusBadge"
            :class="cn('rounded-md px-2.5 py-0.5 text-[11px] font-semibold leading-5 shadow-none', statusBadgeClass)"
            variant="outline"
          >
            {{ statusBadge }}
          </Badge>
          <span class="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {{ displayCourse.level }}
          </span>
        </div>

        <p class="mt-3 text-xs text-slate-500">
          {{ displayCourse.duration }} en total · {{ displayCourse.mode }} · {{ displayCourse.category }}
        </p>

        <p class="mt-4 text-sm leading-6 text-slate-600">
          Formación práctica para mejorar tu dominio de Tukuy Obra y fortalecer tu perfil profesional en proyectos de obra.
        </p>

        <ul class="mt-4 grid gap-3 text-sm leading-6 text-slate-600">
          <li v-for="bullet in detailBullets" :key="bullet" class="grid grid-cols-[18px_1fr] gap-2">
            <Check class="mt-1 h-4 w-4 text-slate-900" />
            <span>{{ bullet }}</span>
          </li>
        </ul>

        <Button
          class="mt-5 w-full"
          type="button"
          @click="displayCourse.pricing === 'paid' ? emit('addToCart') : emit('continueCourse')"
        >
          {{ displayCourse.pricing === 'paid' ? 'Añadir al carrito' : 'Inscribirme al curso' }}
        </Button>
      </div>
    </Transition>
  </article>
</template>

<style scoped>
/* ── z-index & elevation ── */
.course-trend-card {
  z-index: 1;
  transition: transform 0.3s ease, box-shadow 0.3s ease, z-index 0s;
}

.course-trend-card:hover,
.course-trend-card--active {
  z-index: 50;
  transform: translateY(-4px);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* ── Detail panel ── */
.course-detail-panel {
  width: 340px;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 1.25rem;
  color: #0f172a;
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
}

/* ── Transition ── */
.course-detail-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.course-detail-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.course-detail-enter-from,
.course-detail-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>

