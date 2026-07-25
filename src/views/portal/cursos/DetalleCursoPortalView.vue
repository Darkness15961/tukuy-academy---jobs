<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Play,
  ShieldCheck,
  Star,
  Video,
} from "lucide-vue-next";
import { computed, ref, watch, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { cursoPublicoService } from "@/api/services/curso-publico.service";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCourseRating,
  formatReviewCount,
  enrichCourse,
} from "@/lib/presentacion-curso";
import { cursoEstaMatriculado } from "@/lib/acceso-curso";
import type { DetalleCursoPublico } from "@/types/academia";
import { usePortalContext } from "../composables/usePortalContext";

const route = useRoute();
const router = useRouter();
const portal = usePortalContext();

const cursoId = computed(() => String(route.params.cursoId));

const curso = computed(() =>
  portal.courses.value.find((item) => item.id === cursoId.value),
);
const cursoPresentado = computed(() =>
  curso.value ? enrichCourse(curso.value) : null,
);
const yaMatriculado = computed(() =>
  cursoPresentado.value ? cursoEstaMatriculado(cursoPresentado.value) : false,
);
const progreso = computed(() =>
  Math.min(100, Math.max(0, cursoPresentado.value?.progress ?? 0)),
);

const detalle = ref<DetalleCursoPublico | null>(null);
const cargandoDetalle = ref(false);
const moduloAbierto = ref<string | null>(null);

watch(
  curso,
  async (cursoActual) => {
    detalle.value = null;
    moduloAbierto.value = null;
    if (!cursoActual) return;
    cargandoDetalle.value = true;
    try {
      detalle.value = await cursoPublicoService.obtenerDetalle(cursoActual);
    } finally {
      cargandoDetalle.value = false;
    }
  },
  { immediate: true },
);

watchEffect(() => {
  if (!moduloAbierto.value && detalle.value?.modulos[0]) {
    moduloAbierto.value = detalle.value.modulos[0].id;
  }
});

function formatPrecio(precio?: number) {
  return `S/ ${(precio ?? 0).toFixed(2).replace(".", ",")}`;
}

function alternarModulo(moduloId: string) {
  moduloAbierto.value = moduloAbierto.value === moduloId ? null : moduloId;
}

function volverAlCatalogo() {
  void router.push("/tukuy-academy/cursos");
}

function continuarCurso() {
  if (!curso.value) return;
  void portal.openSimuladorCurso(curso.value);
}

function agregarAlCarrito() {
  if (!curso.value) return;
  portal.handleAddToCart(curso.value.id);
}

function comprarAhora() {
  if (!curso.value) return;
  portal.comprarAhora(curso.value.id);
}

function accionPrincipal() {
  if (!cursoPresentado.value) return;
  if (yaMatriculado.value) {
    continuarCurso();
    return;
  }
  if (cursoPresentado.value.pricing === "paid") {
    comprarAhora();
    return;
  }
  continuarCurso();
}

const etiquetaPrincipal = computed(() => {
  if (yaMatriculado.value) {
    return progreso.value >= 100 ? "Revisar curso" : "Continuar curso";
  }
  if (cursoPresentado.value?.pricing === "paid") return "Comprar ahora";
  return "Inscribirme gratis";
});
</script>

