<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Button } from "@/components/ui/button";
import { diapositivasPortada } from "../data/portada.mock";
const emit = defineEmits<{ irA: [destino: string] }>();
const actual = ref(0);
let temporizador: ReturnType<typeof setInterval> | undefined;
function iniciar() {
  detener();
  temporizador = setInterval(
    () => (actual.value = (actual.value + 1) % diapositivasPortada.length),
    5000,
  );
}
function detener() {
  if (temporizador) {
    clearInterval(temporizador);
    temporizador = undefined;
  }
}
function cambiar(n: number) {
  detener();
  actual.value = (n + diapositivasPortada.length) % diapositivasPortada.length;
  iniciar();
}
onMounted(iniciar);
onBeforeUnmount(detener);
</script>
<template>
  <section
    id="inicio"
    class="relative h-[100svh] min-h-[680px] overflow-hidden bg-slate-950"
    @mouseenter="detener"
    @mouseleave="iniciar"
  >
    <TransitionGroup name="hero-fade"
      ><img
        v-for="(d, i) in diapositivasPortada"
        v-show="i === actual"
        :key="d.imagen"
        :src="d.imagen"
        :alt="d.mensaje"
        class="absolute inset-0 h-full w-full object-cover"
        :style="{ objectPosition: d.posicion }"
    /></TransitionGroup>
    <div
      class="absolute inset-0 bg-linear-to-r from-black/85 via-black/48 to-black/10"
    />
    <div
      class="absolute inset-0 bg-linear-to-t from-black/65 via-transparent to-black/25"
    />
    <div
      class="relative mx-auto flex h-full max-w-360 items-center px-5 pt-24 lg:px-8"
    >
      <Transition name="hero-text" mode="out-in"
        ><div :key="actual" class="max-w-4xl text-white">
          <span
            class="hero-highlight relative inline-block px-5 py-2 text-4xl font-black sm:text-6xl lg:text-7xl"
            ><span class="relative z-10">{{
              diapositivasPortada[actual]?.palabra
            }}</span></span
          >
          <h1
            class="mt-3 max-w-4xl text-4xl font-black leading-[1.04] sm:text-6xl lg:text-7xl"
          >
            {{ diapositivasPortada[actual]?.mensaje }}
          </h1>
          <p
            class="mt-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg"
          >
            {{ diapositivasPortada[actual]?.descripcion }}
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <Button
              class="h-13 rounded-none bg-[#F5B400] px-7 text-[#07152B] hover:bg-amber-400"
              @click="
                emit('irA', diapositivasPortada[actual]?.destino ?? '#cursos')
              "
              >{{ diapositivasPortada[actual]?.accion }}</Button
            ><Button
              class="h-13 rounded-none border-white bg-transparent px-7 text-white hover:bg-white hover:text-[#07152B]"
              variant="outline"
              @click="$router.push('/login')"
              >Acceder al portal</Button
            >
          </div>
        </div></Transition
      >
    </div>
    <Button
      class="absolute left-3 top-1/2 rounded-none bg-black/30 text-white"
      size="icon"
      variant="ghost"
      @click="cambiar(actual - 1)"
      ><ChevronLeft /></Button
    ><Button
      class="absolute right-3 top-1/2 rounded-none bg-black/30 text-white"
      size="icon"
      variant="ghost"
      @click="cambiar(actual + 1)"
      ><ChevronRight
    /></Button>
    <div class="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
      <button
        v-for="(_, i) in diapositivasPortada"
        :key="i"
        class="h-1.5 transition-all"
        :class="i === actual ? 'w-12 bg-[#F5B400]' : 'w-8 bg-white/55'"
        @click="cambiar(i)"
      />
    </div>
  </section>
</template>
<style scoped>
.hero-fade-enter-active,
.hero-fade-leave-active {
  transition:
    opacity 0.8s ease,
    transform 5s ease;
}
.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}
.hero-fade-enter-active {
  transform: scale(1.025);
}
.hero-text-enter-active,
.hero-text-leave-active {
  transition:
    opacity 0.7s ease,
    transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
.hero-text-enter-from {
  opacity: 0;
  transform: translateX(-56px);
}
.hero-text-leave-to {
  opacity: 0;
  transform: translateX(36px);
}
.hero-highlight::before {
  position: absolute;
  inset: 0;
  content: "";
  background: #0b3a78;
  transform: scaleX(0);
  transform-origin: left center;
  animation: highlight-wipe 3s cubic-bezier(0.16, 1, 0.3, 1) 0.25s
    forwards;
  will-change: transform;
}
@keyframes highlight-wipe {
  to {
    transform: scaleX(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
  .hero-highlight::before {
    animation: none;
    transform: scaleX(1);
  }
}
</style>
