<script setup lang="ts">
import { Check, Heart, ShoppingCart, Star } from "lucide-vue-next";
import { computed, ref } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  enrichCourse,
  formatCoursePrice,
  formatCourseRating,
  formatReviewCount,
} from "@/lib/presentacion-curso";
import type { Course } from "@/types/academia";

const props = withDefaults(
  defineProps<{
    course: Course;
    variant?: "light" | "dark";
    inCart?: boolean;
    isFavorite?: boolean;
    showActions?: boolean;
    showDetail?: boolean;
    fluid?: boolean;
  }>(),
  {
    variant: "light",
    inCart: false,
    isFavorite: false,
    showActions: true,
    showDetail: true,
    fluid: false,
  },
);

const emit = defineEmits<{
  toggleFavorite: [];
  addToCart: [];
  continueCourse: [];
  select: [];
}>();

const displayCourse = computed(() => enrichCourse(props.course));

const statusBadge = computed(() => {
  if (displayCourse.value.status === "Completado") return "Completado";
  if (
    displayCourse.value.progress > 0 ||
    displayCourse.value.status === "En curso"
  )
    return "En curso";
  if (displayCourse.value.bestseller) return "Lo más vendido";
  if (displayCourse.value.pricing === "free") return "Gratis";
  return null;
});

const statusBadgeClass = computed(() => {
  if (displayCourse.value.status === "Completado")
    return "border-border bg-muted text-muted-foreground";
  if (
    displayCourse.value.progress > 0 ||
    displayCourse.value.status === "En curso"
  ) {
    return "border-primary/20 bg-primary/10 text-primary";
  }
  if (displayCourse.value.bestseller)
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return "border-border bg-card text-muted-foreground";
});

const detailBullets = computed(() => [
  `Aprende a aplicar ${displayCourse.value.category.toLowerCase()} en flujos reales de obra.`,
  `Refuerza criterios para trabajo de campo, oficina técnica y control operativo.`,
  `Suma evidencias para tu CV inteligente y recomendaciones laborales.`,
]);

const isDark = computed(() => props.variant === "dark");

/* ── Hover detail panel: dynamic positioning ── */
const cardRef = ref<HTMLElement | null>(null);
const isHovered = ref(false);
const panelSide = ref<"right" | "left">("right");
const panelVerticalOffset = ref(0);

const PANEL_WIDTH = 340;
const PANEL_GAP = 14; // 0.875rem

let hoverTimeout: ReturnType<typeof setTimeout> | undefined;

function onCardEnter() {
  if (!props.showDetail) return;
  // Small delay to prevent flicker on fast mouse passes
  hoverTimeout = setTimeout(() => {
    calculatePanelPosition();
    isHovered.value = true;
  }, 80);
}

function onCardLeave() {
  clearTimeout(hoverTimeout);
  isHovered.value = false;
}

function calculatePanelPosition() {
  if (!cardRef.value) return;

  const rect = cardRef.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Check if there's enough space on the right
  const spaceRight = viewportWidth - rect.right;
  const spaceLeft = rect.left;

  if (spaceRight >= PANEL_WIDTH + PANEL_GAP + 16) {
    panelSide.value = "right";
  } else if (spaceLeft >= PANEL_WIDTH + PANEL_GAP + 16) {
    panelSide.value = "left";
  } else {
    // Default to the side with more space
    panelSide.value = spaceRight >= spaceLeft ? "right" : "left";
  }

  // Vertical adjustment: prevent the panel from going off-screen bottom
  const panelEstimatedHeight = 380;
  const panelBottom = rect.top + panelEstimatedHeight;
  if (panelBottom > viewportHeight - 16) {
    panelVerticalOffset.value = Math.min(
      rect.top - 16, // Don't push higher than the top of viewport
      panelBottom - viewportHeight + 16,
    );
  } else {
    panelVerticalOffset.value = 0;
  }
}
</script>

