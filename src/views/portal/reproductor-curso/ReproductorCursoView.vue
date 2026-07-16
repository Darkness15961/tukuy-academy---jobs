<script setup lang="ts">
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  ClipboardCheck,
  Download,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  Play,
  RefreshCw,
  Star,
  Trophy,
  Upload,
  X,
} from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Skeleton from "primevue/skeleton";

import { aprendizajeService } from "@/api/services/aprendizaje.service";
import {
  academicoService,
  type EntregaActividadAcademica,
} from "@/api/services/academico.service";
import { Button } from "@/components/ui/button";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { Progress } from "@/components/ui/progress";
import type { Course } from "@/types/academia";
import type {
  ContenidoCursoAprendizaje,
  ItemAprendizaje,
  PreguntaQuiz,
} from "@/types/aprendizaje.types";
import { usePortalContext } from "../composables/usePortalContext";

const route = useRoute();
const router = useRouter();
const portal = usePortalContext();
const { contextoActivo } = useContextoSesion();

const courseId = computed(() => route.params.courseId as string);
const course = computed(
  () => portal.courses.value.find((c) => c.id === courseId.value) ?? null,
);

const cargando = ref(true);
const errorCarga = ref<string | null>(null);
const contenido = ref<ContenidoCursoAprendizaje | null>(null);
const syllabusSections = computed(() => contenido.value?.modulos ?? []);
const quizQuestionsDatabase = computed(
  () => contenido.value?.quizzes ?? ({} as Record<string, PreguntaQuiz[]>),
);

const activeItemId = ref("v1.1");
const completedItems = ref<string[]>([]);
const userGrades = ref<Record<string, number>>({});
const selectedAnswers = ref<Record<number, number>>({});
const quizResult = ref<{
  score: number;
  passed: boolean;
  submitted: boolean;
} | null>(null);

const activeItem = computed<ItemAprendizaje>(() => {
  for (const s of syllabusSections.value) {
    const found = s.items.find((item) => item.id === activeItemId.value);
    if (found) return found;
  }
  const fallback = syllabusSections.value[0]?.items[0];
  if (fallback) return fallback;
  return {
    id: "fallback",
    title: "Clase",
    type: "video",
    description: "",
  };
});

const totalItemsCount = computed(() =>
  syllabusSections.value.reduce((sum, s) => sum + s.items.length, 0),
);
const completedItemsCount = computed(() => completedItems.value.length);
const progressPercent = computed(() => {
  if (totalItemsCount.value === 0) return 0;
  return Math.round((completedItemsCount.value / totalItemsCount.value) * 100);
});

const gradedActivities = computed(() =>
  syllabusSections.value
    .flatMap((s) => s.items)
    .filter((item) => completedItems.value.includes(item.id))
    .map((item) => ({
      ...item,
      grade: userGrades.value[item.id] ?? item.grade,
    }))
    .filter((item) => item.grade !== undefined),
);

const averageGrade = computed(() => {
  if (!gradedActivities.value.length) return 0;
  const total = gradedActivities.value.reduce(
    (sum, item) => sum + (item.grade ?? 0),
    0,
  );
  return Math.round((total / gradedActivities.value.length) * 10) / 10;
});

const gradeStatus = computed(() => {
  if (!gradedActivities.value.length) return "Pendiente";
  return averageGrade.value >= 14 ? "Aprobando" : "En riesgo";
});

const collapsedSections = ref<Record<string, boolean>>({});
const activeTab = ref<"descripcion" | "preguntas" | "notas" | "resenas">(
  "descripcion",
);
const sidebarOpen = ref(false);
const selectorPdf = ref<HTMLInputElement | null>(null);
const archivoSeleccionado = ref<File>();
const entregaActual = ref<EntregaActividadAcademica>();
const enviandoEntrega = ref(false);
const errorEntrega = ref("");

function sincronizarPortal(progreso: number, estado: Course["status"]) {
  const target = portal.courses.value.find((c) => c.id === courseId.value);
  if (!target) return;
  target.progress = progreso;
  target.status = estado;
}

async function persistirProgreso() {
  if (!course.value) return;
  const progreso = progressPercent.value;
  const estado: Course["status"] = progreso >= 100 ? "Completado" : "En curso";

  sincronizarPortal(progreso, estado);

  await aprendizajeService.guardarProgreso(courseId.value, {
    itemsCompletados: [...completedItems.value],
    notas: { ...userGrades.value },
    itemActivoId: activeItemId.value,
    progreso,
    estado,
  });
}

