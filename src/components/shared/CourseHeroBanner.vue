<script setup lang="ts">
import { ChevronLeft, ChevronRight, Star } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { enrichCourse, formatCoursePrice, formatCourseRating, formatReviewCount } from '@/lib/course-display'
import type { Course } from '@/types/academy'

const props = withDefaults(
  defineProps<{
    courses: Course[]
    intervalMs?: number
  }>(),
  { intervalMs: 5000 },
)

const emit = defineEmits<{
  addToCart: [courseId: string]
  continueCourse: [courseId: string]
}>()

const activeIndex = ref(0)
const isPaused = ref(false)

const enrichedCourses = computed(() => props.courses.map(enrichCourse))

let timer: ReturnType<typeof setInterval> | undefined

function startAutoplay() {
  stopAutoplay()
  timer = setInterval(() => {
    if (!isPaused.value) {
      activeIndex.value = (activeIndex.value + 1) % enrichedCourses.value.length
    }
  }, props.intervalMs)
}

function stopAutoplay() {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

function goTo(index: number) {
  activeIndex.value = index
  startAutoplay()
}

function prev() {
  const len = enrichedCourses.value.length
  goTo((activeIndex.value - 1 + len) % len)
}

function next() {
  goTo((activeIndex.value + 1) % enrichedCourses.value.length)
}

onMounted(startAutoplay)
onBeforeUnmount(stopAutoplay)

watch(
  () => props.courses.length,
  () => {
    activeIndex.value = 0
    startAutoplay()
  },
)
</script>

<template>
  <section
    v-if="enrichedCourses.length"
    class="hero-banner relative w-full overflow-hidden rounded-xl"
    @mouseenter="isPaused = true"
    @mouseleave="isPaused = false"
  >
    <!-- Slides -->
    <div class="hero-banner__viewport relative w-full">
      <TransitionGroup name="hero-fade">
        <div
          v-for="(course, i) in enrichedCourses"
          v-show="i === activeIndex"
          :key="course.id"
          class="absolute inset-0"
        >
          <!-- Background image -->
          <img
            :src="course.image"
            :alt="course.title"
            class="absolute inset-0 h-full w-full object-cover"
          />
          <!-- Gradient overlay -->
          <div class="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/20" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent sm:from-slate-950/50" />

          <!-- Content -->
          <div class="relative flex h-full items-end px-5 pb-12 pt-6 sm:items-center sm:px-10 sm:pb-8 lg:px-14">
            <div class="max-w-xl">
              <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge class="border-white/20 bg-white/15 text-[10px] font-semibold text-white backdrop-blur-sm sm:text-[11px]">
                  {{ course.category }}
                </Badge>
                <Badge
                  v-if="course.bestseller"
                  class="border-amber-400/30 bg-amber-400/15 text-[10px] font-semibold text-amber-300 backdrop-blur-sm sm:text-[11px]"
                >
                  ⭐ Más vendido
                </Badge>
                <Badge class="border-white/15 bg-white/10 text-[10px] font-semibold text-white/80 backdrop-blur-sm sm:text-[11px]">
                  {{ course.level }}
                </Badge>
              </div>

              <h2 class="mt-2 text-lg font-black leading-tight tracking-tight text-white sm:mt-3 sm:text-2xl lg:text-3xl">
                {{ course.title }}
              </h2>

              <p class="mt-1.5 text-xs leading-relaxed text-white/70 sm:mt-2 sm:text-sm lg:text-base">
                {{ course.duration }} · {{ course.mode }} · {{ course.instructor }}
              </p>

              <div class="mt-2 flex flex-wrap items-center gap-2 sm:mt-3 sm:gap-3">
                <div class="flex items-center gap-1 text-xs font-bold text-amber-300 sm:text-sm">
                  <Star class="h-3.5 w-3.5 fill-current sm:h-4 sm:w-4" />
                  <span>{{ formatCourseRating(course.rating!) }}</span>
                </div>
                <span class="text-[10px] text-white/50 sm:text-xs">
                  ({{ formatReviewCount(course.reviewCount!) }} valoraciones)
                </span>
                <strong class="text-base font-black text-white sm:text-lg">
                  {{ formatCoursePrice(course) }}
                </strong>
              </div>

              <div class="mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
                <Button
                  v-if="course.progress > 0 || course.status === 'En curso'"
                  class="h-9 bg-white text-sm font-semibold text-slate-900 hover:bg-white/90 sm:h-10"
                  @click="emit('continueCourse', course.id)"
                >
                  Continuar curso
                </Button>
                <Button
                  v-else-if="course.pricing === 'paid'"
                  class="h-9 bg-white text-sm font-semibold text-slate-900 hover:bg-white/90 sm:h-10"
                  @click="emit('addToCart', course.id)"
                >
                  Añadir al carrito
                </Button>
                <Button
                  v-else
                  class="h-9 bg-white text-sm font-semibold text-slate-900 hover:bg-white/90 sm:h-10"
                  @click="emit('continueCourse', course.id)"
                >
                  Inscribirme gratis
                </Button>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Navigation arrows -->
    <button
      type="button"
      class="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 sm:left-3 sm:h-9 sm:w-9"
      aria-label="Curso anterior"
      @click="prev"
    >
      <ChevronLeft class="h-4 w-4 sm:h-5 sm:w-5" />
    </button>
    <button
      type="button"
      class="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 sm:right-3 sm:h-9 sm:w-9"
      aria-label="Siguiente curso"
      @click="next"
    >
      <ChevronRight class="h-4 w-4 sm:h-5 sm:w-5" />
    </button>

    <!-- Dot indicators -->
    <div class="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-4 sm:gap-2">
      <button
        v-for="(course, i) in enrichedCourses"
        :key="course.id"
        type="button"
        class="group/dot relative h-1.5 rounded-full transition-all duration-300 sm:h-2"
        :class="i === activeIndex ? 'w-6 bg-white sm:w-8' : 'w-1.5 bg-white/40 hover:bg-white/60 sm:w-2'"
        :aria-label="`Ver curso ${i + 1}`"
        @click="goTo(i)"
      >
        <span
          v-if="i === activeIndex && !isPaused"
          class="hero-dot-progress absolute inset-0 rounded-full bg-white/60"
          :style="{ animationDuration: `${intervalMs}ms` }"
        />
      </button>
    </div>
  </section>
</template>

<style scoped>
/* ── Responsive aspect ratio ── */
.hero-banner__viewport {
  aspect-ratio: 16 / 9;
}

@media (min-width: 640px) {
  .hero-banner__viewport {
    aspect-ratio: 2.6 / 1;
  }
}

@media (min-width: 1024px) {
  .hero-banner__viewport {
    aspect-ratio: 3.2 / 1;
  }
}

/* ── Slide transitions ── */
.hero-fade-enter-active {
  transition: opacity 0.6s ease;
}

.hero-fade-leave-active {
  transition: opacity 0.4s ease;
}

.hero-fade-enter-from {
  opacity: 0;
}

.hero-fade-leave-to {
  opacity: 0;
}

/* ── Progress dot animation ── */
@keyframes dot-fill {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}

.hero-dot-progress {
  animation: dot-fill linear forwards;
}
</style>
