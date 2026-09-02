<script setup lang="ts">
import { Check, Heart, Loader2, ShoppingCart, Star, Video } from "lucide-vue-next";
import { computed, ref } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ImagenPortadaCurso from "@/components/shared/ImagenPortadaCurso.vue";
import { cursoEstaMatriculado, cursoEsDePago } from "@/lib/acceso-curso";
import {
  cursoEstaCompletado,
  cursoOfreceCertificado,
} from "@/lib/curso-certificado";
import { cn } from "@/lib/utils";
import {
  enrichCourse,
  etiquetaModalidadCurso,
  claseModalidadCurso,
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
    /** En Mi aprendizaje: avance y metadatos en lugar de precio. */
    modoAprendizaje?: boolean;
    /** Landing / catálogo público: sin matrícula ni botones de inscripción. */
    modoCatalogoPublico?: boolean;
    inscribiendo?: boolean;
  }>(),
  {
    variant: "light",
    inCart: false,
    isFavorite: false,
    showActions: true,
    showDetail: true,
    fluid: false,
    modoAprendizaje: false,
    modoCatalogoPublico: false,
    inscribiendo: false,
  },
);

const emit = defineEmits<{
  toggleFavorite: [];
  addToCart: [];
  continueCourse: [];
  select: [];
  solicitarCertificado: [];
}>();

const displayCourse = computed(() =>
  enrichCourse(props.course),
);

const esClaseEnVivo = computed(
  () => displayCourse.value.mode === "Presencial",
);

const cursoPropio = computed(
  () =>
    !props.modoCatalogoPublico &&
    !props.inscribiendo &&
    (props.modoAprendizaje || cursoEstaMatriculado(displayCourse.value)),
);

const progreso = computed(() =>
  Math.min(100, Math.max(0, displayCourse.value.progress ?? 0)),
);

const etiquetaProgreso = computed(() => {
  if (displayCourse.value.status === "Completado" || progreso.value >= 100) {
    return "Completado";
  }
  if (progreso.value <= 0) return "Sin iniciar";
  return `${progreso.value}% completado`;
});

const metaAprendizaje = computed(() =>
  [
    displayCourse.value.duration,
    displayCourse.value.level,
    etiquetaModalidadCurso(displayCourse.value.mode),
  ]
    .filter(Boolean)
    .join(" · "),
);

const statusBadge = computed(() => {
  if (props.modoCatalogoPublico) {
    if (displayCourse.value.bestseller) return "Lo más vendido";
    if (displayCourse.value.pricing === "free") return "Gratis";
    return null;
  }
  if (displayCourse.value.status === "Completado" || progreso.value >= 100) {
    return "Completado";
  }
  if (cursoPropio.value) {
    return progreso.value > 0 ? "En curso" : "Inscrito";
  }
  if (displayCourse.value.alcance === "INTERNO") return "Restringido";
  if (displayCourse.value.origen === "entidad") return "Entidad";
  if (displayCourse.value.bestseller) return "Lo más vendido";
  if (displayCourse.value.pricing === "free") return "Gratis";
  return null;
});

const etiquetaModalidad = computed(() =>
  etiquetaModalidadCurso(displayCourse.value.mode),
);

const claseModalidad = computed(() =>
  claseModalidadCurso(displayCourse.value.mode),
);

const puedeContinuar = computed(() => cursoPropio.value);

const etiquetaContinuar = computed(() =>
  cursoEstaCompletado(displayCourse.value) ? "Revisar" : "Continuar",
);

const muestraCertificado = computed(
  () =>
    props.modoAprendizaje &&
    cursoEstaCompletado(displayCourse.value) &&
    cursoOfreceCertificado(displayCourse.value),
);

const etiquetaAccionDetalle = computed(() => {
  if (props.inscribiendo) return "Inscribiendo…";
  if (cursoPropio.value) {
    return displayCourse.value.status === "Completado" || progreso.value >= 100
      ? "Revisar curso"
      : "Continuar curso";
  }
  if (displayCourse.value.alcance === "INTERNO") return "Ver requisitos";
  if (cursoEsDePago(displayCourse.value)) {
    return props.inCart ? "En carrito" : "Agregar";
  }
  return "Inscribirme al curso";
});

