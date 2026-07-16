<script setup lang="ts">
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ShieldCheck,
  XCircle,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  academicoService,
  type VerificacionCertificadoAcademico,
} from "@/api/services/academico.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Skeleton from "primevue/skeleton";

const route = useRoute();
const router = useRouter();
const cargando = ref(true);
const certificado = ref<VerificacionCertificadoAcademico | null>(null);
const codigo = computed(() => String(route.params.codigo));

onMounted(async () => {
  try {
    certificado.value = await academicoService.verificarCertificado(
      codigo.value,
    );
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <main
    class="min-h-screen bg-[#F3F7FC] text-[#071F52] dark:bg-[#071325] dark:text-white"
  >
    <header
      class="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1A32]"
    >
      <div
        class="mx-auto flex h-20 max-w-6xl items-center justify-between px-5"
      >
        <button
          class="flex items-center gap-3"
          type="button"
          @click="router.push('/')"
        >
          <span
            class="grid h-12 w-12 place-items-center rounded-full bg-white p-1 shadow"
            ><img
              src="/img/iconoTukuyAcademy.png"
              alt="Tukuy Academy"
              class="h-full w-full object-contain"
          /></span>
          <span class="text-left"
            ><strong class="block text-lg font-black"
              >Tukuy
              <span class="font-normal text-[#B87A00]">Academy</span></strong
            ><span
              class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300"
              >Validación académica</span
            ></span
          >
        </button>
        <Button variant="outline" @click="router.push('/login')"
          >Acceder a la plataforma</Button
        >
      </div>
    </header>

    <section class="mx-auto grid max-w-5xl gap-6 px-5 py-12 sm:py-16">
      <div class="text-center">
        <p class="text-xs font-black uppercase tracking-[.24em] text-[#B87A00]">
          Verificación pública
        </p>
        <h1 class="mt-3 text-3xl font-black sm:text-4xl">
          Valida una certificación Tukuy
        </h1>
        <p
          class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300"
        >
          Esta consulta confirma la emisión, las horas reconocidas y el
          cumplimiento académico registrado al momento de certificar.
        </p>
      </div>

      <Card
        v-if="cargando"
        class="border-slate-200 bg-white dark:border-white/10 dark:bg-[#0B1A32]"
        ><CardContent class="grid gap-4 p-8"
          ><Skeleton class="h-16 w-16" /><Skeleton
            class="h-10 w-3/4" /><Skeleton class="h-48 w-full" /></CardContent
      ></Card>

      <Card
        v-else-if="certificado"
        class="overflow-hidden border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B1A32]"
      >
        <div
          class="h-2"
          :class="
            certificado.estado === 'VIGENTE' ? 'bg-emerald-500' : 'bg-red-500'
          "
        />
        <CardContent class="p-0">
          <div class="grid gap-6 p-7 sm:grid-cols-[1fr_auto] sm:p-10">
            <div>
              <div class="flex items-center gap-3">
                <span
                  class="grid h-14 w-14 place-items-center bg-emerald-500/10 text-emerald-600"
                  ><ShieldCheck class="h-7 w-7"
                /></span>
                <div>
                  <p
                    class="text-xs font-black uppercase tracking-wider text-emerald-600"
                  >
                    Certificado {{ certificado.estado.toLowerCase() }}
                  </p>
                  <h2 class="mt-1 text-2xl font-black">
                    Registro académico confirmado
                  </h2>
                </div>
              </div>
              <p
                class="mt-7 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Otorgado a
              </p>
              <h3 class="mt-2 text-3xl font-black">
                {{ certificado.estudiante }}
              </h3>
              <p
                class="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Programa certificado
              </p>
              <p class="mt-2 text-xl font-bold">{{ certificado.curso }}</p>
            </div>
            <div
              class="grid min-w-56 content-center border-l-0 border-slate-200 sm:border-l sm:pl-8 dark:border-white/10"
            >
              <Award class="h-14 w-14 text-[#B87A00]" />
              <p class="mt-4 text-xs text-slate-500">Código verificable</p>
              <strong class="mt-1 font-mono text-sm">{{
                certificado.codigo
              }}</strong>
            </div>
          </div>
          <div
            class="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4 dark:bg-white/10"
          >
            <div
              v-for="dato in [
                {
                  etiqueta: 'Horas certificadas',
                  valor: `${certificado.horasCertificadas} h`,
                  icono: Clock3,
                },
                {
                  etiqueta: 'Nota final',
                  valor: `${certificado.notaFinal} / 20`,
                  icono: GraduationCap,
                },
                {
                  etiqueta: 'Módulos completados',
                  valor: certificado.modulosCompletados,
                  icono: CheckCircle2,
                },
                {
                  etiqueta: 'Fecha de emisión',
                  valor: certificado.emitidoEn,
                  icono: CalendarDays,
                },
              ]"
              :key="dato.etiqueta"
              class="bg-white p-5 dark:bg-[#0B1A32]"
            >
              <component
                :is="dato.icono"
                class="h-5 w-5 text-[#B87A00]"
              /><strong class="mt-3 block text-lg">{{ dato.valor }}</strong
              ><span class="text-xs text-slate-500">{{ dato.etiqueta }}</span>
            </div>
          </div>
          <div
            class="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-7 py-5 text-xs text-slate-500 dark:border-white/10"
          >
            <span
              >Emisor:
              <strong class="text-current">{{
                certificado.organizacion
              }}</strong></span
            ><span
              >Versión del programa: {{ certificado.versionPrograma }}</span
            >
          </div>
        </CardContent>
      </Card>

      <Card
        v-else
        class="border-red-300 bg-white shadow-xl dark:border-red-500/30 dark:bg-[#0B1A32]"
        ><CardContent class="grid place-items-center p-10 text-center"
          ><span
            class="grid h-16 w-16 place-items-center bg-red-500/10 text-red-600"
            ><XCircle class="h-8 w-8"
          /></span>
          <h2 class="mt-5 text-2xl font-black">
            No encontramos este certificado
          </h2>
          <p
            class="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300"
          >
            El código {{ codigo }} no corresponde a una emisión registrada.
            Verifica que el enlace o el código estén completos.
          </p>
          <Button class="mt-6" @click="router.push('/')"
            >Volver a Tukuy Academy</Button
          ></CardContent
        ></Card
      >
    </section>
  </main>
</template>
