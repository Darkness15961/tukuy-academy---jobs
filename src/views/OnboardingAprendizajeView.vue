<script setup lang="ts">
import { Check, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  onboardingAprendizajeService,
  type CarreraOnboarding,
  type InteresOnboarding,
  type SituacionCarrera,
} from "@/api/services/onboarding-aprendizaje.service";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/composables/useAuth";
import {
  consumirCertificadoPendiente,
  guardarCertificadoPendiente,
} from "@/lib/solicitud-certificado";
import { toast } from "@/lib/toast";

type PasoOnboarding = 1 | 2 | 3 | 4 | 5;

const { continuarTrasOnboarding } = useAuth();
const route = useRoute();
const router = useRouter();

const esFlujoCertificado = computed(
  () => route.query.motivo === "certificado" && !!route.query.cursoId,
);

const cargando = ref(true);
const guardando = ref(false);
const paso = ref<PasoOnboarding>(1);
const errorLocal = ref("");

const carreras = ref<CarreraOnboarding[]>([]);
const intereses = ref<InteresOnboarding[]>([]);
const carreraId = ref("");
const situacion = ref<SituacionCarrera>("ESTUDIA");
const interesIds = ref<string[]>([]);

const carreraSeleccionada = computed(() =>
  carreras.value.find((c) => c.id === carreraId.value),
);

const totalPasos = 5;

const panelPorPaso: Record<
  PasoOnboarding,
  { etiqueta: string; titulo: string; texto: string }
> = {
  1: {
    etiqueta: "Tukuy Academy",
    titulo: "Bienvenido",
    texto:
      "Aquí se forman quienes viven el día a día de la obra, el almacén y la gestión de proyectos.",
  },
  2: {
    etiqueta: "Tu lugar",
    titulo: "Queremos conocerte",
    texto:
      "Para acercarte a cursos, sesiones en vivo y herramientas pensadas para construcción, logística y campo.",
  },
  3: {
    etiqueta: "Tu momento",
    titulo: "¿En qué etapa estás?",
    texto:
      "En obra, en formación o explorando el sector: cada camino cuenta.",
  },
  4: {
    etiqueta: "Tu área",
    titulo: "¿Dónde te ves?",
    texto:
      "Ingeniería, obra, almacén, costos, seguridad… elige lo que más te representa.",
  },
  5: {
    etiqueta: "Tu curiosidad",
    titulo: "¿Qué quieres potenciar?",
    texto:
      "BIM, presupuestos, supervisión, Excel, empleabilidad… marca lo que te mueve.",
  },
};

const panelActivo = computed(() => {
  const base = panelPorPaso[paso.value];
  if (paso.value === 1 && esFlujoCertificado.value) {
    return {
      etiqueta: "Tu certificado",
      titulo: "Antes de tu certificado",
      texto:
        "Cuéntanos un poco sobre ti para personalizar tu experiencia y emitir tu certificado.",
    };
  }
  return base;
});

const situaciones: Array<{
  value: SituacionCarrera;
  label: string;
  detalle: string;
}> = [
  {
    value: "EJERCE",
    label: "Ya estoy en el sector",
    detalle: "Obra, oficina técnica, almacén u operación.",
  },
  {
    value: "ESTUDIA",
    label: "Me estoy formando",
    detalle: "Carrera, técnica o especialización.",
  },
  {
    value: "EXPLORA",
    label: "Estoy explorando",
    detalle: "Quiero conocer mejor el mundo de la construcción.",
  },
];

watch(carreraId, (id) => {
  const carrera = carreras.value.find((c) => c.id === id);
  if (!carrera) return;
  if (paso.value <= 4 || interesIds.value.length === 0) {
    interesIds.value = [...carrera.interesesSugeridos];
  }
});

