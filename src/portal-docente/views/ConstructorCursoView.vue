<script setup lang="ts">
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  GripVertical,
  LayoutTemplate,
  Lock,
  Paperclip,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Signature,
  Trash2,
  Upload,
  UserRoundCheck,
  Video,
  HelpCircle,
  ClipboardCheck,
  Clock3,
  Link2,
  Loader2,
  X,
  BookOpen,
  Tag,
  AlignLeft,
  Users,
  Target,
  ListChecks,
} from "lucide-vue-next";
import { computed, nextTick, onMounted, reactive, ref, toRaw, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Skeleton from "primevue/skeleton";
import Dialog from "primevue/dialog";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import {
  docenteService,
  type BorradorCursoDocente,
  type CursoDocente,
} from "@/api/services/docente.service";
import type {
  DocenteResponsableCurso,
  FirmaCertificadoCurso,
} from "@/portal-docente/types/docente.types";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { useAuth } from "@/composables/useAuth";
import { apiConfig } from "@/api/config";
import {
  storageAcademia,
  urlVisualizableMedia,
} from "@/lib/storage-academia";
import PersonalizarPortadaModal from "@/components/shared/PersonalizarPortadaModal.vue";
import ZonaSubidaImagen from "@/components/shared/ZonaSubidaImagen.vue";
import { PORTADA_CURSO_AYUDA_BREVE } from "@/lib/portada-curso";
import ImagenPortadaCurso from "@/components/shared/ImagenPortadaCurso.vue";
import {
  organizacionService,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import type { UnidadOrganizacional } from "@/portal-organizacion/types/estructura-organizacional.types";
import type {
  CondicionRequisitoCurso,
  RequisitoCurso,
} from "@/lib/requisitos-curso";
import { etiquetaRequisito } from "@/lib/requisitos-curso";
import {
  REQUISITOS_FIRMA_TEXTO,
  validarFirmaImagenProgresiva,
  type ChequeoFirma,
} from "@/lib/validar-firma-imagen";
import ToggleSwitch from "primevue/toggleswitch";
import { toast } from "@/lib/toast";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import { plantillasCertificadoService } from "@/api/services/plantillas-certificado.service";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import VistaPreviaPlantillaCertificado from "@/components/shared/VistaPreviaPlantillaCertificado.vue";
import type { PlantillaCertificado } from "@/lib/plantilla-certificado";
import {
  OPCIONES_CANTIDAD_FIRMAS_CERTIFICADO,
  clampCantidadFirmasCertificado,
  normalizarCertificadoCursoDocumento,
} from "@/lib/certificado-curso";
import { formatearDuracionVideo } from "@/lib/youtube-duracion";
import { idVideoYoutube } from "@/lib/youtube";
import {
  formatearDuracionCurso,
  sumarMinutosPrograma,
} from "@/lib/duracion-curso";
import {
  OPCIONES_FUENTE_VIDEO,
  ayudaUrlVideo,
  detectarFuenteVideo,
  placeholderUrlVideo,
  type FuenteVideoCurso,
} from "@/lib/video-curso";

const router = useRouter();
const route = useRoute();
const { contextoActivo, tienePermiso } = useContextoSesion();
const { currentUser, restaurarUsuario } = useAuth();
const paso = ref(1);
const cargando = ref(true);
const guardado = ref(false);
const guardando = ref(false);
const enviado = ref(false);
const mostrandoVistaPrevia = ref(false);
const errorImagen = ref("");
const modalPortadaAbierto = ref(false);
const urlPortadaVistaPrevia = ref("");
const fuentePortadaTemp = ref("");
const archivoPortadaTemp = ref<File | null>(null);
const subiendoPortada = ref(false);
const selectorMaterial = ref<HTMLInputElement | null>(null);
const seccionMaterial = ref<number | null>(null);
const docentesEntidad = ref<UsuarioOrganizacion[]>([]);
const docentesManuales = ref<DocenteResponsableCurso[]>([]);
const modalDocente = ref(false);
const errorFotoDocente = ref("");
const selectorFotoDocente = ref<HTMLInputElement | null>(null);
const docenteManual = reactive<DocenteResponsableCurso>({
  id: "",
  nombre: "",
  correo: "",
  cargo: "",
  especialidad: "",
  foto: "",
  biografia: "",
  experiencia: [""],
  origen: "MANUAL",
});
const unidadesEntidad = ref<UnidadOrganizacional[]>([]);
const cursosParaRequisito = ref<Array<{ id: string; titulo: string; estado: string }>>(
  [],
);
const condicionRequisitos = ref<CondicionRequisitoCurso>("COMPLETADO");
const requisitosAccesoActivos = ref(false);
const errorMaterial = ref("");
const modalFirmas = ref(false);
const busquedaFirma = ref("");
const errorFirmaPropia = ref("");
const subiendoFirmaPropia = ref(false);
const validandoFirma = ref(false);
const chequeosFirma = ref<ChequeoFirma[]>([]);
const plantillaCertificadoOrg = ref<PlantillaCertificado | null>(null);
const catalogoPlantillasCert = ref<PlantillaCertificado[]>([]);
const docentesPuedenConfigurarCert = ref(false);
const cargandoPlantillaCert = ref(false);
const miniaturasPlantilla = ref<Record<string, string>>({});
const progresoFirma = computed(() => {
  if (!chequeosFirma.value.length) return 0;
  const hechos = chequeosFirma.value.filter(
    (item) => item.estado === "ok" || item.estado === "error",
  ).length;
  return Math.round((hechos / chequeosFirma.value.length) * 100);
});
const modalCategorias = ref(false);
const nuevaCategoria = ref("");
const categoriaPendienteEliminar = ref("");
const categoriasCurso = ref([
  "Gestión de obras",
  "Seguridad",
  "Logística",
  "Certificación profesional",
  "Especialización técnica",
]);
const esGestionOrganizacion = computed(() =>
  route.path.startsWith("/organizacion/"),
);
const rutaRegreso = computed(() =>
  esGestionOrganizacion.value ? "/organizacion/cursos" : "/docente/cursos",
);
const esIndependiente = computed(
  () =>
    contextoActivo.value?.ambitoDocencia === "INDEPENDIENTE" ||
    !contextoActivo.value?.organizacionId,
);
/** Org: el admin activó cursos.definir_precio en el perfil (o excepción CONCEDER). */
const puedeDefinirPrecioOrg = computed(
  () =>
    !esIndependiente.value &&
    !esGestionOrganizacion.value &&
    tienePermiso("cursos.definir_precio"),
);
const muestraPasoPrecio = computed(
  () => esIndependiente.value || puedeDefinirPrecioOrg.value,
);
const nombreAmbito = computed(() =>
  esIndependiente.value
    ? "Curso propio · Docencia independiente"
    : `Curso institucional · ${contextoActivo.value?.organizacionNombre}`,
);
const membresiaId = contextoActivo.value?.membresiaId ?? "docente";
const cursoId = computed(() =>
  String(route.params.cursoId ?? route.query.borrador ?? "nuevo"),
);
const cursoGuardado = ref<CursoDocente | null>(null);
const modalEliminarCurso = ref(false);
const eliminandoCurso = ref(false);
const cursoPersistido = computed(
  () =>
    cursoId.value !== "nuevo" &&
    !cursoId.value.startsWith("borrador-") &&
    !cursoId.value.startsWith("curso-institucional-"),
);
const puedeEliminarCurso = computed(
  () =>
    cursoPersistido.value &&
    cursoGuardado.value?.estado !== "ARCHIVADO",
);

const valoresIniciales = {
  titulo: "",
  subtitulo: "",
  descripcion: "",
  publico: "",
  alcanceDirigido: "ORGANIZACION" as "TODOS" | "ORGANIZACION" | "UNIDADES",
  unidadesDestinoIds: [] as string[],
  unidadesDestinoNombres: [] as string[],
  objetivos: [""],
  requisitos: [] as RequisitoCurso[],
  categoria: "",
  nivel: "Básico",
  imagen: "",
  imagenPosicion: "50% 50%",
  ambito: esIndependiente.value ? "INDEPENDIENTE" : "ORGANIZACION",
  organizacionId: contextoActivo.value?.organizacionId ?? null,
  acceso: esIndependiente.value ? "PAGO" : "ORGANIZACION",
  precio: 0,
  visibilidad: esIndependiente.value ? "PUBLICO" : "ORGANIZACION",
  permiteEmpresas: esIndependiente.value,
  certificado: true,
  nombreCertificado: "",
  plantillaCertificadoId: "",
  cantidadFirmas: 1,
  notaMinima: 14,
  vigenciaMeses: 0,
  firmasCertificado: [] as FirmaCertificadoCurso[],
  docenteResponsableId: "",
  docenteResponsableNombre: "",
  docenteResponsablePerfil: undefined as DocenteResponsableCurso | undefined,
  cargadoPorNombre: "",
  origenCarga: esGestionOrganizacion.value
    ? ("ADMINISTRACION" as const)
    : ("DOCENTE" as const),
};
const curso = reactive({ ...valoresIniciales });

const plantillaSeleccionada = computed(() => {
  const id = String(curso.plantillaCertificadoId ?? "").trim();
  if (id) {
    return (
      catalogoPlantillasCert.value.find((p) => p.id === id) ??
      plantillaCertificadoOrg.value
    );
  }
  return plantillaCertificadoOrg.value;
});

type ItemSeccion = NonNullable<
  BorradorCursoDocente["secciones"][number]["items"]
>[number];
type SeccionBorrador = BorradorCursoDocente["secciones"][number];

const TIPOS_ITEM: Array<{ value: ItemSeccion["tipo"]; label: string }> = [
  { value: "video", label: "Video" },
  { value: "lectura", label: "Lectura" },
  { value: "quiz", label: "Cuestionario" },
  { value: "assignment", label: "Entrega PDF" },
];

const OPCIONES_NIVEL = ["Básico", "Intermedio", "Avanzado"];

const OPCIONES_VISIBILIDAD = [
  { value: "PUBLICO", label: "Catálogo público" },
  { value: "PRIVADO", label: "Solo por invitación" },
  { value: "ORGANIZACION", label: "Solo organizaciones" },
];

const OPCIONES_UNIDAD_VIGENCIA = [
  { value: "meses", label: "Meses" },
  { value: "anios", label: "Años" },
];

const OPCIONES_CONDICION_REQUISITO = [
  { value: "COMPLETADO", label: "Completar el curso" },
  { value: "CERTIFICADO", label: "Tener certificado" },
];

const CLASE_COMBO = "filtro-control w-full";
const PANEL_COMBO = "tukuy-filtro-panel";

const ESTILO_ACCION = {
  material:
    "rounded border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-100 dark:hover:bg-teal-500/25",
  seccion:
    "rounded border-dashed border-indigo-400 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-500/50 dark:bg-indigo-500/15 dark:text-indigo-100 dark:hover:bg-indigo-500/25",
  categoria:
    "rounded border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800 hover:bg-fuchsia-100 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-100 dark:hover:bg-fuchsia-500/25",
  docente:
    "rounded border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-100 dark:hover:bg-blue-500/25",
  imagen:
    "rounded border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 dark:border-cyan-500/40 dark:bg-cyan-500/15 dark:text-cyan-100 dark:hover:bg-cyan-500/25",
  agregar:
    "rounded border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100 dark:hover:bg-emerald-500/25",
} as const;

function preguntasSemilla(): NonNullable<ItemSeccion["preguntas"]> {
  return [
    {
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
    },
  ];
}

function placeholderTituloItem(tipo: ItemSeccion["tipo"]) {
  if (tipo === "quiz") return "Título del cuestionario";
  if (tipo === "assignment") return "Título de la entrega PDF";
  if (tipo === "video") return "Título de la clase en video";
  return "Título de la clase";
}

function sincronizarClases(seccion: SeccionBorrador) {
  seccion.items ??= [];
  seccion.clases = seccion.items.map((item) => item.titulo);
}

function asegurarItems(seccion: SeccionBorrador) {
  if (seccion.items?.length) {
    sincronizarClases(seccion);
    return;
  }
  seccion.items = (seccion.clases ?? []).map((titulo, indice) => ({
    titulo,
    tipo: (indice === 0 ? "video" : "lectura") as ItemSeccion["tipo"],
  }));
  sincronizarClases(seccion);
}

const secciones = ref<BorradorCursoDocente["secciones"]>([
  {
    id: crypto.randomUUID(),
    titulo: "",
    clases: [""],
    items: [
      {
        id: crypto.randomUUID(),
        titulo: "",
        tipo: "video",
        urlYoutube: "",
        fuenteVideo: "youtube",
      },
    ],
    recursos: [],
  },
]);
function iconoTipo(tipo: ItemSeccion["tipo"]) {
  if (tipo === "video") return Video;
  if (tipo === "quiz") return HelpCircle;
  if (tipo === "assignment") return ClipboardCheck;
  return FileText;
}

function agregarItem(seccion: SeccionBorrador, tipo: ItemSeccion["tipo"] = "lectura") {
  asegurarItems(seccion);
  seccion.items!.push({
    id: crypto.randomUUID(),
    titulo: "",
    tipo,
    ...(tipo === "quiz" ? { preguntas: preguntasSemilla() } : {}),
    ...(tipo === "video" ? { urlYoutube: "", fuenteVideo: "youtube" as const } : {}),
  });
  sincronizarClases(seccion);
}

function eliminarItem(seccion: SeccionBorrador, indice: number) {
  asegurarItems(seccion);
  seccion.items!.splice(indice, 1);
  sincronizarClases(seccion);
}

function alCambiarTipo(item: ItemSeccion) {
  if (item.tipo === "quiz" && !item.preguntas?.length) {
    item.preguntas = preguntasSemilla();
  }
  if (item.tipo !== "quiz") {
    delete item.preguntas;
  }
  if (item.tipo === "video") {
    item.urlYoutube ??= "";
    item.fuenteVideo ??= "youtube";
  } else {
    delete item.urlYoutube;
    delete item.fuenteVideo;
  }
}

function alCambiarUrlVideo(item: ItemSeccion) {
  const detectada = detectarFuenteVideo(item.urlYoutube);
  if (detectada) item.fuenteVideo = detectada;
  if (
    detectada &&
    String(item.urlYoutube ?? "").trim() &&
    !String(item.titulo ?? "").trim()
  ) {
    item.titulo = "Clase en video";
  }
  const url = String(item.urlYoutube ?? "").trim();
  const meta = metaVideo(item);
  if (!url || (meta.urlCorroborada && meta.urlCorroborada !== url)) {
    limpiarCorroboracionVideo(item);
  }
}

type MetaCorroboracionVideo = {
  estado: "idle" | "cargando" | "ok" | "error";
  error?: string;
  videoId?: string;
  segundos?: number;
  minutos?: number;
  urlCorroborada?: string;
};

const metaCorroboracionVideo = reactive<Record<string, MetaCorroboracionVideo>>(
  {},
);

function claveItemVideo(item: ItemSeccion) {
  return String(item.id ?? item.urlYoutube ?? "").trim() || "sin-id";
}

function metaVideo(item: ItemSeccion): MetaCorroboracionVideo {
  const clave = claveItemVideo(item);
  if (!metaCorroboracionVideo[clave]) {
    metaCorroboracionVideo[clave] = { estado: "idle" };
  }
  return metaCorroboracionVideo[clave];
}

function limpiarCorroboracionVideo(item: ItemSeccion) {
  const clave = claveItemVideo(item);
  delete item.duracionMinutos;
  metaCorroboracionVideo[clave] = { estado: "idle" };
}

async function consultarYAsignarDuracion(
  item: ItemSeccion,
  url: string,
  opciones: { silencioso?: boolean } = {},
) {
  const meta = metaVideo(item);
  meta.estado = "cargando";
  meta.error = undefined;
  try {
    const respuesta =
      await secundariaGatewayService.obtenerDuracionYoutube(url);
    if (!respuesta.ok || !("segundos" in respuesta) || !respuesta.segundos) {
      const detalle =
        "error" in respuesta && typeof respuesta.error === "string"
          ? respuesta.error
          : "No se pudo leer la duración del video.";
      meta.estado = "error";
      meta.error = detalle;
      delete item.duracionMinutos;
      return;
    }
    item.duracionMinutos = respuesta.minutos;
    meta.estado = "ok";
    meta.videoId = respuesta.videoId;
    meta.segundos = respuesta.segundos;
    meta.minutos = respuesta.minutos;
    meta.urlCorroborada = url;
    meta.error = undefined;
    if (!opciones.silencioso) {
      toast.success(
        `URL corroborada · ${formatearDuracionVideo(respuesta.segundos)}`,
      );
    }
  } catch (causa) {
    meta.estado = "error";
    meta.error =
      causa instanceof Error
        ? causa.message
        : "No se pudo corroborar el enlace.";
    delete item.duracionMinutos;
  }
}

async function corroborarUrlVideo(item: ItemSeccion) {
  const url = String(item.urlYoutube ?? "").trim();
  if (!url) {
    toast.error("Pega primero el enlace del video.");
    return;
  }
  const fuente = item.fuenteVideo ?? detectarFuenteVideo(url) ?? "youtube";
  item.fuenteVideo = fuente;
  if (fuente !== "youtube") {
    const meta = metaVideo(item);
    meta.estado = "error";
    meta.error =
      "La corroboración de duración con YouTube Data API solo aplica a enlaces de YouTube.";
    return;
  }
  if (!idVideoYoutube(url)) {
    const meta = metaVideo(item);
    meta.estado = "error";
    meta.error = "El enlace de YouTube no es válido.";
    return;
  }
  await consultarYAsignarDuracion(item, url);
}

/** Completa duraciones faltantes al guardar (si el docente no corroboró a mano). */
async function esperarDuracionesVideoPendientes() {
  const pendientes: Promise<void>[] = [];
  for (const seccion of secciones.value) {
    for (const item of seccion.items ?? []) {
      const url = String(item.urlYoutube ?? "").trim();
      if (
        item.tipo === "video" &&
        (item.fuenteVideo ?? detectarFuenteVideo(url)) === "youtube" &&
        url &&
        !item.duracionMinutos
      ) {
        pendientes.push(
          consultarYAsignarDuracion(item, url, { silencioso: true }),
        );
      }
    }
  }
  if (pendientes.length) await Promise.allSettled(pendientes);
}

function fuenteVideoItem(item: ItemSeccion): FuenteVideoCurso {
  return item.fuenteVideo ?? "youtube";
}

const duracionTotalMinutos = computed(() =>
  sumarMinutosPrograma(secciones.value),
);

const duracionTotalTexto = computed(() =>
  formatearDuracionCurso(duracionTotalMinutos.value),
);

function etiquetaDuracionItem(item: ItemSeccion): string {
  const meta = metaVideo(item);
  if (meta.segundos && meta.segundos > 0) {
    return formatearDuracionVideo(meta.segundos);
  }
  if (!item.duracionMinutos) return "";
  return formatearDuracionVideo(item.duracionMinutos * 60);
}

function sincronizarDuracionesVideoPendientes() {
  for (const seccion of secciones.value) {
    for (const item of seccion.items ?? []) {
      if (
        item.tipo === "video" &&
        fuenteVideoItem(item) === "youtube" &&
        String(item.urlYoutube ?? "").trim() &&
        item.duracionMinutos
      ) {
        const meta = metaVideo(item);
        if (meta.estado === "idle") {
          meta.estado = "ok";
          meta.minutos = item.duracionMinutos;
          meta.segundos = item.duracionMinutos * 60;
          meta.urlCorroborada = String(item.urlYoutube ?? "").trim();
          meta.videoId =
            idVideoYoutube(item.urlYoutube) ?? undefined;
        }
      }
    }
  }
}

function agregarPregunta(item: ItemSeccion) {
  item.preguntas ??= [];
  item.preguntas.push({
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  });
}

function eliminarPregunta(item: ItemSeccion, indice: number) {
  item.preguntas?.splice(indice, 1);
}

const subiendoImagenPregunta = ref("");
const errorImagenPregunta = ref("");

function claveImagenPregunta(si: number, ci: number, pi: number) {
  return `${si}-${ci}-${pi}`;
}

async function procesarArchivoImagenPregunta(
  pregunta: NonNullable<ItemSeccion["preguntas"]>[number],
  si: number,
  ci: number,
  pi: number,
  archivo: File,
) {
  errorImagenPregunta.value = "";
  if (!archivo.type.startsWith("image/")) {
    errorImagenPregunta.value = "Usa JPG, PNG o WebP.";
    return;
  }
  if (archivo.size > 8_000_000) {
    errorImagenPregunta.value = "La imagen debe pesar menos de 8 MB.";
    return;
  }
  subiendoImagenPregunta.value = claveImagenPregunta(si, ci, pi);
  try {
    if (apiConfig.secundariaCursos) {
      const subida = await storageAcademia.subirMaterial(archivo);
      pregunta.imagenReferencia = subida.publicUrl ?? subida.url;
    } else {
      pregunta.imagenReferencia = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result ?? ""));
        lector.onerror = () => reject(new Error("No se pudo leer la imagen"));
        lector.readAsDataURL(archivo);
      });
    }
  } catch (causa) {
    errorImagenPregunta.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo subir la imagen.";
  } finally {
    subiendoImagenPregunta.value = "";
  }
}