function emitirAccionPrincipal() {
  if (props.inscribiendo) return;
  if (cursoPropio.value) {
    emit("continueCourse");
    return;
  }
  if (displayCourse.value.alcance === "INTERNO") {
    emit("select");
    return;
  }
  if (cursoEsDePago(displayCourse.value)) {
    emit("addToCart");
    return;
  }
  emit("continueCourse");
}

const statusBadgeClass = computed(() => {
  if (displayCourse.value.status === "Completado" || progreso.value >= 100) {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (cursoPropio.value) {
    return "border-primary/30 bg-primary/15 text-primary";
  }
  if (displayCourse.value.alcance === "INTERNO")
    return "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (displayCourse.value.origen === "entidad")
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (displayCourse.value.bestseller)
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return "border-border bg-card text-muted-foreground";
});

const marcoCursoPropio = computed(() =>
  props.modoCatalogoPublico
    ? ""
    : displayCourse.value.status === "Completado" || progreso.value >= 100
      ? "border-emerald-500/45 bg-emerald-500/[0.06] shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]"
      : "border-primary/45 bg-primary/[0.06] shadow-[inset_0_0_0_1px_rgba(77,127,194,0.22)]",
);

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
        : cursoPropio
          ? marcoCursoPropio
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
    <div class="relative aspect-video w-full shrink-0">
      <ImagenPortadaCurso
        :src="displayCourse.image"
        :alt="displayCourse.title"
        :object-position="displayCourse.imagenPosicion"
        hover-escala
        :contenedor-class="
          cn(
            'aspect-video h-full w-full rounded-none border-x-0 border-t-0 text-left transition',
            isDark ? 'border-white/10 bg-card/5' : 'border-border bg-muted',
          )
        "
      />
      <div
        v-if="isDark"
        class="pointer-events-none absolute inset-0"
      >
        <div
          :class="[
            'absolute inset-0 bg-linear-to-br opacity-35',
            displayCourse.imageTone,
          ]"
        />
      </div>

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

      <Badge
        class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur-sm"
        :class="claseModalidad"
        variant="outline"
      >
        <Video
          v-if="esClaseEnVivo"
          class="h-3 w-3"
        />
        {{ etiquetaModalidad }}
      </Badge>
    </div>

    <div class="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
      <h3
        class="line-clamp-2 text-base font-bold leading-snug transition"
        :class="
          isDark
            ? 'text-white group-hover:text-accent'
            : 'text-foreground group-hover:text-primary'
        "
      >
        {{ displayCourse.title }}
      </h3>

      <p
        v-if="displayCourse.instructor"
        class="text-sm"
        :class="isDark ? 'text-white/65' : 'text-muted-foreground'"
      >
        {{ displayCourse.instructor }}
      </p>
      <p
        v-if="displayCourse.organizacionNombre"
        class="truncate text-xs font-semibold text-primary"
      >
        {{ displayCourse.organizacionNombre }}
      </p>

      <div
        v-if="!modoAprendizaje"
        class="flex flex-wrap items-center gap-2"
      >
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
          v-if="displayCourse.rating"
          class="flex items-center gap-1 text-sm font-bold text-accent"
        >
          <Star class="h-3.5 w-3.5 fill-current" />
          <span>{{ formatCourseRating(displayCourse.rating) }}</span>
        </div>

        <span
          v-if="displayCourse.reviewCount"
          class="text-xs"
          :class="isDark ? 'text-white/55' : 'text-muted-foreground'"
        >
          ({{ formatReviewCount(displayCourse.reviewCount) }} valoraciones)
        </span>
      </div>

      <div v-else class="grid gap-2">
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
          <span
            class="text-xs font-semibold"
            :class="isDark ? 'text-white/70' : 'text-muted-foreground'"
          >
            {{ displayCourse.category }}
          </span>
        </div>
        <p
          class="text-xs"
          :class="isDark ? 'text-white/55' : 'text-muted-foreground'"
        >
          {{ metaAprendizaje }}
        </p>
      </div>

      <template v-if="modoAprendizaje">
        <div class="mt-auto grid gap-2.5 pt-2">
          <div class="flex items-center justify-between gap-2">
            <span
              class="text-xs font-semibold uppercase tracking-wide"
              :class="isDark ? 'text-white/60' : 'text-muted-foreground'"
            >
              Avance
            </span>
            <strong
              class="text-sm font-black tabular-nums"
              :class="isDark ? 'text-white' : 'text-primary'"
            >
              {{ progreso }}%
            </strong>
          </div>
          <div
            class="relative h-2.5 w-full overflow-hidden rounded-none"
            :class="isDark ? 'bg-white/15' : 'bg-muted'"
            role="progressbar"
            :aria-valuenow="progreso"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-label="`Avance del curso: ${progreso}%`"
          >
            <div
              class="h-full rounded-none bg-primary transition-[width] duration-500 ease-out"
              :class="progreso >= 100 ? 'bg-emerald-500' : 'bg-primary'"
              :style="{ width: `${progreso}%` }"
            />
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span
              class="text-xs"
              :class="isDark ? 'text-white/55' : 'text-muted-foreground'"
            >
              {{ etiquetaProgreso }}
            </span>
            <div
              v-if="showActions"
              class="flex shrink-0 flex-wrap items-center justify-end gap-2"
            >
              <Button
                v-if="muestraCertificado"
                size="sm"
                class="bg-primary text-primary-foreground hover:bg-primary/90"
                @click.stop="emit('solicitarCertificado')"
              >
                Descargar certificado
              </Button>
              <Button
                size="sm"
                :variant="muestraCertificado ? 'outline' : 'default'"
                @click.stop="emit('continueCourse')"
              >
                {{ etiquetaContinuar }}
              </Button>
            </div>
          </div>
        </div>
      </template>

      <div
        v-else-if="cursoPropio"
        class="mt-auto flex items-center justify-between gap-3 pt-1"
      >
        <div class="min-w-0">
          <p
            class="text-xs font-bold uppercase tracking-wide"
            :class="isDark ? 'text-accent' : 'text-primary'"
          >
            {{
              cursoEstaCompletado(displayCourse)
                ? "Completado"
                : "Ya lo tienes"
            }}
          </p>
          <p
            v-if="progreso > 0 && progreso < 100"
            class="mt-0.5 text-xs text-muted-foreground"
          >
            {{ progreso }}% de avance
          </p>
        </div>
        <div
          v-if="showActions"
          class="flex shrink-0 flex-wrap items-center justify-end gap-2"
        >
          <Button
            v-if="muestraCertificado"
            size="sm"
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            @click.stop="emit('solicitarCertificado')"
          >
            Descargar certificado
          </Button>
          <Button
            size="sm"
            :variant="muestraCertificado ? 'outline' : 'default'"
            @click.stop="emit('continueCourse')"
          >
            {{ etiquetaContinuar }}
          </Button>
        </div>
      </div>

      <div
        v-else
        class="mt-auto flex items-end justify-between gap-3 pt-1"
      >
        <strong
          class="text-lg font-black"
          :class="isDark ? 'text-white' : 'text-foreground'"
        >
          {{ formatCoursePrice(displayCourse) }}
        </strong>

        <Button
          v-if="showActions && displayCourse.alcance === 'INTERNO'"
          size="sm"
          variant="outline"
          @click.stop="emit('continueCourse')"
        >
          Ver acceso
        </Button>
        <Button
          v-else-if="showActions && cursoEsDePago(displayCourse)"
          size="sm"
          :variant="inCart ? 'outline' : 'default'"
          @click.stop="emit('addToCart')"
        >
          <ShoppingCart class="h-4 w-4" />
          {{ inCart ? "En carrito" : "Agregar" }}
        </Button>
        <Button
          v-else-if="showActions"
          size="sm"
          variant="outline"
          :disabled="inscribiendo"
          @click.stop="emit('continueCourse')"
        >
          <Loader2 v-if="inscribiendo" class="h-4 w-4 animate-spin" />
          {{ inscribiendo ? "Inscribiendo…" : "Inscribirme" }}
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
            :class="
              cn(
                'inline-flex items-center gap-1 rounded-none px-2.5 py-0.5 text-[11px] font-semibold leading-5 shadow-none',
                claseModalidad,
              )
            "
            variant="outline"
          >
            <Video
              v-if="esClaseEnVivo"
              class="h-3 w-3"
            />
            {{ etiquetaModalidad }}
          </Badge>
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
          {{ displayCourse.duration }} en total · {{ etiquetaModalidad }} ·
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
          :disabled="inscribiendo"
          @click.stop="emitirAccionPrincipal"
        >
          <Loader2 v-if="inscribiendo" class="mr-2 h-4 w-4 animate-spin" />
          {{ etiquetaAccionDetalle }}
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
