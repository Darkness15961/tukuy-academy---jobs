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
  LogOut,
  MessageSquare,
  MoreVertical,
  Play,
  RefreshCw,
  Send,
  Star,
  Upload,
  UserRound,
  X,
} from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { aprendizajeService } from "@/api/services/aprendizaje.service";
import {
  academicoService,
  type EntregaActividadAcademica,
} from "@/api/services/academico.service";
import CargaPerezosaCurso from "@/components/shared/CargaPerezosaCurso.vue";
import { Button } from "@/components/ui/button";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { toast } from "@/lib/toast";
import {
  cursoEstaMatriculado,
  cursoRequiereCompra,
} from "@/lib/acceso-curso";
import {
  guardarProgresoVideoSegundos,
  leerProgresoVideoSegundos,
  limpiarProgresoVideo,
} from "@/lib/youtube";
import {
  descripcionVisibleAlumno,
  etiquetaFuenteVideo,
  urlAperturaVideo,
  urlEmbedVideo,
  type FuenteVideoCurso,
} from "@/lib/video-curso";
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

const descripcionClase = computed(() =>
  descripcionVisibleAlumno(activeItem.value.description, {
    titulo: activeItem.value.title,
    videoUrl: activeItem.value.videoUrl,
  }),
);

const videoActivo = computed(() => {
  if (activeItem.value.type !== "video") return null;
  const start = leerProgresoVideoSegundos(courseId.value, activeItem.value.id);
  return urlEmbedVideo(activeItem.value.videoUrl, activeItem.value.videoFuente, {
    startSeconds: start > 5 ? start : 0,
  });
});