onMounted(async () => {
  try {
    const estado = await onboardingAprendizajeService.obtenerEstado();
    const cursoCertificado = String(route.query.cursoId ?? "").trim();
    if (estado.completado) {
      if (esFlujoCertificado.value && cursoCertificado) {
        await router.replace({
          path: "/tukuy-academy/mi-aprendizaje",
          query: { certificado: cursoCertificado },
        });
        return;
      }
      await continuarTrasOnboarding();
      return;
    }
    if (esFlujoCertificado.value && cursoCertificado) {
      guardarCertificadoPendiente(cursoCertificado);
    }
    const catalogo = await onboardingAprendizajeService.listarCatalogo();
    carreras.value = catalogo.carreras;
    intereses.value = catalogo.intereses;
    if (estado.carreraId) carreraId.value = estado.carreraId;
    if (estado.situacion) situacion.value = estado.situacion;
    if (estado.interesIds?.length) interesIds.value = [...estado.interesIds];
  } catch (causa) {
    errorLocal.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo cargar esta pantalla.";
  } finally {
    cargando.value = false;
  }
});

function irAtras() {
  errorLocal.value = "";
  if (paso.value > 1) paso.value = (paso.value - 1) as PasoOnboarding;
}

function irAdelante() {
  errorLocal.value = "";

  if (paso.value === 3) {
    // situación ya tiene default; solo avanzar
  }

  if (paso.value === 4) {
    if (!carreraId.value) {
      errorLocal.value = "Elige un área para continuar.";
      return;
    }
    const carrera = carreraSeleccionada.value;
    if (carrera && interesIds.value.length === 0) {
      interesIds.value = [...carrera.interesesSugeridos];
    }
  }

  if (paso.value < totalPasos) {
    paso.value = (paso.value + 1) as PasoOnboarding;
  }
}

function toggleInteres(id: string) {
  if (interesIds.value.includes(id)) {
    interesIds.value = interesIds.value.filter((item) => item !== id);
  } else {
    interesIds.value = [...interesIds.value, id];
  }
}