async function cargarCurso() {
  cargando.value = true;
  errorCarga.value = null;
  try {
    const [contenidoCurso, progreso] = await Promise.all([
      aprendizajeService.obtenerContenido(courseId.value),
      aprendizajeService.obtenerProgreso(courseId.value),
    ]);

    contenido.value = contenidoCurso;
    collapsedSections.value = Object.fromEntries(
      contenidoCurso.modulos.map((m) => [m.id, false]),
    );

    completedItems.value = [...progreso.itemsCompletados];
    userGrades.value = { ...progreso.notas };
    activeItemId.value =
      progreso.itemActivoId ||
      contenidoCurso.modulos[0]?.items[0]?.id ||
      "v1.1";

    sincronizarPortal(progreso.progreso, progreso.estado);
    restaurarEstadoQuizActivo();
    await cargarEntregaActiva();
  } catch (err) {
    errorCarga.value =
      err instanceof Error
        ? err.message
        : "No se pudo cargar el contenido del curso.";
    contenido.value = null;
  } finally {
    cargando.value = false;
  }
}

function restaurarEstadoQuizActivo() {
  selectedAnswers.value = {};
  if (completedItems.value.includes(activeItemId.value)) {
    const savedGrade = userGrades.value[activeItemId.value] ?? 18;
    quizResult.value = {
      score: savedGrade,
      passed: savedGrade >= 14,
      submitted: true,
    };
  } else {
    quizResult.value = null;
  }
}

async function toggleItem(itemId: string) {
  if (completedItems.value.includes(itemId)) {
    completedItems.value = completedItems.value.filter((id) => id !== itemId);
  } else {
    completedItems.value = [...completedItems.value, itemId];
  }
  await persistirProgreso();
}

async function submitQuiz(itemId: string) {
  const questions = quizQuestionsDatabase.value[itemId];
  if (!questions) return;

  let correctCount = 0;
  questions.forEach((q, idx) => {
    if (selectedAnswers.value[idx] === q.correctIndex) correctCount++;
  });

  const score = Math.round((correctCount / questions.length) * 20);
  const passed = score >= 14;

  quizResult.value = { score, passed, submitted: true };
  userGrades.value = { ...userGrades.value, [itemId]: score };

  if (passed && !completedItems.value.includes(itemId)) {
    completedItems.value = [...completedItems.value, itemId];
  }

  await persistirProgreso();
}

async function simulateQuickComplete() {
  const all = syllabusSections.value.flatMap((s) =>
    s.items.filter((item) => item.type !== "assignment").map((item) => item.id),
  );
  completedItems.value = all;
  const notas: Record<string, number> = { ...userGrades.value };
  Object.keys(quizQuestionsDatabase.value).forEach((quizId) => {
    notas[quizId] = 20;
  });
  userGrades.value = notas;
  await persistirProgreso();
}

async function simulateReset() {
  completedItems.value = [];
  userGrades.value = {};
  quizResult.value = null;
  await persistirProgreso();
}

function goBack() {
  router.push("/tukuy-academy/cursos");
}

function toggleSection(sectionId: string) {
  collapsedSections.value[sectionId] = !collapsedSections.value[sectionId];
}

function selectItem(itemId: string) {
  activeItemId.value = itemId;
  sidebarOpen.value = false;
  restaurarEstadoQuizActivo();
  archivoSeleccionado.value = undefined;
  errorEntrega.value = "";
  void cargarEntregaActiva();
  void persistirProgreso();
}

async function cargarEntregaActiva() {
  if (activeItem.value.type !== "assignment") {
    entregaActual.value = undefined;
    return;
  }
  const estudianteId = contextoActivo.value?.usuarioId ?? "usuario-actual";
  const entregas = await academicoService.listarEntregasCurso(courseId.value);
  entregaActual.value = entregas.find(
    (entrega) =>
      entrega.estudianteId === estudianteId &&
      entrega.actividadId.endsWith(
        `act-${Number(activeItem.value.id.match(/\d+/)?.[0] ?? 5)}`,
      ),
  );
}

function seleccionarPdf(evento: Event) {
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  errorEntrega.value = "";
  if (!archivo) return;
  if (archivo.type !== "application/pdf") {
    errorEntrega.value = "Selecciona un archivo en formato PDF.";
    return;
  }
  if (archivo.size > 8_000_000) {
    errorEntrega.value = "El PDF debe pesar menos de 8 MB en la demostración.";
    return;
  }
  archivoSeleccionado.value = archivo;
}

