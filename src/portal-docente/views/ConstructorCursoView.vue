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
  Image,
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
  X,
  BookOpen,
  Tag,
  AlignLeft,
  Users,
  Target,
  ListChecks,
} from "lucide-vue-next";
import { computed, nextTick, onMounted, reactive, ref, toRaw } from "vue";
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
import { storageAcademia, urlPublicaMedia } from "@/lib/storage-academia";
import PersonalizarPortadaModal from "@/components/shared/PersonalizarPortadaModal.vue";
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
const selectorImagen = ref<HTMLInputElement | null>(null);
const modalPortadaAbierto = ref(false);
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
const selectorFirmaPropia = ref<HTMLInputElement | null>(null);
const validandoFirma = ref(false);
const chequeosFirma = ref<ChequeoFirma[]>([]);
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
}

function fuenteVideoItem(item: ItemSeccion): FuenteVideoCurso {
  return item.fuenteVideo ?? "youtube";
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

async function anclarImagenPregunta(
  pregunta: NonNullable<ItemSeccion["preguntas"]>[number],
  si: number,
  ci: number,
  pi: number,
  evento: Event,
) {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0];
  entrada.value = "";
  if (!archivo) return;
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
    curso.cargadoPorNombre ||= currentUser.value?.name ?? "";
    if (!esGestionOrganizacion.value) {
      curso.docenteResponsableNombre ||= curso.cargadoPorNombre;
    }
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
        (!esGestionOrganizacion.value || curso.firmasCertificado.length > 0)),
  },
]);
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
  return {
    ...clonPlano(curso),
    requisitosAccesoActivos: requisitosAccesoActivos.value,
    requisitos,
    // El certificado toma el nombre del curso (paso 1).
    nombreCertificado: curso.titulo.trim(),
    secciones: seccionesNormalizadas,
  };
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

