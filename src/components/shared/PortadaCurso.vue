<script setup lang="ts">
import { ChevronLeft, ChevronRight, Star } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  enrichCourse,
  formatCoursePrice,
  formatCourseRating,
  formatReviewCount,
} from "@/lib/presentacion-curso";
import type { Course } from "@/types/academia";

const props = withDefaults(
  defineProps<{
    courses: Course[];
    intervalMs?: number;
  }>(),
  { intervalMs: 5000 },
);

const emit = defineEmits<{
  addToCart: [courseId: string];
  continueCourse: [courseId: string];
}>();

const activeIndex = ref(0);
const isPaused = ref(false);

const enrichedCourses = computed(() => props.courses.map(enrichCourse));

let timer: ReturnType<typeof setInterval> | undefined;

function startAutoplay() {
  stopAutoplay();
  timer = setInterval(() => {
    if (!isPaused.value && enrichedCourses.value.length > 0) {
      activeIndex.value =
        (activeIndex.value + 1) % enrichedCourses.value.length;
    }
  }, props.intervalMs);
}

function stopAutoplay() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}

function goTo(index: number) {
  activeIndex.value = index;
  startAutoplay();
}

function prev() {
  const len = enrichedCourses.value.length;
  if (!len) return;
  goTo((activeIndex.value - 1 + len) % len);
}

function next() {
  const len = enrichedCourses.value.length;
  if (!len) return;
  goTo((activeIndex.value + 1) % len);
}

onMounted(startAutoplay);
onBeforeUnmount(stopAutoplay);

watch(
  () => props.courses.length,
  () => {
    activeIndex.value = 0;
    startAutoplay();
  },
);
</script>

<template>
  <section
    v-if="enrichedCourses.length"
    class="hero-banner relative w-full overflow-hidden bg-[#07152B]"
    @mouseenter="isPaused = true"
    @mouseleave="isPaused = false"
  >
    <!-- Altura fija por aspect-ratio: evita saltos al cambiar de slide -->
    <div class="hero-banner__viewport relative w-full">
      <div
        v-for="(course, i) in enrichedCourses"
        :key="course.id"
        class="absolute inset-0 transition-opacity duration-500 ease-out"
        :class="
          i === activeIndex
            ? 'z-[1] opacity-100'
            : 'pointer-events-none z-0 opacity-0'
        "
        :aria-hidden="i !== activeIndex"
      >
        <img
          :src="course.image"
          :alt="course.title"
          class="absolute inset-0 h-full w-full object-cover"
        />
        <div
          class="absolute inset-0 bg-linear-to-r from-[#07152B]/95 via-[#07152B]/70 to-[#0B3A78]/25"
        />
        <div
          class="absolute inset-0 bg-linear-to-t from-[#07152B]/80 via-transparent to-[#07152B]/30"
        />

        <div
          class="relative flex h-full items-end px-5 pb-12 pt-6 sm:items-center sm:px-10 sm:pb-8 lg:px-14"
        >
          <div class="max-w-2xl">
            <p
              class="text-xs font-black uppercase tracking-[.25em] text-[#F5B400]"
            >
              {{ course.category }}
            </p>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <Badge
                v-if="course.bestseller"
                class="rounded-none border-transparent bg-[#F5B400] text-[11px] font-black text-[#07152B]"
              >
                Más vendido
              </Badge>
              <span
                class="border border-white/25 px-2.5 py-1 text-[11px] font-bold text-white/85"
              >
                {{ course.level }}
              </span>
              <span
                class="border border-white/25 px-2.5 py-1 text-[11px] font-bold text-white/85"
              >
                {{ course.mode }}
              </span>
            </div>

            <h2
              class="mt-4 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl"
            >
              {{ course.title }}
            </h2>

            <p class="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">
              {{ course.duration }} · {{ course.instructor }}
            </p>

            <div class="mt-3 flex flex-wrap items-center gap-3">
              <div
                class="flex items-center gap-1 text-sm font-bold text-[#F5B400]"
              >
                <Star class="h-4 w-4 fill-current" />
                <span>{{ formatCourseRating(course.rating!) }}</span>
              </div>
              <span class="text-xs text-white/50">
                ({{ formatReviewCount(course.reviewCount!) }} valoraciones)
              </span>
              <strong class="text-lg font-black text-white">
                {{ formatCoursePrice(course) }}
              </strong>
            </div>

            <div class="mt-5 flex flex-wrap gap-3">
              <Button
                v-if="course.progress > 0 || course.status === 'En curso'"
                class="h-11 rounded-none bg-[#F5B400] px-6 font-bold text-[#07152B] hover:bg-amber-400"
                @click="emit('continueCourse', course.id)"
              >
                Continuar curso
              </Button>
              <Button
                v-else-if="course.pricing === 'paid'"
                class="h-11 rounded-none bg-[#F5B400] px-6 font-bold text-[#07152B] hover:bg-amber-400"
                @click="emit('addToCart', course.id)"
              >
                Añadir al carrito
              </Button>
              <Button
                v-else
                class="h-11 rounded-none bg-[#F5B400] px-6 font-bold text-[#07152B] hover:bg-amber-400"
                @click="emit('continueCourse', course.id)"
              >
                Inscribirme gratis
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Button
      class="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-none bg-black/35 text-white hover:bg-black/55 active:-translate-y-1/2"
      size="icon"
      variant="ghost"
      type="button"
      aria-label="Curso anterior"
      @click="prev"
    >
      <ChevronLeft class="h-5 w-5" />
    </Button>
    <Button
      class="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-none bg-black/35 text-white hover:bg-black/55 active:-translate-y-1/2"
      size="icon"
      variant="ghost"
      type="button"
      aria-label="Siguiente curso"
      @click="next"
    >
      <ChevronRight class="h-5 w-5" />
    </Button>

    <div
      class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2"
    >
      <button
        v-for="(course, i) in enrichedCourses"
        :key="course.id"
        type="button"
        class="relative h-1.5 overflow-hidden transition-all duration-300"
        :class="
          i === activeIndex
            ? 'w-12 bg-[#F5B400]'
            : 'w-8 bg-white/45 hover:bg-white/65'
        "
        :aria-label="`Ver curso ${i + 1}`"
        @click="goTo(i)"
      >
        <span
          v-if="i === activeIndex && !isPaused"
          class="hero-dot-progress absolute inset-0 bg-[#F5B400]/70"
          :style="{ animationDuration: `${intervalMs}ms` }"
        />
      </button>
    </div>
  </section>
</template>

<style scoped>
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