function quitarImagenPregunta(
  pregunta: NonNullable<ItemSeccion["preguntas"]>[number],
) {
  pregunta.imagenReferencia = "";
  errorImagenPregunta.value = "";
}
onMounted(async () => {
  try {
    await restaurarUsuario();
    cargarCategoriasCurso();
    cargarDocentesManuales();
    if (esGestionOrganizacion.value) {
      const [usuarios, unidades, idsAdministracion] = await Promise.all([
        organizacionService.usuarios.listar(),
        organizacionService.estructura.unidades.listar(),
        organizacionService.estructura.idsDescendientes(
          "unidad-administracion",
        ),
      ]);
      docentesEntidad.value = usuarios.filter(
        (usuario) =>
          usuario.estado === "ACTIVO" && usuario.colegiaturaActiva !== false,
      );
      unidadesEntidad.value = unidades.filter(
        (unidad) =>
          unidad.id !== "unidad-administracion" &&
          idsAdministracion.has(unidad.id) &&
          unidad.estado === "ACTIVA",
      );
    }
    const cursoExistente =
      cursoId.value === "nuevo" ||
      cursoId.value.startsWith("borrador-") ||
      cursoId.value.startsWith("curso-institucional-")
        ? null
        : await docenteService.cursos.obtener(cursoId.value).catch(() => null);
    cursoGuardado.value = cursoExistente;
    const semilla = {
      ...valoresIniciales,
      titulo: cursoExistente?.titulo ?? valoresIniciales.titulo,
      imagen: cursoExistente?.imagen ?? valoresIniciales.imagen,
      imagenPosicion:
        cursoExistente?.imagenPosicion ?? valoresIniciales.imagenPosicion,
      ambito: cursoExistente?.ambito ?? valoresIniciales.ambito,
      organizacionId:
        cursoExistente?.organizacionId ?? valoresIniciales.organizacionId,
      acceso:
        cursoExistente?.modeloAcceso === "VENTA_INDIVIDUAL"
          ? "PAGO"
          : valoresIniciales.acceso,
      secciones: secciones.value,
    };
    const borrador = await docenteService.obtenerBorrador(
      membresiaId,
      cursoId.value,
      semilla,
    );
    const { secciones: seccionesGuardadas, ...datosCurso } = borrador;
    Object.assign(curso, datosCurso);
    if (
      curso.docenteResponsablePerfil?.origen === "MANUAL" &&
      !docentesManuales.value.some(
        (docente) => docente.id === curso.docenteResponsablePerfil?.id,
      )
    ) {
      docentesManuales.value.push(
        clonPlano(curso.docenteResponsablePerfil),
      );
    }
    if (
      curso.docenteResponsableId &&
      !curso.docenteResponsablePerfil
    ) {
      asignarDocente();
    }
    if (curso.categoria && !categoriasCurso.value.includes(curso.categoria)) {
      categoriasCurso.value.push(curso.categoria);
      categoriasCurso.value.sort((a, b) => a.localeCompare(b, "es"));
    }
    curso.firmasCertificado ??= [];
    // Firmas legacy sin origen ni imagen = selección múltiple antigua del docente → se descartan.
    curso.firmasCertificado = curso.firmasCertificado
      .map((firma) => {
        if (firma.origen === "PROPIA" || firma.origen === "INSTITUCIONAL") {
          return firma;
        }
        if (firma.imagen || String(firma.id).startsWith("propia-")) {
          return { ...firma, origen: "PROPIA" as const };
        }
        if (esGestionOrganizacion.value) {
          return { ...firma, origen: "INSTITUCIONAL" as const };
        }
        return null;
      })
      .filter((firma): firma is FirmaCertificadoCurso => firma != null);
    curso.cantidadFirmas = clampCantidadFirmasCertificado(curso.cantidadFirmas, {
      forzarUna: !esGestionOrganizacion.value,
    });
    if (!esGestionOrganizacion.value) {
      const propia = curso.firmasCertificado.find((f) => f.origen === "PROPIA");
      curso.firmasCertificado = propia ? [propia] : [];
    } else if (curso.firmasCertificado.length > curso.cantidadFirmas) {
      curso.firmasCertificado = curso.firmasCertificado.slice(
        0,
        curso.cantidadFirmas,
      );
    }
    curso.alcanceDirigido ??= "ORGANIZACION";
    curso.unidadesDestinoIds ??= [];
    curso.unidadesDestinoNombres ??= [];
    curso.imagenPosicion ??= "50% 50%";
    curso.requisitos = Array.isArray(curso.requisitos) ? curso.requisitos : [];
    // Switch apagado = sin requisitos (no exigir cursos previos).
    requisitosAccesoActivos.value = Boolean(
      (datosCurso as { requisitosAccesoActivos?: boolean })
        .requisitosAccesoActivos,
    );
    if (!requisitosAccesoActivos.value) {
      curso.requisitos = [];
    } else if (curso.requisitos[0]?.condicion) {
      condicionRequisitos.value = curso.requisitos[0].condicion;
    }
    sincronizarUnidadVigencia();
    try {
      const listado = await docenteService.cursos.listar();
      const idActual = cursoId.value;
      const opciones: Array<{ id: string; titulo: string; estado: string }> =
        listado
          .filter(
            (item) =>
              item.id !== idActual &&
              !String(item.id).startsWith("borrador-") &&
              item.estado !== "ARCHIVADO",
          )
          .map((item) => ({
            id: item.id,
            titulo: item.titulo,
            estado: item.estado,
          }));
      for (const requisito of curso.requisitos) {
        if (!opciones.some((item) => item.id === requisito.cursoId)) {
          opciones.push({
            id: requisito.cursoId,
            titulo: requisito.cursoTitulo,
            estado: "ENLAZADO",
          });
        }
      }
      cursosParaRequisito.value = opciones.sort((a, b) =>
        a.titulo.localeCompare(b.titulo, "es"),
      );
    } catch {
      cursosParaRequisito.value = curso.requisitos.map((item) => ({
        id: item.cursoId,
        titulo: item.cursoTitulo,
        estado: "ENLAZADO",
      }));
    }
    secciones.value = seccionesGuardadas.map((seccion) => {
      const normalizada: SeccionBorrador = {
        ...seccion,
        recursos: seccion.recursos ?? [],
      };
      asegurarItems(normalizada);
      return normalizada;
    });
    sincronizarDuracionesVideoPendientes();
    curso.cargadoPorNombre ||= currentUser.value?.name ?? "";
    if (!esGestionOrganizacion.value) {
      curso.docenteResponsableNombre ||= curso.cargadoPorNombre;
    }
    await cargarPlantillaCertificado();
    resolverPasoInicial();
  } finally {
    cargando.value = false;
  }
});
const pasos = computed(() => [
  "Planifica tu curso",
  "Programa y contenidos",
  "Página de presentación",
  "Precio y acceso",
  "Certificado",
  esGestionOrganizacion.value ? "Aprobar contenido" : "Enviar a revisión",
]);
const titulos = computed(() => [
  "Planifica tu curso",
  "Programa y contenidos",
  "Página de presentación",
  "Precio y acceso",
  "Configura el certificado",
  esGestionOrganizacion.value ? "Aprobar contenido" : "Enviar a revisión",
]);
const descripciones = computed(() => [
  "Empieza por el nombre, la categoría y una breve descripción.",
  "Organiza secciones, clases y recursos.",
  "Completa subtítulo, nivel y la portada que verá el estudiante.",
  "Decide quién puede acceder y cómo se comercializa.",
  "Establece las condiciones y datos de certificación.",
  esGestionOrganizacion.value
    ? "Confirma la revisión administrativa y deja el curso aprobado para configurar su publicación."
    : "Comprueba que todo esté listo para la evaluación de Tukuy.",
]);
const pasosVisibles = computed(() =>
  pasos.value
    .map((nombre, indice) => ({ nombre, pasoOriginal: indice + 1 }))
    .filter((item) => item.pasoOriginal !== 4 || muestraPasoPrecio.value),
);
const firmasDisponibles = computed(() => {
  const termino = busquedaFirma.value.trim().toLocaleLowerCase("es");
  return docentesEntidad.value
    .filter((persona) =>
      [persona.nombre, persona.rol, persona.area, persona.especialidad ?? ""]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(termino),
    )
    .map((persona) => ({
      id: String(persona.id),
      personaId: String(persona.id),
      nombre: persona.nombre,
      cargo: persona.rol || persona.area || "",
      tipo: "DIGITAL" as const,
      origen: "INSTITUCIONAL" as const,
    }));
});
const firmaPropiaDocente = computed(() =>
  curso.firmasCertificado.find((firma) => firma.origen === "PROPIA"),
);
const firmasInstitucionales = computed(() =>
  curso.firmasCertificado.filter((firma) => firma.origen !== "PROPIA"),
);

/** Docente: solo su firma. Admin/dirección: firmas del curso hasta cantidadFirmas. */
const firmasParaVistaPrevia = computed(() => {
  if (!esGestionOrganizacion.value) {
    const propia = firmaPropiaDocente.value;
    const nombre =
      propia?.nombre?.trim() ||
      curso.docenteResponsableNombre?.trim() ||
      curso.cargadoPorNombre?.trim() ||
      currentUser.value?.name?.trim() ||
      "Docente del curso";
    return [
      {
        nombre,
        cargo: propia?.cargo?.trim() || "Docente",
        imagen: propia?.imagen,
      },
    ];
  }
  const tope = clampCantidadFirmasCertificado(curso.cantidadFirmas);
  return (curso.firmasCertificado ?? []).slice(0, tope).map((f) => ({
    nombre: f.nombre,
    cargo: f.cargo,
    imagen: f.imagen,
  }));
});

const cantidadFirmasVistaPrevia = computed(() =>
  esGestionOrganizacion.value
    ? clampCantidadFirmasCertificado(curso.cantidadFirmas)
    : 1,
);

const unidadVigencia = ref<"meses" | "anios">("meses");

const certificadoConCaducidad = computed({
  get: () => Number(curso.vigenciaMeses) > 0,
  set: (conCaducidad: boolean) => {
    if (!conCaducidad) {
      curso.vigenciaMeses = 0;
      return;
    }
    if (Number(curso.vigenciaMeses) <= 0) {
      curso.vigenciaMeses = unidadVigencia.value === "anios" ? 12 : 12;
    }
  },
});

const cantidadVigencia = computed({
  get: () => {
    const meses = Number(curso.vigenciaMeses) || 0;
    if (meses <= 0) return unidadVigencia.value === "anios" ? 1 : 12;
    if (unidadVigencia.value === "anios") {
      return Math.max(1, Math.round(meses / 12));
    }
    return meses;
  },
  set: (valor: number) => {
    const n = Math.max(1, Math.floor(Number(valor) || 1));
    curso.vigenciaMeses = unidadVigencia.value === "anios" ? n * 12 : n;
  },
});

