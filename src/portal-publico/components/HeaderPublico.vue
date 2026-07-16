<script setup lang="ts">
import { Menu, X } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";

const emit = defineEmits<{
  irA: [destino: string];
}>();

const router = useRouter();
const desplazado = ref(false);
const abierto = ref(false);

const enlaces = [
  { texto: "Nuestro ADN", destino: "#adn" },
  { texto: "Estudiantes y docentes", destino: "#audiencias" },
  { texto: "Cursos", destino: "#cursos" },
  { texto: "Bolsa Tukuy", destino: "#bolsa" },
  { texto: "Comunidad", destino: "#comunidad" },
  { texto: "Planes", destino: "/planes" },
];

function actualizarDesplazamiento() {
  desplazado.value = window.scrollY > 60;
}

function ir(destino: string) {
  abierto.value = false;
  emit("irA", destino);
}

onMounted(() => {
  actualizarDesplazamiento();
  window.addEventListener("scroll", actualizarDesplazamiento, {
    passive: true,
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", actualizarDesplazamiento);
});
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-all duration-300"
    :class="
      desplazado
        ? 'border-b border-slate-200 bg-white/95 text-[#07152B] shadow-sm backdrop-blur-xl'
        : 'bg-linear-to-b from-black/75 to-transparent text-white'
    "
  >
    <div class="mx-auto flex h-24 max-w-360 items-center px-5 lg:px-8">
      <button
        class="group relative z-10 flex h-32 w-44 shrink-0 self-start flex-col items-center justify-center gap-1 bg-[#F5B400] px-3 text-center shadow-[0_18px_32px_-24px_rgba(7,21,43,0.9)]"
        type="button"
        aria-label="Volver al inicio"
        @click="ir('#inicio')"
      >
        <span
          class="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white transition-transform duration-300 group-hover:scale-105"
          aria-hidden="true"
        >
          <img
            src="/img/iconoTukuyAcademy.png"
            alt="Tukuy Academy"
            width="295"
            height="250"
            class="h-11 w-auto object-contain"
          />
        </span>

        <span
          class="block whitespace-nowrap text-lg leading-none tracking-tight"
        >
          <strong class="font-black text-white">Tukuy</strong>
          <span class="font-normal text-[#071F52]"> Academy</span>
        </span>
      </button>

      <nav
        class="ml-auto hidden items-center gap-5 text-sm font-bold lg:flex xl:gap-7"
        aria-label="Navegación principal"
      >
        <button
          v-for="enlace in enlaces"
          :key="enlace.destino"
          type="button"
          class="group/enlace relative cursor-pointer transition-colors duration-200 hover:text-[#F5B400] hover:[text-shadow:0_0_12px_rgba(245,180,0,0.65)]"
          @click="ir(enlace.destino)"
        >
          {{ enlace.texto }}
          <span
            class="pointer-events-none absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-[#F5B400] shadow-[0_0_8px_rgba(245,180,0,0.8)] transition-transform duration-200 group-hover/enlace:scale-x-100"
          />
        </button>

        <Button
          class="rounded-none bg-[#F5B400] text-[#07152B] hover:bg-amber-400"
          @click="router.push('/login')"
        >
          ACCEDER
        </Button>
      </nav>

      <Button
        class="ml-auto lg:hidden"
        variant="ghost"
        size="icon"
        :aria-label="abierto ? 'Cerrar menú' : 'Abrir menú'"
        :aria-expanded="abierto"
        @click="abierto = !abierto"
      >
        <X v-if="abierto" />
        <Menu v-else />
      </Button>
    </div>

    <div
      v-if="abierto"
      class="border-t bg-white p-5 text-[#07152B] shadow-xl lg:hidden"
    >
      <nav class="grid gap-1" aria-label="Navegación móvil">
        <button
          v-for="enlace in enlaces"
          :key="enlace.destino"
          class="p-3 text-left font-bold"
          type="button"
          @click="ir(enlace.destino)"
        >
          {{ enlace.texto }}
        </button>

        <Button class="mt-2 rounded-none" @click="router.push('/login')">
          Acceder
        </Button>
      </nav>
    </div>
  </header>
</template>
