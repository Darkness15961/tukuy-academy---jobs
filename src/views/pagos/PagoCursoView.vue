<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  LockKeyhole,
} from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import PasarelaIzipaySimulada from "@/components/shared/PasarelaIzipaySimulada.vue";
import EsqueletoPagoCurso from "@/components/shared/EsqueletoPagoCurso.vue";
import { Button } from "@/components/ui/button";
import { cursoPublicoService } from "@/api/services/curso-publico.service";
import { useCursos } from "@/composables/useCursos";
import {
  formatPrecioSoles,
  usePasarelaIzipay,
} from "@/composables/usePasarelaIzipay";
import type { DetalleCursoPublico } from "@/types/academia";

const route = useRoute();
const router = useRouter();
const { courses, loading } = useCursos();
const pasarela = usePasarelaIzipay();

const curso = computed(() =>
  courses.value.find((item) => item.id === String(route.params.cursoId)),
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

const importe = computed(() => curso.value?.price ?? 0);
const esCursoPagado = computed(
  () => curso.value?.pricing === "paid" && importe.value > 0,
);

async function continuarConIzipay() {
  if (!curso.value) return;
  await pasarela.iniciarPagoCurso(curso.value.id);
}
</script>

<template>
  <EsqueletoPagoCurso v-if="loading || cargandoDetalle" />

  <main v-else-if="curso && detalle" class="min-h-screen bg-background text-foreground">
    <header class="border-b border-border bg-card">
      <div
        class="mx-auto flex h-20 max-w-320 items-center justify-between px-5 lg:px-8"
      >
        <button
          type="button"
          class="flex items-center gap-3"
          aria-label="Volver a Tukuy Academy"
          @click="router.push('/')"
        >
          <span
            class="grid h-11 w-11 shrink-0 place-items-center rounded-full dark:bg-white dark:p-1.5 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.16)]"
          >
            <img
              src="/img/iconoTukuyAcademy.png"
              alt="Tukuy Academy"
              class="h-full w-full object-contain"
            />
          </span>
          <span class="text-lg tracking-tight">
            <strong class="font-black text-[#071F52] dark:text-white">Tukuy</strong>
            <span class="text-[#F5B400]"> Academy</span>
          </span>
        </button>

        <span class="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <LockKeyhole class="h-4 w-4 text-emerald-600" />
          Pago protegido con Izipay
        </span>
      </div>
    </header>

    <div
      class="mx-auto grid max-w-320 gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_410px] lg:px-8 lg:py-14"
    >
      <section class="border border-border bg-card p-7 sm:p-10">
        <button
          type="button"
          class="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground"
          @click="router.push(`/cursos/${curso.id}`)"
        >
          <ArrowLeft class="h-4 w-4" />
          Volver al curso
        </button>

        <template v-if="pasarela.fase.value === 'pagado'">
          <div class="mt-12 max-w-2xl">
            <span class="grid h-16 w-16 place-items-center bg-emerald-600 text-white">
              <CheckCircle2 class="h-8 w-8" />
            </span>
            <p class="mt-8 text-xs font-black uppercase tracking-[.24em] text-emerald-700">
              Matrícula confirmada
            </p>
            <h1 class="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              Tu acceso está listo
            </h1>
            <p class="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              El servidor confirmó el pago de la orden
              <strong>{{ pasarela.orden.value?.ordenId }}</strong>. El curso ya
              puede aparecer en tu espacio de aprendizaje.
            </p>
            <Button
              class="mt-8 h-13 rounded-none bg-[#0B3A78] px-8 text-white hover:bg-[#071F52]"
              @click="router.push('/tukuy-academy/mi-aprendizaje')"
            >
              Ir a mi aprendizaje
            </Button>
          </div>
        </template>

        <div v-else class="mt-10">
          <p class="text-xs font-black uppercase tracking-[.24em] text-[#0B3A78]">
            Finaliza tu matrícula
          </p>
          <PasarelaIzipaySimulada
            class="mt-4"
            :fase="pasarela.fase.value"
            :sesion="pasarela.sesion.value"
            :error="pasarela.error.value"
            :procesando="pasarela.procesando.value"
            :puede-iniciar="esCursoPagado"
            :esta-habilitado="pasarela.estaHabilitado"
            @iniciar="continuarConIzipay"
            @simular="pasarela.simularAprobacion"
            @reiniciar="pasarela.reiniciar"
          />
        </div>
      </section>

      <aside class="self-start border border-border bg-card lg:sticky lg:top-8">
        <img
          :src="curso.image"
          :alt="curso.title"
          class="aspect-video w-full object-cover"
        />
        <div class="p-7">
          <p class="text-xs font-black uppercase tracking-[.2em] text-[#0B3A78]">
            Resumen de compra
          </p>
          <h2 class="mt-3 text-xl font-black leading-7">{{ curso.title }}</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ detalle.instructor.nombre }} · {{ curso.duration }}
          </p>

          <div class="mt-7 border-t border-border pt-6">
            <div class="flex items-end justify-between gap-4">
              <span class="text-sm font-bold text-muted-foreground">Total</span>
              <strong class="text-3xl font-black text-foreground">
                {{ formatPrecioSoles(importe) }}
              </strong>
            </div>
            <p class="mt-2 text-right text-xs text-muted-foreground">
              Importe final validado por el servidor
            </p>
          </div>

          <div class="mt-7 grid gap-3 border-t border-border pt-6">
            <p class="flex items-start gap-2 text-sm text-muted-foreground">
              <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Acceso al contenido completo
            </p>
            <p class="flex items-start gap-2 text-sm text-muted-foreground">
              <Check class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Certificado verificable al completar
            </p>
          </div>
        </div>
      </aside>
    </div>
  </main>

  <main v-else class="grid min-h-screen place-items-center bg-background px-5 text-center text-foreground">
    <div>
      <p class="text-xs font-black uppercase tracking-[.2em] text-[#0B3A78]">
        Pago no disponible
      </p>
      <h1 class="mt-3 text-4xl font-black">No encontramos este curso</h1>
      <Button class="mt-7 rounded-none" @click="router.push('/#cursos')">
        Volver al catálogo
      </Button>
    </div>
  </main>
</template>