function sincronizarUnidadVigencia() {
  const meses = Number(curso.vigenciaMeses) || 0;
  unidadVigencia.value = meses > 0 && meses % 12 === 0 ? "anios" : "meses";
}

function alCambiarUnidadVigencia() {
  const meses = Number(curso.vigenciaMeses) || 0;
  if (meses <= 0) return;
  if (unidadVigencia.value === "anios") {
    curso.vigenciaMeses = Math.max(1, Math.round(meses / 12)) * 12;
  }
}
const opcionesDocenteResponsable = computed<DocenteResponsableCurso[]>(() => [
  ...docentesEntidad.value.map((docente) => ({
    id: String(docente.id),
    nombre: docente.nombre,
    correo: docente.correo,
    cargo: docente.rol || docente.area || "",
    especialidad: docente.especialidad || "",
    foto: "",
    biografia: "",
    experiencia: [] as string[],
    origen: "ENTIDAD" as const,
  })),
  ...docentesManuales.value,
]);
const opcionesUnidadesDestino = computed(() => {
  const mapa = new Map(
    unidadesEntidad.value.map((unidad) => [unidad.id, unidad]),
  );
  const rutaUnidad = (unidad: UnidadOrganizacional) => {
    const nombres = [unidad.nombre];
    let padreId = unidad.unidadPadreId;
    while (padreId && padreId !== "unidad-administracion") {
      const padre = mapa.get(padreId);
      if (!padre) break;
      nombres.unshift(padre.nombre);
      padreId = padre.unidadPadreId;
    }
    return nombres.join(" › ");
  };
  return unidadesEntidad.value
    .map((unidad) => ({
      id: unidad.id,
      nombre: unidad.nombre,
      ruta: rutaUnidad(unidad),
    }))
    .sort((a, b) => a.ruta.localeCompare(b.ruta, "es"));
});
const opcionesAlcanceDirigido = [
  {
    label: "Público general",
    value: "TODOS",
    descripcion: "Disponible para personas de la institución y público externo.",
  },
  {
    label: "Toda la institución",
    value: "ORGANIZACION",
    descripcion: "Disponible para todas las personas vinculadas a la entidad.",
  },
  {
    label: "Unidades específicas",
    value: "UNIDADES",
    descripcion: "Disponible solo para los nodos seleccionados del organigrama.",
  },
];
const indicePasoVisible = computed(() =>
  pasosVisibles.value.findIndex((item) => item.pasoOriginal === paso.value),
);
const hayPasoSiguiente = computed(
  () => indicePasoVisible.value < pasosVisibles.value.length - 1,
);
const requisitosRevision = computed(() => [
  {
    id: "req-docente",
    texto: "Docente responsable identificado",
    paso: 1,
    ancla: "campo-docente-responsable",
    listo:
      !esGestionOrganizacion.value ||
      Boolean(curso.docenteResponsableId && curso.docenteResponsableNombre),
  },
  {
    id: "req-info",
    texto: "Información y público objetivo definidos",
    paso: 1,
    ancla: "campo-planifica",
    listo:
      !!curso.titulo.trim() &&
      !!curso.categoria &&
      curso.descripcion.trim().length >= 5 &&
      (esGestionOrganizacion.value
        ? curso.alcanceDirigido !== "UNIDADES" ||
          curso.unidadesDestinoIds.length > 0
        : !!curso.publico.trim()) &&
      curso.objetivos.some((objetivo) => objetivo.trim().length > 0),
  },
  // Solo si el switch está ON: exigir al menos un curso previo enlazado.
  ...(requisitosAccesoActivos.value
    ? [
        {
          id: "req-acceso",
          texto: "Requisitos de acceso enlazados",
          paso: 1,
          ancla: "campo-requisitos-acceso",
          listo: curso.requisitos.some((item) => !!item.cursoId),
        },
      ]
    : []),
  {
    id: "req-programa",
    texto: "Programa con secciones y clases",
    paso: 2,
    ancla: "campo-programa",
    listo:
      secciones.value.length > 0 &&
      secciones.value.every(
        (s) =>
          (s.items?.some((item) => item.titulo.trim().length > 0) ?? false) ||
          s.clases.some((clase) => clase.trim().length > 0),
      ),
  },
  {
    id: "req-presentacion",
    texto: "Página de presentación completa",
    paso: 3,
    ancla: "campo-presentacion",
    listo: !!curso.subtitulo.trim() && !!curso.imagen,
  },
  ...(muestraPasoPrecio.value
    ? [
        {
          id: "req-precio",
          texto: puedeDefinirPrecioOrg.value
            ? "Precio del curso definido"
            : "Precio y acceso configurados",
          paso: 4,
          ancla: "campo-precio",
          listo:
            curso.acceso === "GRATUITO" ||
            (curso.acceso === "PAGO" && curso.precio > 0),
        },
      ]
    : []),
  {
    id: "req-certificado",
    texto: "Certificado configurado",
    paso: 5,
    ancla: "campo-certificado",
    listo:
      !curso.certificado ||
      (!!curso.titulo.trim() &&
        (!esGestionOrganizacion.value || Boolean(plantillaSeleccionada.value)) &&
        (!esGestionOrganizacion.value || curso.firmasCertificado.length > 0)),
  },
]);

const instalacionCertificadosId = computed(
  () =>
    contextoActivo.value?.organizacionId?.trim() ||
    INSTALACION_TUKUY_ACADEMY_ID,
);

async function precargarMiniaturasPlantillas(lista: PlantillaCertificado[]) {
  const pendientes = lista
    .map((p) => p.fondoUrl?.trim())
    .filter((url): url is string => Boolean(url) && !miniaturasPlantilla.value[url]);
  await Promise.all(
    pendientes.map(async (url) => {
      try {
        const listaUrl = await urlVisualizableMedia(url, url);
        if (listaUrl) {
          miniaturasPlantilla.value = {
            ...miniaturasPlantilla.value,
            [url]: listaUrl,
          };
        }
      } catch {
        /* fondo no disponible aún */
      }
    }),
  );
}

function plantillasVisiblesParaDocente(
  plantillas: PlantillaCertificado[],
  puedeUsarPropias: boolean,
): PlantillaCertificado[] {
  const usuarioId = contextoActivo.value?.usuarioId?.trim() ?? "";
  return plantillas.filter((p) => {
    if (p.alcance !== "DOCENTE") return true;
    if (!puedeUsarPropias) return false;
    if (!usuarioId) return true;
    return !p.autorIdentidadRef || p.autorIdentidadRef === usuarioId;
  });
}

async function cargarPlantillaCertificado() {
  cargandoPlantillaCert.value = true;
  try {
    const config = await plantillasCertificadoService.obtenerConfig(
      instalacionCertificadosId.value,
    );
    docentesPuedenConfigurarCert.value = config.docentesPuedenConfigurar === true;
    const visibles = plantillasVisiblesParaDocente(
      config.plantillas ?? [],
      docentesPuedenConfigurarCert.value,
    );
    catalogoPlantillasCert.value = visibles;
    const defaultPlantilla =
      visibles.find((p) => p.esDefault) ??
      visibles.find((p) => p.alcance !== "DOCENTE") ??
      visibles[0] ??
      null;
    plantillaCertificadoOrg.value = defaultPlantilla;

    const idActual = String(curso.plantillaCertificadoId ?? "").trim();
    if (idActual && !visibles.some((p) => p.id === idActual)) {
      curso.plantillaCertificadoId = defaultPlantilla?.id ?? "";
    } else if (!idActual && defaultPlantilla) {
      curso.plantillaCertificadoId = defaultPlantilla.id;
    }

    void precargarMiniaturasPlantillas(visibles);
  } catch {
    try {
      plantillaCertificadoOrg.value =
        await plantillasCertificadoService.obtenerDefault(
          instalacionCertificadosId.value,
        );
      catalogoPlantillasCert.value = plantillaCertificadoOrg.value
        ? [plantillaCertificadoOrg.value]
        : [];
      if (
        plantillaCertificadoOrg.value &&
        !curso.plantillaCertificadoId
      ) {
        curso.plantillaCertificadoId = plantillaCertificadoOrg.value.id;
      }
    } catch {
      plantillaCertificadoOrg.value = null;
      catalogoPlantillasCert.value = [];
    }
  } finally {
    cargandoPlantillaCert.value = false;
  }
}

function seleccionarPlantillaCertificado(plantilla: PlantillaCertificado) {
  curso.plantillaCertificadoId = plantilla.id;
}

function miniaturaPlantilla(plantilla: PlantillaCertificado) {
  const raw = plantilla.fondoUrl?.trim() ?? "";
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:") || /^https?:\/\//i.test(raw)) {
    return raw;
  }
  return miniaturasPlantilla.value[raw] || "";
}

function irADisenoCertificados() {
  void router.push({
    path: "/organizacion/certificados/diseno",
    query: docentesPuedenConfigurarCert.value
      ? { origen: "docente" }
      : undefined,
  });
}