<template>
  <PortalSection wide :centered="false">
    <div v-if="cursoPresentado && detalle" class="grid gap-0">
      <section
        class="relative overflow-hidden border border-border bg-[#07152B] text-white"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-linear-to-br from-[#0B3A78]/80 via-[#07152B] to-[#020817]"
        />
        <div
          class="relative grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_min(100%,420px)] lg:gap-10 lg:p-8"
        >
          <div>
            <button
              type="button"
              class="mb-6 inline-flex items-center gap-2 text-sm font-bold text-white/65 transition hover:text-white"
              @click="volverAlCatalogo"
            >
              <ArrowLeft class="h-4 w-4" />
              Volver al catálogo
            </button>

            <p
              class="text-sm font-black uppercase tracking-[.2em] text-[#F5B400]"
            >
              {{ cursoPresentado.category }}
            </p>
            <h1
              class="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl"
            >
              {{ cursoPresentado.title }}
            </h1>

            <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div class="flex items-center gap-2">
                <strong class="text-[#F5B400]">
                  {{ formatCourseRating(cursoPresentado.rating!) }}
                </strong>
                <span class="flex text-[#F5B400]">
                  <Star
                    v-for="indice in 5"
                    :key="indice"
                    class="h-3.5 w-3.5"
                    :class="
                      indice <= Math.round(cursoPresentado.rating!)
                        ? 'fill-current'
                        : 'opacity-35'
                    "
                  />
                </span>
                <span class="text-sm text-white/60">
                  {{ formatReviewCount(cursoPresentado.reviewCount!) }}
                  valoraciones
                </span>
              </div>
              <span class="inline-flex items-center gap-2 text-sm text-white/75">
                <Clock3 class="h-4 w-4 text-[#F5B400]" />
                {{ cursoPresentado.duration }}
              </span>
              <span class="border border-white/20 px-2.5 py-1 text-xs font-bold">
                {{ cursoPresentado.level }}
              </span>
              <span class="border border-white/20 px-2.5 py-1 text-xs font-bold">
                {{ cursoPresentado.mode }}
              </span>
            </div>

            <div
              class="mt-7 flex items-center gap-4 border-l-4 border-[#F5B400] pl-4"
            >
              <img
                :src="detalle.instructor.foto"
                :alt="detalle.instructor.nombre"
                class="h-12 w-12 object-cover"
              />
              <div>
                <p class="text-xs uppercase tracking-widest text-white/50">
                  Formación a cargo de
                </p>
                <p class="mt-0.5 font-bold">{{ detalle.instructor.nombre }}</p>
                <p class="text-sm text-white/60">
                  {{ detalle.instructor.cargo }}
                </p>
              </div>
            </div>

            <div
              v-if="yaMatriculado"
              class="mt-7 max-w-md border border-white/15 bg-black/25 p-4"
            >
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-white/70">Tu avance</span>
                <strong class="tabular-nums text-[#F5B400]">{{ progreso }}%</strong>
              </div>
              <Progress
                :model-value="progreso"
                class="mt-2 h-2.5 rounded-none bg-white/15"
              />
            </div>
          </div>

          <aside class="border border-white/20 bg-[#020817] shadow-2xl">
            <div class="relative aspect-video bg-black">
              <video
                class="h-full w-full object-cover"
                controls
                preload="metadata"
                :poster="cursoPresentado.image"
              >
                <source :src="detalle.videoPresentacion" type="video/mp4" />
                Tu navegador no permite reproducir este video.
              </video>
              <span
                class="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 bg-black/65 px-2.5 py-1 text-xs font-bold backdrop-blur"
              >
                <Video class="h-3.5 w-3.5 text-[#F5B400]" />
                Vista previa
              </span>
            </div>

            <div class="p-5">
              <template v-if="yaMatriculado">
                <strong class="text-2xl font-black text-[#F5B400]">
                  Ya tienes acceso
                </strong>
                <p class="mt-1 text-sm text-white/60">
                  Continúa desde donde lo dejaste.
                </p>
              </template>
              <template v-else-if="cursoPresentado.pricing === 'paid'">
                <div class="flex flex-wrap items-end gap-3">
                  <strong class="text-3xl font-black text-white">
                    {{ formatPrecio(cursoPresentado.price) }}
                  </strong>
                  <span
                    v-if="detalle.precioAnterior"
                    class="pb-1 text-base text-white/45 line-through"
                  >
                    {{ formatPrecio(detalle.precioAnterior) }}
                  </span>
                  <span
                    v-if="detalle.descuento"
                    class="mb-1 bg-[#F5B400] px-2 py-1 text-xs font-black text-[#07152B]"
                  >
                    -{{ detalle.descuento }}%
                  </span>
                </div>
              </template>
              <strong v-else class="text-2xl font-black text-[#F5B400]">
                Acceso gratuito
              </strong>

              <div
                v-if="cursoPresentado.pricing === 'paid' && !yaMatriculado"
                class="mt-5 grid gap-2"
              >
                <Button
                  class="h-12 w-full bg-[#F5B400] px-6 text-[#07152B] hover:bg-amber-400"
                  @click="comprarAhora"
                >
                  Comprar ahora
                  <ArrowRight class="h-4 w-4" />
                </Button>
                <Button
                  class="h-11 w-full border-white/25 bg-transparent text-white hover:bg-white/10"
                  variant="outline"
                  @click="agregarAlCarrito"
                >
                  {{
                    portal.isInCart(cursoPresentado.id)
                      ? "En carrito"
                      : "Agregar al carrito"
                  }}
                </Button>
              </div>
              <Button
                v-else
                class="mt-5 h-12 w-full bg-[#F5B400] px-6 text-[#07152B] hover:bg-amber-400"
                @click="accionPrincipal"
              >
                {{ etiquetaPrincipal }}
                <ArrowRight class="h-4 w-4" />
              </Button>

              <p
                v-if="portal.mensajeAccesoCurso.value"
                class="mt-3 text-sm text-[#F5B400]"
              >
                {{ portal.mensajeAccesoCurso.value }}
              </p>

              <div class="mt-5 grid gap-2.5 border-t border-white/15 pt-4">
                <p class="flex items-center gap-2 text-sm text-white/70">
                  <Check class="h-4 w-4 text-emerald-400" />
                  Acceso al contenido completo
                </p>
                <p class="flex items-center gap-2 text-sm text-white/70">
                  <ShieldCheck class="h-4 w-4 text-emerald-400" />
                  Certificado verificable al completar
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section class="border border-t-0 border-border bg-muted/40 p-5 sm:p-7 lg:p-8">
        <div
          class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,340px)] lg:gap-10"
        >
          <div>
            <p
              class="text-sm font-black uppercase tracking-[.2em] text-primary"
            >
              Contenido del curso
            </p>
            <h2 class="mt-2 text-2xl font-black text-foreground sm:text-3xl">
              Temas que aprenderás
            </h2>
            <p class="mt-2 text-sm text-muted-foreground">
              {{ detalle.modulos.length }} módulos ·
              {{
                detalle.modulos.reduce(
                  (total, modulo) => total + modulo.temas.length,
                  0,
                )
              }}
              temas
            </p>

            <div class="mt-6 border border-border bg-card">
              <article
                v-for="(modulo, indice) in detalle.modulos"
                :key="modulo.id"
                class="border-b border-border last:border-b-0"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-muted/60 sm:px-5"
                  :aria-expanded="moduloAbierto === modulo.id"
                  @click="alternarModulo(modulo.id)"
                >
                  <span
                    class="grid h-10 w-10 shrink-0 place-items-center bg-primary text-sm font-black text-primary-foreground"
                  >
                    {{ String(indice + 1).padStart(2, "0") }}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block font-black text-foreground">
                      {{ modulo.titulo }}
                    </span>
                    <span class="mt-0.5 block text-xs text-muted-foreground">
                      {{ modulo.temas.length }} temas
                    </span>
                  </span>
                  <ChevronDown
                    class="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300"
                    :class="moduloAbierto === modulo.id ? 'rotate-180' : ''"
                  />
                </button>

                <div
                  v-if="moduloAbierto === modulo.id"
                  class="border-t border-border bg-muted/50 px-4 py-1 sm:pl-[76px]"
                >
                  <div
                    v-for="(tema, temaIndice) in modulo.temas"
                    :key="tema"
                    class="flex items-center gap-3 border-b border-border py-3.5 last:border-b-0"
                  >
                    <Play class="h-4 w-4 shrink-0 text-primary" />
                    <span class="text-sm font-semibold text-foreground">
                      {{ temaIndice + 1 }}. {{ tema }}
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <aside
            class="self-start border border-border border-t-4 border-t-[#F5B400] bg-card p-6 shadow-sm lg:sticky lg:top-24"
          >
            <p
              class="text-xs font-black uppercase tracking-[.15em] text-primary"
            >
              Conoce al instructor
            </p>
            <div class="mt-4 flex items-center gap-4">
              <img
                :src="detalle.instructor.foto"
                :alt="detalle.instructor.nombre"
                class="h-20 w-20 object-cover"
              />
              <div>
                <h2 class="text-lg font-black text-foreground">
                  {{ detalle.instructor.nombre }}
                </h2>
                <p class="mt-1 text-sm leading-5 text-muted-foreground">
                  {{ detalle.instructor.cargo }}
                </p>
              </div>
            </div>

            <p class="mt-5 text-sm leading-7 text-muted-foreground">
              {{ detalle.instructor.biografia }}
            </p>

            <div class="mt-5 border-t border-border pt-4">
              <h3 class="font-black text-foreground">Experiencia profesional</h3>
              <ul class="mt-3 grid gap-2.5">
                <li
                  v-for="experiencia in detalle.instructor.experiencia"
                  :key="experiencia"
                  class="flex items-start gap-2.5 text-sm leading-6 text-muted-foreground"
                >
                  <Check class="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  {{ experiencia }}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </div>

    <div
      v-else-if="portal.coursesLoading.value || cargandoDetalle"
      class="grid gap-6 border border-border bg-card p-6"
      aria-busy="true"
    >
      <Skeleton class="h-8 w-48" />
      <Skeleton class="h-12 w-full max-w-2xl" />
      <div class="grid gap-6 lg:grid-cols-2">
        <Skeleton class="aspect-video w-full" />
        <div class="grid gap-3">
          <Skeleton class="h-6 w-40" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
        </div>
      </div>
    </div>

    <div
      v-else
      class="grid place-items-center border border-border bg-card px-5 py-16 text-center"
    >
      <div>
        <p class="text-sm font-black uppercase tracking-[.15em] text-primary">
          Curso no encontrado
        </p>
        <h1 class="mt-3 text-3xl font-black text-foreground">
          Este curso no está disponible
        </h1>
        <Button class="mt-6" @click="volverAlCatalogo">
          Volver al catálogo
        </Button>
      </div>
    </div>
  </PortalSection>
</template>
