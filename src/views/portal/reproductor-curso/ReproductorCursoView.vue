<script setup lang="ts">
import {
  BookOpen,
  Check,
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
  HelpCircle,
  Lock,
  MessageSquare,
  MoreVertical,
  Play,
  RefreshCw,
  Send,
  Share2,
  Star,
  Upload,
  UserRound,
  X,
} from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Skeleton from "primevue/skeleton";

import { aprendizajeService } from "@/api/services/aprendizaje.service";
import {
  academicoService,
  type EntregaActividadAcademica,
} from "@/api/services/academico.service";
import { Button } from "@/components/ui/button";
import { useContextoSesion } from "@/composables/useContextoSesion";
import {
  cursoEstaMatriculado,
  cursoRequiereCompra,
} from "@/lib/acceso-curso";
import {
  guardarProgresoVideoSegundos,
  leerProgresoVideoSegundos,
  limpiarProgresoVideo,
  urlEmbedYoutube,
} from "@/lib/youtube";
import type { Course } from "@/types/academia";
import type {
  ContenidoCursoAprendizaje,
  ItemAprendizaje,
  ModuloAprendizaje,
  PreguntaQuiz,
  RecursoAprendizaje,
} from "@/types/aprendizaje.types";
import { usePortalContext } from "../composables/usePortalContext";
import { asegurarCursosCargados } from "@/composables/useCursos";
import { apiConfig } from "@/api/config";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import { mapearContenidoAprendizajeSecundaria } from "@/api/services/mapper-curso-secundaria";
import { urlPublicaMedia } from "@/lib/storage-academia";

const route = useRoute();
const router = useRouter();
const portal = usePortalContext();
const { contextoActivo } = useContextoSesion();

const courseId = computed(() => route.params.courseId as string);
/** Fallback si el catálogo aún no trae el curso (deep-link raro). */
const courseFallback = ref<Course | null>(null);
const course = computed(
  () =>
    portal.courses.value.find((c) => c.id === courseId.value) ??
    courseFallback.value,
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
const quizPreguntaIndice = ref(0);
const quizResult = ref<{
  score: number;
  passed: boolean;
  submitted: boolean;
  correctIndexes?: number[];
  enviando?: boolean;
  error?: string;
  mostrandoRevision?: boolean;
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

const embedYoutube = computed(() => {
  if (activeItem.value.type !== "video") return null;
  const start = leerProgresoVideoSegundos(courseId.value, activeItem.value.id);
  return urlEmbedYoutube(activeItem.value.videoUrl, {
    startSeconds: start > 5 ? start : 0,
    enableJsApi: true,
  });
});

const iframeYoutube = ref<HTMLIFrameElement | null>(null);
let timerProgresoVideo: ReturnType<typeof setInterval> | null = null;
let ytPlayer: {
  getCurrentTime?: () => number;
  destroy?: () => void;
} | null = null;

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>,
      ) => {
        getCurrentTime: () => number;
        destroy: () => void;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

function cargarApiYoutube(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const previo = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previo?.();
      resolve();
    };
    if (!document.querySelector('script[data-tukuy-yt]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.tukuyYt = "1";
      document.head.appendChild(script);
    }
  });
}

async function montarPlayerYoutube() {
  if (activeItem.value.type !== "video" || !iframeYoutube.value) return;
  if (!embedYoutube.value) return;
  try {
    await cargarApiYoutube();
    if (!window.YT?.Player || !iframeYoutube.value) return;
    ytPlayer?.destroy?.();
    ytPlayer = new window.YT.Player(iframeYoutube.value, {
      events: {
        onStateChange: (evento: { data?: number }) => {
          // 0 = ended
          if (evento.data === 0) {
            limpiarProgresoVideo(courseId.value, activeItem.value.id);
            if (!completedItems.value.includes(activeItem.value.id)) {
              void marcarActividadCompleta(activeItem.value.id);
            }
          }
        },
      },
    });
    if (timerProgresoVideo) clearInterval(timerProgresoVideo);
    timerProgresoVideo = setInterval(() => {
      const t = ytPlayer?.getCurrentTime?.();
      if (typeof t === "number" && Number.isFinite(t) && t > 0) {
        guardarProgresoVideoSegundos(
          courseId.value,
          activeItem.value.id,
          t,
        );
      }
    }, 4000);
  } catch {
    // Sin API: el embed igual funciona; solo no hay resume fino.
  }
}

function destruirPlayerYoutube() {
  if (timerProgresoVideo) {
    clearInterval(timerProgresoVideo);
    timerProgresoVideo = null;
  }
  try {
    ytPlayer?.destroy?.();
  } catch {
    /* noop */
  }
  ytPlayer = null;
}

watch(
  () => [activeItem.value.id, activeItem.value.type, embedYoutube.value] as const,
  async () => {
    destruirPlayerYoutube();
    if (activeItem.value.type === "video" && embedYoutube.value) {
      await nextTick();
      await montarPlayerYoutube();
    }
  },
);