function enfocarVistaPreviaCertificado() {
  document
    .getElementById("vista-previa-certificado-curso")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resolverPasoInicial() {
  const crudo = route.query.paso;
  const valor = typeof crudo === "string" ? Number(crudo) : NaN;
  if (!Number.isFinite(valor) || valor < 1 || valor > pasos.value.length) {
    return;
  }
  paso.value = Math.floor(valor);
  if (typeof crudo === "string") {
    const query = { ...route.query };
    delete query.paso;
    void router.replace({ query });
  }
}

watch(paso, (activo) => {
  if (activo === 5) void cargarPlantillaCertificado();
});
const listoParaEnviar = computed(() =>
  requisitosRevision.value.every((r) => r.listo),
);

async function irARequisitoPendiente(item: {
  listo: boolean;
  paso: number;
  ancla: string;
}) {
  if (item.listo) return;
  paso.value = item.paso;
  await nextTick();
  requestAnimationFrame(() => {
    const destino = document.getElementById(item.ancla);
    destino?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

/**
 * Clona datos planos sin Proxy reactivo.
 * `toRaw` solo desempaqueta el nivel raíz; anidados siguen siendo Proxy
 * y `structuredClone` falla con "could not be cloned".
 */
function clonPlano<T>(valor: T): T {
  return JSON.parse(JSON.stringify(toRaw(valor as object))) as T;
}

function construirBorrador(): BorradorCursoDocente {
  const seccionesNormalizadas = clonPlano(secciones.value).map((seccion) => {
    asegurarItems(seccion);
    if (!seccion.id) seccion.id = crypto.randomUUID();
    for (const item of seccion.items ?? []) {
      if (!item.id) item.id = crypto.randomUUID();
      if (item.tipo !== "video") continue;
      const url = String(item.urlYoutube ?? "").trim();
      item.urlYoutube = url;
      if (!url) continue;
      item.fuenteVideo =
        detectarFuenteVideo(url) ?? item.fuenteVideo ?? "youtube";
      // La secundaria descarta ítems sin título; el enlace de Drive/TikTok
      // no puede perderse por dejar el título vacío.
      if (!String(item.titulo ?? "").trim()) {
        item.titulo = "Clase en video";
      }
    }
    sincronizarClases(seccion);
    // Conservar URLs http(s)/s3; no reenviar dataURL enormes.
    return {
      ...seccion,
      recursos: (seccion.recursos ?? []).map((recurso) => {
        const contenido = String(recurso.contenido ?? "");
        const esUrl =
          /^https?:\/\//i.test(contenido) || contenido.startsWith("s3://");
        return {
          ...recurso,
          contenido:
            esUrl || contenido.length <= 20_000 ? contenido : "",
        };
      }),
    };
  });
  const porId = new Map(
    cursosParaRequisito.value.map((item) => [item.id, item.titulo]),
  );
  const requisitos = requisitosAccesoActivos.value
    ? curso.requisitos
        .filter((item) => item.cursoId)
        .map((item) => ({
          tipo: "CURSO_PREVIO" as const,
          cursoId: item.cursoId,
          cursoTitulo: porId.get(item.cursoId) ?? item.cursoTitulo,
          condicion: condicionRequisitos.value,
        }))
    : [];
  return normalizarCertificadoCursoDocumento({
    ...clonPlano(curso),
    requisitosAccesoActivos: requisitosAccesoActivos.value,
    requisitos,
    // El certificado toma el nombre del curso (paso 1).
    nombreCertificado: curso.titulo.trim(),
    secciones: seccionesNormalizadas,
    origenCarga: esGestionOrganizacion.value ? "ADMINISTRACION" : "DOCENTE",
    cantidadFirmas: esGestionOrganizacion.value
      ? clampCantidadFirmasCertificado(curso.cantidadFirmas)
      : 1,
  }) as BorradorCursoDocente;
}

function mensajeErrorGuardado(causa: unknown): string {
  const crudo =
    causa instanceof Error
      ? causa.message
      : typeof causa === "string"
        ? causa
        : "No se pudo guardar el borrador del curso.";

  if (/modalidad_formacion/i.test(crudo)) {
    return "Falta un ajuste en la base secundaria. Ejecuta el script 20260813150000_guardar_curso_cast_modalidad.sql y vuelve a intentar.";
  }
  if (/estado_curso/i.test(crudo)) {
    return "Falta un ajuste de estado en la base. Ejecuta 20260805258200_guardar_curso_cast_seguro.sql y vuelve a intentar.";
  }

  const detalle = crudo.split("—").pop()?.trim() || crudo;
  if (detalle.length > 180) return `${detalle.slice(0, 177)}…`;
  return detalle;
}

function notificarError(causa: unknown, resumen = "No se pudo guardar") {
  toast.error(resumen, {
    description: mensajeErrorGuardado(causa),
    duration: 7000,
  });
}

function notificarExito(mensaje: string) {
  toast.success("Listo", {
    description: mensaje,
    duration: 3500,
  });
}

async function guardar(pasoDestino?: number) {
  if (guardando.value) return false;
  guardando.value = true;
  try {
    await esperarDuracionesVideoPendientes();
    const { curso: guardadoCurso, borrador: borradorPersistido } =
      await docenteService.guardarCursoDesdeBorrador(
        membresiaId,
        cursoId.value,
        construirBorrador(),
      );
    // Rehidratar IDs estables que escribió la secundaria (evita wipe en el 2º save).
    const { secciones: seccionesGuardadas, ...datosCurso } = borradorPersistido;
    Object.assign(curso, datosCurso);
    sincronizarUnidadVigencia();
    secciones.value = seccionesGuardadas.map((seccion) => {
      const items =
        seccion.items?.map((item) => ({
          ...item,
          id: item.id || crypto.randomUUID(),
        })) ?? [];
      return {
        ...seccion,
        id: seccion.id || crypto.randomUUID(),
        items,
        clases: items.map((item) => item.titulo),
        recursos: seccion.recursos ?? [],
      };
    });
    if (
      cursoId.value === "nuevo" ||
      cursoId.value.startsWith("borrador-") ||
      cursoId.value.startsWith("curso-institucional-")
    ) {
      const query: Record<string, string | string[] | undefined> = {
        ...route.query,
        borrador: undefined,
      };
      if (pasoDestino && pasoDestino >= 1) {
        query.paso = String(pasoDestino);
      } else {
        delete query.paso;
      }
      await router.replace({
        path: esGestionOrganizacion.value
          ? `/organizacion/cursos/${guardadoCurso.id}/constructor`
          : `/docente/cursos/${guardadoCurso.id}/constructor`,
        query,
      });
    }
    guardado.value = true;
    notificarExito("Borrador guardado correctamente.");
    setTimeout(() => (guardado.value = false), 2000);
    return true;
  } catch (causa) {
    notificarError(causa);
    return false;
  } finally {
    guardando.value = false;
  }
}
function agregarObjetivo() {
  curso.objetivos.push("");
}
function quitarObjetivo(indice: number) {
  curso.objetivos.splice(indice, 1);
}

const idsRequisitosCurso = computed({
  get: () => curso.requisitos.map((item) => item.cursoId),
  set: (ids: string[]) => {
    const unicos = [...new Set(ids.filter(Boolean))];
    const porId = new Map(
      cursosParaRequisito.value.map((item) => [item.id, item.titulo]),
    );
    const previos = new Map(
      curso.requisitos.map((item) => [item.cursoId, item]),
    );
    curso.requisitos = unicos.map((id) => {
      const existente = previos.get(id);
      return {
        tipo: "CURSO_PREVIO" as const,
        cursoId: id,
        cursoTitulo:
          porId.get(id) ?? existente?.cursoTitulo ?? "Curso previo",
        condicion: condicionRequisitos.value,
      };
    });
  },
});

function aplicarCondicionRequisitos() {
  for (const requisito of curso.requisitos) {
    requisito.condicion = condicionRequisitos.value;
  }
}

function alCambiarRequisitosAcceso(activo: boolean) {
  requisitosAccesoActivos.value = activo;
  if (!activo) {
    curso.requisitos = [];
  }
}

const etiquetasRequisitosVista = computed(() =>
  requisitosAccesoActivos.value
    ? curso.requisitos.map(etiquetaRequisito)
    : [],
);
function agregarSeccion() {
  const seccion: SeccionBorrador = {
    id: crypto.randomUUID(),
    titulo: "",
    clases: [""],
    items: [{ id: crypto.randomUUID(), titulo: "", tipo: "lectura" }],
    recursos: [],
  };
  secciones.value.push(seccion);
}

function asignarDocente() {
  const docente = opcionesDocenteResponsable.value.find(
    (item) => item.id === curso.docenteResponsableId,
  );
  curso.docenteResponsableNombre = docente?.nombre ?? "";
  curso.docenteResponsablePerfil = docente
    ? clonPlano(docente)
    : undefined;
}

function claveDocentesManuales() {
  return `tukuy:docentes-manuales:${contextoActivo.value?.organizacionId ?? "general"}`;
}

function cargarDocentesManuales() {
  const guardados = localStorage.getItem(claveDocentesManuales());
  if (!guardados) return;
  try {
    const docentes = JSON.parse(guardados);
    if (Array.isArray(docentes)) docentesManuales.value = docentes;
  } catch {
    // Conserva el catálogo institucional si el almacenamiento está dañado.
  }
}

function abrirNuevoDocente() {
  Object.assign(docenteManual, {
    id: "",
    nombre: "",
    correo: "",
    cargo: "",
    especialidad: "",
    foto: "",
    biografia: "",
    experiencia: [""],
    origen: "MANUAL",
  });
  errorFotoDocente.value = "";
  modalDocente.value = true;
}

function seleccionarFotoDocente(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0];
  if (!archivo) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
    errorFotoDocente.value = "Usa una fotografía JPG, PNG o WEBP.";
    entrada.value = "";
    return;
  }
  if (archivo.size > 1_000_000) {
    errorFotoDocente.value = "La fotografía debe pesar menos de 1 MB.";
    entrada.value = "";
    return;
  }
  const lector = new FileReader();
  lector.onload = () => {
    docenteManual.foto = String(lector.result ?? "");
    errorFotoDocente.value = "";
  };
  lector.readAsDataURL(archivo);
  entrada.value = "";
}

function agregarExperienciaDocente() {
  docenteManual.experiencia.push("");
}

function quitarExperienciaDocente(indice: number) {
  docenteManual.experiencia.splice(indice, 1);
  if (!docenteManual.experiencia.length) docenteManual.experiencia.push("");
}

function guardarDocenteManual() {
  if (
    !docenteManual.nombre.trim() ||
    !docenteManual.cargo.trim() ||
    !docenteManual.biografia.trim()
  ) return;
  const docente: DocenteResponsableCurso = {
    ...clonPlano(docenteManual),
    id: `docente-manual-${Date.now()}`,
    nombre: docenteManual.nombre.trim(),
    correo: docenteManual.correo.trim(),
    cargo: docenteManual.cargo.trim(),
    especialidad: docenteManual.especialidad.trim(),
    biografia: docenteManual.biografia.trim(),
    experiencia: docenteManual.experiencia.map((item) => item.trim()).filter(Boolean),
    origen: "MANUAL",
  };
  docentesManuales.value.push(docente);
  localStorage.setItem(claveDocentesManuales(), JSON.stringify(docentesManuales.value));
  curso.docenteResponsableId = docente.id;
  curso.docenteResponsableNombre = docente.nombre;
  curso.docenteResponsablePerfil = clonPlano(docente);
  modalDocente.value = false;
}

function claveCategoriasCurso() {
  return `tukuy:categorias-cursos:${contextoActivo.value?.organizacionId ?? "general"}`;
}

function cargarCategoriasCurso() {
  const guardadas = localStorage.getItem(claveCategoriasCurso());
  if (!guardadas) return;
  try {
    const categorias = JSON.parse(guardadas);
    if (Array.isArray(categorias) && categorias.every((item) => typeof item === "string")) {
      categoriasCurso.value = categorias;
    }
  } catch {
    // Conserva las categorías iniciales si el almacenamiento está dañado.
  }
}

function guardarCategoriasCurso() {
  localStorage.setItem(
    claveCategoriasCurso(),
    JSON.stringify(categoriasCurso.value),
  );
}

function agregarCategoriaCurso() {
  const nombre = nuevaCategoria.value.trim();
  if (!nombre) return;
  const yaExiste = categoriasCurso.value.some(
    (categoria) =>
      categoria.toLocaleLowerCase("es") === nombre.toLocaleLowerCase("es"),
  );
  if (yaExiste) return;
  categoriasCurso.value.push(nombre);
  categoriasCurso.value.sort((a, b) => a.localeCompare(b, "es"));
  curso.categoria = nombre;
  nuevaCategoria.value = "";
  guardarCategoriasCurso();
}

function solicitarEliminarCategoria(categoria: string) {
  if (curso.categoria === categoria) return;
  categoriaPendienteEliminar.value = categoria;
}

function cancelarEliminarCategoria() {
  categoriaPendienteEliminar.value = "";
}

function confirmarEliminarCategoria() {
  if (!categoriaPendienteEliminar.value) return;
  categoriasCurso.value = categoriasCurso.value.filter(
    (categoria) => categoria !== categoriaPendienteEliminar.value,
  );
  categoriaPendienteEliminar.value = "";
  guardarCategoriasCurso();
}

function actualizarUnidadesDestino() {
  curso.unidadesDestinoNombres = opcionesUnidadesDestino.value
    .filter((unidad) => curso.unidadesDestinoIds.includes(unidad.id))
    .map((unidad) => unidad.ruta);
  curso.publico = curso.unidadesDestinoNombres.join(", ");
}

function actualizarAlcanceDirigido() {
  if (curso.alcanceDirigido === "TODOS") {
    curso.unidadesDestinoIds = [];
    curso.unidadesDestinoNombres = [];
    curso.publico = "Público general, pertenezca o no a la institución";
    return;
  }
  if (curso.alcanceDirigido === "ORGANIZACION") {
    curso.unidadesDestinoIds = [];
    curso.unidadesDestinoNombres = [];
    curso.publico = `Toda la institución ${contextoActivo.value?.organizacionNombre ?? ""}`.trim();
    return;
  }
  actualizarUnidadesDestino();
}

function abrirSelectorMaterial(indice: number) {
  seccionMaterial.value = indice;
  errorMaterial.value = "";
  selectorMaterial.value?.click();
}

async function seleccionarMaterial(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0];
  const indice = seccionMaterial.value;
  if (!archivo || indice === null) return;
  const formatos = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png",
    "image/jpeg",
  ];
  if (!formatos.includes(archivo.type)) {
    errorMaterial.value =
      "Formato no permitido. Usa PDF, Word, PowerPoint, PNG o JPG.";
    entrada.value = "";
    return;
  }
  if (archivo.size > 12_000_000) {
    errorMaterial.value = "Cada archivo debe pesar menos de 12 MB.";
    entrada.value = "";
    return;
  }
  errorMaterial.value = "";
  try {
    let contenido = "";
    if (apiConfig.secundariaCursos) {
      const subida = await storageAcademia.subirMaterial(archivo);
      contenido = subida.publicUrl ?? subida.url;
    } else {
      contenido = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result ?? ""));
        lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
        lector.readAsDataURL(archivo);
      });
    }
    const seccion = secciones.value[indice];
    if (!seccion) return;
    seccion.recursos ??= [];
    seccion.recursos.push({
      id: `recurso-${Date.now()}`,
      nombre: archivo.name,
      tipo: archivo.type,
      tamanio: archivo.size,
      contenido,
    });
  } catch (causa) {
    errorMaterial.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo subir el material.";
  }
  entrada.value = "";
}

function eliminarMaterial(indiceSeccion: number, recursoId: string) {
  const seccion = secciones.value[indiceSeccion];
  if (!seccion?.recursos) return;
  seccion.recursos = seccion.recursos.filter((item) => item.id !== recursoId);
}
function agregarFirma(firma: FirmaCertificadoCurso) {
  if (!esGestionOrganizacion.value) return;
  if (curso.firmasCertificado.some((item) => item.id === firma.id)) return;
  const tope = clampCantidadFirmasCertificado(curso.cantidadFirmas);
  if (curso.firmasCertificado.length >= tope) {
    toast.error(`Este certificado admite hasta ${tope} firmas.`);
    return;
  }
  curso.firmasCertificado.push({
    ...firma,
    origen: firma.origen ?? "INSTITUCIONAL",
  });
}

function alCambiarCantidadFirmas(valor: unknown) {
  if (!esGestionOrganizacion.value) {
    curso.cantidadFirmas = 1;
    return;
  }
  const n = clampCantidadFirmasCertificado(
    typeof valor === "object" && valor && "value" in valor
      ? (valor as { value: unknown }).value
      : valor,
  );
  curso.cantidadFirmas = n;
  if (curso.firmasCertificado.length > n) {
    curso.firmasCertificado = curso.firmasCertificado.slice(0, n);
  }
}

function quitarFirma(id: string) {
  const firma = curso.firmasCertificado.find((item) => item.id === id);
  if (!firma) return;
  // El docente solo puede quitar su propia firma; el admin puede quitar institucionales.
  if (!esGestionOrganizacion.value && firma.origen !== "PROPIA") return;
  if (esGestionOrganizacion.value && firma.origen === "PROPIA") return;
  curso.firmasCertificado = curso.firmasCertificado.filter(
    (item) => item.id !== id,
  );
}

async function procesarArchivoFirmaPropia(archivo: File) {
  errorFirmaPropia.value = "";
  chequeosFirma.value = [];
  validandoFirma.value = true;
  subiendoFirmaPropia.value = false;

  try {
    const validacion = await validarFirmaImagenProgresiva(
      archivo,
      (pasos) => {
        chequeosFirma.value = pasos;
      },
    );
    if (!validacion.ok) {
      const fallido = validacion.chequeos.find((item) => item.estado === "error");
      errorFirmaPropia.value =
        fallido?.mensaje ||
        "La firma no cumple los requisitos técnicos. Corrígela e inténtalo de nuevo.";
      notificarError(
        errorFirmaPropia.value,
        "Firma no válida",
      );
      return;
    }

    subiendoFirmaPropia.value = true;
    let urlImagen = "";
    if (apiConfig.secundariaCursos) {
      const subida = await storageAcademia.subirMaterial(archivo);
      urlImagen = subida.publicUrl ?? subida.url;
    } else {
      urlImagen = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result ?? ""));
        lector.onerror = () => reject(new Error("No se pudo leer la firma"));
        lector.readAsDataURL(archivo);
      });
    }

    const nombre =
      currentUser.value?.name?.trim() ||
      curso.docenteResponsableNombre ||
      curso.cargadoPorNombre ||
      "Docente";
    const personaId = String(
      contextoActivo.value?.usuarioId ??
        contextoActivo.value?.membresiaId ??
        nombre,
    );
    const propia: FirmaCertificadoCurso = {
      id: `propia-${personaId}`,
      personaId,
      nombre,
      cargo: "Docente del curso",
      tipo: "DIGITAL",
      imagen: urlImagen,
      origen: "PROPIA",
    };
    curso.firmasCertificado = [
      ...curso.firmasCertificado.filter((firma) => firma.origen !== "PROPIA"),
      propia,
    ];
    notificarExito("Firma validada y cargada correctamente.");
  } catch (causa) {
    errorFirmaPropia.value =
      causa instanceof Error ? causa.message : "No se pudo subir tu firma.";
    notificarError(errorFirmaPropia.value, "Firma no válida");
  } finally {
    validandoFirma.value = false;
    subiendoFirmaPropia.value = false;
  }
}

async function enviarRevision() {
  if (!listoParaEnviar.value) return;
  try {
    await esperarDuracionesVideoPendientes();
    const borrador = construirBorrador();
    if (esGestionOrganizacion.value) {
      const { curso: guardado } = await docenteService.guardarCursoDesdeBorrador(
        membresiaId,
        cursoId.value,
        borrador,
      );
      const propuesta =
        await organizacionService.catalogoCursos.registrarParaRevision({
          cursoDocenteId: guardado.id,
          titulo: borrador.titulo,
          imagen: borrador.imagen,
          docenteResponsableId: borrador.docenteResponsableId,
          docenteResponsableNombre:
            borrador.docenteResponsableNombre || "Docente responsable",
          cargadoPor: borrador.cargadoPorNombre,
          origenCarga: "ADMINISTRACION",
          categoria: borrador.categoria,
          lecciones: borrador.secciones.reduce(
            (total, seccion) => total + seccion.clases.length,
            0,
          ),
        });
      await organizacionService.catalogoCursos.aprobar(propuesta.id, {
        publicar: false,
        alcance:
          borrador.alcanceDirigido === "TODOS" ? "TODOS" : "ORGANIZACION",
        precio: 0,
        moneda: "PEN",
      });
    } else {
      await docenteService.enviarBorradorRevision(
        membresiaId,
        cursoId.value,
        borrador,
      );
    }
    enviado.value = true;
    notificarExito(
      esGestionOrganizacion.value
        ? "Contenido aprobado correctamente."
        : "Curso enviado a revisión.",
    );
  } catch (causa) {
    notificarError(causa, "No se pudo completar el envío");
  }
}
async function siguiente() {
  const siguientePaso = pasosVisibles.value[indicePasoVisible.value + 1];
  const pasoDestino = siguientePaso?.pasoOriginal;
  if (!pasoDestino) return;
  const eraCursoNuevo =
    cursoId.value === "nuevo" ||
    cursoId.value.startsWith("borrador-") ||
    cursoId.value.startsWith("curso-institucional-");
  const ok = await guardar(eraCursoNuevo ? pasoDestino : undefined);
  if (!ok) return;
  if (!eraCursoNuevo) {
    paso.value = pasoDestino;
  }
}

function anterior() {
  const pasoAnterior = pasosVisibles.value[indicePasoVisible.value - 1];
  if (pasoAnterior) paso.value = pasoAnterior.pasoOriginal;
}

async function procesarArchivoPortada(archivo: File) {
  errorImagen.value = "";
  if (!archivo.type.startsWith("image/")) {
    errorImagen.value = "Selecciona una imagen JPG, PNG o WebP.";
    return;
  }
  if (archivo.size > 8_000_000) {
    errorImagen.value = "La imagen debe pesar menos de 8 MB.";
    return;
  }
  if (fuentePortadaTemp.value.startsWith("blob:")) {
    URL.revokeObjectURL(fuentePortadaTemp.value);
  }
  archivoPortadaTemp.value = archivo;
  fuentePortadaTemp.value = URL.createObjectURL(archivo);
  modalPortadaAbierto.value = true;
}

function cancelarPersonalizarPortada() {
  modalPortadaAbierto.value = false;
  if (fuentePortadaTemp.value.startsWith("blob:")) {
    URL.revokeObjectURL(fuentePortadaTemp.value);
  }
  fuentePortadaTemp.value = "";
  archivoPortadaTemp.value = null;
}

