<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
} from "vue";

import { Button } from "@/components/ui/button";

export type DiapositivaPortada = {
  imagen: string;
  /** Texto corto que rota con la imagen */
  rotulo?: string;
};

const props = withDefaults(
  defineProps<{
    /** Lista simple de imágenes (compatibilidad). */
    imagenes?: string[];
    /** Carrusel con rótulos opcionales por diapositiva. */
    diapositivas?: DiapositivaPortada[];
    etiqueta: string;
    titulo: string;
    descripcion: string;
    textoAccion: string;
    textoAccionSecundaria?: string;
    iconoAccion?: Component;
    iconoAccionSecundaria?: Component;
    intervalo?: number;
    etiquetaAccesible?: string;
  }>(),
  {
    imagenes: () => [],
    diapositivas: () => [],
    intervalo: 5000,
    etiquetaAccesible: "Resumen del portal",
  },
);

const emit = defineEmits<{
  accion: [];
  "accion-secundaria": [];
}>();

const slides = computed((): DiapositivaPortada[] => {
  if (props.diapositivas.length) return props.diapositivas;
  return props.imagenes.map((imagen) => ({ imagen }));
});

const diapositivaActual = ref(0);
let temporizador: ReturnType<typeof setInterval> | undefined;

function detener() {
  if (!temporizador) return;
  clearInterval(temporizador);
  temporizador = undefined;
}

function iniciar() {
  detener();
  if (slides.value.length < 2) return;
  temporizador = setInterval(() => {
    diapositivaActual.value =
      (diapositivaActual.value + 1) % slides.value.length;
  }, props.intervalo);
}

function cambiar(indice: number) {
  diapositivaActual.value = indice;
  iniciar();
}

watch(
  slides,
  () => {
    diapositivaActual.value = 0;
    iniciar();
  },
  { deep: true },
);

onMounted(iniciar);
onBeforeUnmount(detener);

const rotuloActual = computed(
  () => slides.value[diapositivaActual.value]?.rotulo,
);
</script>

<template>
  <section
    class="group relative min-h-[310px] overflow-hidden border-t-4 border-[#F5B400] bg-[#071F52] text-white shadow-[0_24px_58px_-38px_rgba(7,31,82,0.95)] sm:min-h-[340px]"
    :aria-label="etiquetaAccesible"
    @mouseenter="detener"
    @mouseleave="iniciar"
  >
    <TransitionGroup name="portada-panel">
      <img
        v-for="(slide, indice) in slides"
        v-show="indice === diapositivaActual"
        :key="slide.imagen"
        :src="slide.imagen"
        alt=""
        class="absolute inset-0 h-full w-full object-cover object-center"
        aria-hidden="true"
      />
    </TransitionGroup>
    <div
      class="absolute inset-0 bg-linear-to-r from-[#020817]/95 via-[#071F52]/78 to-[#0B3A78]/30"
    />
    <div
      class="absolute inset-0 bg-linear-to-t from-[#020817]/70 via-transparent to-black/25"
    />

    <div
      class="relative flex min-h-[306px] flex-col justify-between gap-8 p-6 sm:min-h-[336px] sm:p-8 lg:flex-row lg:items-end"
    >
      <div class="max-w-3xl">
        <div class="mb-7 flex items-center gap-3">
          <span
            class="grid h-11 w-11 place-items-center bg-[#F5B400] shadow-lg"
          >
            <img
              src="/img/iconoTukuyAcademy.png"
              alt=""
              class="h-8 w-auto"
              aria-hidden="true"
            />
          </span>
          <p class="text-lg leading-none tracking-tight">
            <strong class="font-black text-white">Tukuy</strong>
            <span class="font-normal text-[#F5B400]"> Academy</span>
          </p>
        </div>

        <p class="text-xs font-black uppercase tracking-[.2em] text-[#F5B400]">
          {{ etiqueta }}
        </p>
        <h1 class="mt-3 text-3xl font-black sm:text-4xl">{{ titulo }}</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
          {{ descripcion }}
        </p>

        <Transition name="portada-rotulo" mode="out-in">
          <p
            v-if="rotuloActual"
            :key="rotuloActual"
            class="mt-4 inline-flex max-w-xl border-l-4 border-[#F5B400] bg-black/35 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm"
          >
            {{ rotuloActual }}
          </p>
        </Transition>
      </div>

      <div class="flex shrink-0 flex-col items-start gap-5 lg:items-end">
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="textoAccionSecundaria"
            variant="outline"
            class="h-12 rounded-none border-white/40 bg-white/10 px-5 text-white hover:bg-white/20 hover:text-white"
            @click="emit('accion-secundaria')"
          >
            <component
              :is="iconoAccionSecundaria ?? Plus"
              class="h-4 w-4"
            />
            {{ textoAccionSecundaria }}
          </Button>
          <Button
            class="h-12 rounded-none bg-accent px-6 text-accent-foreground hover:bg-amber-400"
            @click="emit('accion')"
          >
            <component :is="iconoAccion ?? Plus" class="h-4 w-4" />
            {{ textoAccion }}
          </Button>
        </div>
        <div
          v-if="slides.length > 1"
          class="flex gap-2"
          aria-label="Diapositivas de bienvenida"
        >
          <button
            v-for="(_, indice) in slides"
            :key="indice"
            type="button"
            class="h-1.5 transition-all duration-300"
            :class="
              indice === diapositivaActual
                ? 'w-10 bg-[#F5B400]'
                : 'w-6 bg-white/45 hover:bg-white/75'
            "
            :aria-label="`Mostrar imagen ${indice + 1}`"
            @click="cambiar(indice)"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.portada-panel-enter-active,
.portada-panel-leave-active {
  transition:
    opacity 0.9s ease,
    transform 5s ease;
}

.portada-panel-enter-from,
.portada-panel-leave-to {
  opacity: 0;
}

.portada-panel-enter-active {
  transform: scale(1.035);
}

.portada-rotulo-enter-active,
.portada-rotulo-leave-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.portada-rotulo-enter-from,
.portada-rotulo-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .portada-panel-enter-active,
  .portada-panel-leave-active,
  .portada-rotulo-enter-active,
  .portada-rotulo-leave-active {
    transition: none;
  }
}
</style>