onBeforeUnmount(() => {
  destruirPlayerYoutube();
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

const notaMinimaCurso = computed(() => {
  const desdeContenido = Number(contenido.value?.notaMinima);
  if (Number.isFinite(desdeContenido) && desdeContenido > 0) {
    return desdeContenido;
  }
  return 14;
});

const itemsEnOrden = computed(() =>
  syllabusSections.value.flatMap((section) => section.items),
);

function actividadBloqueada(itemId: string): boolean {
  const orden = itemsEnOrden.value;
  const idx = orden.findIndex((item) => item.id === itemId);
  if (idx <= 0) return false;
  for (let i = 0; i < idx; i += 1) {
    if (!completedItems.value.includes(orden[i].id)) return true;
  }
  return false;
}

const recursosModuloActivo = computed<RecursoAprendizaje[]>(() => {
  for (const section of syllabusSections.value) {
    if (section.items.some((item) => item.id === activeItemId.value)) {
      return section.recursos ?? [];
    }
  }
  return [];
});

function abrirRecurso(recurso: RecursoAprendizaje) {
  const url = recurso.contenido?.trim();
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

const gradeStatus = computed(() => {
  if (!gradedActivities.value.length) return "Pendiente";
  return averageGrade.value >= notaMinimaCurso.value ? "Aprobando" : "En riesgo";
});

const collapsedSections = ref<Record<string, boolean>>({});
const activeTab = ref<"descripcion" | "preguntas" | "notas">(
  "descripcion",
);

type MensajeCursoAlumno = {
  id: string;
  contenido: string;
  hora: string;
  autor: "DOCENTE" | "ESTUDIANTE";
};
type DocenteCursoAlumno = {
  id: string;
  nombre: string;
  cargo: string;
  iniciales: string;
};

const docenteCurso = ref<DocenteCursoAlumno | null>(null);
const conversacionId = ref("");
const mensajesDocente = ref<MensajeCursoAlumno[]>([]);
const textoMensajeDocente = ref("");
const cargandoChat = ref(false);
const enviandoMensaje = ref(false);
const errorChat = ref("");

const sidebarOpen = ref(true);
const menuMasAbierto = ref(false);
const avisoCompartir = ref("");
const recursosItemId = ref<string | null>(null);
const selectorPdf = ref<HTMLInputElement | null>(null);
const archivoSeleccionado = ref<File>();
const entregaActual = ref<EntregaActividadAcademica>();
const enviandoEntrega = ref(false);
const errorEntrega = ref("");
const apuntes = ref("");
const guardandoApuntes = ref(false);
const mensajeApuntes = ref("");
let timerApuntes: ReturnType<typeof setTimeout> | null = null;

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
  courseFallback.value = null;
  try {
    // F5 / enlace directo: el catálogo aún no está en memoria (sí lo está
    // al entrar desde "Continuar curso"). Esperar antes de buscar el id.
    await asegurarCursosCargados();
    await portal.sincronizarProgresosCursos();
    await nextTick();

    let cursoActual = course.value;
    if (!cursoActual && apiConfig.secundariaCursos) {
      // Deep-link: el id puede existir en secundaria aunque el merge del
      // catálogo falle. Cargamos contenido y armamos meta mínima.
      const data =
        await secundariaGatewayService.obtenerContenidoAprendizaje(
          courseId.value,
        );
      if (!data.ok) {
        errorCarga.value = "No encontramos este curso.";
        return;
      }
      if (!data.matriculaId) {
        await router.replace(`/tukuy-academy/cursos/${courseId.value}`);
        return;
      }
      const mapeado = mapearContenidoAprendizajeSecundaria(data);
      const titulo = String(data.curso?.titulo ?? "Curso");
      courseFallback.value = {
        id: courseId.value,
        title: titulo,
        category: String(data.curso?.categoria ?? ""),
        duration: "",
        level: "Basico",
        mode: "Virtual",
        progress: mapeado.progreso.progreso,
        status: mapeado.progreso.estado,
        pricing: data.curso?.gratuito === false ? "paid" : "free",
        price: Number(data.curso?.precio ?? 0),
        imageTone: "from-primary/20 to-primary/5",
        image: "",
        origen: "tukuy",
        alcance: "PUBLICO",
      };
      contenido.value = mapeado.contenido;
      collapsedSections.value = Object.fromEntries(
        mapeado.contenido.modulos.map((m) => [m.id, false]),
      );
      completedItems.value = [...mapeado.progreso.itemsCompletados];
      userGrades.value = { ...mapeado.progreso.notas };
      apuntes.value = mapeado.apuntes;
      activeItemId.value =
        mapeado.progreso.itemActivoId ||
        mapeado.contenido.modulos[0]?.items[0]?.id ||
        "v1.1";
      restaurarEstadoQuizActivo();
      await cargarEntregaActiva();
      await cargarChatDocente();
      return;
    }

    if (!cursoActual) {
      errorCarga.value = "No encontramos este curso.";
      return;
    }
    if (!cursoEstaMatriculado(cursoActual)) {
      if (cursoRequiereCompra(cursoActual)) {
        portal.handleAddToCart(cursoActual.id);
        return;
      }
      await router.replace(`/tukuy-academy/cursos/${cursoActual.id}`);
      return;
    }

    const [contenidoCurso, progreso, textoApuntes] = await Promise.all([
      aprendizajeService.obtenerContenido(courseId.value),
      aprendizajeService.obtenerProgreso(courseId.value),
      aprendizajeService.obtenerApuntes(courseId.value),
    ]);

    contenido.value = contenidoCurso;
    collapsedSections.value = Object.fromEntries(
      contenidoCurso.modulos.map((m) => [m.id, false]),
    );

    completedItems.value = [...progreso.itemsCompletados];
    userGrades.value = { ...progreso.notas };
    apuntes.value = textoApuntes;
    activeItemId.value =
      progreso.itemActivoId ||
      contenidoCurso.modulos[0]?.items[0]?.id ||
      "v1.1";

    sincronizarPortal(progreso.progreso, progreso.estado);
    restaurarEstadoQuizActivo();
    await cargarEntregaActiva();
    await cargarChatDocente();
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

const preguntasQuizActivo = computed(
  () => quizQuestionsDatabase.value[activeItem.value.id] ?? [],
);
const preguntaQuizActual = computed(
  () => preguntasQuizActivo.value[quizPreguntaIndice.value],
);
const totalPreguntasQuiz = computed(() => preguntasQuizActivo.value.length);
const esUltimaPreguntaQuiz = computed(
  () =>
    totalPreguntasQuiz.value > 0 &&
    quizPreguntaIndice.value >= totalPreguntasQuiz.value - 1,
);
const respuestaPreguntaActual = computed(() => {
  const valor = selectedAnswers.value[quizPreguntaIndice.value];
  return typeof valor === "number";
});

function irAPreguntaQuiz(indice: number) {
  if (indice < 0 || indice >= totalPreguntasQuiz.value) return;
  quizPreguntaIndice.value = indice;
}

function quizAnterior() {
  irAPreguntaQuiz(quizPreguntaIndice.value - 1);
}

function quizSiguienteOEnviar() {
  if (!respuestaPreguntaActual.value) return;
  if (esUltimaPreguntaQuiz.value) {
    void submitQuiz(activeItem.value.id);
    return;
  }
  irAPreguntaQuiz(quizPreguntaIndice.value + 1);
}

function reiniciarIntentoQuiz() {
  quizResult.value = null;
  selectedAnswers.value = {};
  quizPreguntaIndice.value = 0;
}

function restaurarEstadoQuizActivo() {
  selectedAnswers.value = {};
  quizPreguntaIndice.value = 0;
  if (completedItems.value.includes(activeItemId.value)) {
    const savedGrade = userGrades.value[activeItemId.value] ?? notaMinimaCurso.value;
    quizResult.value = {
      score: savedGrade,
      passed: savedGrade >= notaMinimaCurso.value,
      submitted: true,
    };
  } else {
    quizResult.value = null;
  }
}

async function persistirApuntes() {
  if (guardandoApuntes.value) return;
  guardandoApuntes.value = true;
  mensajeApuntes.value = "";
  try {
    apuntes.value = await aprendizajeService.guardarApuntes(
      courseId.value,
      apuntes.value,
    );
    mensajeApuntes.value = "Apuntes guardados.";
    window.setTimeout(() => {
      if (mensajeApuntes.value === "Apuntes guardados.") {
        mensajeApuntes.value = "";
      }
    }, 1800);
  } catch (causa) {
    mensajeApuntes.value =
      causa instanceof Error
        ? causa.message
        : "No se pudieron guardar los apuntes.";
  } finally {
    guardandoApuntes.value = false;
  }
}

function programarGuardadoApuntes() {
  if (timerApuntes) clearTimeout(timerApuntes);
  timerApuntes = setTimeout(() => {
    void persistirApuntes();
  }, 800);
}

async function cargarChatDocente() {
  cargandoChat.value = true;
  errorChat.value = "";
  try {
    const chat = await aprendizajeService.abrirChatConDocente(courseId.value);
    docenteCurso.value = chat.docente;
    conversacionId.value = chat.conversacionId;
    mensajesDocente.value = chat.mensajes;
  } catch (causa) {
    errorChat.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo abrir el chat con el docente.";
    docenteCurso.value = null;
    conversacionId.value = "";
    mensajesDocente.value = [];
  } finally {
    cargandoChat.value = false;
  }
}

async function enviarMensajeAlDocente() {
  const texto = textoMensajeDocente.value.trim();
  if (!texto || !conversacionId.value || enviandoMensaje.value) return;
  enviandoMensaje.value = true;
  errorChat.value = "";
  try {
    const mensaje = await aprendizajeService.enviarMensajeAlDocente(
      conversacionId.value,
      texto,
    );
    mensajesDocente.value = [...mensajesDocente.value, mensaje];
    textoMensajeDocente.value = "";
  } catch (causa) {
    errorChat.value =
      causa instanceof Error ? causa.message : "No se pudo enviar el mensaje.";
  } finally {
    enviandoMensaje.value = false;
  }
}

function irAMensajeDocente() {
  activeTab.value = "preguntas";
}


async function marcarActividadCompleta(itemId: string) {
  if (!itemId || completedItems.value.includes(itemId)) return;
  if (actividadBloqueada(itemId)) return;
  const item = encontrarItem(itemId);
  if (item && (item.type === "quiz" || item.type === "assignment")) return;
  completedItems.value = [...completedItems.value, itemId];
  await persistirProgreso();
}

function encontrarItem(itemId: string): ItemAprendizaje | undefined {
  for (const s of syllabusSections.value) {
    const found = s.items.find((item) => item.id === itemId);
    if (found) return found;
  }
  return undefined;
}

async function toggleItem(itemId: string) {
  const item = encontrarItem(itemId);
  if (item && (item.type === "quiz" || item.type === "assignment")) return;
  if (actividadBloqueada(itemId) && !completedItems.value.includes(itemId)) {
    return;
  }

  if (completedItems.value.includes(itemId)) {
    completedItems.value = completedItems.value.filter((id) => id !== itemId);
  } else {
    completedItems.value = [...completedItems.value, itemId];
  }
  await persistirProgreso();
}

async function submitQuiz(itemId: string) {
  const questions = quizQuestionsDatabase.value[itemId];
  if (!questions?.length || quizResult.value?.enviando) return;

  const respuestas = questions.map((_, idx) => {
    const valor = selectedAnswers.value[idx];
    return typeof valor === "number" ? valor : -1;
  });
  if (respuestas.some((r) => r < 0)) return;

  quizResult.value = {
    score: 0,
    passed: false,
    submitted: false,
    enviando: true,
    error: undefined,
  };

  try {
    const resultado = await aprendizajeService.calificarQuiz(
      courseId.value,
      itemId,
      respuestas,
    );
    quizResult.value = {
      score: resultado.score,
      passed: resultado.passed,
      submitted: true,
      correctIndexes: resultado.correctIndexes,
    };
    userGrades.value = { ...userGrades.value, ...resultado.notas };
    completedItems.value = [...resultado.itemsCompletados];
    sincronizarPortal(resultado.progreso, resultado.estado);
  } catch (causa) {
    quizResult.value = {
      score: 0,
      passed: false,
      submitted: false,
      enviando: false,
      error:
        causa instanceof Error
          ? causa.message
          : "No se pudo calificar el cuestionario.",
    };
  }
}

function goBack() {
  router.push("/tukuy-academy/mi-aprendizaje");
}

const CIRCUNFERENCIA_PROGRESO = 2 * Math.PI * 13;

const trazoProgreso = computed(() => {
  const pct = Math.min(100, Math.max(0, progressPercent.value)) / 100;
  return CIRCUNFERENCIA_PROGRESO * (1 - pct);
});

const indiceItemActivo = computed(() =>
  itemsEnOrden.value.findIndex((item) => item.id === activeItem.value.id),
);

const itemAnteriorId = computed(() => {
  const indice = indiceItemActivo.value;
  if (indice <= 0) return null;
  return itemsEnOrden.value[indice - 1]?.id ?? null;
});

const itemSiguienteId = computed(() => {
  const indice = indiceItemActivo.value;
  const siguiente = itemsEnOrden.value[indice + 1];
  if (!siguiente || actividadBloqueada(siguiente.id)) return null;
  return siguiente.id;
});

function irAItemVecino(itemId: string | null) {
  if (!itemId) return;
  selectItem(itemId);
}

async function compartirCurso() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    avisoCompartir.value = "Enlace copiado";
  } catch {
    avisoCompartir.value = "No se pudo copiar el enlace";
  }
  window.setTimeout(() => {
    avisoCompartir.value = "";
  }, 1600);
}

function minutosDesdeDuracion(valor?: string) {
  if (!valor) return 0;
  const mmss = valor.trim().match(/^(\d+):(\d{2})$/);
  if (mmss?.[1] && mmss[2]) {
    return Number(mmss[1]) + Number(mmss[2]) / 60;
  }
  const min = valor.match(/(\d+)\s*min/i);
  return min?.[1] ? Number(min[1]) : 0;
}

function resumenSeccion(section: ModuloAprendizaje) {
  const total = section.items.length;
  const hechas = section.items.filter((item) =>
    completedItems.value.includes(item.id),
  ).length;
  const minutos = section.items.reduce(
    (suma, item) => suma + minutosDesdeDuracion(item.duration),
    0,
  );
  return {
    total,
    hechas,
    tiempo: minutos > 0 ? `${Math.max(1, Math.round(minutos))} min` : "",
  };
}

function recursosDeSeccion(section: ModuloAprendizaje) {
  return section.recursos ?? [];
}

function toggleRecursosItem(itemId: string) {
  recursosItemId.value = recursosItemId.value === itemId ? null : itemId;
}

function toggleSection(sectionId: string) {
  collapsedSections.value[sectionId] = !collapsedSections.value[sectionId];
}

function selectItem(itemId: string) {
  if (actividadBloqueada(itemId)) return;
  activeItemId.value = itemId;
  if (typeof window !== "undefined" && window.innerWidth < 1024) {
    sidebarOpen.value = false;
  }
  restaurarEstadoQuizActivo();
  archivoSeleccionado.value = undefined;
  errorEntrega.value = "";
  void cargarEntregaActiva();
  programarGuardadoItemActivo();
}

let timerItemActivo: ReturnType<typeof setTimeout> | null = null;
function programarGuardadoItemActivo() {
  if (timerItemActivo) clearTimeout(timerItemActivo);
  timerItemActivo = setTimeout(() => {
    void aprendizajeService.guardarItemActivo(
      courseId.value,
      activeItemId.value,
    );
  }, 400);
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
      entrega.actividadId === activeItem.value.id,
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

onMounted(() => {
  if (typeof window !== "undefined" && window.innerWidth < 1024) {
    sidebarOpen.value = false;
  }
  void cargarCurso();
});
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
    <header
      class="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3 sm:px-4"
    >
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          class="hidden h-8 w-8 shrink-0 place-items-center sm:grid"
          aria-label="Volver a mi aprendizaje"
          @click="goBack"
        >
          <img
            class="h-8 w-8 object-contain"
            src="/img/iconoTukuyAcademy.png"
            alt="Tukuy Academy"
          />
        </button>
        <Button
          variant="ghost"
          size="icon"
          class="shrink-0 text-muted-foreground sm:hidden"
          aria-label="Volver"
          @click="goBack"
        >
          <ChevronLeft class="h-5 w-5" />
        </Button>
        <div class="hidden h-6 w-px bg-border sm:block" />
        <h1 class="min-w-0 truncate text-sm font-semibold text-foreground">
          {{ course.title }}
        </h1>
      </div>

      <div class="flex shrink-0 items-center gap-1 sm:gap-2">
        <div class="hidden items-center gap-2 sm:flex">
          <svg
            class="h-8 w-8 -rotate-90"
            viewBox="0 0 32 32"
            aria-hidden="true"
          >
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              class="stroke-muted"
              stroke-width="2.5"
            />
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              class="stroke-primary"
              stroke-width="2.5"
              stroke-linecap="round"
              :stroke-dasharray="CIRCUNFERENCIA_PROGRESO"
              :stroke-dashoffset="trazoProgreso"
            />
          </svg>
          <span class="text-sm font-medium text-foreground">Tu progreso</span>
        </div>
        <span class="text-xs font-semibold text-primary sm:hidden">
          {{ progressPercent }}%
        </span>

        <Button
          variant="ghost"
          size="sm"
          class="hidden text-foreground sm:inline-flex"
          @click="compartirCurso"
        >
          <Share2 class="h-4 w-4" />
          Compartir
        </Button>
        <span
          v-if="avisoCompartir"
          class="hidden text-xs text-muted-foreground sm:inline"
        >
          {{ avisoCompartir }}
        </span>

        <div class="relative">
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground"
            aria-label="Más opciones"
            @click="menuMasAbierto = !menuMasAbierto"
          >
            <MoreVertical class="h-5 w-5" />
          </Button>
          <div
            v-if="menuMasAbierto"
            class="absolute right-0 top-full z-30 mt-1 w-48 border border-border bg-card py-1 shadow-lg"
          >
            <button
              type="button"
              class="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              @click="
                menuMasAbierto = false;
                compartirCurso();
              "
            >
              Copiar enlace
            </button>
            <button
              type="button"
              class="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              @click="
                menuMasAbierto = false;
                goBack();
              "
            >
              Salir del curso
            </button>
            <button
              v-if="course.mode === 'Mixto' || course.mode === 'Presencial'"
              type="button"
              class="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              @click="
                menuMasAbierto = false;
                router.push('/tukuy-academy/calendario');
              "
            >
              Ver calendario
            </button>
          </div>
        </div>

        <Button
          v-if="!sidebarOpen"
          variant="ghost"
          size="icon"
          class="text-muted-foreground"
          aria-label="Contenido del curso"
          @click="sidebarOpen = true"
        >
          <BookOpen class="h-5 w-5" />
        </Button>
      </div>
    </header>

    <!-- Main content -->
    <div class="flex flex-1 overflow-hidden">
      <div class="flex min-w-0 flex-1 flex-col overflow-y-auto bg-card">
        <!-- Main player workspace depending on type -->
        <div
          class="relative w-full"
          :class="
            activeItem.type === 'video'
              ? 'aspect-video max-h-[min(70vh,720px)] bg-black'
              : 'min-h-[min(62vh,680px)] max-h-[min(78vh,860px)] overflow-y-auto bg-background'
          "
        >
          <button
            v-if="itemAnteriorId && activeItem.type !== 'quiz'"
            type="button"
            class="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90"
            aria-label="Clase anterior"
            @click="irAItemVecino(itemAnteriorId)"
          >
            <ChevronLeft class="h-6 w-6" />
          </button>
          <button
            v-if="itemSiguienteId && activeItem.type !== 'quiz'"
            type="button"
            class="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90"
            aria-label="Siguiente clase"
            @click="irAItemVecino(itemSiguienteId)"
          >
            <ChevronRight class="h-6 w-6" />
          </button>
          <!-- Video Player State -->
          <template v-if="activeItem.type === 'video'">
            <iframe
              v-if="embedYoutube"
              :key="`${activeItem.id}-${embedYoutube}`"
              ref="iframeYoutube"
              class="absolute inset-0 h-full w-full"
              :src="embedYoutube"
              :title="activeItem.title"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"
            />
            <div
              v-if="embedYoutube && !completedItems.includes(activeItem.id)"
              class="absolute bottom-3 right-3 z-10"
            >
              <Button
                size="sm"
                class="bg-primary text-white hover:bg-primary/90 font-semibold shadow-lg"
                @click="marcarActividadCompleta(activeItem.id)"
              >
                Marcar como vista
              </Button>
            </div>
            <div
              v-else-if="!embedYoutube"
              class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-6"
            >
              <div
                class="grid h-16 w-16 place-items-center rounded-full bg-card/10"
              >
                <Play class="h-7 w-7 text-white fill-white" />
              </div>
              <div class="space-y-1.5">
                <span
                  class="text-xs font-bold text-blue-400 tracking-wider uppercase"
                  >Video de YouTube</span
                >
                <h3
                  class="text-base font-bold text-white max-w-xl mx-auto truncate"
                >
                  {{ activeItem.title }}
                </h3>
              </div>
              <p class="max-w-md text-xs text-slate-400">
                Esta clase aún no tiene un enlace de YouTube. El docente puede
                anclarlo desde el constructor del curso.
              </p>
              <Button
                size="sm"
                class="mt-2 bg-primary text-white hover:bg-primary/90 font-semibold"
                @click="marcarActividadCompleta(activeItem.id)"
              >
                Marcar como vista
              </Button>
            </div>
          </template>

          <template v-else-if="activeItem.type === 'quiz'">
            <div
              v-if="!quizResult || !quizResult.submitted"
              class="px-4 py-6 sm:px-8"
            >
              <div class="mx-auto w-full max-w-3xl">
                <p class="text-sm text-muted-foreground">
                  {{ activeItem.title }} · nota mínima
                  {{ notaMinimaCurso }}/20
                </p>

                <div v-if="preguntaQuizActual" class="mt-6">
                  <p class="text-sm text-muted-foreground">
                    Pregunta {{ quizPreguntaIndice + 1 }}:
                  </p>
                  <h3 class="mt-1 text-xl font-semibold text-foreground">
                    {{ preguntaQuizActual.question }}
                  </h3>

                  <div
                    v-if="preguntaQuizActual.imagenReferencia"
                    class="mt-5 overflow-hidden border border-border bg-muted/30"
                  >
                    <img
                      :src="urlPublicaMedia(preguntaQuizActual.imagenReferencia)"
                      :alt="`Referencia de la pregunta ${quizPreguntaIndice + 1}`"
                      class="mx-auto max-h-72 w-full object-contain"
                    />
                  </div>

                  <div class="mt-5 grid gap-3">
                    <label
                      v-for="(opt, oIdx) in preguntaQuizActual.options"
                      :key="oIdx"
                      class="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3.5 text-sm transition"
                      :class="
                        selectedAnswers[quizPreguntaIndice] === oIdx
                          ? 'border-primary bg-muted font-medium text-foreground'
                          : 'border-border bg-card text-foreground hover:bg-muted/60'
                      "
                    >
                      <input
                        type="radio"
                        class="mt-0.5 accent-primary"
                        :name="'pregunta-quiz-' + quizPreguntaIndice"
                        :value="oIdx"
                        v-model="selectedAnswers[quizPreguntaIndice]"
                      />
                      <span class="leading-6">{{ opt }}</span>
                    </label>
                  </div>

                  <p
                    v-if="quizResult?.error"
                    class="mt-4 text-sm text-red-600"
                  >
                    {{ quizResult.error }}
                  </p>

                  <div class="mt-6 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      :disabled="quizPreguntaIndice === 0"
                      @click="quizAnterior"
                    >
                      <ChevronLeft class="h-4 w-4" />
                      Anterior
                    </Button>
                    <span class="text-xs text-muted-foreground">
                      {{ quizPreguntaIndice + 1 }} /
                      {{ totalPreguntasQuiz }}
                    </span>
                    <Button
                      :disabled="
                        !respuestaPreguntaActual || quizResult?.enviando
                      "
                      @click="quizSiguienteOEnviar"
                    >
                      {{
                        quizResult?.enviando
                          ? "Calificando…"
                          : esUltimaPreguntaQuiz
                            ? "Enviar cuestionario"
                            : "Siguiente"
                      }}
                      <ChevronRight
                        v-if="!esUltimaPreguntaQuiz && !quizResult?.enviando"
                        class="h-4 w-4"
                      />
                    </Button>
                  </div>
                </div>

                <p
                  v-else
                  class="mt-8 rounded-lg border border-border bg-muted/40 p-5 text-sm text-muted-foreground"
                >
                  Este cuestionario aún no tiene preguntas. Cuando el docente
                  las publique podrás evaluarte aquí.
                </p>
              </div>
            </div>

            <div v-else class="px-4 py-6 sm:px-8">
              <div class="mx-auto w-full max-w-3xl">
                <template v-if="!quizResult.mostrandoRevision">
                  <div class="text-center">
                    <div class="flex justify-center">
                      <div
                        class="rounded-full p-5 ring-8"
                        :class="
                          quizResult.passed
                            ? 'bg-emerald-500/10 ring-emerald-500/15 text-emerald-600'
                            : 'bg-red-500/10 ring-red-500/15 text-red-600'
                        "
                      >
                        <CheckCircle2
                          v-if="quizResult.passed"
                          class="h-10 w-10"
                        />
                        <X v-else class="h-10 w-10" />
                      </div>
                    </div>
                    <p
                      class="mt-4 text-xs font-bold uppercase tracking-wider"
                      :class="
                        quizResult.passed ? 'text-emerald-600' : 'text-red-600'
                      "
                    >
                      {{
                        quizResult.passed
                          ? "Cuestionario aprobado"
                          : "Cuestionario desaprobado"
                      }}
                    </p>
                    <h3 class="mt-1 text-xl font-bold text-foreground">
                      {{ activeItem.title }}
                    </h3>
                    <p class="mt-4 text-4xl font-black text-foreground">
                      {{ quizResult.score }} / 20
                    </p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {{
                        quizResult.passed
                          ? "Nota aprobada para acreditación."
                          : `Requiere un mínimo de ${notaMinimaCurso} para aprobar.`
                      }}
                    </p>
                    <div class="mt-6 flex justify-center gap-3">
                      <Button
                        v-if="!quizResult.passed"
                        variant="outline"
                        @click="reiniciarIntentoQuiz"
                      >
                        <RefreshCw class="mr-1.5 h-3.5 w-3.5" />
                        Intentar de nuevo
                      </Button>
                      <Button
                        v-if="quizResult.correctIndexes?.length"
                        @click="
                          quizPreguntaIndice = 0;
                          quizResult = {
                            ...quizResult,
                            mostrandoRevision: true,
                          };
                        "
                      >
                        Ver mis respuestas
                      </Button>
                    </div>
                  </div>
                </template>

                <template v-else-if="preguntaQuizActual">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm text-muted-foreground">
                      Revisión · pregunta {{ quizPreguntaIndice + 1 }}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      @click="
                        quizResult = {
                          ...quizResult,
                          mostrandoRevision: false,
                        }
                      "
                    >
                      Volver al resultado
                    </Button>
                  </div>
                  <h3 class="mt-3 text-xl font-semibold text-foreground">
                    {{ preguntaQuizActual.question }}
                  </h3>
                  <div
                    v-if="preguntaQuizActual.imagenReferencia"
                    class="mt-5 overflow-hidden border border-border bg-muted/30"
                  >
                    <img
                      :src="urlPublicaMedia(preguntaQuizActual.imagenReferencia)"
                      alt="Referencia de la pregunta"
                      class="mx-auto max-h-72 w-full object-contain"
                    />
                  </div>
                  <div class="mt-5 grid gap-3">
                    <div
                      v-for="(opt, oIdx) in preguntaQuizActual.options"
                      :key="oIdx"
                      class="rounded-lg border px-4 py-3.5 text-sm"
                      :class="
                        oIdx === quizResult.correctIndexes?.[quizPreguntaIndice]
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-foreground'
                          : selectedAnswers[quizPreguntaIndice] === oIdx
                            ? 'border-red-500/50 bg-red-500/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground'
                      "
                    >
                      {{ opt }}
                      <span
                        v-if="
                          oIdx ===
                          quizResult.correctIndexes?.[quizPreguntaIndice]
                        "
                        class="ml-2 text-[11px] font-bold uppercase text-emerald-700"
                        >Correcta</span
                      >
                      <span
                        v-else-if="
                          selectedAnswers[quizPreguntaIndice] === oIdx
                        "
                        class="ml-2 text-[11px] font-bold uppercase text-red-700"
                        >Tu respuesta</span
                      >
                    </div>
                  </div>
                  <div class="mt-6 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      :disabled="quizPreguntaIndice === 0"
                      @click="quizAnterior"
                    >
                      <ChevronLeft class="h-4 w-4" />
                      Anterior
                    </Button>
                    <span class="text-xs text-muted-foreground">
                      {{ quizPreguntaIndice + 1 }} / {{ totalPreguntasQuiz }}
                    </span>
                    <Button
                      v-if="!esUltimaPreguntaQuiz"
                      @click="irAPreguntaQuiz(quizPreguntaIndice + 1)"
                    >
                      Siguiente
                      <ChevronRight class="h-4 w-4" />
                    </Button>
                    <Button
                      v-else-if="!quizResult.passed"
                      variant="outline"
                      @click="reiniciarIntentoQuiz"
                    >
                      <RefreshCw class="mr-1.5 h-3.5 w-3.5" />
                      Intentar de nuevo
                    </Button>
                  </div>
                </template>
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
                  v-if="recursosModuloActivo.length"
                  size="sm"
                  variant="outline"
                  class="border-white/20 bg-card/10 text-white hover:bg-card/25"
                  @click="abrirRecurso(recursosModuloActivo[0])"
                >
                  <Download class="mr-1.5 h-4 w-4" />
                  {{ recursosModuloActivo[0].nombre || "Descargar material" }}
                </Button>
                <Button
                  size="sm"
                  :class="
                    completedItems.includes(activeItem.id)
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-blue-600 hover:bg-primary/100'
                  "
                  class="text-white font-semibold"
                  :disabled="actividadBloqueada(activeItem.id)"
                  @click="
                    completedItems.includes(activeItem.id)
                      ? undefined
                      : marcarActividadCompleta(activeItem.id)
                  "
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

        </div>

        <div class="border-b border-border bg-card">
          <nav class="flex gap-0 overflow-x-auto px-4 sm:px-6">
            <button
              type="button"
              class="whitespace-nowrap px-3 py-3.5 text-sm font-medium transition border-b-2 sm:px-4"
              :class="
                activeTab === 'descripcion'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'descripcion'"
            >
              Descripción general
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-3 py-3.5 text-sm font-medium transition border-b-2 sm:px-4"
              :class="
                activeTab === 'preguntas'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'preguntas'"
            >
              Preguntas y respuestas
            </button>
            <button
              type="button"
              class="whitespace-nowrap px-3 py-3.5 text-sm font-medium transition border-b-2 sm:px-4"
              :class="
                activeTab === 'notas'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'notas'"
            >
              Notas
            </button>
          </nav>
        </div>

        <!-- Tab content -->
        <div class="p-6 sm:p-8 bg-card">
          <template v-if="activeTab === 'descripcion'">
            <h2 class="text-2xl font-bold tracking-tight text-foreground">
              {{ activeItem.title }}
            </h2>
            <div
              class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
            >
              <span v-if="course.rating" class="inline-flex items-center gap-1">
                <Star class="h-3.5 w-3.5 fill-current text-accent" />
                {{ course.rating.toFixed(1).replace(".", ",") }}
              </span>
              <span>{{ course.mode }}</span>
              <span>{{ course.duration }}</span>
              <span
                >{{ completedItemsCount }} / {{ totalItemsCount }} clases</span
              >
              <span
                :class="
                  gradeStatus === 'En riesgo'
                    ? 'text-amber-600'
                    : 'text-foreground'
                "
                >{{ gradeStatus }}</span
              >
              <span v-if="averageGrade"
                >Promedio {{ averageGrade }}/20</span
              >
            </div>
            <p
              v-if="activeItem.description"
              class="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground"
            >
              {{ activeItem.description }}
            </p>

            <!-- Docente del curso -->
            <div
              class="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span
                  class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-white"
                >
                  {{ docenteCurso?.iniciales || "DO" }}
                </span>
                <div class="min-w-0">
                  <p class="text-xs font-bold uppercase text-muted-foreground">
                    Tu docente
                  </p>
                  <p class="truncate text-base font-black text-foreground">
                    {{ docenteCurso?.nombre || "Docente del curso" }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ docenteCurso?.cargo || "Instructor" }}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                class="bg-primary text-white"
                @click="irAMensajeDocente"
              >
                <MessageSquare class="h-4 w-4" />
                Escribir al docente
              </Button>
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
            <div class="grid gap-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 class="text-base font-bold text-foreground">
                    Preguntas y respuestas
                  </h3>
                  <p class="mt-1 text-sm text-muted-foreground">
                    Conversación privada con
                    {{ docenteCurso?.nombre || "tu instructor" }}. No es el foro
                    entre compañeros.
                  </p>
                </div>
                <div
                  v-if="docenteCurso"
                  class="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5"
                >
                  <UserRound class="h-4 w-4 text-primary" />
                  <span class="text-xs font-semibold">{{
                    docenteCurso.nombre
                  }}</span>
                </div>
              </div>

              <p v-if="errorChat" class="text-sm font-semibold text-red-600">
                {{ errorChat }}
              </p>

              <div
                class="flex max-h-80 min-h-56 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4"
              >
                <div
                  v-if="cargandoChat"
                  class="py-10 text-center text-sm text-muted-foreground"
                >
                  Cargando conversación…
                </div>
                <p
                  v-else-if="!mensajesDocente.length"
                  class="py-10 text-center text-sm text-muted-foreground"
                >
                  Aún no hay mensajes. Escribe tu primera duda al docente.
                </p>
                <div
                  v-for="mensaje in mensajesDocente"
                  :key="mensaje.id"
                  class="max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm"
                  :class="
                    mensaje.autor === 'ESTUDIANTE'
                      ? 'ml-auto bg-primary text-white'
                      : 'bg-card text-foreground'
                  "
                >
                  <p>{{ mensaje.contenido }}</p>
                  <p class="mt-1 text-right text-[10px] opacity-70">
                    {{ mensaje.hora }}
                  </p>
                </div>
              </div>

              <form
                class="flex gap-2"
                @submit.prevent="enviarMensajeAlDocente"
              >
                <input
                  v-model="textoMensajeDocente"
                  class="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none ring-primary focus:ring-2"
                  placeholder="Escribe un mensaje para tu docente…"
                  :disabled="!conversacionId || enviandoMensaje"
                />
                <Button
                  type="submit"
                  :disabled="
                    !textoMensajeDocente.trim() ||
                    !conversacionId ||
                    enviandoMensaje
                  "
                >
                  <Send class="h-4 w-4" />
                  Enviar
                </Button>
              </form>
            </div>
          </template>

          <template v-else-if="activeTab === 'notas'">
            <div class="grid gap-4">
              <div>
                <h3 class="text-base font-bold text-foreground">Tus apuntes</h3>
                <p class="mt-1 text-sm text-muted-foreground">
                  Se guardan automáticamente.
                </p>
              </div>
              <textarea
                v-model="apuntes"
                rows="10"
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-2"
                placeholder="Escribe ideas clave, dudas o recordatorios de la clase…"
                @input="programarGuardadoApuntes"
                @blur="persistirApuntes"
              />
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs text-muted-foreground">
                  {{
                    guardandoApuntes
                      ? "Guardando…"
                      : mensajeApuntes || "Autoguardado al escribir."
                  }}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="guardandoApuntes"
                  @click="persistirApuntes"
                >
                  Guardar ahora
                </Button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <aside
        class="flex shrink-0 flex-col border-l border-border bg-card"
        :class="[
          sidebarOpen
            ? 'fixed inset-y-14 right-0 z-40 w-[min(100%,22rem)] shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:w-[380px] lg:shadow-none'
            : 'hidden',
        ]"
      >
        <div
          class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4"
        >
          <h2 class="text-base font-bold text-foreground">
            Contenido del curso
          </h2>
          <Button
            variant="ghost"
            size="icon"
            class="text-muted-foreground"
            aria-label="Cerrar contenido"
            @click="sidebarOpen = false"
          >
            <X class="h-5 w-5" />
          </Button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <section
            v-for="(section, indiceSeccion) in syllabusSections"
            :key="section.id"
            class="border-b border-border"
          >
            <button
              type="button"
              class="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/40"
              @click="toggleSection(section.id)"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold leading-snug text-foreground">
                  Sección {{ indiceSeccion + 1 }}:
                  {{ section.title }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ resumenSeccion(section).hechas }} /
                  {{ resumenSeccion(section).total }}
                  <span v-if="resumenSeccion(section).tiempo">
                    · {{ resumenSeccion(section).tiempo }}
                  </span>
                </p>
              </div>
              <ChevronDown
                class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform"
                :class="{ 'rotate-180': !collapsedSections[section.id] }"
              />
            </button>

            <div v-show="!collapsedSections[section.id]" class="pb-2">
              <div
                v-for="item in section.items"
                :key="item.id"
                class="relative"
              >
                <button
                  type="button"
                  class="flex w-full items-start gap-3 px-4 py-2.5 text-left"
                  :class="[
                    actividadBloqueada(item.id)
                      ? 'cursor-not-allowed opacity-50'
                      : activeItemId === item.id
                        ? 'bg-muted'
                        : 'hover:bg-muted/50',
                  ]"
                  :aria-current="activeItemId === item.id ? 'true' : undefined"
                  :disabled="actividadBloqueada(item.id)"
                  @click="selectItem(item.id)"
                >
                  <span
                    role="checkbox"
                    tabindex="0"
                    class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center border border-muted-foreground/50 bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    :aria-checked="completedItems.includes(item.id)"
                    :aria-label="
                      completedItems.includes(item.id)
                        ? `Completada: ${item.title}`
                        : `Marcar completada: ${item.title}`
                    "
                    :class="
                      item.type === 'quiz' ||
                      item.type === 'assignment' ||
                      actividadBloqueada(item.id)
                        ? 'pointer-events-none'
                        : ''
                    "
                    @click.stop="toggleItem(item.id)"
                    @keydown.enter.prevent.stop="toggleItem(item.id)"
                    @keydown.space.prevent.stop="toggleItem(item.id)"
                  >
                    <Lock
                      v-if="actividadBloqueada(item.id)"
                      class="h-3 w-3 text-muted-foreground"
                    />
                    <Check
                      v-else-if="completedItems.includes(item.id)"
                      class="h-3 w-3 text-primary"
                    />
                  </span>

                  <div class="min-w-0 flex-1">
                    <p
                      class="text-sm leading-snug"
                      :class="
                        activeItemId === item.id
                          ? 'font-semibold text-foreground'
                          : 'text-foreground/90'
                      "
                    >
                      {{ item.title }}
                    </p>
                    <div
                      class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span class="inline-flex items-center gap-1">
                        <component
                          :is="getItemIcon(item.type)"
                          class="h-3.5 w-3.5"
                        />
                        <span>{{
                          item.duration ||
                          (item.questions
                            ? `${item.questions} preguntas`
                            : item.type === "quiz"
                              ? "Cuestionario"
                              : item.type === "assignment"
                                ? "Tarea"
                                : item.type === "reading"
                                  ? "Lectura"
                                  : "Video")
                        }}</span>
                      </span>
                      <button
                        v-if="recursosDeSeccion(section).length"
                        type="button"
                        class="inline-flex items-center gap-1 border border-border px-1.5 py-0.5 text-[11px] font-medium hover:bg-background"
                        @click.stop="toggleRecursosItem(item.id)"
                      >
                        Recursos
                        <ChevronDown class="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </button>

                <div
                  v-if="
                    recursosItemId === item.id &&
                    recursosDeSeccion(section).length
                  "
                  class="mb-2 ml-11 mr-4 border border-border bg-muted/40"
                >
                  <button
                    v-for="recurso in recursosDeSeccion(section)"
                    :key="recurso.id"
                    type="button"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
                    @click="abrirRecurso(recurso)"
                  >
                    <Download class="h-3.5 w-3.5 shrink-0" />
                    <span class="truncate">{{ recurso.nombre }}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
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