async function confirmarPortadaRecortada(archivo: File) {
  modalPortadaAbierto.value = false;
  if (fuentePortadaTemp.value.startsWith("blob:")) {
    URL.revokeObjectURL(fuentePortadaTemp.value);
  }
  fuentePortadaTemp.value = "";
  archivoPortadaTemp.value = null;

  errorImagen.value = "";
  subiendoPortada.value = true;
  const previewLocal = URL.createObjectURL(archivo);
  curso.imagen = previewLocal;
  curso.imagenPosicion = "50% 50%";
  try {
    if (apiConfig.secundariaCursos) {
      const subida = await storageAcademia.subirPortada(archivo);
      const urlPublica = subida.publicUrl ?? subida.url;
      curso.imagen = urlPublica;
      URL.revokeObjectURL(previewLocal);
    } else {
      curso.imagen = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result ?? ""));
        lector.onerror = () => reject(new Error("No se pudo leer la imagen"));
        lector.readAsDataURL(archivo);
      });
      URL.revokeObjectURL(previewLocal);
    }
  } catch (causa) {
    errorImagen.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo subir la portada.";
  } finally {
    subiendoPortada.value = false;
  }
}

watch(
  () => curso.imagen,
  (valor) => {
    void (async () => {
      urlPortadaVistaPrevia.value = valor
        ? await urlVisualizableMedia(valor, "")
        : "";
    })();
  },
  { immediate: true },
);

async function confirmarEliminarCurso() {
  if (!cursoPersistido.value || eliminandoCurso.value) return;
  eliminandoCurso.value = true;
  try {
    if (esGestionOrganizacion.value) {
      await docenteService.archivarCurso(cursoId.value);
    } else {
      await docenteService.eliminarCurso(cursoId.value);
    }
    toast.success("Curso oculto del catálogo.");
    void router.push(rutaRegreso.value);
  } catch (causa) {
    toast.error(
      causa instanceof Error
        ? causa.message
        : "No se pudo eliminar el curso.",
    );
  } finally {
    eliminandoCurso.value = false;
    modalEliminarCurso.value = false;
  }
}
</script>

