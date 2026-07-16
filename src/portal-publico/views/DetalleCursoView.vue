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

import SiteFooter from "@/components/shared/SiteFooter.vue";
import { Button } from "@/components/ui/button";
import { cursoPublicoService } from "@/api/services/curso-publico.service";
import { useAuth } from "@/composables/useAuth";
import { useCursos } from "@/composables/useCursos";
import {
  enrichCourse,
  formatCourseRating,
  formatReviewCount,
} from "@/lib/presentacion-curso";
import EsqueletoDetalleCurso from "../components/EsqueletoDetalleCurso.vue";
import HeaderPublico from "../components/HeaderPublico.vue";
import type { DetalleCursoPublico } from "@/types/academia";

const route = useRoute();
const router = useRouter();
const { courses, loading } = useCursos();
const { isAuthenticated } = useAuth();

const curso = computed(() =>
  courses.value.find((item) => item.id === String(route.params.cursoId)),
);
const cursoPresentado = computed(() =>
  curso.value ? enrichCourse(curso.value) : null,
);
const detalle = ref<DetalleCursoPublico | null>(null);
const cargandoDetalle = ref(false);

watch(
  curso,
  async (cursoActual) => {
    detalle.value = null;
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
const moduloAbierto = ref<string | null>(null);

watchEffect(() => {
  if (!moduloAbierto.value && detalle.value?.modulos[0]) {
    moduloAbierto.value = detalle.value.modulos[0].id;
  }
});

function alternarModulo(moduloId: string) {
  moduloAbierto.value = moduloAbierto.value === moduloId ? null : moduloId;
}

function irA(destino: string) {
  router.push({ path: "/", hash: destino });
}

function formatPrecio(precio?: number) {
  return `S/ ${(precio ?? 0).toFixed(2).replace(".", ",")}`;
}

function iniciarInscripcion() {
  if (!cursoPresentado.value) return;

  const destino =
    cursoPresentado.value.pricing === "paid"
      ? `/pago/curso/${cursoPresentado.value.id}`
      : "/tukuy-academy/cursos";

  if (isAuthenticated.value) {
    router.push(destino);
    return;
  }

  router.push({ name: "login", query: { continuar: destino } });
}
</script>

<template>
  <div class="min-h-screen bg-white text-[#07152B]">
    <HeaderPublico @ir-a="irA" />

    <main v-if="cursoPresentado && detalle">
      <section class="relative overflow-hidden bg-[#07152B] pb-16 pt-32 text-white">
        <div
          class="pointer-events-none absolute inset-0 bg-linear-to-br from-[#0B3A78] via-[#07152B] to-[#020817]"
        />
        <div
          class="pointer-events-none absolute inset-0 opacity-20"
          style="background-image: linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px); background-size: 96px 96px"
        />

        <div
          class="relative mx-auto grid max-w-360 gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_480px] lg:px-8"
        >
          <div class="self-center py-5">
            <button
              type="button"
              class="mb-9 inline-flex items-center gap-2 text-sm font-bold text-white/65 transition hover:text-white"
              @click="router.push('/#cursos')"
            >
              <ArrowLeft class="h-4 w-4" />
              Volver a cursos
            </button>

            <p
              class="text-sm font-black uppercase tracking-[.25em] text-[#F5B400]"
            >
              {{ cursoPresentado.category }}
            </p>
            <h1
              class="mt-4 max-w-4xl text-4xl font-black leading-[1.04] sm:text-5xl xl:text-6xl"
            >
              {{ cursoPresentado.title }}
            </h1>

            <div class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <div class="flex items-center gap-2">
                <strong class="text-lg text-[#F5B400]">
                  {{ formatCourseRating(cursoPresentado.rating!) }}
                </strong>
                <span class="flex text-[#F5B400]">
                  <Star
                    v-for="indice in 5"
                    :key="indice"
                    class="h-4 w-4"
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
              <span class="h-4 w-px bg-white/25" />
              <span class="inline-flex items-center gap-2 text-sm text-white/75">
                <Clock3 class="h-4 w-4 text-[#F5B400]" />
                {{ cursoPresentado.duration }}
              </span>
              <span class="border border-white/20 px-3 py-1 text-xs font-bold">
                {{ cursoPresentado.level }}
              </span>
              <span class="border border-white/20 px-3 py-1 text-xs font-bold">
                {{ cursoPresentado.mode }}
              </span>
            </div>

            <div class="mt-8 flex items-center gap-4 border-l-4 border-[#F5B400] pl-5">
              <img
                :src="detalle.instructor.foto"
                :alt="detalle.instructor.nombre"
                class="h-14 w-14 object-cover"
              />
              <div>
                <p class="text-xs uppercase tracking-widest text-white/50">
                  Formación a cargo de
                </p>
                <p class="mt-1 font-bold">{{ detalle.instructor.nombre }}</p>
                <p class="text-sm text-white/60">
                  {{ detalle.instructor.cargo }}
                </p>
              </div>
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
                class="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-2 bg-black/65 px-3 py-1.5 text-xs font-bold backdrop-blur"
              >
                <Video class="h-4 w-4 text-[#F5B400]" />
                Vista previa del curso
              </span>
            </div>

            <div class="p-6">
              <div
                v-if="cursoPresentado.pricing === 'paid'"
                class="flex flex-wrap items-end gap-3"
              >
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
              <strong v-else class="text-3xl font-black text-[#F5B400]">
                Acceso gratuito
              </strong>

              <Button
                class="mt-6 h-13 w-full bg-[#F5B400] px-6 text-[#07152B] hover:bg-amber-400"
                @click="iniciarInscripcion"
              >
                {{
                  cursoPresentado.pricing === "paid"
                    ? isAuthenticated
                      ? "Comprar curso"
                      : "Iniciar sesión para comprar"
                    : isAuthenticated
                      ? "Inscribirme gratis"
                      : "Iniciar sesión para inscribirme"
                }}
                <ArrowRight class="h-4 w-4" />
              </Button>

              <div class="mt-5 grid gap-3 border-t border-white/15 pt-5">
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

      <section class="bg-[#F5F8FC] py-16">
        <div
          class="mx-auto grid max-w-360 gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8"
        >
          <div>
            <p
              class="text-sm font-black uppercase tracking-[.25em] text-[#0B3A78]"
            >
              Contenido del curso
            </p>
            <h2 class="mt-3 text-4xl font-black sm:text-5xl">
              Temas que aprenderás
            </h2>
            <p class="mt-4 text-sm text-[#64748B]">
              {{ detalle.modulos.length }} módulos ·
              {{ detalle.modulos.reduce((total, modulo) => total + modulo.temas.length, 0) }}
              temas
            </p>

            <div class="mt-8 border-t border-[#CBD8E8] bg-white">
              <article
                v-for="(modulo, indice) in detalle.modulos"
                :key="modulo.id"
                class="border-b border-[#CBD8E8]"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-4 px-5 py-5 text-left transition hover:bg-blue-50/60"
                  :aria-expanded="moduloAbierto === modulo.id"
                  @click="alternarModulo(modulo.id)"
                >
                  <span
                    class="grid h-10 w-10 shrink-0 place-items-center bg-[#07152B] text-sm font-black text-white"
                  >
                    {{ String(indice + 1).padStart(2, "0") }}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-lg font-black">
                      {{ modulo.titulo }}
                    </span>
                    <span class="mt-1 block text-xs text-[#64748B]">
                      {{ modulo.temas.length }} temas
                    </span>
                  </span>
                  <ChevronDown
                    class="h-5 w-5 shrink-0 transition-transform duration-300"
                    :class="moduloAbierto === modulo.id ? 'rotate-180' : ''"
                  />
                </button>

                <div
                  v-if="moduloAbierto === modulo.id"
                  class="border-t border-[#E8EDF5] bg-[#F8FAFD] px-5 py-2 sm:pl-[76px]"
                >
                  <div
                    v-for="(tema, temaIndice) in modulo.temas"
                    :key="tema"
                    class="flex items-center gap-3 border-b border-[#E8EDF5] py-4 last:border-b-0"
                  >
                    <Play class="h-4 w-4 shrink-0 text-[#0B3A78]" />
                    <span class="text-sm font-semibold">
                      {{ temaIndice + 1 }}. {{ tema }}
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <aside class="self-start border-t-4 border-[#F5B400] bg-white p-7 shadow-sm lg:sticky lg:top-28">
            <p
              class="text-xs font-black uppercase tracking-[.2em] text-[#0B3A78]"
            >
              Conoce al instructor
            </p>
            <div class="mt-5 flex items-center gap-4">
              <img
                :src="detalle.instructor.foto"
                :alt="detalle.instructor.nombre"
                class="h-24 w-24 object-cover"
              />
              <div>
                <h2 class="text-xl font-black">
                  {{ detalle.instructor.nombre }}
                </h2>
                <p class="mt-1 text-sm leading-5 text-[#52657A]">
                  {{ detalle.instructor.cargo }}
                </p>
              </div>
            </div>

            <p class="mt-6 text-sm leading-7 text-[#52657A]">
              {{ detalle.instructor.biografia }}
            </p>

            <div class="mt-6 border-t border-[#E8EDF5] pt-5">
              <h3 class="font-black">Experiencia profesional</h3>
              <ul class="mt-4 grid gap-3">
                <li
                  v-for="experiencia in detalle.instructor.experiencia"
                  :key="experiencia"
                  class="flex items-start gap-3 text-sm leading-6 text-[#52657A]"
                >
                  <Check class="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  {{ experiencia }}
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>

    <EsqueletoDetalleCurso v-else-if="loading || cargandoDetalle" />

    <main
      v-else
      class="grid min-h-screen place-items-center bg-[#F5F8FC] px-5 text-center"
    >
      <div>
        <p class="text-sm font-black uppercase tracking-[.2em] text-[#0B3A78]">
          Curso no encontrado
        </p>
        <h1 class="mt-3 text-4xl font-black">Este curso no está disponible</h1>
        <Button class="mt-7" @click="router.push('/#cursos')">
          Volver al catálogo
        </Button>
      </div>
    </main>

    <SiteFooter variant="dark" links-to-login />
  </div>
</template>