async function entregarActividad() {
  if (!archivoSeleccionado.value) {
    errorEntrega.value =
      "Primero selecciona el archivo PDF que deseas entregar.";
    return;
  }
  enviandoEntrega.value = true;
  errorEntrega.value = "";
  try {
    entregaActual.value = await academicoService.registrarEntregaPortal(
      courseId.value,
      activeItem.value.id,
      archivoSeleccionado.value,
      {
        id: contextoActivo.value?.usuarioId ?? "usuario-actual",
        nombre: portal.user.value?.name ?? "Estudiante Tukuy",
      },
    );
    archivoSeleccionado.value = undefined;
    if (selectorPdf.value) selectorPdf.value.value = "";
    if (!completedItems.value.includes(activeItem.value.id)) {
      completedItems.value = [...completedItems.value, activeItem.value.id];
    }
    await persistirProgreso();
  } catch (error) {
    errorEntrega.value =
      error instanceof Error
        ? error.message
        : "No se pudo registrar la entrega.";
  } finally {
    enviandoEntrega.value = false;
  }
}

function getItemIcon(type: ItemAprendizaje["type"]) {
  switch (type) {
    case "video":
      return CirclePlay;
    case "quiz":
      return HelpCircle;
    case "reading":
      return FileText;
    case "assignment":
      return ClipboardCheck;
  }
}

onMounted(cargarCurso);
watch(courseId, cargarCurso);
</script>