const embedVideo = computed(() => videoActivo.value?.embed ?? null);
const fuenteVideoActiva = computed<FuenteVideoCurso>(
  () => videoActivo.value?.fuente ?? "youtube",
);
const urlAperturaVideoActiva = computed(() =>
  urlAperturaVideo(activeItem.value.videoUrl, fuenteVideoActiva.value),
);

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
  if (!embedVideo.value || fuenteVideoActiva.value !== "youtube") return;
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
  () =>
    [activeItem.value.id, activeItem.value.type, embedVideo.value, fuenteVideoActiva.value] as const,
  async () => {
    destruirPlayerYoutube();
    if (
      activeItem.value.type === "video" &&
      embedVideo.value &&
      fuenteVideoActiva.value === "youtube"
    ) {
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

function abrirRevisionQuiz() {
  if (!quizResult.value) return;
  quizPreguntaIndice.value = 0;
  quizResult.value = {
    ...quizResult.value,
    mostrandoRevision: true,
  };
}

function cerrarRevisionQuiz() {
  if (!quizResult.value) return;
  quizResult.value = {
    ...quizResult.value,
    mostrandoRevision: false,
  };
}

function actividadBloqueada(itemId: string): boolean {
  const orden = itemsEnOrden.value;
  const idx = orden.findIndex((item) => item.id === itemId);
  if (idx <= 0) return false;
  for (let i = 0; i < idx; i += 1) {
    const previo = orden[i];
    if (previo && !completedItems.value.includes(previo.id)) return true;
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
    toast.error(mensajeApuntes.value);
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
  } catch {
    errorChat.value =
      "El chat con el docente no está disponible por ahora. Puedes seguir el curso con normalidad.";
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
    toast.success("Mensaje enviado al docente.");
  } catch (causa) {
    errorChat.value =
      causa instanceof Error ? causa.message : "No se pudo enviar el mensaje.";
    toast.error(errorChat.value);
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
    toast.error(
      quizResult.value.error ?? "No se pudo calificar el cuestionario.",
    );
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
    toast.error(errorEntrega.value);
    return;
  }
  if (archivo.size > 8_000_000) {
    errorEntrega.value = "El PDF debe pesar menos de 8 MB en la demostración.";
    toast.error(errorEntrega.value);
    return;
  }
  archivoSeleccionado.value = archivo;
}

async function entregarActividad() {
  if (!archivoSeleccionado.value) {
    errorEntrega.value =
      "Primero selecciona el archivo PDF que deseas entregar.";
    toast.error(errorEntrega.value);
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
    toast.success("Entrega registrada.");
  } catch (error) {
    errorEntrega.value =
      error instanceof Error
        ? error.message
        : "No se pudo registrar la entrega.";
    toast.error(errorEntrega.value);
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
    aria-busy="true"
  >
    <CargaPerezosaCurso
      pantalla-completa
      :mensajes="[
        'Abriendo el curso…',
        'Alistando recursos…',
        'Cargando materiales…',
        'Preparando módulos…',
        'Sincronizando avance…',
        'Casi listo…',
      ]"
    />
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
      class="z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-2 sm:gap-3 sm:px-4"
    >
      <div class="flex min-w-0 items-center gap-2 sm:gap-3">
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

      <div class="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <div
          class="flex items-center gap-2 rounded-none border border-primary/25 bg-primary/10 px-1.5 py-1 sm:px-2.5 sm:py-1.5"
          :title="`Avance del curso: ${progressPercent}%`"
        >
          <svg
            class="h-7 w-7 shrink-0 -rotate-90 sm:h-8 sm:w-8"
            viewBox="0 0 32 32"
            aria-hidden="true"
          >
            <circle
              cx="16"
              cy="16"
              r="13"
              fill="none"
              class="stroke-primary/20"
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
          <div class="leading-tight">
            <p class="hidden text-[10px] font-bold uppercase tracking-wide text-primary sm:block">
              Tu progreso
            </p>
            <p class="text-xs font-black tabular-nums text-foreground sm:text-sm">
              {{ progressPercent }}%
            </p>
          </div>
        </div>

        <Button
          size="sm"
          class="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="Regresar al portal"
          @click="goBack"
        >
          <LogOut class="h-4 w-4" />
          <span class="hidden sm:inline">Regresar al portal</span>
          <span class="sm:hidden">Regresar</span>
        </Button>

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
                goBack();
              "
            >
              Regresar al portal
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
              ? fuenteVideoActiva === 'tiktok'
                ? 'min-h-[min(70vh,760px)] bg-black'
                : 'aspect-video max-h-[min(70vh,720px)] bg-black'
              : activeItem.type === 'quiz'
                ? 'min-h-[min(62vh,680px)] max-h-[min(78vh,860px)] overflow-y-auto bg-gradient-to-b from-primary/[0.07] via-background to-background'
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
              v-if="embedVideo && fuenteVideoActiva === 'youtube'"
              :key="`${activeItem.id}-${embedVideo}`"
              ref="iframeYoutube"
              class="absolute inset-0 h-full w-full"
              :src="embedVideo"
              :title="activeItem.title"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              referrerpolicy="strict-origin-when-cross-origin"
            />
            <iframe
              v-else-if="embedVideo && fuenteVideoActiva === 'drive'"
              :key="`${activeItem.id}-${embedVideo}`"
              class="absolute inset-0 h-full w-full"
              :src="embedVideo"
              :title="activeItem.title"
              allow="autoplay; encrypted-media; fullscreen"
              referrerpolicy="no-referrer"
            />
            <div
              v-else-if="embedVideo && fuenteVideoActiva === 'tiktok'"
              class="absolute inset-0 flex items-center justify-center p-3"
            >
              <iframe
                :key="`${activeItem.id}-${embedVideo}`"
                class="h-full max-h-[min(70vh,720px)] w-full max-w-[min(100%,420px)] rounded-none bg-black"
                :src="embedVideo"
                :title="activeItem.title"
                allow="encrypted-media; fullscreen; autoplay"
                referrerpolicy="strict-origin-when-cross-origin"
              />
            </div>
            <a
              v-if="embedVideo && fuenteVideoActiva === 'drive' && urlAperturaVideoActiva"
              class="absolute left-3 bottom-3 z-10 rounded-md bg-black/70 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/85"
              :href="urlAperturaVideoActiva"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir en Google Drive
            </a>
            <div
              v-if="embedVideo && !completedItems.includes(activeItem.id)"
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
              v-else-if="!embedVideo"
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
                  >Video de {{ etiquetaFuenteVideo(fuenteVideoActiva) }}</span
                >
                <h3
                  class="text-base font-bold text-white max-w-xl mx-auto truncate"
                >
                  {{ activeItem.title }}
                </h3>
              </div>
              <p class="max-w-md text-xs text-slate-400">
                Esta clase aún no tiene un enlace de
                {{ etiquetaFuenteVideo(fuenteVideoActiva) }} válido. El docente
                puede anclarlo desde el constructor del curso.
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
                <div
                  class="rounded-none border border-primary/20 bg-card/90 px-4 py-3 shadow-sm sm:px-5"
                >
                  <p
                    class="text-xs font-black uppercase tracking-[0.18em] text-primary"
                  >
                    Cuestionario
                  </p>
                  <p class="mt-1 text-sm font-semibold text-foreground">
                    {{ activeItem.title }}
                  </p>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    Nota mínima {{ notaMinimaCurso }}/20 para aprobar
                  </p>
                </div>

                <div v-if="preguntaQuizActual" class="mt-6">
                  <div class="mb-3 flex items-center gap-2">
                    <span
                      class="inline-flex h-7 min-w-7 items-center justify-center rounded-none bg-primary px-2 text-xs font-black text-primary-foreground"
                    >
                      {{ quizPreguntaIndice + 1 }}
                    </span>
                    <p class="text-sm text-muted-foreground">
                      de {{ totalPreguntasQuiz }} preguntas
                    </p>
                  </div>
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
                      class="flex cursor-pointer items-start gap-3 rounded-none border px-4 py-3.5 text-sm transition"
                      :class="
                        selectedAnswers[quizPreguntaIndice] === oIdx
                          ? 'border-primary bg-primary/10 font-medium text-foreground ring-1 ring-primary/25'
                          : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/[0.04]'
                      "
                    >
                      <input
                        v-model="selectedAnswers[quizPreguntaIndice]"
                        class="mt-0.5"
                        type="radio"
                        :name="`q-${quizPreguntaIndice}`"
                        :value="oIdx"
                      />
                      <span>{{ opt }}</span>
                    </label>
                  </div>

                  <p
                    v-if="quizResult?.error"
                    class="mt-4 text-sm font-semibold text-destructive"
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
                    <span class="text-xs font-semibold text-primary">
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
                  class="mt-8 rounded-none border border-border bg-muted/40 p-5 text-sm text-muted-foreground"
                >
                  Este cuestionario aún no tiene preguntas. Cuando el docente
                  las publique podrás evaluarte aquí.
                </p>
              </div>
            </div>

            <div v-else class="px-4 py-6 sm:px-8">
              <div class="mx-auto w-full max-w-3xl">
                <template v-if="!quizResult.mostrandoRevision">
                  <div
                    class="overflow-hidden rounded-none border shadow-sm"
                    :class="
                      quizResult.passed
                        ? 'border-emerald-500/35 bg-gradient-to-b from-emerald-500/15 via-card to-card'
                        : 'border-red-500/35 bg-gradient-to-b from-red-500/12 via-card to-card'
                    "
                  >
                    <div
                      class="h-1.5 w-full"
                      :class="
                        quizResult.passed ? 'bg-emerald-500' : 'bg-red-500'
                      "
                    />
                    <div class="px-6 py-10 text-center sm:px-10">
                      <div class="flex justify-center">
                        <div
                          class="rounded-full p-5 ring-8"
                          :class="
                            quizResult.passed
                              ? 'bg-emerald-500 text-white ring-emerald-500/20'
                              : 'bg-red-500 text-white ring-red-500/20'
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
                        class="mt-5 text-xs font-black uppercase tracking-[0.2em]"
                        :class="
                          quizResult.passed
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-red-700 dark:text-red-300'
                        "
                      >
                        {{
                          quizResult.passed
                            ? "Cuestionario aprobado"
                            : "Cuestionario desaprobado"
                        }}
                      </p>
                      <h3 class="mt-2 text-xl font-bold text-foreground">
                        {{ activeItem.title }}
                      </h3>
                      <p
                        class="mt-5 inline-flex items-center gap-2 rounded-none px-4 py-2 text-3xl font-black tabular-nums sm:text-4xl"
                        :class="
                          quizResult.passed
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                            : 'bg-red-500/15 text-red-800 dark:text-red-200'
                        "
                      >
                        {{ quizResult.score }}
                        <span class="text-lg font-bold opacity-60">/ 20</span>
                      </p>
                      <p class="mt-3 text-sm text-muted-foreground">
                        {{
                          quizResult.passed
                            ? "Nota aprobada para acreditación."
                            : `Requiere un mínimo de ${notaMinimaCurso} para aprobar.`
                        }}
                      </p>
                      <div class="mt-7 flex flex-wrap justify-center gap-3">
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
                          @click="abrirRevisionQuiz"
                        >
                          Ver mis respuestas
                        </Button>
                      </div>
                    </div>
                  </div>
                </template>

                <template v-else-if="preguntaQuizActual">
                  <div
                    class="rounded-none border border-primary/20 bg-card px-4 py-4 sm:px-5"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <p
                        class="text-xs font-black uppercase tracking-[0.16em] text-primary"
                      >
                        Revisión · pregunta {{ quizPreguntaIndice + 1 }}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        @click="cerrarRevisionQuiz"
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
                        :src="
                          urlPublicaMedia(preguntaQuizActual.imagenReferencia)
                        "
                        alt="Referencia de la pregunta"
                        class="mx-auto max-h-72 w-full object-contain"
                      />
                    </div>
                    <div class="mt-5 grid gap-3">
                      <div
                        v-for="(opt, oIdx) in preguntaQuizActual.options"
                        :key="oIdx"
                        class="rounded-none border px-4 py-3.5 text-sm"
                        :class="
                          oIdx ===
                          quizResult.correctIndexes?.[quizPreguntaIndice]
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-foreground'
                            : selectedAnswers[quizPreguntaIndice] === oIdx
                              ? 'border-red-500/50 bg-red-500/10 text-foreground'
                              : 'border-border bg-muted/30 text-muted-foreground'
                        "
                      >
                        {{ opt }}
                        <span
                          v-if="
                            oIdx ===
                            quizResult.correctIndexes?.[quizPreguntaIndice]
                          "
                          class="ml-2 text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300"
                          >Correcta</span
                        >
                        <span
                          v-else-if="
                            selectedAnswers[quizPreguntaIndice] === oIdx
                          "
                          class="ml-2 text-[11px] font-bold uppercase text-red-700 dark:text-red-300"
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
                      <span class="text-xs font-semibold text-primary">
                        {{ quizPreguntaIndice + 1 }} /
                        {{ totalPreguntasQuiz }}
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
                  v-if="recursosModuloActivo[0]"
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
          <nav class="flex gap-0 overflow-x-auto px-3 sm:px-6">
            <button
              type="button"
              class="whitespace-nowrap px-3 py-3.5 text-sm font-medium transition border-b-2 sm:px-4"
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
              class="whitespace-nowrap px-3 py-3.5 text-sm font-medium transition border-b-2 sm:px-4"
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
              class="whitespace-nowrap px-3 py-3.5 text-sm font-medium transition border-b-2 sm:px-4"
              :class="
                activeTab === 'notas'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              "
              @click="activeTab = 'notas'"
            >
              Notas
            </button>
          </nav>
        </div>

        <!-- Tab content -->
        <div class="bg-card p-4 sm:bg-gradient-to-b sm:from-primary/[0.04] sm:to-card sm:p-8">
          <template v-if="activeTab === 'descripcion'">
            <h2 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {{ activeItem.title }}
            </h2>
            <div
              class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm"
            >
              <span
                v-if="course.rating"
                class="inline-flex items-center gap-1 rounded-none border border-accent/30 bg-accent/10 px-2 py-0.5 text-foreground"
              >
                <Star class="h-3.5 w-3.5 fill-current text-accent" />
                {{ course.rating.toFixed(1).replace(".", ",") }}
              </span>
              <span
                class="rounded-none border border-border bg-muted/60 px-2 py-0.5 text-foreground"
                >{{ course.mode }}</span
              >
              <span
                class="rounded-none border border-border bg-muted/60 px-2 py-0.5 text-foreground"
                >{{ course.duration }}</span
              >
              <span
                class="rounded-none border border-primary/20 bg-primary/10 px-2 py-0.5 text-primary"
                >{{ completedItemsCount }} / {{ totalItemsCount }} clases</span
              >
              <span
                class="rounded-none border px-2 py-0.5"
                :class="
                  gradeStatus === 'En riesgo'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                "
                >{{ gradeStatus }}</span
              >
              <span
                v-if="averageGrade"
                class="rounded-none border border-border bg-card px-2 py-0.5"
                >Promedio {{ averageGrade }}/20</span
              >
            </div>
            <p
              v-if="descripcionClase"
              class="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground"
            >
              {{ descripcionClase }}
            </p>

            <!-- Docente del curso -->
            <div
              class="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-none border border-primary/20 bg-primary/[0.06] p-4"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span
                  class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-white"
                >
                  {{ docenteCurso?.iniciales || "DO" }}
                </span>
                <div class="min-w-0">
                  <p class="text-xs font-bold uppercase tracking-wide text-primary">
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

              <p v-if="errorChat" class="text-sm font-semibold text-destructive">
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

      <button
        v-if="sidebarOpen"
        type="button"
        class="fixed inset-x-0 top-14 bottom-0 z-30 bg-background/80 lg:hidden"
        aria-label="Cerrar contenido del curso"
        @click="sidebarOpen = false"
      />
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
                class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out"
                :class="{ 'rotate-180': !collapsedSections[section.id] }"
              />
            </button>

            <div
              class="grid transition-[grid-template-rows] duration-300 ease-out"
              :class="
                collapsedSections[section.id]
                  ? 'grid-rows-[0fr]'
                  : 'grid-rows-[1fr]'
              "
            >
              <div class="min-h-0 overflow-hidden">
                <div
                  class="pb-2 transition-opacity duration-300 ease-out"
                  :class="
                    collapsedSections[section.id]
                      ? 'opacity-0'
                      : 'opacity-100'
                  "
                >
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
