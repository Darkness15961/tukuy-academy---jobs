<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { BannerPortalAlumno } from "@/api/services/portal-banners.service";
import CapaFiltroBanner from "@/components/shared/CapaFiltroBanner.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const props = withDefaults(
  defineProps<{
    slides: BannerPortalAlumno[];
    intervalMs?: number;
  }>(),
  { intervalMs: 5000 },
);

const emit = defineEmits<{
  cta: [slide: BannerPortalAlumno];
}>();

const activeIndex = ref(0);
const isPaused = ref(false);

const visibles = computed(() =>
  props.slides.filter((s) => s.activo !== false && s.imagenUrl?.trim()),
);

let timer: ReturnType<typeof setInterval> | undefined;

function startAutoplay() {
  stopAutoplay();
  timer = setInterval(() => {
    if (!isPaused.value && visibles.value.length > 1) {
      activeIndex.value = (activeIndex.value + 1) % visibles.value.length;
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
  const len = visibles.value.length;
  if (!len) return;
  goTo((activeIndex.value - 1 + len) % len);
}

function next() {
  const len = visibles.value.length;
  if (!len) return;
  goTo((activeIndex.value + 1) % len);
}

onMounted(startAutoplay);
onBeforeUnmount(stopAutoplay);

watch(
  () => visibles.value.length,
  () => {
    activeIndex.value = 0;
    startAutoplay();
  },
);
</script>

<template>
  <section
    v-if="visibles.length"
    class="hero-banner relative w-full overflow-hidden bg-[#07152B]"
    @mouseenter="isPaused = true"
    @mouseleave="isPaused = false"
  >
    <div class="hero-banner__viewport relative w-full">
      <div
        v-for="(slide, i) in visibles"
        :key="slide.id"
        class="absolute inset-0 transition-opacity duration-500 ease-out"
        :class="
          i === activeIndex
            ? 'z-[1] opacity-100'
            : 'pointer-events-none z-0 opacity-0'
        "
        :aria-hidden="i !== activeIndex"
      >
        <img
          :src="slide.imagenUrl"
          :alt="slide.titulo"
          class="absolute inset-0 h-full w-full object-cover object-center"
        />

        <!-- Móvil: degradado suave abajo para leer sobre la imagen -->
        <div
          class="pointer-events-none absolute inset-0 bg-linear-to-t from-[#07152B]/92 via-[#07152B]/35 to-transparent sm:hidden"
          aria-hidden="true"
        />
        <!-- Desktop: filtro configurable -->
        <div class="max-sm:hidden absolute inset-0">
          <CapaFiltroBanner :estilo="slide.filtroImagen" />
        </div>

        <div
          class="absolute inset-0 z-[1] flex items-end px-4 pb-10 pt-8 sm:items-center sm:px-10 sm:pb-8 sm:pt-6 lg:px-14"
        >
          <div class="max-w-2xl">
            <!-- Móvil: frase + CTA superpuestos sobre la imagen -->
            <div class="sm:hidden">
              <p class="text-lg font-black leading-snug text-white">
                {{ slide.etiqueta?.trim() || slide.titulo }}
              </p>
              <div v-if="slide.ctaTexto?.trim()" class="mt-4">
                <Button
                  class="h-10 rounded-none bg-[#F5B400] px-5 text-sm font-bold text-[#07152B] shadow-lg hover:bg-amber-400"
                  @click="emit('cta', slide)"
                >
                  {{ slide.ctaTexto }}
                </Button>
              </div>
            </div>

            <!-- Desktop: contenido completo -->
            <div class="hidden sm:block">
              <p
                v-if="slide.etiqueta"
                class="text-xs font-black uppercase tracking-[.25em] text-[#F5B400]"
              >
                {{ slide.etiqueta }}
              </p>

              <div
                v-if="slide.badges?.length"
                class="mt-3 flex flex-wrap items-center gap-2"
              >
                <Badge
                  v-for="(badge, bi) in slide.badges"
                  :key="`${slide.id}-${bi}`"
                  class="rounded-none border-transparent text-[11px] font-black"
                  :class="
                    bi === 0
                      ? 'bg-[#F5B400] text-[#07152B]'
                      : 'border border-white/25 bg-transparent text-white/85'
                  "
                >
                  {{ badge }}
                </Badge>
                <span
                  class="border border-white/25 px-2.5 py-1 text-[11px] font-bold uppercase text-white/85"
                >
                  {{ slide.tipo }}
                </span>
              </div>
              <div v-else class="mt-3">
                <span
                  class="border border-white/25 px-2.5 py-1 text-[11px] font-bold uppercase text-white/85"
                >
                  {{ slide.tipo }}
                </span>
              </div>

              <h2
                class="mt-4 text-3xl font-black leading-tight text-white lg:text-4xl"
              >
                {{ slide.titulo }}
              </h2>

              <p
                v-if="slide.subtitulo"
                class="mt-2 text-base leading-relaxed text-white/70"
              >
                {{ slide.subtitulo }}
              </p>

              <div v-if="slide.ctaTexto?.trim()" class="mt-5 flex flex-wrap gap-3">
                <Button
                  class="h-11 rounded-none bg-[#F5B400] px-6 font-bold text-[#07152B] hover:bg-amber-400"
                  @click="emit('cta', slide)"
                >
                  {{ slide.ctaTexto }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-if="visibles.length > 1">
      <button
        type="button"
        class="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center bg-black/40 text-white hover:bg-black/60"
        aria-label="Anterior"
        @click="prev"
      >
        <ChevronLeft class="h-5 w-5" />
      </button>
      <button
        type="button"
        class="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center bg-black/40 text-white hover:bg-black/60"
        aria-label="Siguiente"
        @click="next"
      >
        <ChevronRight class="h-5 w-5" />
      </button>
      <div
        class="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2"
      >
        <button
          v-for="(_, i) in visibles"
          :key="i"
          type="button"
          class="h-1 w-6 transition"
          :class="i === activeIndex ? 'bg-[#F5B400]' : 'bg-white/40'"
          :aria-label="`Slide ${i + 1}`"
          @click="goTo(i)"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.hero-banner__viewport {
  aspect-ratio: 21 / 9;
  min-height: 220px;
  max-height: min(420px, 58vh);
}

@media (max-width: 639px) {
  .hero-banner__viewport {
    aspect-ratio: 4 / 5;
    min-height: 300px;
    max-height: min(420px, 62vh);
  }
}
</style>