async function finalizar() {
  errorLocal.value = "";
  if (!carreraId.value) {
    errorLocal.value = "Elige un área para continuar.";
    paso.value = 4;
    return;
  }
  if (interesIds.value.length < 1) {
    errorLocal.value = "Marca al menos una opción.";
    return;
  }
  guardando.value = true;
  try {
    await onboardingAprendizajeService.completar({
      carreraId: carreraId.value,
      situacion: situacion.value,
      interesIds: interesIds.value,
    });
    toast.success(
      esFlujoCertificado.value
        ? "Listo. Abriendo tu certificado…"
        : "Bienvenido a Tukuy Academy.",
    );
    const cursoCertificado =
      consumirCertificadoPendiente() ||
      String(route.query.cursoId ?? "").trim() ||
      null;
    if (cursoCertificado) {
      await router.push({
        path: "/tukuy-academy/mi-aprendizaje",
        query: { certificado: cursoCertificado },
      });
      return;
    }
    await continuarTrasOnboarding();
  } catch (causa) {
    errorLocal.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo guardar. ¿Aplicaste 20260820180000_onboarding_carrera_intereses.sql?";
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <main class="grid min-h-screen bg-[#111317] text-white lg:grid-cols-[1.05fr_0.95fr]">
    <section
      class="relative hidden overflow-hidden border-r border-white/10 lg:block"
    >
      <img
        src="/img/portal-estudiante.png"
        alt=""
        class="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div
        class="absolute inset-0 bg-linear-to-t from-[#111317] via-[#111317]/70 to-[#111317]/30"
      />
      <div class="relative flex h-full flex-col justify-end p-10 xl:p-14">
        <p
          class="text-xs font-black uppercase tracking-[0.22em] text-[#F5B400]"
        >
          {{ panelActivo.etiqueta }}
        </p>
        <h1 class="mt-3 max-w-md text-4xl font-black leading-tight xl:text-5xl">
          {{ panelActivo.titulo }}
        </h1>
        <p class="mt-4 max-w-md text-sm leading-6 text-white/70">
          {{ panelActivo.texto }}
        </p>
      </div>
    </section>

    <section class="grid place-items-center px-5 py-10 sm:px-8">
      <div class="w-full max-w-xl">
        <div class="mb-8 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <img
              class="h-10 w-auto"
              src="/img/iconoTukuyAcademy.png"
              alt="Tukuy Academy"
            />
            <div>
              <p
                class="text-xs font-bold uppercase tracking-[0.16em] text-white/50"
              >
                Tukuy Academy
              </p>
              <p class="text-sm font-semibold text-white/80 lg:hidden">
                {{ panelActivo.titulo }}
              </p>
            </div>
          </div>
          <p class="text-xs font-semibold tabular-nums text-white/40">
            {{ paso }} / {{ totalPasos }}
          </p>
        </div>

        <div class="mb-8 flex gap-1.5" aria-hidden="true">
          <span
            v-for="n in totalPasos"
            :key="n"
            class="h-1 flex-1 transition-colors duration-300"
            :class="n <= paso ? 'bg-[#F5B400]' : 'bg-white/15'"
          />
        </div>

        <div
          v-if="cargando"
          class="grid place-items-center gap-3 py-24 text-white/70"
        >
          <LoaderCircle class="h-8 w-8 animate-spin text-[#F5B400]" />
          Un momento…
        </div>

        <template v-else>
          <!-- 1 · Bienvenida -->
          <div v-if="paso === 1" class="grid gap-8">
            <div>
              <h2 class="text-3xl font-black leading-tight sm:text-4xl">
                Bienvenido a Tukuy Academy
              </h2>
              <p class="mt-4 text-base leading-7 text-white/65">
                Formamos a quienes hacen posible la obra: desde el campo y el
                almacén hasta la oficina técnica y la gestión de proyectos.
              </p>
            </div>
            <Button
              class="h-12 w-full bg-[#F5B400] font-black text-[#111317] hover:bg-amber-300"
              @click="irAdelante"
            >
              Empezar
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>

          <!-- 2 · Queremos conocerte -->
          <div v-else-if="paso === 2" class="grid gap-8">
            <div>
              <h2 class="text-3xl font-black leading-tight sm:text-4xl">
                Queremos conocerte
              </h2>
              <p class="mt-4 text-base leading-7 text-white/65">
                En Tukuy Academy el aprendizaje habla el idioma de la
                construcción: obras, costos, seguridad, materiales, almacén y
                tecnología aplicada al día a día.
              </p>
              <p class="mt-3 text-base leading-7 text-white/65">
                Unas preguntas cortas nos ayudan a acercarte lo que más te
                sirve.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                variant="outline"
                class="h-12 border-white/20 bg-transparent text-white hover:bg-white/10"
                @click="irAtras"
              >
                <ChevronLeft class="h-4 w-4" />
                Volver
              </Button>
              <Button
                class="h-12 flex-1 bg-[#F5B400] font-black text-[#111317] hover:bg-amber-300"
                @click="irAdelante"
              >
                Continuar
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- 3 · Situación -->
          <div v-else-if="paso === 3" class="grid gap-6">
            <div>
              <h2 class="text-2xl font-black sm:text-3xl">
                ¿En qué momento estás?
              </h2>
              <p class="mt-2 text-sm text-white/60">
                Elige la opción que más se acerque a ti hoy.
              </p>
            </div>

            <div class="grid gap-2">
              <button
                v-for="item in situaciones"
                :key="item.value"
                type="button"
                class="flex items-start gap-3 border px-4 py-4 text-left transition"
                :class="
                  situacion === item.value
                    ? 'border-[#F5B400] bg-[#F5B400]/15'
                    : 'border-white/15 bg-white/4 hover:border-white/30'
                "
                @click="situacion = item.value"
              >
                <span
                  class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center border"
                  :class="
                    situacion === item.value
                      ? 'border-[#F5B400] bg-[#F5B400] text-[#111317]'
                      : 'border-white/30'
                  "
                >
                  <Check v-if="situacion === item.value" class="h-3.5 w-3.5" />
                </span>
                <span class="min-w-0">
                  <span class="block font-bold">{{ item.label }}</span>
                  <span class="mt-0.5 block text-xs text-white/55">{{
                    item.detalle
                  }}</span>
                </span>
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <Button
                variant="outline"
                class="h-12 border-white/20 bg-transparent text-white hover:bg-white/10"
                @click="irAtras"
              >
                <ChevronLeft class="h-4 w-4" />
                Volver
              </Button>
              <Button
                class="h-12 flex-1 bg-[#F5B400] font-black text-[#111317] hover:bg-amber-300"
                @click="irAdelante"
              >
                Continuar
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- 4 · Carrera / área -->
          <div v-else-if="paso === 4" class="grid gap-6">
            <div>
              <h2 class="text-2xl font-black sm:text-3xl">
                ¿En qué área te mueves?
              </h2>
              <p class="mt-2 text-sm text-white/60">
                Obra, ingeniería, almacén, costos… elige la que más te
                represente.
              </p>
            </div>

            <div class="grid max-h-[min(48vh,26rem)] gap-2 overflow-auto pr-1">
              <button
                v-for="carrera in carreras"
                :key="carrera.id"
                type="button"
                class="flex items-start gap-3 border px-4 py-3 text-left transition"
                :class="
                  carreraId === carrera.id
                    ? 'border-[#F5B400] bg-[#F5B400]/12'
                    : 'border-white/12 bg-white/3 hover:border-white/25'
                "
                @click="carreraId = carrera.id"
              >
                <span
                  class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center border"
                  :class="
                    carreraId === carrera.id
                      ? 'border-[#F5B400] bg-[#F5B400] text-[#111317]'
                      : 'border-white/30'
                  "
                >
                  <Check v-if="carreraId === carrera.id" class="h-3.5 w-3.5" />
                </span>
                <span class="min-w-0">
                  <span class="block font-bold">{{ carrera.nombre }}</span>
                  <span class="mt-0.5 block text-xs text-white/55">{{
                    carrera.descripcion
                  }}</span>
                </span>
              </button>
            </div>

            <p v-if="errorLocal" class="text-sm font-semibold text-red-300">
              {{ errorLocal }}
            </p>

            <div class="flex flex-wrap gap-2">
              <Button
                variant="outline"
                class="h-12 border-white/20 bg-transparent text-white hover:bg-white/10"
                @click="irAtras"
              >
                <ChevronLeft class="h-4 w-4" />
                Volver
              </Button>
              <Button
                class="h-12 flex-1 bg-[#F5B400] font-black text-[#111317] hover:bg-amber-300"
                @click="irAdelante"
              >
                Continuar
                <ChevronRight class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- 5 · Intereses -->
          <div v-else class="grid gap-6">
            <div>
              <h2 class="text-2xl font-black sm:text-3xl">
                ¿Qué te gustaría potenciar?
              </h2>
              <p class="mt-2 text-sm text-white/60">
                Ideas a partir de
                <strong class="text-white">{{
                  carreraSeleccionada?.nombre ?? "tu área"
                }}</strong
                >. Marca lo que te interesa.
              </p>
            </div>

            <div
              class="grid max-h-[min(48vh,26rem)] gap-2 overflow-auto sm:grid-cols-2"
            >
              <button
                v-for="interes in intereses"
                :key="interes.id"
                type="button"
                class="flex items-start gap-3 border px-3 py-3 text-left transition"
                :class="
                  interesIds.includes(interes.id)
                    ? 'border-[#F5B400] bg-[#F5B400]/12'
                    : 'border-white/12 bg-white/3 hover:border-white/25'
                "
                @click="toggleInteres(interes.id)"
              >
                <span
                  class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center border"
                  :class="
                    interesIds.includes(interes.id)
                      ? 'border-[#F5B400] bg-[#F5B400] text-[#111317]'
                      : 'border-white/30'
                  "
                >
                  <Check
                    v-if="interesIds.includes(interes.id)"
                    class="h-3.5 w-3.5"
                  />
                </span>
                <span class="min-w-0">
                  <span class="flex items-center gap-2 font-bold">
                    <span
                      class="h-2.5 w-2.5 shrink-0 rounded-full"
                      :style="{ backgroundColor: interes.color }"
                    />
                    {{ interes.nombre }}
                  </span>
                  <span class="mt-0.5 block text-[11px] text-white/55">{{
                    interes.descripcion
                  }}</span>
                </span>
              </button>
            </div>

            <p v-if="errorLocal" class="text-sm font-semibold text-red-300">
              {{ errorLocal }}
            </p>

            <div class="flex flex-wrap gap-2">
              <Button
                variant="outline"
                class="h-12 border-white/20 bg-transparent text-white hover:bg-white/10"
                :disabled="guardando"
                @click="irAtras"
              >
                <ChevronLeft class="h-4 w-4" />
                Volver
              </Button>
              <Button
                class="h-12 flex-1 bg-[#F5B400] font-black text-[#111317] hover:bg-amber-300"
                :disabled="guardando"
                @click="finalizar"
              >
                {{ guardando ? "Guardando…" : "Entrar a Tukuy" }}
              </Button>
            </div>
          </div>
        </template>
      </div>
    </section>
  </main>
</template>