<template>
  <section class="constructor-curso mx-auto grid max-w-350 gap-6 text-foreground">
    <div v-if="cargando" class="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
      <Skeleton class="h-[520px] w-full" />
      <Skeleton class="h-[620px] w-full" />
    </div>
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            @click="router.push(rutaRegreso)"
            ><ArrowLeft class="h-5 w-5"
          /></Button>
          <div>
            <p class="text-xs font-bold uppercase text-primary">
              Constructor de curso
            </p>
            <h1 class="text-xl font-black text-foreground">{{ curso.titulo.trim() || "Nuevo curso" }}</h1>
            <p class="mt-1 text-xs font-semibold text-muted-foreground">
              {{ nombreAmbito }}
            </p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1">
          <div class="flex items-center gap-2">
            <span
              v-if="guardando"
              class="text-xs text-muted-foreground"
              >Guardando…</span
            >
            <span
              v-else-if="guardado"
              class="text-xs text-emerald-700 dark:text-emerald-400"
              >Cambios guardados</span
            ><Button
              variant="outline"
              :disabled="guardando"
              @click="guardar()"
              ><Save class="h-4 w-4" />Guardar borrador</Button
            ><Button class="bg-primary" @click="mostrandoVistaPrevia = true"
              ><Eye class="h-4 w-4" />Vista previa</Button
            ><Button
              v-if="puedeEliminarCurso"
              variant="outline"
              class="border-destructive/40 text-destructive hover:bg-destructive/10"
              @click="modalEliminarCurso = true"
              ><Trash2 class="h-4 w-4" />Ocultar curso</Button
            >
          </div>
        </div>
      </div>

      <div
        v-if="esGestionOrganizacion"
        class="flex gap-3 border-l-4 border-l-amber-500 bg-amber-500/10 p-4"
      >
        <UserRoundCheck class="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
        <div>
          <p class="font-black text-foreground">Carga administrativa por encargo</p>
          <p class="mt-1 text-sm text-muted-foreground">
            Administración prepara el contenido, pero el docente seleccionado conserva la responsabilidad académica del curso.
          </p>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        <Card class="h-fit rounded-md border-border bg-card"
          ><CardContent class="p-3"
            ><button
              v-for="(item, indice) in pasosVisibles"
              :key="item.pasoOriginal"
              class="flex w-full items-center gap-3 rounded p-3 text-left text-sm font-semibold"
              :class="
                paso === item.pasoOriginal
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              "
              @click="paso = item.pasoOriginal"
            >
              <span
                class="grid h-6 w-6 place-items-center rounded-full text-xs"
                :class="
                  paso === item.pasoOriginal
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                "
                >{{ indice + 1 }}</span
              ><span class="flex-1">{{ item.nombre }}</span
              ><ChevronRight class="h-4 w-4" /></button></CardContent
        ></Card>

        <Card class="rounded-md border-border bg-card"
          ><CardContent class="p-6 text-foreground sm:p-8">
            <Badge class="bg-primary/10 text-primary"
              >Paso {{ indicePasoVisible + 1 }} de {{ pasosVisibles.length }}</Badge
            >
            <h2 class="mt-3 text-2xl font-black text-foreground">{{ titulos[paso - 1] }}</h2>
            <p class="mt-2 text-sm text-muted-foreground">
              {{ descripciones[paso - 1] }}
            </p>

            <div
              id="campo-planifica"
              v-if="paso === 1"
              class="paso-campos mt-7 grid gap-6"
            >
              <label class="grid gap-2 text-sm font-bold text-foreground">
                <span class="flex items-center gap-2">
                  <BookOpen class="h-4 w-4 text-primary" />Nombre del curso
                </span>
                <Input
                  v-model="curso.titulo"
                  placeholder="Ej. Seguridad en obra civil"
                />
              </label>
              <label class="grid gap-2 text-sm font-bold text-foreground">
                <span class="flex items-center gap-2">
                  <Tag class="h-4 w-4 text-primary" />Categoría
                </span>
                <div class="flex gap-2">
                  <Select
                    v-model="curso.categoria"
                    :options="categoriasCurso"
                    class="filtro-control min-w-0 flex-1"
                    :panel-class="PANEL_COMBO"
                    placeholder="Selecciona una categoría"
                  />
                  <Button
                    v-if="esGestionOrganizacion"
                    type="button"
                    variant="outline"
                    @click="modalCategorias = true"
                  >
                    Gestionar
                  </Button>
                </div>
              </label>
              <label class="grid gap-2 text-sm font-bold text-foreground">
                <span class="flex items-center gap-2">
                  <AlignLeft class="h-4 w-4 text-primary" />Descripción breve
                </span>
                <textarea
                  v-model="curso.descripcion"
                  class="min-h-28 border border-input bg-card p-3 font-normal text-foreground"
                  placeholder="Resume de qué trata el curso"
                />
              </label>
              <div
                v-if="esGestionOrganizacion"
                class="grid gap-2 text-sm font-bold text-foreground"
              >
                <span class="flex items-center gap-2">
                  <Users class="h-4 w-4 text-primary" />Dirigido a
                </span>
                <Select
                  v-model="curso.alcanceDirigido"
                  :options="opcionesAlcanceDirigido"
                  option-label="label"
                  option-value="value"
                  :class="CLASE_COMBO"
                  :panel-class="PANEL_COMBO"
                  placeholder="Selecciona el alcance del curso"
                  fluid
                  @change="actualizarAlcanceDirigido"
                />
                <div
                  v-if="curso.alcanceDirigido === 'UNIDADES'"
                  class="mt-2 grid gap-2"
                >
                  <span>Unidades habilitadas</span>
                  <MultiSelect
                    v-model="curso.unidadesDestinoIds"
                    :options="opcionesUnidadesDestino"
                    option-label="ruta"
                    option-value="id"
                    display="chip"
                    :class="CLASE_COMBO"
                    :panel-class="PANEL_COMBO"
                    placeholder="Selecciona unidades del organigrama"
                    :max-selected-labels="4"
                    selected-items-label="{0} unidades seleccionadas"
                    fluid
                    @change="actualizarUnidadesDestino"
                  />
                </div>
              </div>
              <label v-else class="grid gap-2 text-sm font-bold text-foreground">
                <span class="flex items-center gap-2">
                  <Users class="h-4 w-4 text-primary" />Dirigido a
                </span>
                <textarea
                  v-model="curso.publico"
                  class="min-h-24 border border-input bg-card p-3 font-normal text-foreground"
                  placeholder="¿Quién debería tomar este curso?"
                />
              </label>
              <label
                id="campo-docente-responsable"
                v-if="esGestionOrganizacion"
                class="grid gap-2 text-sm font-bold text-foreground"
              >
                <span class="flex items-center gap-2">
                  <UserRoundCheck class="h-4 w-4 text-primary" />Docente responsable
                </span>
                <div class="flex gap-2">
                  <Select
                    v-model="curso.docenteResponsableId"
                    :options="opcionesDocenteResponsable"
                    option-label="nombre"
                    option-value="id"
                    class="filtro-control min-w-0 flex-1"
                    :panel-class="PANEL_COMBO"
                    placeholder="Selecciona al autor académico"
                    @change="asignarDocente"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-3">
                        <img
                          v-if="option.foto"
                          :src="option.foto"
                          :alt="option.nombre"
                          class="h-9 w-9 object-cover"
                        />
                        <span v-else class="grid h-9 w-9 place-items-center bg-primary/10 text-xs font-black text-primary">
                          {{ option.nombre.split(' ').slice(0, 2).map((item: string) => item[0]).join('') }}
                        </span>
                        <span>
                          <b class="block text-foreground">{{ option.nombre }}</b>
                          <small class="text-muted-foreground">
                            {{ option.especialidad || option.cargo }}
                            <template v-if="option.origen === 'MANUAL'"> · Agregado manualmente</template>
                          </small>
                        </span>
                      </div>
                    </template>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    @click="abrirNuevoDocente"
                  >
                    <Plus class="h-4 w-4" />Añadir docente
                  </Button>
                </div>
              </label>
              <div>
                <div class="flex justify-between">
                  <h3 class="flex items-center gap-2 font-bold text-foreground">
                    <Target class="h-4 w-4 text-primary" />Objetivos de aprendizaje
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    @click="agregarObjetivo"
                    ><Plus class="h-4 w-4" />Agregar</Button
                  >
                </div>
                <div
                  v-for="(_, i) in curso.objetivos"
                  :key="i"
                  class="mt-2 flex items-center gap-2"
                >
                  <Input
                    v-model="curso.objetivos[i]"
                    class="min-w-0 flex-1"
                    placeholder="Ej. Aplicar lo aprendido en situaciones reales"
                  />
                  <Button
                    v-if="i > 0"
                    size="icon"
                    variant="ghost"
                    type="button"
                    class="btn-borrar"
                    aria-label="Quitar objetivo"
                    @click="quitarObjetivo(i)"
                  >
                    <X class="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div>
                <label
                  id="campo-requisitos-acceso"
                  class="flex items-start gap-3 rounded border border-border bg-muted/20 p-4"
                >
                  <ToggleSwitch
                    :model-value="requisitosAccesoActivos"
                    @update:model-value="alCambiarRequisitosAcceso"
                  />
                  <span>
                    <b class="block text-sm text-foreground">Añadir requisitos de acceso al curso</b>
                    <small class="text-muted-foreground">
                      Actívalo solo si el alumno debe cumplir cursos previos
                      verificables para inscribirse. Si está apagado, no se
                      exigen requisitos.
                    </small>
                  </span>
                </label>
                <div v-if="requisitosAccesoActivos" class="mt-4">
                  <h3 class="flex items-center gap-2 font-bold text-foreground">
                    <ListChecks class="h-4 w-4 text-primary" />Cursos previos requeridos
                  </h3>
                  <div class="mt-3 grid gap-3 sm:grid-cols-[220px_1fr]">
                    <Select
                      v-model="condicionRequisitos"
                      :options="OPCIONES_CONDICION_REQUISITO"
                      option-label="label"
                      option-value="value"
                      placeholder="Condición"
                      :class="CLASE_COMBO"
                      :panel-class="PANEL_COMBO"
                      fluid
                      @update:model-value="aplicarCondicionRequisitos"
                    />
                    <MultiSelect
                      v-model="idsRequisitosCurso"
                      :options="cursosParaRequisito"
                      option-label="titulo"
                      option-value="id"
                      display="chip"
                      filter
                      placeholder="Selecciona cursos previos"
                      empty-message="No hay otros cursos para enlazar"
                      empty-filter-message="Sin coincidencias"
                      :class="CLASE_COMBO"
                      :panel-class="PANEL_COMBO"
                      fluid
                    />
                  </div>
                  <ul
                    v-if="etiquetasRequisitosVista.length"
                    class="mt-3 space-y-1 text-sm text-muted-foreground"
                  >
                    <li
                      v-for="etiqueta in etiquetasRequisitosVista"
                      :key="etiqueta"
                    >
                      · {{ etiqueta }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div
              id="campo-programa"
              v-else-if="paso === 2"
              class="paso-campos mt-7 grid gap-4"
            >
              <input
                ref="selectorMaterial"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                class="sr-only"
                @change="seleccionarMaterial"
              />
              <p
                v-if="errorMaterial"
                class="border-l-4 border-l-destructive bg-destructive/10 p-3 text-sm text-destructive"
              >
                {{ errorMaterial }}
              </p>
              <div
                v-if="duracionTotalMinutos > 0"
                class="flex flex-wrap items-center gap-2 border border-border bg-muted/40 px-4 py-3 text-sm"
              >
                <Clock3 class="h-4 w-4 text-primary" />
                <span class="font-semibold text-foreground">
                  Duración total del curso:
                  {{ duracionTotalTexto }}
                </span>
                <span class="text-xs text-muted-foreground">
                  (suma de videos detectados y actividades estimadas)
                </span>
              </div>
              <article
                v-for="(seccion, si) in secciones"
                :key="si"
                class="overflow-hidden rounded-xl border border-border"
              >
                <div class="flex items-center gap-3 bg-muted p-4">
                  <GripVertical class="h-5 w-5 text-muted-foreground" /><Input
                    v-model="seccion.titulo"
                    class="flex-1 border-0 bg-transparent font-bold text-foreground shadow-none"
                    placeholder="Nombre de la sección"
                  />
                </div>
                <div class="divide-y">
                  <div
                    v-for="(item, ci) in seccion.items ?? []"
                    :key="ci"
                    class="grid gap-3 p-4"
                  >
                    <div class="flex flex-wrap items-center gap-3">
                      <component
                        :is="iconoTipo(item.tipo)"
                        class="h-4 w-4 shrink-0 text-muted-foreground"
                      />
                      <Input
                        v-model="item.titulo"
                        class="min-w-40 flex-1 border-0 bg-transparent text-foreground shadow-none"
                        :placeholder="placeholderTituloItem(item.tipo)"
                        @update:model-value="sincronizarClases(seccion)"
                      />
                      <Select
                        v-model="item.tipo"
                        :options="TIPOS_ITEM"
                        option-label="label"
                        option-value="value"
                        class="filtro-control w-40 shrink-0"
                        :panel-class="PANEL_COMBO"
                        @change="alCambiarTipo(item)"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        class="btn-borrar"
                        aria-label="Eliminar actividad"
                        @click="eliminarItem(seccion, ci)"
                      >
                        <Trash2 class="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div
                      v-if="item.tipo === 'video'"
                      class="ml-7 grid gap-2 border border-border bg-muted/30 p-3"
                    >
                      <label
                        class="text-xs font-bold uppercase tracking-wide text-muted-foreground"
                        >Origen del video</label
                      >
                      <Select
                        :model-value="fuenteVideoItem(item)"
                        :options="OPCIONES_FUENTE_VIDEO"
                        option-label="label"
                        option-value="value"
                        class="filtro-control w-full"
                        :panel-class="PANEL_COMBO"
                        @update:model-value="
                          (valor: FuenteVideoCurso) =>
                            (item.fuenteVideo = valor)
                        "
                      />
                      <label
                        class="text-xs font-bold uppercase tracking-wide text-muted-foreground"
                        >Enlace de
                        {{
                          fuenteVideoItem(item) === "tiktok"
                            ? "TikTok"
                            : fuenteVideoItem(item) === "drive"
                              ? "Google Drive"
                              : "YouTube"
                        }}</label
                      >
                      <div class="flex flex-wrap items-stretch gap-2">
                        <Input
                          v-model="item.urlYoutube"
                          class="min-w-0 flex-1"
                          :placeholder="
                            placeholderUrlVideo(fuenteVideoItem(item))
                          "
                          @update:model-value="alCambiarUrlVideo(item)"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          class="shrink-0"
                          :disabled="
                            metaVideo(item).estado === 'cargando' ||
                            !String(item.urlYoutube ?? '').trim()
                          "
                          @click="corroborarUrlVideo(item)"
                        >
                          <Loader2
                            v-if="metaVideo(item).estado === 'cargando'"
                            class="h-4 w-4 animate-spin"
                          />
                          <Link2 v-else class="h-4 w-4" />
                          {{
                            metaVideo(item).estado === "cargando"
                              ? "Corroborando…"
                              : "Corroborar URL"
                          }}
                        </Button>
                      </div>
                      <p class="text-xs text-muted-foreground">
                        {{ ayudaUrlVideo(fuenteVideoItem(item)) }}
                      </p>
                      <p
                        v-if="metaVideo(item).estado === 'error'"
                        class="text-xs font-medium text-destructive"
                      >
                        {{ metaVideo(item).error }}
                      </p>
                      <div
                        v-if="
                          metaVideo(item).estado === 'ok' ||
                          (item.duracionMinutos &&
                            fuenteVideoItem(item) === 'youtube')
                        "
                        class="grid gap-2 sm:grid-cols-3"
                      >
                        <div
                          class="rounded-md border border-border bg-card px-3 py-2"
                        >
                          <p
                            class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                          >
                            Estado
                          </p>
                          <p
                            class="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
                          >
                            URL válida
                          </p>
                        </div>
                        <div
                          class="rounded-md border border-border bg-card px-3 py-2"
                        >
                          <p
                            class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                          >
                            Duración
                          </p>
                          <p class="mt-1 text-sm font-semibold text-foreground">
                            {{ etiquetaDuracionItem(item) || "—" }}
                          </p>
                        </div>
                        <div
                          class="rounded-md border border-border bg-card px-3 py-2"
                        >
                          <p
                            class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                          >
                            Video ID
                          </p>
                          <p
                            class="mt-1 truncate font-mono text-xs font-semibold text-foreground"
                            :title="
                              metaVideo(item).videoId ||
                              idVideoYoutube(item.urlYoutube) ||
                              ''
                            "
                          >
                            {{
                              metaVideo(item).videoId ||
                              idVideoYoutube(item.urlYoutube) ||
                              "—"
                            }}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="item.tipo === 'quiz'"
                      class="ml-7 grid gap-3 border border-border bg-muted/30 p-3"
                    >
                      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        Preguntas del cuestionario
                      </p>
                      <div
                        v-for="(pregunta, pi) in item.preguntas ?? []"
                        :key="pi"
                        class="grid gap-2 rounded-md border border-border bg-card p-3"
                      >
                        <div class="flex items-start gap-2">
                          <Input
                            v-model="pregunta.question"
                            class="flex-1"
                            :placeholder="`Pregunta ${pi + 1}`"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            class="btn-borrar"
                            @click="eliminarPregunta(item, pi)"
                          >
                            <Trash2 class="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div
                          class="grid gap-2 rounded-md border border-dashed border-border bg-muted/20 p-3"
                        >
                          <p class="text-xs font-bold text-foreground">
                            Imagen de referencia
                            <span class="font-medium text-muted-foreground">
                              · opcional
                            </span>
                          </p>
                          <ZonaSubidaImagen
                            compacto
                            aspecto="auto"
                            :src="pregunta.imagenReferencia"
                            titulo="Imagen de referencia"
                            ayuda="Opcional · JPG, PNG o WebP"
                            etiqueta-boton="Agregar imagen"
                            :cargando="
                              subiendoImagenPregunta ===
                              claveImagenPregunta(si, ci, pi)
                            "
                            :error="
                              subiendoImagenPregunta ===
                              claveImagenPregunta(si, ci, pi)
                                ? errorImagenPregunta
                                : ''
                            "
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            @archivo="
                              procesarArchivoImagenPregunta(
                                pregunta,
                                si,
                                ci,
                                pi,
                                $event,
                              )
                            "
                          />
                          <Button
                            v-if="pregunta.imagenReferencia"
                            size="sm"
                            variant="ghost"
                            type="button"
                            class="btn-borrar"
                            @click="quitarImagenPregunta(pregunta)"
                          >
                            Quitar imagen
                          </Button>
                          <p
                            v-if="errorImagenPregunta"
                            class="text-[11px] font-medium text-destructive"
                          >
                            {{ errorImagenPregunta }}
                          </p>
                        </div>
                        <div
                          v-for="(opcion, oi) in pregunta.options"
                          :key="oi"
                          class="flex items-center gap-2"
                        >
                          <input
                            type="radio"
                            class="accent-primary"
                            :name="`correcta-${si}-${ci}-${pi}`"
                            :checked="pregunta.correctIndex === oi"
                            @change="pregunta.correctIndex = oi"
                          />
                          <Input
                            v-model="pregunta.options[oi]"
                            class="flex-1"
                            :placeholder="`Opción ${String.fromCharCode(65 + oi)}`"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        @click="agregarPregunta(item)"
                      >
                        <Plus class="h-4 w-4" />Agregar pregunta
                      </Button>
                    </div>
                  </div>
                  <div class="m-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      @click="agregarItem(seccion, 'video')"
                    >
                      <Video class="h-4 w-4" />Video
                    </Button>
                    <Button
                      variant="outline"
                      @click="agregarItem(seccion, 'lectura')"
                    >
                      <FileText class="h-4 w-4" />Clase / lectura
                    </Button>
                    <Button
                      variant="outline"
                      @click="agregarItem(seccion, 'quiz')"
                    >
                      <HelpCircle class="h-4 w-4" />Cuestionario
                    </Button>
                    <Button
                      variant="outline"
                      @click="agregarItem(seccion, 'assignment')"
                    >
                      <ClipboardCheck class="h-4 w-4" />Entrega PDF
                    </Button>
                  </div>
                  <div class="m-3 border border-dashed border-border bg-muted/30 p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p class="text-sm font-black text-foreground">Material del docente</p>
                        <p class="text-xs text-muted-foreground">
                          PDF, Word, PowerPoint, imágenes o video MP4.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        @click="abrirSelectorMaterial(si)"
                      >
                        <Upload class="h-4 w-4" />Subir material
                      </Button>
                    </div>
                    <div v-if="seccion.recursos?.length" class="mt-3 grid gap-2">
                      <div
                        v-for="recurso in seccion.recursos"
                        :key="recurso.id"
                        class="flex items-center gap-3 border border-border bg-card p-3"
                      >
                        <Paperclip class="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-bold text-foreground">{{ recurso.nombre }}</p>
                          <p class="text-[11px] text-muted-foreground">
                            {{ (recurso.tamanio / 1024).toFixed(0) }} KB
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          class="btn-borrar"
                          aria-label="Eliminar material"
                          @click="eliminarMaterial(si, recurso.id)"
                        >
                          <Trash2 class="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
              <Button
                variant="outline"
                @click="agregarSeccion"
                ><Plus class="h-4 w-4" />Agregar sección</Button
              >
            </div>

            <div
              id="campo-presentacion"
              v-else-if="paso === 3"
              class="paso-campos mt-7 grid gap-5"
            >
              <div
                v-if="duracionTotalMinutos > 0"
                class="flex flex-wrap items-center gap-2 border border-primary/25 bg-primary/5 px-4 py-3 text-sm"
              >
                <Clock3 class="h-4 w-4 text-primary" />
                <span class="font-semibold text-foreground">
                  Duración publicada del curso: {{ duracionTotalTexto }}
                </span>
                <span class="text-xs text-muted-foreground">
                  Se mostrará en el catálogo y en Mis cursos
                </span>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="grid gap-2 text-sm font-bold text-foreground sm:col-span-2"
                  >Subtítulo<Input
                    v-model="curso.subtitulo"
                    placeholder="Una promesa clara para el estudiante" /></label
                ><label class="grid gap-2 text-sm font-bold text-foreground"
                  >Nivel
                  <Select
                    v-model="curso.nivel"
                    :options="OPCIONES_NIVEL"
                    :class="CLASE_COMBO"
                    :panel-class="PANEL_COMBO"
                    placeholder="Selecciona el nivel"
                    fluid
                  />
                </label
                >
              </div>
              <ZonaSubidaImagen
                :src="curso.imagen"
                :object-position="curso.imagenPosicion"
                ajuste-preview="natural"
                titulo="Imagen de portada"
                :ayuda="`JPG o PNG · ${PORTADA_CURSO_AYUDA_BREVE}`"
                :cargando="subiendoPortada"
                :error="errorImagen"
                @archivo="procesarArchivoPortada"
              />
            </div>

            <div
              id="campo-precio"
              v-else-if="paso === 4 && muestraPasoPrecio"
              class="paso-campos mt-7 grid gap-6"
            >
              <div
                v-if="puedeDefinirPrecioOrg"
                class="border-l-4 border-l-primary bg-primary/5 p-4 text-sm"
              >
                <b>Tu organización te autoriza a proponer el precio.</b>
                <p class="mt-1 text-xs text-muted-foreground">
                  Solo el monto (o gratuito). Descuentos y acceso público los
                  define Administración al aprobar.
                </p>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <button
                  v-for="tipo in ['GRATUITO', 'PAGO']"
                  :key="tipo"
                  type="button"
                  class="btn-opcion border-2 p-5 text-left"
                  :class="
                    curso.acceso === tipo
                      ? 'border-primary bg-primary/10'
                      : 'border-border'
                  "
                  @click="curso.acceso = tipo"
                >
                  <strong>{{
                    tipo === "GRATUITO" ? "Curso gratuito" : "Curso de pago"
                  }}</strong>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{
                      tipo === "GRATUITO"
                        ? "Acceso sin costo"
                        : "Venta individual o empresarial"
                    }}
                  </p>
                </button>
              </div>
              <label
                v-if="curso.acceso === 'PAGO'"
                class="grid max-w-sm gap-2 text-sm font-bold text-foreground"
                >Precio en soles<Input
                  v-model.number="curso.precio"
                  type="number"
                  min="1"
              /></label>
              <template v-if="esIndependiente">
                <label class="grid max-w-sm gap-2 text-sm font-bold text-foreground"
                  >Visibilidad
                  <Select
                    v-model="curso.visibilidad"
                    :options="OPCIONES_VISIBILIDAD"
                    option-label="label"
                    option-value="value"
                    :class="CLASE_COMBO"
                    :panel-class="PANEL_COMBO"
                    placeholder="Selecciona visibilidad"
                    fluid
                  />
                </label>
                <label class="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                  ><input v-model="curso.permiteEmpresas" type="checkbox" /><span
                    ><b class="block text-sm text-foreground"
                      >Permitir licencias empresariales</b
                    ><span class="text-xs text-muted-foreground"
                      >Las organizaciones podrán asignarlo a sus equipos.</span
                    ></span
                  ></label
                >
              </template>
            </div>

            <div
              id="campo-certificado"
              v-else-if="paso === 5"
              class="paso-campos mt-7 grid gap-6"
            >
              <div class="grid content-start gap-5">
                <label class="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                  ><input v-model="curso.certificado" type="checkbox" /><span
                    ><b class="block text-foreground">Emitir certificado</b
                    ><span class="text-xs text-muted-foreground"
                      >Se genera al cumplir las condiciones.</span
                    ></span
                  ></label
                ><template v-if="curso.certificado"
                  ><div
                    v-if="instalacionCertificadosId"
                    class="rounded border border-border p-4 text-sm"
                    :class="
                      plantillaSeleccionada
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-amber-500/40 bg-amber-500/10'
                    "
                  >
                    <p class="font-black text-foreground">Plantilla del certificado</p>
                    <p
                      v-if="cargandoPlantillaCert"
                      class="mt-1 text-muted-foreground"
                    >
                      Cargando diseño del certificado…
                    </p>
                    <template v-else-if="plantillaSeleccionada">
                      <p class="mt-1 text-muted-foreground">
                        Se usará
                        <strong class="text-foreground">{{
                          plantillaSeleccionada.nombre
                        }}</strong>
                        {{
                          plantillaSeleccionada.alcance === "DOCENTE"
                            ? "(plantilla propia)."
                            : "(plantilla institucional)."
                        }}
                        Elige otra en el catálogo de abajo.
                      </p>
                      <Button
                        v-if="esGestionOrganizacion || docentesPuedenConfigurarCert"
                        class="mt-3"
                        size="sm"
                        variant="outline"
                        @click="irADisenoCertificados"
                      >
                        <LayoutTemplate class="mr-2 h-4 w-4" />
                        {{
                          esGestionOrganizacion
                            ? "Editar diseños"
                            : "Crear o editar mi plantilla"
                        }}
                      </Button>
                    </template>
                    <template v-else>
                      <p class="mt-1 text-amber-900 dark:text-amber-200">
                        Aún no hay plantilla disponible. Dirección debe configurar al menos una plantilla institucional.
                      </p>
                      <Button
                        v-if="esGestionOrganizacion"
                        class="mt-3"
                        size="sm"
                        @click="irADisenoCertificados"
                      >
                        Configurar plantilla
                      </Button>
                    </template>
                  </div>
                  <div class="grid gap-2 rounded border border-border bg-muted/20 p-4 text-sm">
                    <p class="font-bold text-foreground">Nombre del certificado</p>
                    <p class="text-muted-foreground">
                      Se usa el nombre del curso:
                      <strong class="text-foreground">{{
                        curso.titulo.trim() || "Completa el nombre en el paso 1"
                      }}</strong>
                    </p>
                  </div>
                  <label class="grid gap-2 text-sm font-bold text-foreground"
                    >Nota mínima (sobre 20)<Input
                      v-model.number="curso.notaMinima"
                      type="number"
                      min="0"
                      max="20" /></label
                  ><div class="grid gap-3">
                    <p class="text-sm font-bold text-foreground">Vigencia del certificado</p>
                    <div class="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        class="btn-opcion border-2 p-4 text-left"
                        :class="
                          !certificadoConCaducidad
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        "
                        @click="certificadoConCaducidad = false"
                      >
                        <strong class="block text-sm">Sin fecha de caducidad</strong>
                      </button>
                      <button
                        type="button"
                        class="btn-opcion border-2 p-4 text-left"
                        :class="
                          certificadoConCaducidad
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        "
                        @click="certificadoConCaducidad = true"
                      >
                        <strong class="block text-sm">Con fecha de caducidad</strong>
                      </button>
                    </div>
                    <div
                      v-if="certificadoConCaducidad"
                      class="flex max-w-sm items-center gap-2"
                    >
                      <Input
                        v-model.number="cantidadVigencia"
                        type="number"
                        min="1"
                        class="w-24"
                      />
                      <Select
                        v-model="unidadVigencia"
                        :options="OPCIONES_UNIDAD_VIGENCIA"
                        option-label="label"
                        option-value="value"
                        class="filtro-control min-w-0 flex-1"
                        :panel-class="PANEL_COMBO"
                        @change="alCambiarUnidadVigencia"
                      />
                    </div>
                  </div
                  ><div class="border border-border bg-muted/20 p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p class="text-sm font-black text-foreground">Firmas del certificado</p>
                        <p class="mt-1 text-xs text-muted-foreground">
                          <template v-if="esGestionOrganizacion">
                            Enlaza hasta {{ curso.cantidadFirmas || 1 }} firmas (docentes contratados u otros firmantes).
                          </template>
                          <template v-else>
                            Solo tu firma. El backend no permite más de una en cursos docentes.
                          </template>
                        </p>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <Select
                          v-if="esGestionOrganizacion"
                          :model-value="curso.cantidadFirmas || 1"
                          :options="OPCIONES_CANTIDAD_FIRMAS_CERTIFICADO"
                          option-label="label"
                          option-value="value"
                          class="filtro-control w-36"
                          :panel-class="PANEL_COMBO"
                          @update:model-value="alCambiarCantidadFirmas"
                        />
                        <Button
                          v-if="esGestionOrganizacion"
                          size="sm"
                          variant="outline"
                          :disabled="
                            curso.firmasCertificado.length >=
                            (curso.cantidadFirmas || 1)
                          "
                          @click="modalFirmas = true"
                        >
                          <Plus class="h-4 w-4" />Añadir firma
                        </Button>
                      </div>
                    </div>

                    <!-- Docente: solo firma propia por imagen -->
                    <div
                      v-if="!esGestionOrganizacion"
                      class="mt-4 grid gap-3"
                    >
                      <div
                        v-if="firmaPropiaDocente"
                        class="flex items-center gap-3 border border-border bg-card p-3"
                      >
                        <img
                          v-if="firmaPropiaDocente.imagen"
                          :src="firmaPropiaDocente.imagen"
                          alt="Tu firma"
                          class="h-12 w-28 object-contain border border-border bg-background"
                        />
                        <span
                          v-else
                          class="grid h-10 w-10 shrink-0 place-items-center bg-primary/10 text-primary"
                        >
                          <Signature class="h-5 w-5" />
                        </span>
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-black text-foreground">
                            {{ firmaPropiaDocente.nombre }}
                          </p>
                          <p class="text-xs text-muted-foreground">
                            Tu firma · {{ firmaPropiaDocente.cargo }}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          class="btn-borrar"
                          aria-label="Quitar tu firma"
                          @click="quitarFirma(firmaPropiaDocente.id)"
                        >
                          <Trash2 class="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div
                        class="rounded border-2 border-dashed border-border p-4"
                      >
                        <ZonaSubidaImagen
                          compacto
                          aspecto="auto"
                          :src="firmaPropiaDocente?.imagen ?? ''"
                          titulo="Subir mi firma"
                          ayuda="PNG o JPG · fondo transparente recomendado"
                          etiqueta-boton="Subir mi firma"
                          etiqueta-boton-cambiar="Cambiar mi firma"
                          :cargando="validandoFirma || subiendoFirmaPropia"
                          :error="errorFirmaPropia"
                          accept="image/png,image/jpeg"
                          @archivo="procesarArchivoFirmaPropia"
                        />

                        <div class="mt-4 rounded border border-border bg-card/60 p-3 text-left">
                          <p class="text-xs font-black uppercase tracking-wide text-muted-foreground">
                            Requisitos de la imagen
                          </p>
                          <ul class="mt-2 space-y-1 text-xs text-muted-foreground">
                            <li
                              v-for="req in REQUISITOS_FIRMA_TEXTO"
                              :key="req"
                            >
                              · {{ req }}
                            </li>
                          </ul>
                        </div>

                        <div
                          v-if="chequeosFirma.length"
                          class="mt-4 grid gap-2 text-left"
                        >
                          <div class="flex items-center justify-between gap-2">
                            <p class="text-xs font-bold text-foreground">
                              Verificación técnica
                            </p>
                            <span class="text-xs text-muted-foreground"
                              >{{ progresoFirma }}%</span
                            >
                          </div>
                          <div class="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              class="h-full bg-primary transition-all duration-300"
                              :style="{ width: `${progresoFirma}%` }"
                            />
                          </div>
                          <div
                            v-for="chequeo in chequeosFirma"
                            :key="chequeo.id"
                            class="flex items-start gap-2 rounded border border-border/70 px-2.5 py-2"
                            :class="{
                              'bg-emerald-500/5': chequeo.estado === 'ok',
                              'bg-red-500/5': chequeo.estado === 'error',
                              'bg-primary/5': chequeo.estado === 'revisando',
                            }"
                          >
                            <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center">
                              <Check
                                v-if="chequeo.estado === 'ok'"
                                class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                              />
                              <X
                                v-else-if="chequeo.estado === 'error'"
                                class="h-3.5 w-3.5 text-destructive"
                              />
                              <span
                                v-else-if="chequeo.estado === 'revisando'"
                                class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"
                              />
                              <span
                                v-else
                                class="h-2 w-2 rounded-full bg-border"
                              />
                            </span>
                            <div class="min-w-0 flex-1">
                              <p class="text-xs font-semibold">
                                {{ chequeo.titulo }}
                                <span class="font-normal text-muted-foreground">
                                  · {{ chequeo.detalle }}
                                </span>
                              </p>
                              <p
                                v-if="chequeo.mensaje"
                                class="mt-0.5 text-[11px]"
                                :class="
                                  chequeo.estado === 'error'
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                                "
                              >
                                {{ chequeo.mensaje }}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        v-if="firmasInstitucionales.length"
                        class="grid gap-2 border-t border-border pt-3"
                      >
                        <div
                          v-for="firma in firmasInstitucionales"
                          :key="firma.id"
                          class="flex items-center gap-3 border border-border bg-card/60 p-3 opacity-90"
                        >
                          <span
                            class="grid h-10 w-10 shrink-0 place-items-center bg-muted text-muted-foreground"
                          >
                            <Signature class="h-5 w-5" />
                          </span>
                          <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-black text-foreground">
                              {{ firma.nombre }}
                            </p>
                            <p class="text-xs text-muted-foreground">
                              {{ firma.cargo }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Admin organización: selección múltiple -->
                    <div
                      v-else-if="curso.firmasCertificado.length"
                      class="mt-4 grid gap-2"
                    >
                      <div
                        v-for="firma in curso.firmasCertificado"
                        :key="firma.id"
                        class="flex items-center gap-3 border border-border bg-card p-3"
                      >
                        <img
                          v-if="firma.imagen"
                          :src="firma.imagen"
                          :alt="`Firma de ${firma.nombre}`"
                          class="h-12 w-28 object-contain border border-border bg-background"
                        />
                        <span
                          v-else
                          class="grid h-10 w-10 shrink-0 place-items-center bg-primary/10 text-primary"
                        >
                          <Signature class="h-5 w-5" />
                        </span>
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-black text-foreground">
                            {{ firma.nombre }}
                          </p>
                          <p class="text-xs text-muted-foreground">
                            {{ firma.cargo }} ·
                            {{
                              firma.origen === "PROPIA"
                                ? "Firma del docente"
                                : `Firma ${firma.tipo === "DIGITAL" ? "digital" : "electrónica"}`
                            }}
                          </p>
                        </div>
                        <Button
                          v-if="firma.origen !== 'PROPIA'"
                          size="icon"
                          variant="ghost"
                          class="btn-borrar"
                          :aria-label="`Quitar firma de ${firma.nombre}`"
                          @click="quitarFirma(firma.id)"
                        >
                          <Trash2 class="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
              <div class="mx-auto grid w-full max-w-3xl gap-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="text-sm font-bold text-foreground">
                      Vista previa del certificado
                    </p>
                    <p class="text-xs text-muted-foreground">
                      <template v-if="esGestionOrganizacion">
                        Firmas configuradas en el curso (hasta {{ curso.cantidadFirmas || 1 }}).
                      </template>
                      <template v-else>
                        Se muestra con el nombre del curso y tu firma (una sola).
                      </template>
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    :disabled="!plantillaSeleccionada"
                    @click="enfocarVistaPreviaCertificado"
                  >
                    <Eye class="h-4 w-4" />
                    Ver vista previa
                  </Button>
                </div>

                <div id="vista-previa-certificado-curso">
                  <VistaPreviaPlantillaCertificado
                    :plantilla="plantillaSeleccionada"
                    :titulo-curso="curso.titulo"
                    :firmas="firmasParaVistaPrevia"
                    :cargando="cargandoPlantillaCert"
                    :cantidad-firmas="cantidadFirmasVistaPrevia"
                    :mostrar-selector-firmas="false"
                  />
                </div>

                <div class="grid gap-3 border border-border bg-muted/20 p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-black text-foreground">
                        Catálogo de plantillas
                      </p>
                      <p class="mt-1 text-xs text-muted-foreground">
                        <template v-if="docentesPuedenConfigurarCert">
                          Puedes usar plantillas de la institución y las tuyas.
                        </template>
                        <template v-else>
                          Solo plantillas que brinda la institución.
                        </template>
                      </p>
                    </div>
                    <Button
                      v-if="
                        esGestionOrganizacion || docentesPuedenConfigurarCert
                      "
                      type="button"
                      size="sm"
                      variant="outline"
                      @click="irADisenoCertificados"
                    >
                      <LayoutTemplate class="h-4 w-4" />
                      {{
                        esGestionOrganizacion
                          ? "Gestionar diseños"
                          : "Crear mi plantilla"
                      }}
                    </Button>
                  </div>

                  <p
                    v-if="cargandoPlantillaCert"
                    class="text-sm text-muted-foreground"
                  >
                    Cargando plantillas…
                  </p>
                  <p
                    v-else-if="!catalogoPlantillasCert.length"
                    class="text-sm text-amber-800 dark:text-amber-200"
                  >
                    Aún no hay plantillas disponibles. Pide a Dirección que configure el diseño del certificado.
                  </p>
                  <div
                    v-else
                    class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    <button
                      v-for="plantilla in catalogoPlantillasCert"
                      :key="plantilla.id"
                      type="button"
                      class="overflow-hidden border-2 text-left transition"
                      :class="
                        curso.plantillaCertificadoId === plantilla.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/40'
                      "
                      @click="seleccionarPlantillaCertificado(plantilla)"
                    >
                      <div class="aspect-[297/210] bg-muted">
                        <img
                          v-if="miniaturaPlantilla(plantilla)"
                          :src="miniaturaPlantilla(plantilla)"
                          :alt="plantilla.nombre"
                          class="h-full w-full object-cover"
                        />
                        <div
                          v-else
                          class="grid h-full place-items-center text-xs text-muted-foreground"
                        >
                          Sin fondo
                        </div>
                      </div>
                      <div class="grid gap-1 p-3">
                        <p class="truncate text-sm font-bold text-foreground">
                          {{ plantilla.nombre }}
                        </p>
                        <p class="text-[11px] text-muted-foreground">
                          {{
                            plantilla.alcance === "DOCENTE"
                              ? "Plantilla propia"
                              : plantilla.esDefault
                                ? "Institucional · oficial"
                                : "Institucional"
                          }}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="mt-7">
              <div
                v-if="enviado"
                class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center"
              >
                <CheckCircle2 class="mx-auto h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                <h3 class="mt-4 text-xl font-black text-foreground">
                  {{ esGestionOrganizacion ? "Curso aprobado por Administración" : "Curso enviado a revisión" }}
                </h3>
                <p class="mt-2 text-sm text-emerald-800 dark:text-emerald-300">
                  {{
                    esGestionOrganizacion
                      ? "El contenido quedó aprobado, con su docente responsable, firmantes y trazabilidad de la carga administrativa. Ya puede configurarse para su publicación."
                      : "El equipo Tukuy evaluará el contenido y te notificará sus observaciones."
                  }}
                </p>
                <Button
                  v-if="esGestionOrganizacion"
                  class="mt-5"
                  @click="router.push(rutaRegreso)"
                >
                  Volver al catálogo
                </Button>
              </div>
              <template v-else
                ><div class="space-y-3">
                  <p class="text-sm text-muted-foreground">
                    Si falta algo, haz clic en el pendiente para ir directo a completarlo.
                  </p>
                  <button
                    v-for="item in requisitosRevision"
                    :key="item.id"
                    type="button"
                    class="flex w-full items-center gap-3 rounded border border-border p-4 text-left transition"
                    :class="
                      item.listo
                        ? 'border-border bg-card'
                        : 'cursor-pointer border-amber-400/50 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10'
                    "
                    :disabled="item.listo"
                    :aria-label="
                      item.listo
                        ? item.texto
                        : `Ir a completar: ${item.texto}`
                    "
                    @click="irARequisitoPendiente(item)"
                  >
                    <span
                      class="grid h-7 w-7 place-items-center rounded-full"
                      :class="
                        item.listo
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-accent/15 text-[#B87A00] dark:text-accent'
                      "
                      ><Check v-if="item.listo" class="h-4 w-4" /><Lock
                        v-else
                        class="h-4 w-4" /></span
                    ><span class="flex-1 text-sm font-semibold text-foreground">{{
                      item.texto
                    }}</span
                    ><Badge
                      :class="
                        item.listo
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-accent/15 text-[#B87A00] dark:text-accent'
                      "
                      >{{ item.listo ? "Listo" : "Ir a completar" }}</Badge
                    >
                  </button>
                </div>
                <div class="mt-6 rounded-xl bg-muted p-4">
                  <div class="flex gap-3">
                    <ShieldCheck class="h-5 w-5 text-primary" />
                    <p class="text-sm text-muted-foreground">
                      {{
                        esGestionOrganizacion
                          ? "Al aprobar confirmas que Administración ya revisó el material entregado por el docente y configuró su certificación."
                          : "Al enviar confirmas que el contenido es original y cumple las políticas académicas de Tukuy."
                      }}
                    </p>
                  </div>
                </div>
                <Button
                  class="mt-6 w-full bg-primary"
                  :disabled="!listoParaEnviar"
                  @click="enviarRevision"
                  ><Send class="h-4 w-4" />{{ esGestionOrganizacion ? "Aprobar contenido" : "Enviar curso a revisión" }}</Button
                ></template
              >
            </div>

            <div
              v-if="!enviado"
              class="mt-8 flex flex-col gap-3 border-t border-border pt-5"
            >
              <div class="flex justify-between gap-3">
                <Button
                  variant="outline"
                  :disabled="indicePasoVisible <= 0 || guardando"
                  @click="anterior"
                  ><ChevronLeft class="h-4 w-4" />Anterior</Button
                ><Button
                  v-if="hayPasoSiguiente"
                  :disabled="guardando"
                  @click="siguiente"
                  >{{
                    guardando ? "Guardando…" : "Guardar y continuar"
                  }}<ChevronRight class="h-4 w-4"
                /></Button>
              </div>
            </div> </CardContent
        ></Card>
      </div>
    </template>
    <Dialog
      v-model:visible="modalDocente"
      modal
      header="Agregar docente responsable"
      :style="{ width: 'min(48rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-5 text-foreground">
        <p class="text-sm text-muted-foreground">
          Esta información identificará al autor académico y será visible en la presentación pública del curso.
        </p>
        <div class="grid gap-5 sm:grid-cols-[150px_1fr]">
          <div>
            <button
              type="button"
              class="grid aspect-square w-full place-items-center overflow-hidden border border-dashed border-primary bg-primary/5 text-center text-xs font-bold text-primary"
              @click="selectorFotoDocente?.click()"
            >
              <img v-if="docenteManual.foto" :src="docenteManual.foto" alt="Fotografía del docente" class="h-full w-full object-cover" />
              <span v-else class="grid justify-items-center gap-2"><Upload class="h-6 w-6" />Subir fotografía</span>
            </button>
            <input ref="selectorFotoDocente" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="seleccionarFotoDocente" />
            <p v-if="errorFotoDocente" class="mt-2 text-xs text-destructive">{{ errorFotoDocente }}</p>
            <p class="mt-2 text-xs text-muted-foreground">JPG, PNG o WEBP · máximo 1 MB.</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold text-foreground">Nombre completo *<Input v-model="docenteManual.nombre" placeholder="Ej. Marco Antonio Ruiz" /></label>
            <label class="grid gap-2 text-sm font-bold text-foreground">Correo<Input v-model="docenteManual.correo" type="email" placeholder="docente@correo.com" /></label>
            <label class="grid gap-2 text-sm font-bold text-foreground">Cargo profesional *<Input v-model="docenteManual.cargo" placeholder="Ej. Ingeniero civil" /></label>
            <label class="grid gap-2 text-sm font-bold text-foreground">Especialidad<Input v-model="docenteManual.especialidad" placeholder="Ej. Gestión de proyectos" /></label>
          </div>
        </div>
        <label class="grid gap-2 text-sm font-bold text-foreground">
          Presentación profesional *
          <textarea v-model="docenteManual.biografia" rows="4" class="w-full border border-input bg-background px-3 py-2 font-normal outline-none focus:border-primary" placeholder="Resume su trayectoria, enfoque profesional y aporte al curso." />
        </label>
        <div class="grid gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold text-foreground">Experiencia destacada</span>
            <Button type="button" size="sm" variant="ghost" @click="agregarExperienciaDocente"><Plus class="h-4 w-4" />Añadir experiencia</Button>
          </div>
          <div v-for="(_, indice) in docenteManual.experiencia" :key="indice" class="flex gap-2">
            <Input v-model="docenteManual.experiencia[indice]" placeholder="Ej. 12 años dirigiendo proyectos de infraestructura" />
            <Button type="button" size="icon" variant="ghost" title="Quitar experiencia" @click="quitarExperienciaDocente(indice)"><Trash2 class="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalDocente = false">Cancelar</Button>
        <Button
          :disabled="!docenteManual.nombre.trim() || !docenteManual.cargo.trim() || !docenteManual.biografia.trim()"
          @click="guardarDocenteManual"
        >
          Guardar y seleccionar
        </Button>
      </template>
    </Dialog>
    <Dialog
      v-model:visible="modalCategorias"
      modal
      header="Gestionar categorías de cursos"
      :style="{ width: 'min(38rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-5 text-foreground">
        <div class="flex gap-2">
          <Input
            v-model="nuevaCategoria"
            class="min-w-0 flex-1"
            placeholder="Nombre de la nueva categoría"
            @keyup.enter="agregarCategoriaCurso"
          />
          <Button
            variant="outline"
            :class="ESTILO_ACCION.categoria"
            :disabled="!nuevaCategoria.trim()"
            @click="agregarCategoriaCurso"
          >
            <Plus class="h-4 w-4" />Añadir
          </Button>
        </div>

        <div class="grid gap-2">
          <div
            v-for="categoria in categoriasCurso"
            :key="categoria"
            class="flex items-center gap-3 border border-border bg-card p-3"
          >
            <span class="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{{ categoria }}</span>
            <Badge v-if="curso.categoria === categoria" class="bg-primary text-white">
              En uso
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              :disabled="curso.categoria === categoria"
              :title="
                curso.categoria === categoria
                  ? 'Cambia la categoría del curso antes de eliminarla'
                  : `Eliminar ${categoria}`
              "
              @click="solicitarEliminarCategoria(categoria)"
            >
              <Trash2 class="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div
          v-if="categoriaPendienteEliminar"
          class="border-l-4 border-l-red-600 bg-red-500/10 p-4"
        >
          <p class="text-sm font-black text-foreground">
            ¿Eliminar la categoría “{{ categoriaPendienteEliminar }}”?
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            Dejará de estar disponible para nuevos cursos. Los cursos guardados previamente
            conservarán su información histórica.
          </p>
          <div class="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="outline" @click="cancelarEliminarCategoria">
              Cancelar
            </Button>
            <Button size="sm" variant="destructive" @click="confirmarEliminarCategoria">
              Sí, eliminar
            </Button>
          </div>
        </div>
      </div>
      <template #footer>
        <Button @click="modalCategorias = false">Listo</Button>
      </template>
    </Dialog>
    <Dialog
      v-model:visible="modalEliminarCurso"
      modal
      header="Ocultar curso del catálogo"
      :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
    >
      <p class="text-sm text-muted-foreground">
        El curso dejará de mostrarse en el catálogo para nuevos alumnos. Quienes ya
        están inscritos conservan acceso, progreso y certificados. No se borran
        materiales ni matrículas.
      </p>
      <template #footer>
        <Button variant="outline" @click="modalEliminarCurso = false">
          Cancelar
        </Button>
        <Button
          variant="destructive"
          :disabled="eliminandoCurso"
          @click="confirmarEliminarCurso"
        >
          {{ eliminandoCurso ? "Ocultando…" : "Sí, ocultar" }}
        </Button>
      </template>
    </Dialog>
    <Dialog
      v-if="esGestionOrganizacion"
      v-model:visible="modalFirmas"
      modal
      header="Añadir firma institucional"
      :style="{ width: 'min(46rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="busquedaFirma"
            class="pl-10"
            placeholder="Buscar por nombre, cargo, área o especialidad"
          />
        </div>
        <div class="max-h-96 grid gap-2 overflow-y-auto pr-1">
          <button
            v-for="firma in firmasDisponibles"
            :key="firma.id"
            type="button"
            class="flex items-center gap-3 border border-border p-3 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="curso.firmasCertificado.some((item) => item.id === firma.id)"
            @click="agregarFirma(firma)"
          >
            <span class="grid h-10 w-10 shrink-0 place-items-center bg-primary/10 text-primary">
              <Signature class="h-5 w-5" />
            </span>
            <span class="min-w-0 flex-1">
              <b class="block truncate text-sm">{{ firma.nombre }}</b>
              <small v-if="firma.cargo" class="text-muted-foreground">{{ firma.cargo }}</small>
            </span>
            <Check v-if="curso.firmasCertificado.some((item) => item.id === firma.id)" class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <Plus v-else class="h-5 w-5 text-primary" />
          </button>
          <p v-if="!firmasDisponibles.length" class="py-8 text-center text-sm text-muted-foreground">
            No encontramos firmas disponibles con esa búsqueda.
          </p>
        </div>
      </div>
      <template #footer>
        <Button @click="modalFirmas = false">Listo</Button>
      </template>
    </Dialog>
    <div
      v-if="mostrandoVistaPrevia"
      class="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      @click.self="mostrandoVistaPrevia = false"
    >
      <article
        class="max-h-[90vh] w-full max-w-4xl overflow-auto border border-border bg-card shadow-2xl"
      >
        <div class="relative aspect-[16/7] bg-slate-900">
          <ImagenPortadaCurso
            v-if="urlPortadaVistaPrevia"
            :src="urlPortadaVistaPrevia"
            :alt="curso.titulo"
            :object-position="curso.imagenPosicion"
            :opacidad="0.65"
            contenedor-class="aspect-[16/7] h-full w-full bg-slate-900"
          />
          <div
            class="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-950/60 to-transparent"
          />
          <div class="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
            <Badge class="mb-4 bg-accent text-slate-950">{{
              curso.nivel
            }}</Badge>
            <h2 class="max-w-2xl text-3xl font-black">{{ curso.titulo }}</h2>
            <p v-if="curso.subtitulo.trim()" class="mt-3 max-w-2xl text-sm text-slate-200">
              {{ curso.subtitulo }}
            </p>
          </div>
        </div>
        <div class="grid gap-6 p-7 sm:grid-cols-[1fr_260px]">
          <div>
            <h3 class="font-black text-foreground">Lo que aprenderás</h3>
            <ul class="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li
                v-for="(objetivo, indice) in curso.objetivos.filter((item) => item.trim())"
                :key="`${indice}-${objetivo}`"
              >
                ✓ {{ objetivo }}
              </li>
            </ul>
            <template v-if="etiquetasRequisitosVista.length">
              <h3 class="mt-6 font-black text-foreground">Requisitos</h3>
              <ul class="mt-3 grid gap-2 text-sm text-muted-foreground">
                <li
                  v-for="etiqueta in etiquetasRequisitosVista"
                  :key="etiqueta"
                >
                  · {{ etiqueta }}
                </li>
              </ul>
            </template>
          </div>
          <div class="border-l border-border pl-5 text-sm">
            <p class="font-black text-foreground">{{ curso.categoria }}</p>
            <p class="mt-2 text-muted-foreground">
              {{ secciones.length }} secciones ·
              {{
                secciones.reduce((total, item) => total + item.clases.length, 0)
              }}
              clases
            </p>
            <p class="mt-2 font-black text-primary">
              {{
                curso.acceso === "PAGO"
                  ? `S/ ${curso.precio}`
                  : "Acceso institucional o gratuito"
              }}
            </p>
          </div>
        </div>
        <div
          v-if="curso.docenteResponsablePerfil"
          class="grid gap-5 border-t border-border p-7 sm:grid-cols-[110px_1fr]"
        >
          <img
            v-if="curso.docenteResponsablePerfil.foto"
            :src="curso.docenteResponsablePerfil.foto"
            :alt="curso.docenteResponsablePerfil.nombre"
            class="aspect-square w-full object-cover"
          />
          <div v-else class="grid aspect-square w-full place-items-center bg-primary text-2xl font-black text-white">
            {{ curso.docenteResponsablePerfil.nombre.split(' ').slice(0, 2).map((item: string) => item[0]).join('') }}
          </div>
          <div>
            <p class="text-xs font-black uppercase tracking-[0.18em] text-primary">Docente responsable</p>
            <h3 class="mt-1 text-xl font-black text-foreground">{{ curso.docenteResponsablePerfil.nombre }}</h3>
            <p class="text-sm font-semibold text-muted-foreground">
              {{ curso.docenteResponsablePerfil.cargo }}
              <template v-if="curso.docenteResponsablePerfil.especialidad"> · {{ curso.docenteResponsablePerfil.especialidad }}</template>
            </p>
            <p class="mt-3 text-sm text-muted-foreground">{{ curso.docenteResponsablePerfil.biografia }}</p>
            <ul v-if="curso.docenteResponsablePerfil.experiencia.length" class="mt-3 grid gap-1 text-sm">
              <li v-for="experiencia in curso.docenteResponsablePerfil.experiencia" :key="experiencia">✓ {{ experiencia }}</li>
            </ul>
          </div>
        </div>
        <div class="flex justify-end border-t border-border p-4">
          <Button @click="mostrandoVistaPrevia = false"
            >Cerrar vista previa</Button
          >
        </div>
      </article>
    </div>

    <PersonalizarPortadaModal
      :abierto="modalPortadaAbierto"
      :fuente="fuentePortadaTemp"
      :nombre-archivo="archivoPortadaTemp?.name"
      :tipo-mime="archivoPortadaTemp?.type"
      @cancelar="cancelarPersonalizarPortada"
      @listo="confirmarPortadaRecortada"
    />
  </section>
</template>

<style scoped>
/* Radio suave en todo el constructor (5 pasos), no solo botones. */
.constructor-curso {
  --constructor-radio: 0.3125rem;
  color: var(--color-foreground);
}

.constructor-curso :deep(button:not(.rounded-full)),
.constructor-curso :deep(input:not([type="radio"]):not([type="checkbox"]):not([type="file"])),
.constructor-curso :deep(textarea),
.constructor-curso :deep(select),
.constructor-curso :deep(article),
.constructor-curso :deep(img),
.constructor-curso :deep(label),
.constructor-curso :deep(.p-select),
.constructor-curso :deep(.p-select-label),
.constructor-curso :deep(.p-multiselect),
.constructor-curso :deep(.p-multiselect-label),
.constructor-curso :deep(.p-dialog),
.constructor-curso :deep([class*="rounded"]:not([class*="rounded-full"])),
.constructor-curso :deep([class~="border"]),
.constructor-curso :deep([class*="border-2"]),
.constructor-curso :deep([class*="border-dashed"]),
.constructor-curso :deep([class*="bg-card"]),
.constructor-curso :deep([class*="bg-muted"]),
.constructor-curso :deep([class*="bg-primary"]),
.constructor-curso :deep([class*="bg-rose"]),
.constructor-curso :deep([class*="bg-sky"]),
.constructor-curso :deep([class*="bg-violet"]),
.constructor-curso :deep([class*="bg-amber"]),
.constructor-curso :deep([class*="bg-teal"]),
.constructor-curso :deep([class*="bg-indigo"]),
.constructor-curso :deep([class*="bg-fuchsia"]),
.constructor-curso :deep([class*="bg-emerald"]),
.constructor-curso :deep([class*="bg-cyan"]),
.constructor-curso :deep([class*="bg-red-"]),
.constructor-curso :deep([class*="bg-linear"]) {
  border-radius: var(--constructor-radio) !important;
}

.constructor-curso :deep(.rounded-full) {
  border-radius: 9999px !important;
}

.constructor-curso :deep(input::placeholder),
.constructor-curso :deep(textarea::placeholder) {
  color: var(--color-muted-foreground) !important;
  opacity: 1 !important;
}

.constructor-curso :deep(.p-select-label.p-placeholder),
.constructor-curso :deep(.p-multiselect-label.p-placeholder) {
  color: var(--color-muted-foreground) !important;
  opacity: 1 !important;
}

/* Campos de texto: tokens del tema (claro y oscuro). */
.paso-campos :deep(input:not([type="radio"]):not([type="checkbox"]):not([type="file"]):not(.border-0)),
.paso-campos :deep(textarea) {
  border-color: var(--color-border) !important;
  background-color: var(--color-card) !important;
  color: var(--color-foreground) !important;
}

.paso-campos :deep(input.border-0),
.paso-campos :deep(.bg-muted input) {
  background-color: transparent !important;
  border-color: transparent !important;
  color: var(--color-foreground) !important;
}

.paso-campos :deep(.filtro-control.p-select),
.paso-campos :deep(.filtro-control.p-multiselect),
.paso-campos :deep(.filtro-control.p-inputtext) {
  background-color: var(--color-card) !important;
  border-color: var(--color-border) !important;
  color: var(--color-foreground) !important;
}

.paso-campos :deep(.filtro-control.p-select .p-select-label),
.paso-campos :deep(.filtro-control.p-multiselect .p-multiselect-label),
.paso-campos :deep(.filtro-control.p-multiselect .p-multiselect-label-container) {
  color: var(--color-foreground) !important;
}

.paso-campos :deep(.filtro-control.p-select .p-select-label.p-placeholder),
.paso-campos :deep(.filtro-control.p-multiselect .p-multiselect-label.p-placeholder) {
  color: var(--color-muted-foreground) !important;
}

.paso-campos :deep(.filtro-control.p-select .p-select-dropdown),
.paso-campos :deep(.filtro-control.p-multiselect .p-multiselect-dropdown) {
  color: var(--color-muted-foreground) !important;
}

.paso-campos :deep(.filtro-control.p-multiselect .p-chip),
.paso-campos :deep(.filtro-control.p-multiselect .p-multiselect-chip) {
  background: color-mix(in srgb, var(--color-primary) 22%, var(--color-muted)) !important;
  color: var(--color-foreground) !important;
}

.paso-campos :deep(.filtro-control.p-multiselect .p-chip-remove-icon),
.paso-campos :deep(.filtro-control.p-multiselect .p-multiselect-chip-icon) {
  color: var(--color-muted-foreground) !important;
}

.paso-campos :deep(input:not([type="radio"]):not([type="checkbox"]):not([type="file"]):focus),
.paso-campos :deep(textarea:focus) {
  border-color: var(--color-ring) !important;
  outline: 2px solid color-mix(in srgb, var(--color-ring) 35%, transparent);
  outline-offset: 0;
}

.paso-campos :deep(.control-boton) {
  border-color: var(--color-border) !important;
  background-color: var(--color-muted) !important;
  color: var(--color-foreground) !important;
}

.paso-campos :deep(.control-boton:hover) {
  border-color: var(--color-primary) !important;
  background-color: color-mix(
    in srgb,
    var(--color-primary) 12%,
    var(--color-muted)
  ) !important;
}

.paso-campos :deep(.btn-opcion) {
  background-color: var(--color-card) !important;
  color: var(--color-foreground) !important;
}

.paso-campos :deep(.btn-opcion:hover) {
  background-color: var(--color-muted) !important;
}
</style>