async function guardar() {
  if (guardando.value) return false;
  guardando.value = true;
  try {
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
      await router.replace({
        path: esGestionOrganizacion.value
          ? `/organizacion/cursos/${guardadoCurso.id}/constructor`
          : `/docente/cursos/${guardadoCurso.id}/constructor`,
        query: { ...route.query, borrador: undefined },
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
  curso.firmasCertificado.push({
    ...firma,
    origen: firma.origen ?? "INSTITUCIONAL",
  });
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

async function seleccionarFirmaPropia(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0];
  if (!archivo) return;
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
    entrada.value = "";
  }
}

async function enviarRevision() {
  if (!listoParaEnviar.value) return;
  try {
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
  const ok = await guardar();
  if (!ok) return;
  const siguientePaso = pasosVisibles.value[indicePasoVisible.value + 1];
  if (siguientePaso) paso.value = siguientePaso.pasoOriginal;
}

function anterior() {
  const pasoAnterior = pasosVisibles.value[indicePasoVisible.value - 1];
  if (pasoAnterior) paso.value = pasoAnterior.pasoOriginal;
}

async function seleccionarImagen(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0];
  if (!archivo) return;
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
  entrada.value = "";
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
  <section class="constructor-curso mx-auto grid max-w-350 gap-6">
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
            <h1 class="text-xl font-black">{{ curso.titulo.trim() || "Nuevo curso" }}</h1>
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
              class="border-red-500/40 text-red-600 hover:bg-red-500/10"
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
          <p class="font-black">Carga administrativa por encargo</p>
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
                :class="paso === item.pasoOriginal ? 'bg-primary text-white' : 'bg-border'"
                >{{ indice + 1 }}</span
              ><span class="flex-1">{{ item.nombre }}</span
              ><ChevronRight class="h-4 w-4" /></button></CardContent
        ></Card>

        <Card class="rounded-md border-border bg-card"
          ><CardContent class="p-6 sm:p-8">
            <Badge class="bg-primary/10 text-primary"
              >Paso {{ indicePasoVisible + 1 }} de {{ pasosVisibles.length }}</Badge
            >
            <h2 class="mt-3 text-2xl font-black">{{ titulos[paso - 1] }}</h2>
            <p class="mt-2 text-sm text-muted-foreground">
              {{ descripciones[paso - 1] }}
            </p>

            <div
              id="campo-planifica"
              v-if="paso === 1"
              class="paso-campos mt-7 grid gap-6"
            >
              <label class="grid gap-2 text-sm font-bold">
                <span class="flex items-center gap-2">
                  <BookOpen class="h-4 w-4 text-sky-600" />Nombre del curso
                </span>
                <Input
                  v-model="curso.titulo"
                  placeholder="Ej. Seguridad en obra civil"
                />
              </label>
              <label class="grid gap-2 text-sm font-bold">
                <span class="flex items-center gap-2">
                  <Tag class="h-4 w-4 text-indigo-600" />Categoría
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
              <label class="grid gap-2 text-sm font-bold">
                <span class="flex items-center gap-2">
                  <AlignLeft class="h-4 w-4 text-sky-600" />Descripción breve
                </span>
                <textarea
                  v-model="curso.descripcion"
                  class="min-h-28 border border-input bg-card p-3 font-normal"
                  placeholder="Resume de qué trata el curso"
                />
              </label>
              <div
                v-if="esGestionOrganizacion"
                class="grid gap-2 text-sm font-bold"
              >
                <span class="flex items-center gap-2">
                  <Users class="h-4 w-4 text-indigo-600" />Dirigido a
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
              <label v-else class="grid gap-2 text-sm font-bold">
                <span class="flex items-center gap-2">
                  <Users class="h-4 w-4 text-sky-600" />Dirigido a
                </span>
                <textarea
                  v-model="curso.publico"
                  class="min-h-24 border border-input bg-card p-3 font-normal"
                  placeholder="¿Quién debería tomar este curso?"
                />
              </label>
              <label
                id="campo-docente-responsable"
                v-if="esGestionOrganizacion"
                class="grid gap-2 text-sm font-bold"
              >
                <span class="flex items-center gap-2">
                  <UserRoundCheck class="h-4 w-4 text-indigo-600" />Docente responsable
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
                          <b class="block">{{ option.nombre }}</b>
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
                  <h3 class="flex items-center gap-2 font-bold">
                    <Target class="h-4 w-4 text-sky-600" />Objetivos de aprendizaje
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
                    <X class="h-4 w-4 text-red-600" />
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
                    <b class="block text-sm">Añadir requisitos de acceso al curso</b>
                    <small class="text-muted-foreground">
                      Actívalo solo si el alumno debe cumplir cursos previos
                      verificables para inscribirse. Si está apagado, no se
                      exigen requisitos.
                    </small>
                  </span>
                </label>
                <div v-if="requisitosAccesoActivos" class="mt-4">
                  <h3 class="flex items-center gap-2 font-bold">
                    <ListChecks class="h-4 w-4 text-sky-600" />Cursos previos requeridos
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
                class="border-l-4 border-l-red-600 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
              >
                {{ errorMaterial }}
              </p>
              <article
                v-for="(seccion, si) in secciones"
                :key="si"
                class="overflow-hidden rounded-xl border border-border"
              >
                <div class="flex items-center gap-3 bg-muted p-4">
                  <GripVertical class="h-5 w-5 text-muted-foreground" /><Input
                    v-model="seccion.titulo"
                    class="flex-1 border-0 bg-transparent font-bold shadow-none"
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
                        class="min-w-40 flex-1 border-0 bg-transparent shadow-none"
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
                        <Trash2 class="h-4 w-4 text-red-600" />
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
                      <Input
                        v-model="item.urlYoutube"
                        :placeholder="placeholderUrlVideo(fuenteVideoItem(item))"
                        @update:model-value="alCambiarUrlVideo(item)"
                      />
                      <p class="text-xs text-muted-foreground">
                        {{ ayudaUrlVideo(fuenteVideoItem(item)) }}
                      </p>
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
                            <Trash2 class="h-4 w-4 text-red-600" />
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
                          <div
                            v-if="pregunta.imagenReferencia"
                            class="overflow-hidden border border-border bg-background"
                          >
                            <img
                              :src="urlPublicaMedia(pregunta.imagenReferencia)"
                              alt="Referencia de la pregunta"
                              class="max-h-44 w-full object-contain"
                            />
                          </div>
                          <div class="flex flex-wrap items-center gap-2">
                            <label class="inline-flex">
                              <input
                                class="sr-only"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                :disabled="
                                  subiendoImagenPregunta ===
                                  claveImagenPregunta(si, ci, pi)
                                "
                                @change="
                                  anclarImagenPregunta(
                                    pregunta,
                                    si,
                                    ci,
                                    pi,
                                    $event,
                                  )
                                "
                              />
                              <span
                                class="control-boton inline-flex h-9 cursor-pointer items-center gap-1.5 border px-3 text-xs font-semibold"
                              >
                                <Image class="h-3.5 w-3.5" />
                                {{
                                  subiendoImagenPregunta ===
                                  claveImagenPregunta(si, ci, pi)
                                    ? "Subiendo…"
                                    : pregunta.imagenReferencia
                                      ? "Cambiar imagen"
                                      : "Agregar imagen"
                                }}
                              </span>
                            </label>
                            <Button
                              v-if="pregunta.imagenReferencia"
                              size="sm"
                              variant="ghost"
                              type="button"
                              class="btn-borrar"
                              @click="quitarImagenPregunta(pregunta)"
                            >
                              Quitar
                            </Button>
                          </div>
                          <p
                            v-if="errorImagenPregunta"
                            class="text-[11px] font-medium text-red-600"
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
                        <p class="text-sm font-black">Material del docente</p>
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
                          <p class="truncate text-sm font-bold">{{ recurso.nombre }}</p>
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
                          <Trash2 class="h-4 w-4 text-red-600" />
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
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="grid gap-2 text-sm font-bold sm:col-span-2"
                  >Subtítulo<Input
                    v-model="curso.subtitulo"
                    placeholder="Una promesa clara para el estudiante" /></label
                ><label class="grid gap-2 text-sm font-bold"
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
              <div
                class="border-2 border-dashed border-border bg-muted/30 p-7 text-center"
              >
                <img
                  v-if="curso.imagen"
                  :src="curso.imagen"
                  alt="Vista previa de la portada"
                  class="mx-auto mb-4 aspect-video max-h-56 w-full rounded object-cover"
                />
                <Image v-else class="mx-auto h-8 w-8 text-primary" />
                <p class="mt-2 font-bold">Imagen de portada</p>
                <p class="text-xs text-muted-foreground">
                  JPG o PNG · después de elegirla podrás recortar en 16:9
                </p>
                <input
                  ref="selectorImagen"
                  class="hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  @change="seleccionarImagen"
                />
                <Button
                  class="mt-3"
                  size="sm"
                  variant="outline"
                  :disabled="subiendoPortada"
                  @click="selectorImagen?.click()"
                >
                  {{
                    subiendoPortada
                      ? "Subiendo…"
                      : curso.imagen
                        ? "Cambiar imagen"
                        : "Seleccionar imagen"
                  }}
                </Button>
                <p
                  v-if="errorImagen"
                  class="mt-2 text-xs font-semibold text-red-600"
                >
                  {{ errorImagen }}
                </p>
              </div>
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
                class="grid max-w-sm gap-2 text-sm font-bold"
                >Precio en soles<Input
                  v-model.number="curso.precio"
                  type="number"
                  min="1"
              /></label>
              <template v-if="esIndependiente">
                <label class="grid max-w-sm gap-2 text-sm font-bold"
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
                <label class="flex items-center gap-3 rounded-xl border p-4"
                  ><input v-model="curso.permiteEmpresas" type="checkbox" /><span
                    ><b class="block text-sm"
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
              class="paso-campos mt-7 grid gap-6 lg:grid-cols-[1fr_360px]"
            >
              <div class="grid content-start gap-5">
                <label class="flex items-center gap-3 rounded-xl border p-4"
                  ><input v-model="curso.certificado" type="checkbox" /><span
                    ><b class="block">Emitir certificado</b
                    ><span class="text-xs text-muted-foreground"
                      >Se genera al cumplir las condiciones.</span
                    ></span
                  ></label
                ><template v-if="curso.certificado"
                  ><div class="grid gap-2 rounded border border-border bg-muted/20 p-4 text-sm">
                    <p class="font-bold">Nombre del certificado</p>
                    <p class="text-muted-foreground">
                      Se usa el nombre del curso:
                      <strong class="text-foreground">{{
                        curso.titulo.trim() || "Completa el nombre en el paso 1"
                      }}</strong>
                    </p>
                  </div>
                  <label class="grid gap-2 text-sm font-bold"
                    >Nota mínima (sobre 20)<Input
                      v-model.number="curso.notaMinima"
                      type="number"
                      min="0"
                      max="20" /></label
                  ><div class="grid gap-3">
                    <p class="text-sm font-bold">Vigencia del certificado</p>
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
                        <p class="text-sm font-black">Firmas del certificado</p>
                      </div>
                      <Button
                        v-if="esGestionOrganizacion"
                        size="sm"
                        variant="outline"
                        @click="modalFirmas = true"
                      >
                        <Plus class="h-4 w-4" />Añadir firma
                      </Button>
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
                          class="h-12 w-28 object-contain bg-white"
                        />
                        <span
                          v-else
                          class="grid h-10 w-10 shrink-0 place-items-center bg-primary/10 text-primary"
                        >
                          <Signature class="h-5 w-5" />
                        </span>
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-black">
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
                          <Trash2 class="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                      <div
                        class="rounded border-2 border-dashed border-border p-4"
                      >
                        <input
                          ref="selectorFirmaPropia"
                          class="hidden"
                          type="file"
                          accept="image/png,image/jpeg"
                          @change="seleccionarFirmaPropia"
                        />
                        <div class="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            :disabled="validandoFirma || subiendoFirmaPropia"
                            @click="selectorFirmaPropia?.click()"
                          >
                            <Upload class="h-4 w-4" />
                            {{
                              validandoFirma
                                ? "Validando requisitos…"
                                : subiendoFirmaPropia
                                  ? "Subiendo…"
                                  : firmaPropiaDocente
                                    ? "Cambiar mi firma"
                                    : "Subir mi firma"
                            }}
                          </Button>
                        </div>

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
                            <p class="text-xs font-bold">
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
                                class="h-3.5 w-3.5 text-emerald-600"
                              />
                              <X
                                v-else-if="chequeo.estado === 'error'"
                                class="h-3.5 w-3.5 text-red-600"
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
                                    ? 'text-red-600'
                                    : 'text-muted-foreground'
                                "
                              >
                                {{ chequeo.mensaje }}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p
                          v-if="errorFirmaPropia"
                          class="mt-3 text-center text-xs font-semibold text-red-600"
                        >
                          {{ errorFirmaPropia }}
                        </p>
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
                            <p class="truncate text-sm font-black">
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
                          class="h-12 w-28 object-contain bg-white"
                        />
                        <span
                          v-else
                          class="grid h-10 w-10 shrink-0 place-items-center bg-primary/10 text-primary"
                        >
                          <Signature class="h-5 w-5" />
                        </span>
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-black">
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
                          <Trash2 class="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  ></template
                >
              </div>
              <div
                class="border bg-linear-to-br from-[#071F52] to-[#0B3A78] p-6 text-center text-white"
              >
                <Award class="mx-auto h-10 w-10 text-amber-300" />
                <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-blue-200">
                  Vista previa
                </p>
                <p class="mt-3 text-xs text-blue-100">
                  {{ curso.titulo.trim() || "Certificado del curso" }}
                </p>
                <strong class="mt-4 block text-xl">
                  {{ curso.titulo.trim() || "Título del curso" }}
                </strong>
                <p class="mt-3 text-xs text-blue-200/70">
                  El nombre de quien apruebe aparecerá al emitirse
                </p>
                <div
                  v-if="curso.firmasCertificado.length"
                  class="mt-7 grid gap-4"
                  :class="curso.firmasCertificado.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
                >
                  <div v-for="firma in curso.firmasCertificado" :key="firma.id">
                    <img
                      v-if="firma.imagen"
                      :src="firma.imagen"
                      :alt="firma.nombre"
                      class="mx-auto h-10 max-w-[7rem] object-contain"
                    />
                    <div class="mx-auto mt-2 h-px w-28 bg-white/50" />
                    <p class="mt-1 text-[10px] font-bold">{{ firma.nombre }}</p>
                    <p v-if="firma.cargo" class="text-[9px] text-blue-100">{{ firma.cargo }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="mt-7">
              <div
                v-if="enviado"
                class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center"
              >
                <CheckCircle2 class="mx-auto h-12 w-12 text-emerald-600" />
                <h3 class="mt-4 text-xl font-black">
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
                    class="flex w-full items-center gap-3 rounded border p-4 text-left transition"
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
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-accent/15 text-[#B87A00] dark:text-accent'
                      "
                      ><Check v-if="item.listo" class="h-4 w-4" /><Lock
                        v-else
                        class="h-4 w-4" /></span
                    ><span class="flex-1 text-sm font-semibold">{{
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
              class="mt-8 flex flex-col gap-3 border-t pt-5"
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
      <div class="grid gap-5">
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
            <p v-if="errorFotoDocente" class="mt-2 text-xs text-red-600">{{ errorFotoDocente }}</p>
            <p class="mt-2 text-xs text-muted-foreground">JPG, PNG o WEBP · máximo 1 MB.</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold">Nombre completo *<Input v-model="docenteManual.nombre" placeholder="Ej. Marco Antonio Ruiz" /></label>
            <label class="grid gap-2 text-sm font-bold">Correo<Input v-model="docenteManual.correo" type="email" placeholder="docente@correo.com" /></label>
            <label class="grid gap-2 text-sm font-bold">Cargo profesional *<Input v-model="docenteManual.cargo" placeholder="Ej. Ingeniero civil" /></label>
            <label class="grid gap-2 text-sm font-bold">Especialidad<Input v-model="docenteManual.especialidad" placeholder="Ej. Gestión de proyectos" /></label>
          </div>
        </div>
        <label class="grid gap-2 text-sm font-bold">
          Presentación profesional *
          <textarea v-model="docenteManual.biografia" rows="4" class="w-full border border-input bg-background px-3 py-2 font-normal outline-none focus:border-primary" placeholder="Resume su trayectoria, enfoque profesional y aporte al curso." />
        </label>
        <div class="grid gap-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold">Experiencia destacada</span>
            <Button type="button" size="sm" variant="ghost" @click="agregarExperienciaDocente"><Plus class="h-4 w-4" />Añadir experiencia</Button>
          </div>
          <div v-for="(_, indice) in docenteManual.experiencia" :key="indice" class="flex gap-2">
            <Input v-model="docenteManual.experiencia[indice]" placeholder="Ej. 12 años dirigiendo proyectos de infraestructura" />
            <Button type="button" size="icon" variant="ghost" title="Quitar experiencia" @click="quitarExperienciaDocente(indice)"><Trash2 class="h-4 w-4 text-red-600" /></Button>
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
      <div class="grid gap-5">
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
            <span class="min-w-0 flex-1 truncate text-sm font-bold">{{ categoria }}</span>
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
              <Trash2 class="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </div>

        <div
          v-if="categoriaPendienteEliminar"
          class="border-l-4 border-l-red-600 bg-red-500/10 p-4"
        >
          <p class="text-sm font-black">
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
            <Check v-if="curso.firmasCertificado.some((item) => item.id === firma.id)" class="h-5 w-5 text-emerald-600" />
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
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"
      @click.self="mostrandoVistaPrevia = false"
    >
      <article
        class="max-h-[90vh] w-full max-w-4xl overflow-auto border border-border bg-card shadow-2xl"
      >
        <div class="relative aspect-[16/7] bg-slate-900">
          <img
            v-if="curso.imagen"
            :src="curso.imagen"
            :alt="curso.titulo"
            class="h-full w-full object-cover opacity-65"
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
            <h3 class="font-black">Lo que aprenderás</h3>
            <ul class="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li
                v-for="(objetivo, indice) in curso.objetivos.filter((item) => item.trim())"
                :key="`${indice}-${objetivo}`"
              >
                ✓ {{ objetivo }}
              </li>
            </ul>
            <template v-if="etiquetasRequisitosVista.length">
              <h3 class="mt-6 font-black">Requisitos</h3>
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
            <p class="font-black">{{ curso.categoria }}</p>
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
            <h3 class="mt-1 text-xl font-black">{{ curso.docenteResponsablePerfil.nombre }}</h3>
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
  color: currentColor !important;
  opacity: 0.38 !important;
}

.constructor-curso :deep(.p-select-label.p-placeholder),
.constructor-curso :deep(.p-multiselect-label.p-placeholder) {
  color: currentColor !important;
  opacity: 0.38 !important;
}

/* Todos los pasos: un color por tipo de control. */
.paso-campos :deep(input:not([type="radio"]):not([type="checkbox"]):not([type="file"])),
.paso-campos :deep(textarea) {
  border-color: #7dd3fc !important;
  background-color: #f0f9ff !important;
}

/* Combos: un solo estilo (filtro-control). Sin tinte índigo aparte. */
.paso-campos :deep(.filtro-control.p-select),
.paso-campos :deep(.filtro-control.p-multiselect) {
  border-color: #cfd9e7 !important;
  background-color: #ffffff !important;
}

.dark .paso-campos :deep(.filtro-control.p-select),
.dark .paso-campos :deep(.filtro-control.p-multiselect) {
  border-color: #273246 !important;
  background-color: #121a28 !important;
}

.paso-campos :deep(button:not(.btn-borrar):not(.btn-opcion)),
.paso-campos :deep(.control-boton) {
  border-color: #6ee7b7 !important;
  background-color: #ecfdf5 !important;
  color: #065f46 !important;
}

.paso-campos :deep(button:not(.btn-borrar):not(.btn-opcion):hover),
.paso-campos :deep(.control-boton:hover) {
  background-color: #d1fae5 !important;
}
</style>