<template>
  <article
    ref="cardRef"
    class="course-trend-card group relative flex cursor-pointer snap-start flex-col rounded-none border shadow-sm transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    :class="[
      isDark
        ? 'border-white/10 bg-card/5 text-white'
        : 'border-border bg-card text-card-foreground',
      fluid ? 'w-full shrink' : 'w-[280px] shrink-0',
      isHovered ? 'course-trend-card--active' : '',
    ]"
    role="link"
    tabindex="0"
    :aria-label="`Ver detalles del curso ${displayCourse.title}`"
    @mouseenter="onCardEnter"
    @mouseleave="onCardLeave"
    @click="emit('select')"
    @keydown.enter.self.prevent="emit('select')"
    @keydown.space.self.prevent="emit('select')"
  >
    <div
      class="relative aspect-video w-full overflow-hidden rounded-none border-x-0 border-t-0 text-left transition"
      :class="
        isDark ? 'border-white/10 bg-card/5' : 'border-border bg-muted'
      "
    >
      <img
        :src="displayCourse.image"
        :alt="displayCourse.title"
        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
      <div
        v-if="isDark"
        :class="[
          'absolute inset-0 bg-linear-to-br opacity-35',
          displayCourse.imageTone,
        ]"
      />

      <Button
        v-if="showActions"
        class="absolute right-3 top-3 h-8 w-8 rounded-none border border-border bg-card/95 shadow-sm hover:bg-card"
        size="icon"
        variant="outline"
        type="button"
        aria-label="Agregar a favoritos"
        @click.stop="emit('toggleFavorite')"
      >
        <Heart
          class="h-4 w-4"
          :class="isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'"
        />
      </Button>
    </div>

    <div class="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
      <h3
        class="line-clamp-2 text-base font-bold leading-snug transition group-hover:text-primary"
        :class="isDark ? 'text-white' : 'text-foreground'"
      >
        {{ displayCourse.title }}
      </h3>

      <p
        class="text-sm"
        :class="isDark ? 'text-white/65' : 'text-muted-foreground'"
      >
        {{ displayCourse.instructor }}
      </p>

      <div class="flex flex-wrap items-center gap-2">
        <Badge
          v-if="statusBadge"
          :class="
            cn(
              'rounded-none px-2.5 py-0.5 text-[11px] font-semibold leading-5 shadow-none',
              isDark
                ? 'border-white/10 bg-card/90 text-foreground'
                : statusBadgeClass,
            )
          "
          variant="outline"
        >
          {{ statusBadge }}
        </Badge>

        <div
          class="flex items-center gap-1 text-sm font-bold text-accent"
        >
          <Star class="h-3.5 w-3.5 fill-current" />
          <span>{{ formatCourseRating(displayCourse.rating!) }}</span>
        </div>

        <span
          class="text-xs"
          :class="isDark ? 'text-white/55' : 'text-muted-foreground'"
        >
          ({{ formatReviewCount(displayCourse.reviewCount!) }} valoraciones)
        </span>
      </div>

      <div class="mt-auto flex items-end justify-between gap-2 pt-1">
        <strong
          class="text-lg font-black"
          :class="isDark ? 'text-white' : 'text-foreground'"
        >
          {{ formatCoursePrice(displayCourse) }}
        </strong>

        <Button
          v-if="
            showActions &&
            (displayCourse.progress > 0 || displayCourse.status === 'En curso')
          "
          size="sm"
          @click.stop="emit('continueCourse')"
        >
          Continuar
        </Button>
        <Button
          v-else-if="showActions && displayCourse.pricing === 'paid'"
          size="sm"
          :variant="inCart ? 'outline' : 'default'"
          @click.stop="emit('addToCart')"
        >
          <ShoppingCart class="h-4 w-4" />
          {{ inCart ? "En carrito" : "Comprar" }}
        </Button>
        <Button
          v-else-if="showActions"
          size="sm"
          variant="outline"
          @click.stop="emit('continueCourse')"
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
          class="absolute top-20 h-4 w-4 rotate-45 border-border bg-card"
          :class="[
            panelSide === 'right'
              ? '-left-2 border-b border-l'
              : '-right-2 border-t border-r',
          ]"
        />

        <h4 class="text-base font-bold leading-snug text-foreground">
          {{ displayCourse.title }}
        </h4>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            v-if="statusBadge"
            :class="
              cn(
                'rounded-none px-2.5 py-0.5 text-[11px] font-semibold leading-5 shadow-none',
                statusBadgeClass,
              )
            "
            variant="outline"
          >
            {{ statusBadge }}
          </Badge>
          <span
            class="rounded-none border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
          >
            {{ displayCourse.level }}
          </span>
        </div>

        <p class="mt-3 text-xs text-muted-foreground">
          {{ displayCourse.duration }} en total · {{ displayCourse.mode }} ·
          {{ displayCourse.category }}
        </p>

        <p class="mt-4 text-sm leading-6 text-muted-foreground">
          Formación práctica para mejorar tu dominio de Tukuy Obra y fortalecer
          tu perfil profesional en proyectos de obra.
        </p>

        <ul class="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
          <li
            v-for="bullet in detailBullets"
            :key="bullet"
            class="grid grid-cols-[18px_1fr] gap-2"
          >
            <Check class="mt-1 h-4 w-4 text-foreground" />
            <span>{{ bullet }}</span>
          </li>
        </ul>

        <Button
          class="mt-5 w-full"
          type="button"
          @click.stop="
            displayCourse.pricing === 'paid'
              ? emit('addToCart')
              : emit('continueCourse')
          "
        >
          {{
            displayCourse.pricing === "paid"
              ? "Añadir al carrito"
              : "Inscribirme al curso"
          }}
        </Button>
      </div>
    </Transition>
  </article>
</template>

<style scoped>
/* ── z-index & elevation ── */
.course-trend-card {
  z-index: 1;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    z-index 0s;
}

.course-trend-card:hover,
.course-trend-card--active {
  z-index: 20;
  transform: translateY(-4px);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* ── Detail panel ── */
.course-detail-panel {
  width: 340px;
  border-radius: 0;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  padding: 1.25rem;
  color: var(--color-card-foreground);
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
}

/* ── Transition ── */
.course-detail-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.course-detail-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.course-detail-enter-from,
.course-detail-leave-to {
  opacity: 0;
  transform: translateX(6px);
}
</style>