<template>
  <div
    v-if="cargando"
    class="min-h-screen bg-background p-5 text-foreground sm:p-8"
  >
    <div class="mx-auto grid max-w-7xl gap-5">
      <Skeleton class="h-14 w-full" />
      <div class="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div class="grid gap-4">
          <Skeleton class="aspect-video w-full" />
          <Skeleton class="h-12 w-full" />
          <Skeleton class="h-36 w-full" />
        </div>
        <Skeleton class="hidden h-[42rem] w-full lg:block" />
      </div>
    </div>
  </div>

  <div
    v-else-if="errorCarga"
    class="grid min-h-screen place-items-center bg-background text-center text-foreground"
  >
    <div class="grid gap-4 p-8">
      <HelpCircle class="mx-auto h-16 w-16 text-muted-foreground/60" />
      <h1 class="text-2xl font-black">No se pudo cargar el curso</h1>
      <p class="text-sm text-muted-foreground">{{ errorCarga }}</p>
      <Button
        class="mx-auto bg-primary text-white hover:bg-primary/90"
        @click="goBack"
      >
        Volver a cursos
      </Button>
    </div>
  </div>

  <div
    v-else-if="course && contenido"
    class="flex h-screen flex-col bg-background font-sans text-foreground"
  >
    <!-- Top bar -->
    <header
      class="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm sm:px-6 z-10 dark:border-border dark:bg-card"
    >
      <div class="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          class="shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
          @click="goBack"
        >
          <ChevronLeft class="h-5 w-5" />
        </Button>
        <div class="hidden h-8 w-px bg-border sm:block" />
        <span
          class="hidden h-9 w-9 shrink-0 place-items-center rounded-full sm:grid dark:bg-white dark:p-1.5"
        >
          <img
            class="h-full w-full object-contain"
            src="/img/iconoTukuyAcademy.png"
            alt="Tukuy Academy"
          />
        </span>
        <div class="min-w-0">
          <span
            class="block text-[10px] font-extrabold uppercase tracking-wider text-primary"
          >
            Simulador de Aprendizaje
          </span>
          <h1 class="min-w-0 truncate text-sm font-bold text-foreground">
            {{ course.title }}
          </h1>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Progress pill -->
        <div
          class="hidden items-center gap-2 rounded-full border border-border bg-primary/10 px-3.5 py-1.5 sm:flex"
        >
          <CirclePlay class="h-4 w-4 text-primary" />
          <span class="text-xs font-semibold text-muted-foreground"
            >Progreso General</span
          >
          <strong class="text-xs text-primary">{{ progressPercent }}%</strong>
        </div>

        <!-- Exit button -->
        <Button
          variant="outline"
          size="sm"
          class="border-border bg-card text-muted-foreground hover:bg-muted"
          @click="goBack"
        >
          Salir del curso
        </Button>

        <!-- Mobile sidebar toggle -->
        <Button
          variant="ghost"
          size="icon"
          class="text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          @click="sidebarOpen = !sidebarOpen"
        >
          <BookOpen class="h-5 w-5" />
        </Button>
      </div>
    </header>

    <!-- Main content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left: Player + details -->
      <div class="flex flex-1 flex-col overflow-y-auto bg-card">
        <!-- Main player workspace depending on type -->
        <div
          class="relative aspect-video w-full bg-slate-950 border-b border-border"
        >
          <!-- Video Player State -->
          <template v-if="activeItem.type === 'video'">
            <div
              class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6"
            >
              <button
                type="button"
                class="group grid h-16 w-16 place-items-center rounded-full bg-card/10 transition hover:bg-card/20 hover:scale-105"
              >
                <Play class="h-7 w-7 text-white fill-white" />
              </button>
              <div class="space-y-1.5">
                <span
                  class="text-xs font-bold text-blue-400 tracking-wider uppercase"
                  >Reproduciendo clase en video</span
                >
                <h3
                  class="text-base font-bold text-white max-w-xl mx-auto truncate"
                >
                  {{ activeItem.title }}
                </h3>
              </div>
              <p class="max-w-md text-xs text-slate-400">
                Interactúa con las lecciones y cuestionarios para simular tu
                avance del curso.
              </p>

              <div class="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  class="bg-primary text-white hover:bg-primary/90 font-semibold"
                  @click="simulateQuickComplete"
                >
                  <Trophy class="mr-1.5 h-3.5 w-3.5" /> Completar contenidos
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="border-white/20 bg-card/10 text-white hover:bg-card/25 hover:text-white"
                  @click="simulateReset"
                >
                  <RefreshCw class="mr-1.5 h-3.5 w-3.5" /> Reiniciar avance
                </Button>
              </div>
            </div>
          </template>

          <!-- Quiz State -->
          <template v-else-if="activeItem.type === 'quiz'">
            <!-- When NOT submitted -->
            <div
              v-if="!quizResult || !quizResult.submitted"
              class="absolute inset-0 flex flex-col bg-slate-900 text-white p-6 overflow-y-auto"
            >
              <div class="max-w-2xl mx-auto w-full space-y-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="rounded-full bg-amber-500/10 p-2.5">
                    <HelpCircle class="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <span
                      class="text-[10px] font-bold text-amber-400 tracking-wider uppercase"
                      >Evaluación interactiva</span
                    >
                    <h3 class="text-base font-bold text-white leading-snug">
                      {{ activeItem.title }}
                    </h3>
                  </div>
                </div>

                <p
                  class="border-b border-slate-800 pb-4 text-xs leading-relaxed text-slate-300"
                >
                  Responde las siguientes preguntas de opción múltiple basadas
                  en el material de este módulo. Se requiere una nota mínima
                  aprobatoria de <strong>14/20</strong> para completar esta
                  lección.
                </p>

                <!-- Questions List -->
                <div
                  v-if="quizQuestionsDatabase[activeItem.id]"
                  class="space-y-6"
                >
                  <div
                    v-for="(q, qIdx) in quizQuestionsDatabase[activeItem.id]"
                    :key="qIdx"
                    class="space-y-2.5 bg-slate-950/40 p-4 rounded-lg border border-slate-800"
                  >
                    <h4 class="text-xs font-bold text-slate-200">
                      {{ qIdx + 1 }}. {{ q.question }}
                    </h4>
                    <div class="grid gap-2">
                      <label
                        v-for="(opt, oIdx) in q.options"
                        :key="oIdx"
                        class="flex items-start gap-3 rounded-md p-2.5 text-xs cursor-pointer border transition-all"
                        :class="
                          selectedAnswers[qIdx] === oIdx
                            ? 'bg-primary/30 border-primary text-white font-medium'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                        "
                      >
                        <input
                          type="radio"
                          :name="'q-' + qIdx"
                          :value="oIdx"
                          v-model="selectedAnswers[qIdx]"
                          class="mt-0.5 accent-blue-500 shrink-0"
                        />
                        <span>{{ opt }}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-end gap-3 pt-2">
                  <Button
                    size="sm"
                    class="bg-amber-600 hover:bg-amber-500 font-bold text-white px-6 py-2.5 h-10"
                    :disabled="
                      Object.keys(selectedAnswers).length <
                      (quizQuestionsDatabase[activeItem.id]?.length || 0)
                    "
                    @click="submitQuiz(activeItem.id)"
                  >
                    Enviar y Calificar cuestionario
                  </Button>
                </div>
              </div>
            </div>

            <!-- When Submitted (Results screen) -->
            <div
              v-else
              class="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900 text-white text-center"
            >
              <div class="max-w-md mx-auto space-y-6">
                <!-- Result icon -->
                <div class="flex justify-center">
                  <div
                    class="rounded-full p-5 ring-8"
                    :class="
                      quizResult.passed
                        ? 'bg-emerald-500/10 ring-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/10 ring-red-500/15 text-red-400'
                    "
                  >
                    <CheckCircle2
                      v-if="quizResult.passed"
                      class="h-10 w-10 text-emerald-400"
                    />
                    <X v-else class="h-10 w-10 text-red-400" />
                  </div>
                </div>

                <div class="space-y-2">
                  <span
                    class="text-xs font-bold tracking-wider uppercase"
                    :class="
                      quizResult.passed ? 'text-emerald-400' : 'text-red-400'
                    "
                  >
                    {{
                      quizResult.passed
                        ? "¡Cuestionario Aprobado!"
                        : "Cuestionario Desaprobado"
                    }}
                  </span>
                  <h3 class="text-lg font-bold text-white">
                    {{ activeItem.title }}
                  </h3>
                </div>

                <!-- Score indicator -->
                <div
                  class="bg-slate-950/50 rounded-xl p-4 border border-slate-800 max-w-xs mx-auto"
                >
                  <p
                    class="text-xs font-bold uppercase tracking-wide text-slate-400"
                  >
                    Calificación obtenida
                  </p>
                  <strong
                    class="text-4xl font-black block mt-1"
                    :class="
                      quizResult.passed ? 'text-emerald-400' : 'text-red-400'
                    "
                  >
                    {{ quizResult.score }} / 20
                  </strong>
                  <p class="mt-1 text-[10px] text-slate-400">
                    {{
                      quizResult.passed
                        ? "Nota aprobada para acreditación."
                        : "Requiere un mínimo de 14 para aprobar."
                    }}
                  </p>
                </div>

                <div class="flex justify-center gap-3 pt-2">
                  <Button
                    v-if="!quizResult.passed"
                    size="sm"
                    class="bg-amber-600 hover:bg-amber-500 font-bold text-white px-5"
                    @click="
                      quizResult = null;
                      selectedAnswers = {};
                    "
                  >
                    <RefreshCw class="mr-1.5 h-3.5 w-3.5" />
                    Intentar de nuevo
                  </Button>
                  <Button
                    v-else
                    size="sm"
                    variant="outline"
                    class="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                    @click="
                      quizResult = null;
                      selectedAnswers = {};
                    "
                  >
                    Ver mis respuestas
                  </Button>
                </div>
              </div>
            </div>
          </template>

          <!-- Reading State -->
          <template v-else-if="activeItem.type === 'reading'">
            <div
              class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6 bg-slate-900 text-white"
            >
              <div
                class="rounded-full bg-primary/100/10 p-4 ring-4 ring-blue-500/20"
              >
                <FileText class="h-8 w-8 text-blue-400" />
              </div>
              <div class="space-y-1.5">
                <span
                  class="text-xs font-bold text-blue-400 tracking-wider uppercase"
                  >Material complementario / Lectura</span
                >
                <h3 class="text-lg font-bold text-white max-w-xl mx-auto">
                  {{ activeItem.title }}
                </h3>
              </div>
              <p class="max-w-md text-xs text-slate-400">
                Revisa el documento o plantilla Excel para afianzar los
                conceptos prácticos.
              </p>

              <div class="mt-4 flex flex-wrap justify-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  class="border-white/20 bg-card/10 text-white hover:bg-card/25"
                >
                  <Download class="mr-1.5 h-4 w-4" /> Descargar Material
                </Button>
                <Button
                  size="sm"
                  :class="
                    completedItems.includes(activeItem.id)
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-blue-600 hover:bg-primary/100'
                  "
                  class="text-white font-semibold"
                  @click="toggleItem(activeItem.id)"
                >
                  <CheckCircle2 class="mr-1.5 h-4 w-4" />
                  {{
                    completedItems.includes(activeItem.id)
                      ? "Lectura Completada"
                      : "Marcar como Leído"
                  }}
                </Button>
              </div>
            </div>
          </template>

          <!-- Assignment State -->
          <template v-else-if="activeItem.type === 'assignment'">
            <div
              class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6 bg-slate-900 text-white"
            >
              <div
                class="rounded-full bg-purple-500/10 p-4 ring-4 ring-purple-500/20"
              >
                <FileCheck2 class="h-8 w-8 text-purple-400" />
              </div>
              <div class="space-y-1.5">
                <span
                  class="text-xs font-bold text-purple-400 tracking-wider uppercase"
                  >Actividad: Entrega de evidencia PDF</span
                >
                <h3 class="text-lg font-bold text-white max-w-xl mx-auto">
                  {{ activeItem.title }}
                </h3>
              </div>
              <p class="max-w-md text-xs text-slate-400">
                Sube la resolución del caso práctico en formato PDF. El docente
                revisará el archivo y registrará la nota y retroalimentación.
              </p>

              <div
                v-if="entregaActual?.archivo || archivoSeleccionado"
                class="w-full max-w-md border border-white/15 bg-white/5 px-4 py-3 text-left text-xs"
              >
                <p class="font-bold text-white">
                  {{
                    archivoSeleccionado?.name ?? entregaActual?.archivo?.nombre
                  }}
                </p>
                <p class="mt-1 text-slate-400">
                  {{
                    archivoSeleccionado
                      ? "Archivo listo para enviar"
                      : entregaActual?.estado.replace("_", " ")
                  }}
                  <span v-if="entregaActual?.nota !== undefined">
                    · Nota {{ entregaActual.nota }}/20
                  </span>
                </p>
                <p
                  v-if="
                    entregaActual?.retroalimentacion && !archivoSeleccionado
                  "
                  class="mt-2 border-l-2 border-purple-400 pl-2 leading-5 text-slate-200"
                >
                  {{ entregaActual.retroalimentacion }}
                </p>
              </div>
              <p
                v-if="errorEntrega"
                class="max-w-md text-xs font-bold text-red-400"
              >
                {{ errorEntrega }}
              </p>

              <div class="mt-4 flex gap-3">
                <input
                  ref="selectorPdf"
                  class="hidden"
                  type="file"
                  accept="application/pdf"
                  @change="seleccionarPdf"
                />
                <Button
                  v-if="entregaActual?.archivo"
                  size="sm"
                  variant="outline"
                  class="border-white/20 bg-card/10 text-white hover:bg-card/25"
                  @click="academicoService.abrirArchivo(entregaActual)"
                >
                  <Eye class="mr-1.5 h-4 w-4" />
                  Ver PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  class="border-white/20 bg-card/10 text-white hover:bg-card/25"
                  @click="selectorPdf?.click()"
                >
                  <Upload class="mr-1.5 h-4 w-4" />
                  {{
                    entregaActual?.archivo
                      ? "Reemplazar PDF"
                      : "Seleccionar PDF"
                  }}
                </Button>
                <Button
                  size="sm"
                  :class="
                    completedItems.includes(activeItem.id)
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-purple-600 hover:bg-purple-550'
                  "
                  class="text-white font-semibold"
                  :disabled="enviandoEntrega || !archivoSeleccionado"
                  @click="entregarActividad"
                >
                  <CheckCircle2 class="mr-1.5 h-4 w-4" />
                  {{
                    enviandoEntrega
                      ? "Enviando..."
                      : entregaActual?.archivo
                        ? "Enviar nueva versión"
                        : "Entregar y finalizar"
                  }}
                </Button>
              </div>
            </div>
          </template>

          <!-- Fake control bar at bottom of player -->
          <div
            class="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-slate-950/85 px-4 py-2.5 text-[11px] text-slate-400"
          >
            <span>02:14 / 15:00</span>
            <div class="h-1 flex-1 mx-4 rounded bg-slate-800 overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-500"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
            <span>Calidad HD</span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="border-b border-border bg-card">
          <nav class="flex gap-0 overflow-x-auto px-6">
            <button
              type="button"
              class="whitespace-nowrap px-4 py-4 text-sm font-bold transition border-b-2"
              :class="
                activeTab === 'descripcion'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'descripcion'"
            >
              Descripción general
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-4 py-4 text-sm font-bold transition border-b-2"
              :class="
                activeTab === 'preguntas'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'preguntas'"
            >
              Preguntas y respuestas
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-4 py-4 text-sm font-bold transition border-b-2"
              :class="
                activeTab === 'notas'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'notas'"
            >
              Notas
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-4 py-4 text-sm font-bold transition border-b-2"
              :class="
                activeTab === 'resenas'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'resenas'"
            >
              Reseñas
            </button>
          </nav>
        </div>

        <!-- Tab content -->
        <div class="p-6 sm:p-8 bg-card">
          <template v-if="activeTab === 'descripcion'">
            <h2 class="text-xl font-black text-foreground">
              {{ activeItem.title }}
            </h2>
            <p class="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {{ activeItem.description }}
            </p>

            <!-- Cards section -->
            <div class="mt-6 grid gap-4 sm:grid-cols-3">
              <div
                class="rounded-xl border border-border bg-muted p-4 shadow-sm"
              >
                <div
                  class="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"
                >
                  <ClipboardCheck class="h-4 w-4 text-primary" />
                  Avance simulado
                </div>
                <strong class="mt-2 block text-3xl font-black text-foreground"
                  >{{ completedItemsCount }}/{{ totalItemsCount }}</strong
                >
              </div>

              <div
                class="rounded-xl border border-border bg-muted p-4 shadow-sm"
              >
                <div
                  class="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"
                >
                  <Star class="h-4 w-4 text-[#F5B400]" />
                  Promedio de notas
                </div>
                <strong class="mt-2 block text-3xl font-black text-foreground">
                  {{ averageGrade || "--" }}
                </strong>
              </div>

              <div
                class="rounded-xl border border-border bg-muted p-4 shadow-sm"
              >
                <div
                  class="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"
                >
                  <GraduationCap class="h-4 w-4 text-emerald-600" />
                  Estado
                </div>
                <strong
                  class="mt-2 block text-3xl font-black text-foreground"
                  :class="
                    gradeStatus === 'En riesgo'
                      ? 'text-amber-500'
                      : 'text-foreground'
                  "
                >
                  {{ gradeStatus }}
                </strong>
              </div>
            </div>

            <!-- What you will learn -->
            <div class="mt-8 border-t border-border pt-6">
              <h3 class="text-base font-bold text-foreground">
                Lo que aprenderás en esta sesión
              </h3>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div
                  class="flex gap-3 rounded-lg border border-border p-3.5 bg-muted/50"
                >
                  <CheckCircle2
                    class="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                  />
                  <span class="text-sm text-muted-foreground leading-snug"
                    >Aplicar {{ course.category.toLowerCase() }} en flujos
                    reales de obra y campo.</span
                  >
                </div>
                <div
                  class="flex gap-3 rounded-lg border border-border p-3.5 bg-muted/50"
                >
                  <CheckCircle2
                    class="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                  />
                  <span class="text-sm text-muted-foreground leading-snug"
                    >Reforzar criterios para control operativo y oficina
                    técnica.</span
                  >
                </div>
                <div
                  class="flex gap-3 rounded-lg border border-border p-3.5 bg-muted/50"
                >
                  <CheckCircle2
                    class="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                  />
                  <span class="text-sm text-muted-foreground leading-snug"
                    >Generar evidencias válidas para tu CV inteligente
                    Tukuy.</span
                  >
                </div>
                <div
                  class="flex gap-3 rounded-lg border border-border p-3.5 bg-muted/50"
                >
                  <CheckCircle2
                    class="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                  />
                  <span class="text-sm text-muted-foreground leading-snug"
                    >Obtener certificado verificable al completar todas las
                    lecciones.</span
                  >
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'preguntas'">
            <div class="flex flex-col items-center gap-4 py-12 text-center">
              <MessageSquare class="h-12 w-12 text-muted-foreground/60" />
              <h3 class="text-base font-bold text-foreground">
                Preguntas y respuestas
              </h3>
              <p class="max-w-md text-sm text-muted-foreground">
                Próximamente podrás hacer preguntas sobre las lecciones y el
                instructor responderá aquí.
              </p>
            </div>
          </template>

          <template v-else-if="activeTab === 'notas'">
            <div class="flex flex-col items-center gap-4 py-12 text-center">
              <FileText class="h-12 w-12 text-muted-foreground/60" />
              <h3 class="text-base font-bold text-foreground">Tus notas</h3>
              <p class="max-w-md text-sm text-muted-foreground">
                Guarda apuntes importantes durante las clases para repasarlos
                más adelante.
              </p>
            </div>
          </template>

          <template v-else-if="activeTab === 'resenas'">
            <div class="flex flex-col items-center gap-4 py-12 text-center">
              <Star class="h-12 w-12 text-muted-foreground/60" />
              <h3 class="text-base font-bold text-foreground">
                Reseñas del curso
              </h3>
              <p class="max-w-md text-sm text-muted-foreground">
                Al completar el curso podrás dejar tu valoración y ayudar a
                otros estudiantes.
              </p>
            </div>
          </template>
        </div>
      </div>

      <!-- Right: Course content sidebar -->
      <aside
        class="shrink-0 flex-col border-l border-border bg-card"
        :class="[
          sidebarOpen
            ? 'fixed inset-y-16 right-0 z-40 flex w-80 shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-96 lg:shadow-none'
            : 'hidden lg:flex lg:w-96',
        ]"
      >
        <!-- Sidebar header -->
        <div
          class="flex items-center justify-between border-b border-border px-4 py-4"
        >
          <h2
            class="text-sm font-bold text-foreground uppercase tracking-wider"
          >
            Temario del Curso
          </h2>
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            @click="sidebarOpen = false"
          >
            <ChevronRight class="h-5 w-5" />
          </Button>
        </div>

        <!-- Progress bar -->
        <div class="border-b border-border px-4 py-4 bg-muted/50">
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="text-muted-foreground font-semibold"
              >{{ completedItemsCount }} de
              {{ totalItemsCount }} completadas</span
            >
            <strong class="text-primary font-bold"
              >{{ progressPercent }}%</strong
            >
          </div>
          <Progress
            :model-value="progressPercent"
            class="h-2 bg-muted [&>div]:bg-primary"
          />
        </div>

        <!-- Sections list -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            v-for="section in syllabusSections"
            :key="section.id"
            class="border border-border rounded-lg overflow-hidden shadow-sm bg-card"
          >
            <!-- Collapsible header -->
            <button
              type="button"
              class="w-full flex items-center justify-between px-4 py-3 bg-muted/70 border-b border-border text-left transition hover:bg-muted/70"
              @click="toggleSection(section.id)"
            >
              <span
                class="text-xs font-bold text-foreground uppercase tracking-wide truncate pr-2"
              >
                {{ section.title }}
              </span>
              <ChevronDown
                class="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200"
                :class="{ 'rotate-180': !collapsedSections[section.id] }"
              />
            </button>

            <!-- Collapsible body -->
            <div
              v-show="!collapsedSections[section.id]"
              class="divide-y divide-border"
            >
              <button
                v-for="item in section.items"
                :key="item.id"
                type="button"
                class="w-full flex items-start gap-3 p-3 text-left transition duration-150"
                :class="[
                  activeItemId === item.id
                    ? 'bg-primary/10 font-medium'
                    : 'hover:bg-muted/50',
                ]"
                @click="selectItem(item.id)"
              >
                <!-- Checkbox -->
                <span
                  class="shrink-0 mt-0.5 z-10"
                  @click.stop="toggleItem(item.id)"
                >
                  <CheckCircle2
                    class="h-5 w-5 transition duration-150"
                    :class="[
                      completedItems.includes(item.id)
                        ? 'text-primary fill-primary/10'
                        : 'text-muted-foreground/60 hover:text-muted-foreground',
                    ]"
                  />
                </span>

                <!-- Info -->
                <div class="min-w-0 flex-1">
                  <p
                    class="text-xs font-semibold leading-normal"
                    :class="
                      activeItemId === item.id
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    "
                  >
                    {{ item.title }}
                  </p>
                  <div
                    class="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-medium"
                  >
                    <span class="flex items-center gap-1">
                      <component
                        :is="getItemIcon(item.type)"
                        class="h-3 w-3 text-muted-foreground"
                      />
                      <span class="capitalize">{{
                        item.type === "quiz"
                          ? "Cuestionario"
                          : item.type === "reading"
                            ? "Lectura"
                            : item.type === "assignment"
                              ? "Tarea"
                              : "Video"
                      }}</span>
                    </span>
                    <span v-if="item.duration || item.questions">·</span>
                    <span v-if="item.duration">{{ item.duration }}</span>
                    <span v-else-if="item.questions"
                      >{{ item.questions }} preguntas</span
                    >
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <!-- Course not found -->
  <div
    v-else
    class="grid min-h-screen place-items-center bg-muted text-center text-foreground"
  >
    <div class="grid gap-4 p-8">
      <HelpCircle class="mx-auto h-16 w-16 text-muted-foreground/60" />
      <h1 class="text-2xl font-black text-foreground">Curso no encontrado</h1>
      <p class="text-sm text-muted-foreground">
        El curso que buscas no existe o fue eliminado.
      </p>
      <Button
        class="mx-auto bg-primary text-white hover:bg-primary/90"
        @click="goBack"
      >
        Volver a cursos
      </Button>
    </div>
  </div>
</template>
