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
} from "lucide-vue-next";
import { computed, onMounted, reactive, ref } from "vue";
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
} from "@/api/services/docente.service";
import type {
  DocenteResponsableCurso,
  FirmaCertificadoCurso,
} from "@/portal-docente/types/docente.types";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { useAuth } from "@/composables/useAuth";
import {
  organizacionService,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import type { UnidadOrganizacional } from "@/portal-organizacion/types/estructura-organizacional.types";

const router = useRouter();
const route = useRoute();
const { contextoActivo } = useContextoSesion();
const { currentUser, restaurarUsuario } = useAuth();
const paso = ref(1);
const cargando = ref(true);
const guardado = ref(false);
const enviado = ref(false);
const mostrandoVistaPrevia = ref(false);
const errorImagen = ref("");
const selectorImagen = ref<HTMLInputElement | null>(null);
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
const errorMaterial = ref("");
const modalFirmas = ref(false);
const busquedaFirma = ref("");
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
const nombreAmbito = computed(() =>
  esIndependiente.value
    ? "Curso propio · Docencia independiente"
    : `Curso institucional · ${contextoActivo.value?.organizacionNombre}`,
);
const membresiaId = contextoActivo.value?.membresiaId ?? "docente";
const cursoId = computed(() =>
  String(route.params.cursoId ?? route.query.borrador ?? "nuevo"),
);

const valoresIniciales = {
  titulo: "Nuevo curso de formación",
  subtitulo: "",
  descripcion: "",
  publico: "Profesionales y técnicos de obra",
  alcanceDirigido: "UNIDADES" as "TODOS" | "ORGANIZACION" | "UNIDADES",
  unidadesDestinoIds: [] as string[],
  unidadesDestinoNombres: [] as string[],
  objetivos: ["Aplicar los conceptos del curso en situaciones reales de obra"],
  requisitos: ["Conocimientos básicos de gestión de obras"],
  categoria: "Gestión de obras",
  nivel: "Básico",
  imagen: "",
  ambito: esIndependiente.value ? "INDEPENDIENTE" : "ORGANIZACION",
  organizacionId: contextoActivo.value?.organizacionId ?? null,
  acceso: esIndependiente.value ? "PAGO" : "ORGANIZACION",
  precio: esIndependiente.value ? 89 : 0,
  visibilidad: esIndependiente.value ? "PUBLICO" : "ORGANIZACION",
  permiteEmpresas: esIndependiente.value,
  certificado: true,
  nombreCertificado: "Certificado de aprobación",
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
const secciones = ref<BorradorCursoDocente["secciones"]>([
  {
    titulo: "Introducción y fundamentos",
    clases: ["Bienvenida al curso", "Conceptos principales"],
    recursos: [],
  },
  {
    titulo: "Aplicación práctica",
    clases: ["Caso de estudio en obra"],
    recursos: [],
  },
]);
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
      cursoId.value === "nuevo"
        ? null
        : await docenteService.cursos.obtener(cursoId.value);
    const semilla = {
      ...valoresIniciales,
      titulo: cursoExistente?.titulo ?? valoresIniciales.titulo,
      imagen: cursoExistente?.imagen ?? valoresIniciales.imagen,
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
        structuredClone(curso.docenteResponsablePerfil),
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
    curso.alcanceDirigido ??= "UNIDADES";
    curso.unidadesDestinoIds ??= [];
    curso.unidadesDestinoNombres ??= [];
    secciones.value = seccionesGuardadas.map((seccion) => ({
      ...seccion,
      recursos: seccion.recursos ?? [],
    }));
    curso.cargadoPorNombre ||= currentUser.value?.name ?? "Carlos Alberto";
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
  "Define a quién está dirigido y qué logrará.",
  "Organiza secciones, clases y recursos.",
  "Diseña la información que verá el estudiante antes de inscribirse.",
  "Decide quién puede acceder y cómo se comercializa.",
  "Establece las condiciones y datos de certificación.",
  esGestionOrganizacion.value
    ? "Confirma la revisión administrativa y deja el curso aprobado para configurar su publicación."
    : "Comprueba que todo esté listo para la evaluación de Tukuy.",
]);
const pasosVisibles = computed(() =>
  pasos.value
    .map((nombre, indice) => ({ nombre, pasoOriginal: indice + 1 }))
    .filter((item) => item.pasoOriginal !== 4 || esIndependiente.value),
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
    .flatMap((persona) =>
      (["DIGITAL", "ELECTRONICA"] as const).map((tipo) => ({
        id: `${persona.id}-${tipo}`,
        personaId: String(persona.id),
        nombre: persona.nombre,
        cargo: persona.rol || persona.area || "Representante institucional",
        tipo,
      })),
    );
});
const opcionesDocenteResponsable = computed<DocenteResponsableCurso[]>(() => [
  ...docentesEntidad.value.map((docente) => ({
    id: String(docente.id),
    nombre: docente.nombre,
    correo: docente.correo,
    cargo: docente.rol || docente.area || "Docente",
    especialidad: docente.especialidad || docente.area || "",
    foto: "",
    biografia: `${docente.nombre} es especialista en ${docente.especialidad || docente.area || "formación profesional"}.`,
    experiencia: [docente.rol, docente.area].filter(Boolean),
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
const descripcionAlcanceDirigido = computed(
  () =>
    opcionesAlcanceDirigido.find(
      (opcion) => opcion.value === curso.alcanceDirigido,
    )?.descripcion ?? "",
);
const indicePasoVisible = computed(() =>
  pasosVisibles.value.findIndex((item) => item.pasoOriginal === paso.value),
);
const hayPasoSiguiente = computed(
  () => indicePasoVisible.value < pasosVisibles.value.length - 1,
);
const requisitosRevision = computed(() => [
  {
    texto: "Docente responsable identificado",
    listo:
      !esGestionOrganizacion.value ||
      Boolean(curso.docenteResponsableId && curso.docenteResponsableNombre),
  },
  {
    texto: "Información y público objetivo definidos",
    listo:
      (esGestionOrganizacion.value
        ? curso.alcanceDirigido !== "UNIDADES" ||
          curso.unidadesDestinoIds.length > 0
        : !!curso.publico) && curso.objetivos.length > 0,
  },
  {
    texto: "Programa con secciones y clases",
    listo:
      secciones.value.length > 0 &&
      secciones.value.every((s) => s.clases.length > 0),
  },
  {
    texto: "Página de presentación completa",
    listo:
      !!curso.titulo && !!curso.subtitulo && curso.descripcion.length >= 30,
  },
  ...(esIndependiente.value
    ? [
        {
          texto: "Precio y acceso configurados",
          listo:
            curso.acceso === "GRATUITO" ||
            (curso.acceso === "PAGO" && curso.precio > 0),
        },
      ]
    : []),
  {
    texto: "Certificado configurado",
    listo:
      !curso.certificado ||
      (!!curso.nombreCertificado &&
        (!esGestionOrganizacion.value || curso.firmasCertificado.length > 0)),
  },
]);
const listoParaEnviar = computed(() =>
  requisitosRevision.value.every((r) => r.listo),
);

function construirBorrador(): BorradorCursoDocente {
  return {
    ...structuredClone(curso),
    secciones: structuredClone(secciones.value),
  };
}

async function guardar() {
  await docenteService.guardarCursoDesdeBorrador(
    membresiaId,
    cursoId.value,
    construirBorrador(),
  );
  guardado.value = true;
  setTimeout(() => (guardado.value = false), 2000);
}
function agregarObjetivo() {
  curso.objetivos.push("Nuevo objetivo de aprendizaje");
}
function agregarRequisito() {
  curso.requisitos.push("Nuevo requisito");
}
function agregarSeccion() {
  secciones.value.push({
    titulo: "Nueva sección",
    clases: ["Nueva clase"],
    recursos: [],
  });
}

function asignarDocente() {
  const docente = opcionesDocenteResponsable.value.find(
    (item) => item.id === curso.docenteResponsableId,
  );
  curso.docenteResponsableNombre = docente?.nombre ?? "";
  curso.docenteResponsablePerfil = docente
    ? structuredClone(docente)
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
    ...structuredClone(docenteManual),
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
  curso.docenteResponsablePerfil = structuredClone(docente);
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

function seleccionarMaterial(evento: Event) {
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
    "video/mp4",
  ];
  if (!formatos.includes(archivo.type)) {
    errorMaterial.value = "Formato no permitido. Usa PDF, Word, PowerPoint, PNG, JPG o MP4.";
    entrada.value = "";
    return;
  }
  if (archivo.size > 1_500_000) {
    errorMaterial.value = "En la simulación cada archivo debe pesar menos de 1.5 MB.";
    entrada.value = "";
    return;
  }
  const lector = new FileReader();
  lector.onload = () => {
    const seccion = secciones.value[indice];
    if (!seccion) return;
    seccion.recursos ??= [];
    seccion.recursos.push({
      id: `recurso-${Date.now()}`,
      nombre: archivo.name,
      tipo: archivo.type,
      tamanio: archivo.size,
      contenido: String(lector.result ?? ""),
    });
  };
  lector.readAsDataURL(archivo);
  entrada.value = "";
}

function eliminarMaterial(indiceSeccion: number, recursoId: string) {
  const seccion = secciones.value[indiceSeccion];
  if (!seccion?.recursos) return;
  seccion.recursos = seccion.recursos.filter((item) => item.id !== recursoId);
}
function agregarFirma(firma: FirmaCertificadoCurso) {
  if (curso.firmasCertificado.some((item) => item.id === firma.id)) return;
  curso.firmasCertificado.push({ ...firma });
}

function quitarFirma(id: string) {
  curso.firmasCertificado = curso.firmasCertificado.filter(
    (firma) => firma.id !== id,
  );
}

async function enviarRevision() {
  if (!listoParaEnviar.value) return;
  const borrador = construirBorrador();
  if (esGestionOrganizacion.value) {
    const guardado = await docenteService.guardarCursoDesdeBorrador(
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
}
async function siguiente() {
  await guardar();
  const siguientePaso = pasosVisibles.value[indicePasoVisible.value + 1];
  if (siguientePaso) paso.value = siguientePaso.pasoOriginal;
}

function anterior() {
  const pasoAnterior = pasosVisibles.value[indicePasoVisible.value - 1];
  if (pasoAnterior) paso.value = pasoAnterior.pasoOriginal;
}

function seleccionarImagen(evento: Event) {
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  if (!archivo) return;
  errorImagen.value = "";
  if (!archivo.type.startsWith("image/")) {
    errorImagen.value = "Selecciona una imagen JPG, PNG o WebP.";
    return;
  }
  if (archivo.size > 1_500_000) {
    errorImagen.value =
      "La imagen debe pesar menos de 1.5 MB para esta demostración.";
    return;
  }
  const lector = new FileReader();
  lector.onload = () => {
    curso.imagen = String(lector.result ?? "");
  };
  lector.readAsDataURL(archivo);
}
</script>

<template>
  <section class="mx-auto grid max-w-350 gap-6">
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
            <h1 class="text-xl font-black">{{ curso.titulo }}</h1>
            <p class="mt-1 text-xs font-semibold text-muted-foreground">
              {{ nombreAmbito }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="guardado"
            class="text-xs text-emerald-700 dark:text-emerald-400"
            >Cambios guardados</span
          ><Button variant="outline" @click="guardar"
            ><Save class="h-4 w-4" />Guardar borrador</Button
          ><Button class="bg-primary" @click="mostrandoVistaPrevia = true"
            ><Eye class="h-4 w-4" />Vista previa</Button
          >
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
        <Card class="h-fit border-border bg-card"
          ><CardContent class="p-3"
            ><button
              v-for="(item, indice) in pasosVisibles"
              :key="item.pasoOriginal"
              class="flex w-full items-center gap-3 rounded-lg p-3 text-left text-sm font-semibold"
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

        <Card class="border-border bg-card"
          ><CardContent class="p-6 sm:p-8">
            <Badge class="bg-primary/10 text-primary"
              >Paso {{ indicePasoVisible + 1 }} de {{ pasosVisibles.length }}</Badge
            >
            <h2 class="mt-3 text-2xl font-black">{{ titulos[paso - 1] }}</h2>
            <p class="mt-2 text-sm text-muted-foreground">
              {{ descripciones[paso - 1] }}
            </p>

            <div v-if="paso === 1" class="mt-7 grid gap-6">
              <label
                v-if="esGestionOrganizacion"
                class="grid gap-2 text-sm font-bold"
              >
                Docente responsable
                <div class="flex gap-2">
                  <Select
                    v-model="curso.docenteResponsableId"
                    :options="opcionesDocenteResponsable"
                    option-label="nombre"
                    option-value="id"
                    filter
                    class="min-w-0 flex-1 font-normal"
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
                  <Button type="button" variant="outline" @click="abrirNuevoDocente">
                    <Plus class="h-4 w-4" />Añadir docente
                  </Button>
                </div>
              </label>
              <label
                v-if="esGestionOrganizacion"
                class="grid gap-2 text-sm font-bold"
              >
                Categoría
                <div class="flex gap-2">
                  <Select
                    v-model="curso.categoria"
                    :options="categoriasCurso"
                    class="min-w-0 flex-1 font-normal"
                    placeholder="Selecciona una categoría"
                  />
                  <Button type="button" variant="outline" @click="modalCategorias = true">
                    Gestionar
                  </Button>
                </div>
              </label>
              <div
                v-if="esGestionOrganizacion"
                class="grid gap-2 text-sm font-bold"
              >
                Dirigido a
                <Select
                  v-model="curso.alcanceDirigido"
                  :options="opcionesAlcanceDirigido"
                  option-label="label"
                  option-value="value"
                  class="w-full font-normal"
                  placeholder="Selecciona el alcance del curso"
                  @change="actualizarAlcanceDirigido"
                />
                <span class="font-normal text-muted-foreground">
                  {{ descripcionAlcanceDirigido }}
                </span>
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
                    filter
                    display="chip"
                    class="w-full font-normal"
                    placeholder="Selecciona unidades del organigrama"
                    :max-selected-labels="4"
                    selected-items-label="{0} unidades seleccionadas"
                    @change="actualizarUnidadesDestino"
                  />
                  <span class="font-normal text-muted-foreground">
                    Se muestran todos los nodos activos ubicados debajo de Administración.
                  </span>
                </div>
              </div>
              <label v-else class="grid gap-2 text-sm font-bold"
                >Dirigido a<textarea
                  v-model="curso.publico"
                  class="min-h-24 rounded-md border p-3 font-normal"
                />
              </label>
              <div>
                <div class="flex justify-between">
                  <h3 class="font-bold">Objetivos de aprendizaje</h3>
                  <Button size="sm" variant="ghost" @click="agregarObjetivo"
                    ><Plus class="h-4 w-4" />Agregar</Button
                  >
                </div>
                <Input
                  v-for="(_, i) in curso.objetivos"
                  :key="i"
                  v-model="curso.objetivos[i]"
                  class="mt-2"
                />
              </div>
              <div>
                <div class="flex justify-between">
                  <h3 class="font-bold">Requisitos</h3>
                  <Button size="sm" variant="ghost" @click="agregarRequisito"
                    ><Plus class="h-4 w-4" />Agregar</Button
                  >
                </div>
                <Input
                  v-for="(_, i) in curso.requisitos"
                  :key="i"
                  v-model="curso.requisitos[i]"
                  class="mt-2"
                />
              </div>
            </div>

            <div v-else-if="paso === 2" class="mt-7 grid gap-4">
              <input
                ref="selectorMaterial"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.mp4"
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
                  />
                </div>
                <div class="divide-y">
                  <div
                    v-for="(clase, ci) in seccion.clases"
                    :key="ci"
                    class="flex items-center gap-3 p-4"
                  >
                    <component
                      :is="ci === 0 ? Video : FileText"
                      class="h-4 w-4 text-primary"
                    /><Input
                      v-model="seccion.clases[ci]"
                      class="flex-1 border-0 shadow-none"
                    /><Badge variant="outline">{{
                      ci === 0 ? "Video" : "Lectura"
                    }}</Badge>
                  </div>
                  <Button
                    class="m-3"
                    variant="ghost"
                    @click="seccion.clases.push('Nueva clase')"
                    ><Plus class="h-4 w-4" />Agregar clase</Button
                  >
                  <div
                    class="m-3 grid gap-3 border border-amber-300 bg-amber-50 p-4 text-slate-900 sm:grid-cols-[auto_1fr_auto] sm:items-center dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-white"
                  >
                    <span
                      class="grid h-10 w-10 place-items-center bg-[#071F52] text-white"
                    >
                      <FileText class="h-5 w-5" />
                    </span>
                    <div>
                      <p
                        class="text-[10px] font-black uppercase tracking-[.16em] text-[#B87A00] dark:text-amber-300"
                      >
                        Actividad calificable obligatoria
                      </p>
                      <strong class="mt-1 block text-sm">
                        Evidencia aplicada · {{ seccion.titulo }}
                      </strong>
                      <p
                        class="mt-1 text-xs text-slate-600 dark:text-slate-300"
                      >
                        El estudiante entregará un PDF. La nota y las horas
                        aprobadas alimentarán el certificado.
                      </p>
                    </div>
                    <div class="text-left text-xs sm:text-right">
                      <strong class="block">Nota máxima 20</strong>
                      <span class="text-slate-500 dark:text-slate-300">
                        {{ Math.max(2, seccion.clases.length * 2) }} horas
                      </span>
                    </div>
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
                        <Paperclip class="h-4 w-4 shrink-0 text-primary" />
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-bold">{{ recurso.nombre }}</p>
                          <p class="text-[11px] text-muted-foreground">
                            {{ (recurso.tamanio / 1024).toFixed(0) }} KB
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
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
                class="border-dashed"
                @click="agregarSeccion"
                ><Plus class="h-4 w-4" />Agregar sección</Button
              >
            </div>

            <div v-else-if="paso === 3" class="mt-7 grid gap-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="grid gap-2 text-sm font-bold sm:col-span-2"
                  >Título público<Input v-model="curso.titulo" /></label
                ><label class="grid gap-2 text-sm font-bold sm:col-span-2"
                  >Subtítulo<Input
                    v-model="curso.subtitulo"
                    placeholder="Una promesa clara para el estudiante" /></label
                ><label v-if="!esGestionOrganizacion" class="grid gap-2 text-sm font-bold"
                  >Categoría<select
                    v-model="curso.categoria"
                    class="h-10 rounded-md border px-3 font-normal"
                  >
                    <option>Gestión de obras</option>
                    <option>Seguridad</option>
                    <option>Logística</option>
                  </select></label
                ><label class="grid gap-2 text-sm font-bold"
                  >Nivel<select
                    v-model="curso.nivel"
                    class="h-10 rounded-md border px-3 font-normal"
                  >
                    <option>Básico</option>
                    <option>Intermedio</option>
                    <option>Avanzado</option>
                  </select></label
                ><label class="grid gap-2 text-sm font-bold sm:col-span-2"
                  >Descripción<textarea
                    v-model="curso.descripcion"
                    class="min-h-32 rounded-md border p-3 font-normal"
                    placeholder="Mínimo 30 caracteres"
                  />
                </label>
              </div>
              <div
                class="rounded-xl border-2 border-dashed border-blue-200 bg-primary/10/50 p-7 text-center"
              >
                <img
                  v-if="curso.imagen"
                  :src="curso.imagen"
                  alt="Vista previa de la portada"
                  class="mx-auto mb-4 aspect-video max-h-56 w-full object-cover"
                />
                <Image v-else class="mx-auto h-8 w-8 text-primary" />
                <p class="mt-2 font-bold">Imagen de portada</p>
                <p class="text-xs text-muted-foreground">
                  JPG o PNG · proporción 16:9
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
                  @click="selectorImagen?.click()"
                  >Seleccionar imagen</Button
                >
                <p
                  v-if="errorImagen"
                  class="mt-2 text-xs font-semibold text-red-600"
                >
                  {{ errorImagen }}
                </p>
              </div>
            </div>

            <div
              v-else-if="paso === 4 && esIndependiente"
              class="mt-7 grid gap-6"
            >
              <div class="grid gap-3 sm:grid-cols-2">
                <button
                  v-for="tipo in ['GRATUITO', 'PAGO']"
                  :key="tipo"
                  class="rounded-xl border-2 p-5 text-left"
                  :class="
                    curso.acceso === tipo
                      ? 'border-blue-600 bg-primary/10'
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
                  min="1" /></label
              ><label class="grid max-w-sm gap-2 text-sm font-bold"
                >Visibilidad<select
                  v-model="curso.visibilidad"
                  class="h-10 rounded-md border px-3 font-normal"
                >
                  <option value="PUBLICO">Catálogo público</option>
                  <option value="PRIVADO">Solo por invitación</option>
                  <option value="ORGANIZACION">Solo organizaciones</option>
                </select></label
              ><label class="flex items-center gap-3 rounded-xl border p-4"
                ><input v-model="curso.permiteEmpresas" type="checkbox" /><span
                  ><b class="block text-sm">Permitir licencias empresariales</b
                  ><span class="text-xs text-muted-foreground"
                    >Las organizaciones podrán asignarlo a sus equipos.</span
                  ></span
                ></label
              >
            </div>

            <div
              v-else-if="paso === 5"
              class="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]"
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
                  ><label class="grid gap-2 text-sm font-bold"
                    >Nombre del certificado<Input
                      v-model="curso.nombreCertificado" /></label
                  ><label class="grid gap-2 text-sm font-bold"
                    >Nota mínima (sobre 20)<Input
                      v-model.number="curso.notaMinima"
                      type="number"
                      min="0"
                      max="20" /></label
                  ><label class="grid gap-2 text-sm font-bold"
                    >Vigencia en meses<Input
                      v-model.number="curso.vigenciaMeses"
                      type="number"
                      min="0"
                    /><span class="font-normal text-muted-foreground"
                      >0 significa que no vence.</span
                    ></label
                  ><div class="border border-border bg-muted/20 p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p class="text-sm font-black">Firmas del certificado</p>
                        <p class="mt-1 text-xs text-muted-foreground">
                          {{ curso.firmasCertificado.length }}
                          {{ curso.firmasCertificado.length === 1 ? "firma configurada" : "firmas configuradas" }}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" @click="modalFirmas = true">
                        <Plus class="h-4 w-4" />Añadir firma
                      </Button>
                    </div>
                    <div v-if="curso.firmasCertificado.length" class="mt-4 grid gap-2">
                      <div
                        v-for="firma in curso.firmasCertificado"
                        :key="firma.id"
                        class="flex items-center gap-3 border border-border bg-card p-3"
                      >
                        <span class="grid h-10 w-10 shrink-0 place-items-center bg-primary/10 text-primary">
                          <Signature class="h-5 w-5" />
                        </span>
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-black">{{ firma.nombre }}</p>
                          <p class="text-xs text-muted-foreground">
                            {{ firma.cargo }} · Firma {{ firma.tipo === "DIGITAL" ? "digital" : "electrónica" }}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          :aria-label="`Quitar firma de ${firma.nombre}`"
                          @click="quitarFirma(firma.id)"
                        >
                          <Trash2 class="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <p v-else class="mt-4 border-l-4 border-l-amber-500 bg-amber-500/10 p-3 text-xs text-muted-foreground">
                      Agrega al menos una firma institucional para aprobar el curso.
                    </p>
                  </div
                  ></template
                >
              </div>
              <div
                class="rounded-xl border bg-linear-to-br from-[#071F52] to-[#0B3A78] p-6 text-center text-white"
              >
                <Award class="mx-auto h-10 w-10 text-amber-300" />
                <p class="mt-4 text-xs uppercase tracking-widest text-blue-200">
                  Tukuy Academy certifica que
                </p>
                <strong class="mt-4 block text-xl"
                  >Nombre del estudiante</strong
                >
                <p class="mt-3 text-xs text-blue-100">
                  completó satisfactoriamente
                </p>
                <p class="mt-2 font-bold">{{ curso.titulo }}</p>
                <div
                  v-if="curso.firmasCertificado.length"
                  class="mt-7 grid gap-4"
                  :class="curso.firmasCertificado.length > 1 ? 'grid-cols-2' : 'grid-cols-1'"
                >
                  <div v-for="firma in curso.firmasCertificado" :key="firma.id">
                    <Signature class="mx-auto h-7 w-7 text-amber-300" />
                    <div class="mx-auto mt-2 h-px w-28 bg-white/50" />
                    <p class="mt-1 text-[10px] font-bold">{{ firma.nombre }}</p>
                    <p class="text-[9px] text-blue-100">{{ firma.cargo }}</p>
                  </div>
                </div>
                <div class="mx-auto mt-5 h-px w-28 bg-white/40" />
                <p class="mt-2 text-[10px]">Código verificable</p>
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
                  <div
                    v-for="item in requisitosRevision"
                    :key="item.texto"
                    class="flex items-center gap-3 rounded-lg border p-4"
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
                      >{{ item.listo ? "Listo" : "Pendiente" }}</Badge
                    >
                  </div>
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
              class="mt-8 flex justify-between border-t pt-5"
            >
              <Button
                variant="outline"
                :disabled="indicePasoVisible <= 0"
                @click="anterior"
                ><ChevronLeft class="h-4 w-4" />Anterior</Button
              ><Button v-if="hayPasoSiguiente" @click="siguiente"
                >Guardar y continuar<ChevronRight class="h-4 w-4"
              /></Button>
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
          <Button :disabled="!nuevaCategoria.trim()" @click="agregarCategoriaCurso">
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
      v-model:visible="modalFirmas"
      modal
      header="Añadir firma al certificado"
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
        <p class="text-xs text-muted-foreground">
          Cada persona dispone de una firma digital y una firma electrónica. Puedes seleccionar
          ambas cuando el proceso institucional lo requiera.
        </p>
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
              <small class="text-muted-foreground">{{ firma.cargo }}</small>
            </span>
            <Badge :class="firma.tipo === 'DIGITAL' ? 'bg-primary text-white' : 'bg-amber-500 text-slate-950'">
              Firma {{ firma.tipo === "DIGITAL" ? "digital" : "electrónica" }}
            </Badge>
            <Check v-if="curso.firmasCertificado.some((item) => item.id === firma.id)" class="h-5 w-5 text-emerald-600" />
            <Plus v-else class="h-5 w-5 text-primary" />
          </button>
          <p v-if="!firmasDisponibles.length" class="py-8 text-center text-sm text-muted-foreground">
            No encontramos firmas disponibles con esa búsqueda.
          </p>
        </div>
      </div>
      <template #footer>
        <Button @click="modalFirmas = false">
          Listo · {{ curso.firmasCertificado.length }} firmas
        </Button>
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
            <p class="mt-3 max-w-2xl text-sm text-slate-200">
              {{
                curso.subtitulo ||
                "Agrega un subtítulo para presentar el valor del curso."
              }}
            </p>
          </div>
        </div>
        <div class="grid gap-6 p-7 sm:grid-cols-[1fr_260px]">
          <div>
            <h3 class="font-black">Lo que aprenderás</h3>
            <ul class="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li v-for="objetivo in curso.objetivos" :key="objetivo">
                ✓ {{ objetivo }}
              </li>
            </ul>
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
  </section>
</template>
