<script setup lang="ts">
import {
  BookOpenCheck,
  Building2,
  GitBranch,
  LayoutDashboard,
  ListTree,
  Plus,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserPlus,
  UsersRound,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import ToggleSwitch from "primevue/toggleswitch";
import TreeTable from "primevue/treetable";
import { computed, onMounted, reactive, ref, watch } from "vue";

import {
  organizacionService,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { cursosService } from "@/api/services/cursos.service";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import IconoAyuda from "@/components/shared/IconoAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import { useContextoSesion } from "@/composables/useContextoSesion";
import OrganigramaOrganizacion from "@/portal-organizacion/components/OrganigramaOrganizacion.vue";
import type { NodoOrganigramaEntidad } from "@/portal-organizacion/components/NodoOrganigrama.vue";
import type {
  EstructuraOrganizacional,
  NivelOrganizacional,
  PerfilEntidad,
  PoliticaIncorporacionUnidad,
  ReglaAccesoCursoEntidad,
  TipoUnidadEntidad,
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";
import type { Course } from "@/types/academia";

type Seccion =
  | "estructura"
  | "perfiles"
  | "acceso-cursos";
type NodoTablaEstructura = {
  key: string;
  data: UnidadOrganizacional & { numeracion: string };
  children: NodoTablaEstructura[];
};

const cargando = ref(true);
const { contextoActivo, membresias, tienePermiso } = useContextoSesion();
const logoEntidad = computed(
  () =>
    membresias.value.find(
      (membresia) => membresia.id === contextoActivo.value?.membresiaId,
    )?.organizacion?.logo ?? "",
);
const nombreEntidad = computed(
  () =>
    contextoActivo.value?.organizacionNombre ??
    "COLEGIO DE INGENIEROS CUSCO",
);
const guardando = ref(false);
const eliminando = ref(false);
const seccion = ref<Seccion>("estructura");
const vistaEstructura = ref<"ORGANIGRAMA" | "TABLA">("ORGANIGRAMA");
const nodosTablaExpandidos = ref<Record<string, boolean>>({});
const mensaje = ref("");
const modalUnidad = ref(false);
const modalEliminarUnidad = ref(false);
const unidadEditandoId = ref<string | null>(null);
const tipoCreacionUnidad = ref<"SUBNIVEL" | "MISMO_NIVEL" | "LIBRE">("LIBRE");
const unidadReferenciaId = ref<string | null>(null);
const ladoInsercion = ref<"IZQUIERDA" | "DERECHA" | null>(null);
const modalTipo = ref(false);
const modalEstructura = ref(false);
const modalNivel = ref(false);
const creandoTipoDesdeUnidad = ref(false);
const modalPerfil = ref(false);
const modalReglaCurso = ref(false);
const unidades = ref<UnidadOrganizacional[]>([]);
const estructuras = ref<EstructuraOrganizacional[]>([]);
const niveles = ref<NivelOrganizacional[]>([]);
const estructuraSeleccionadaId = ref("");
const tiposUnidad = ref<TipoUnidadEntidad[]>([]);
const politicas = ref<PoliticaIncorporacionUnidad[]>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const perfiles = ref<PerfilEntidad[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const reglasAccesoCursos = ref<ReglaAccesoCursoEntidad[]>([]);
const cursosDisponibles = ref<Course[]>([]);
const requiereDniEnrolamiento = ref(true);

const formularioUnidad = reactive({
  nombre: "",
  descripcion: "",
  codigo: "",
  tipoUnidadId: "",
  estructuraId: "",
  nivelId: "",
  unidadPadreId: "",
  responsableUsuarioId: "",
  politicaIncorporacionId: "",
  permiteSubunidades: true,
});
// Estado del buscador de responsable por DNI
const busquedaDni = ref("");
const busquedaResultados = computed(() => {
  const q = busquedaDni.value.trim().toLowerCase();
  if (!q) return [];
  return usuarios.value
    .filter(
      (u) =>
        u.dni?.toLowerCase().includes(q) ||
        u.nombre?.toLowerCase().includes(q),
    )
    .slice(0, 8);
});
const responsableSeleccionado = computed(() =>
  usuariosPorId.value.get(formularioUnidad.responsableUsuarioId),
);
function seleccionarResponsable(usuario: UsuarioOrganizacion) {
  formularioUnidad.responsableUsuarioId = String(usuario.id);
  busquedaDni.value = "";
}
function limpiarResponsable() {
  formularioUnidad.responsableUsuarioId = "";
  busquedaDni.value = "";
}
const formularioEstructura = reactive({
  nombre: "",
  descripcion: "",
  tipo: "FUNCIONAL" as EstructuraOrganizacional["tipo"],
  modoJerarquia: "FLEXIBLE" as EstructuraOrganizacional["modoJerarquia"],
});
const formularioNivel = reactive({ nombre: "" });
const formularioTipo = reactive({
  nombre: "",
  descripcion: "",
});
const formularioPerfil = reactive({
  nombre: "",
  descripcion: "",
  plantilla: "SUPERVISION" as PerfilEntidad["plantilla"],
});
const formularioReglaCurso = reactive({
  cursoId: "",
  publico: "TODA_LA_ENTIDAD" as ReglaAccesoCursoEntidad["publico"],
  publicoIds: [] as string[],
  incluirDescendientes: true,
  modalidad: "LIBRE" as ReglaAccesoCursoEntidad["modalidad"],
  cupo: null as number | null,
});

const secciones = [
  { id: "estructura" as const, nombre: "Estructura", icono: GitBranch },
  { id: "perfiles" as const, nombre: "Perfiles y permisos", icono: ShieldCheck },
  { id: "acceso-cursos" as const, nombre: "Acceso a cursos", icono: BookOpenCheck },
];
const opcionesPublicoCurso = [
  { label: "Toda la entidad", value: "TODA_LA_ENTIDAD" },
  { label: "Nodos seleccionados", value: "UNIDADES" },
  { label: "Especialidades", value: "ESPECIALIDADES" },
  { label: "Perfiles institucionales", value: "PERFILES" },
];
const opcionesModalidadCurso = [
  { label: "Matrícula libre", value: "LIBRE" },
  { label: "Con aprobación", value: "CON_APROBACION" },
  { label: "Solo por asignación", value: "SOLO_ASIGNACION" },
  { label: "Solo por invitación", value: "INVITACION" },
];
const opcionesPlantilla = [
  { label: "Gestión", value: "GESTION" },
  { label: "Supervisión", value: "SUPERVISION" },
  { label: "Docencia", value: "DOCENCIA" },
  { label: "Aprendizaje", value: "APRENDIZAJE" },
  { label: "Personalizado", value: "PERSONALIZADO" },
];
const permisosPorPlantilla: Record<string, string[]> = {
  GESTION: [
    "cursos.ver",
    "cursos.aprobar",
    "categorias.ver",
    "categorias.gestionar",
    "asignaciones.crear",
    "certificados.emitir",
    "reportes.ver",
  ],
  SUPERVISION: ["alumnos.ver", "asignaciones.ver", "reportes.ver"],
  DOCENCIA: ["cursos.ver", "cursos.crear", "alumnos.ver", "evaluaciones.calificar"],
  APRENDIZAJE: ["cursos.ver", "aprendizaje.consumir", "certificados.ver"],
  PERSONALIZADO: ["cursos.ver"],
};

onMounted(cargar);

async function cargar() {
  try {
    await organizacionService.estructura.normalizarJerarquia();
    [
      estructuras.value,
      niveles.value,
      unidades.value,
      tiposUnidad.value,
      politicas.value,
      vinculaciones.value,
      perfiles.value,
      usuarios.value,
      reglasAccesoCursos.value,
      cursosDisponibles.value,
    ] = await Promise.all([
      organizacionService.estructura.estructuras.listar(),
      organizacionService.estructura.niveles.listar(),
      organizacionService.estructura.unidades.listar(),
      organizacionService.estructura.tiposUnidad.listar(),
      organizacionService.estructura.politicasIncorporacion.listar(),
      organizacionService.estructura.vinculaciones.listar(),
      organizacionService.estructura.perfiles.listar(),
      organizacionService.usuarios.listar(),
      organizacionService.estructura.reglasAccesoCursos.listar(),
      cursosService.getAll(),
    ]);
    const configuracion = await organizacionService.obtenerConfiguracion();
    requiereDniEnrolamiento.value = configuracion.requiereDniEnrolamiento;
    const guardadaId = localStorage.getItem("tukuy_demo_organizacion_estructura_seleccionada");
    if (guardadaId && estructuras.value.some((e) => e.id === guardadaId && !e.esSistema)) {
      estructuraSeleccionadaId.value = guardadaId;
    } else {
      estructuraSeleccionadaId.value =
        estructuras.value.find((item) => !item.esSistema && item.estado === "ACTIVA")?.id ?? "";
    }
  } finally {
    cargando.value = false;
  }
}

watch(estructuraSeleccionadaId, (nuevoId) => {
  if (nuevoId) {
    localStorage.setItem("tukuy_demo_organizacion_estructura_seleccionada", nuevoId);
  }
});

const usuariosPorId = computed(
  () => new Map(usuarios.value.map((usuario) => [String(usuario.id), usuario])),
);
const unidadesPorId = computed(
  () => new Map(unidades.value.map((unidad) => [unidad.id, unidad])),
);
const estructurasConfigurables = computed(() =>
  estructuras.value.filter((item) => !item.esSistema && item.estado === "ACTIVA"),
);
const estructuraSeleccionada = computed(() =>
  estructuras.value.find((item) => item.id === estructuraSeleccionadaId.value),
);
const nivelesEstructura = computed(() =>
  niveles.value
    .filter(
      (item) =>
        item.estructuraId === estructuraSeleccionadaId.value && item.estado === "ACTIVO",
    )
    .sort((a, b) => a.orden - b.orden),
);
const unidadesGobierno = computed(() =>
  unidades.value.filter((item) => item.esSistema),
);
const unidadesEstructura = computed(() =>
  unidades.value.filter(
    (item) => item.estructuraId === estructuraSeleccionadaId.value && !item.esSistema,
  ),
);
const unidadEditando = computed(() =>
  unidadEditandoId.value
    ? unidadesPorId.value.get(unidadEditandoId.value)
    : undefined,
);
const unidadEditandoTieneHijos = computed(() =>
  unidadEditandoId.value
    ? unidades.value.some(
        (unidad) => unidad.unidadPadreId === unidadEditandoId.value,
      )
    : false,
);
const esUnidadGobierno = computed(() =>
  Boolean(unidadEditando.value?.esSistema),
);
const puedeSolicitarEliminarUnidad = computed(
  () =>
    Boolean(unidadEditandoId.value) &&
    !esUnidadGobierno.value &&
    puedeEditarUnidad(unidadEditandoId.value ?? ""),
);
const puedeEliminarUnidad = computed(
  () =>
    puedeSolicitarEliminarUnidad.value && !unidadEditandoTieneHijos.value,
);
const impactoEliminacion = computed(() => {
  if (!unidadEditandoId.value) {
    return { subunidades: 0, personas: 0, vinculaciones: 0, reglas: 0 };
  }
  const ids = idsUnidadYDescendientes(unidadEditandoId.value);
  const relaciones = vinculaciones.value.filter((item) => ids.has(item.unidadId));
  return {
    subunidades: Math.max(0, ids.size - 1),
    personas: new Set(relaciones.map((item) => item.usuarioId)).size,
    vinculaciones: relaciones.length,
    reglas: reglasAccesoCursos.value.filter(
      (item) =>
        item.publico === "UNIDADES" && item.publicoIds.some((id) => ids.has(id)),
    ).length,
  };
});
const unidadesPadreDisponibles = computed(() => {
  const excluidas = unidadEditandoId.value
    ? idsUnidadYDescendientes(unidadEditandoId.value)
    : new Set<string>();
  return unidadesEstructura.value.filter(
    (unidad) =>
      !excluidas.has(unidad.id) && puedeCrearEnUnidad(unidad.id),
  );
});
const tituloModalUnidad = computed(() => {
  if (unidadEditandoId.value) {
    return `Editar ${unidadEditando.value?.nombre ?? "nodo"}`;
  }
  const padre = unidadesPorId.value.get(formularioUnidad.unidadPadreId);
  const referencia = unidadReferenciaId.value
    ? unidadesPorId.value.get(unidadReferenciaId.value)
    : undefined;
  if (tipoCreacionUnidad.value === "MISMO_NIVEL" && referencia) {
    return `Nuevo nodo a la ${
      ladoInsercion.value === "IZQUIERDA" ? "izquierda" : "derecha"
    } de ${referencia.nombre}`;
  }
  return padre
    ? `Nuevo nodo descendiente de ${padre.nombre}`
    : "Nuevo nodo organizacional";
});
const tiposPorId = computed(
  () => new Map(tiposUnidad.value.map((tipo) => [tipo.id, tipo])),
);
const tiposUnidadPersonalizables = computed(() =>
  tiposUnidad.value.filter(
    (tipo) =>
      !["dirección", "direccion", "administración", "administracion"].includes(
        tipo.nombreSingular.trim().toLocaleLowerCase("es"),
      ),
  ),
);
const OPCION_NUEVO_TIPO = "__AGREGAR_NUEVO_TIPO__";
const opcionesTipoUnidadFormulario = computed(() => {
  if (esUnidadGobierno.value) return tiposUnidad.value;

  const idsPermitidos = new Set<string>();
  const unidadActual = unidadEditando.value;
  if (unidadActual) idsPermitidos.add(unidadActual.tipoUnidadId);

  const padreId = formularioUnidad.unidadPadreId || null;
  const padre = padreId ? unidadesPorId.value.get(padreId) : undefined;
  if (padre && !esUnidadGobiernoPorId(padre.id)) {
    idsPermitidos.add(padre.tipoUnidadId);
  }

  const heredados = tiposUnidadPersonalizables.value.filter((tipo) =>
    idsPermitidos.has(tipo.id),
  );
  return [
    ...(padre ? heredados : tiposUnidadPersonalizables.value),
    {
      id: OPCION_NUEVO_TIPO,
      nombreSingular: "+ Agregar nuevo tipo",
      nombrePlural: "Agregar nuevos tipos",
      descripcion: "Crear un tipo propio para esta rama",
      color: "#0B3A78",
      permiteSubunidades: true,
      estado: "ACTIVO" as const,
    },
  ];
});
const politicasPorId = computed(
  () => new Map(politicas.value.map((politica) => [politica.id, politica])),
);
const especialidades = computed(() =>
  [...new Set(usuarios.value.map((usuario) => usuario.especialidad).filter(Boolean))]
    .sort()
    .map((nombre) => ({ id: nombre as string, nombre: nombre as string })),
);
const opcionesDestinoRegla = computed(() => {
  if (formularioReglaCurso.publico === "UNIDADES") return unidades.value;
  if (formularioReglaCurso.publico === "ESPECIALIDADES") return especialidades.value;
  if (formularioReglaCurso.publico === "PERFILES") return perfiles.value;
  return [];
});

const nodosTablaEstructura = computed<NodoTablaEstructura[]>(() =>
  construirNodosTabla(null),
);
const nodosOrganigrama = computed<NodoOrganigramaEntidad[]>(() =>
  construirNodosOrganigrama(null),
);
const vinculacionesActivas = computed(() =>
  vinculaciones.value.filter((item) => item.estado === "ACTIVA"),
);
const solicitudesPendientes = computed(() =>
  vinculaciones.value.filter((item) => item.estado === "PENDIENTE"),
);
const usuariosVinculados = computed(
  () => new Set(vinculacionesActivas.value.map((item) => item.usuarioId)).size,
);

const esPerfilDireccion = computed(
  () =>
    contextoActivo.value?.rol === "ORGANIZATION_OWNER" ||
    tienePermiso("entidad.gobernar"),
);
const esPerfilAdministracion = computed(
  () =>
    contextoActivo.value?.rol === "ORGANIZATION_ADMIN" ||
    tienePermiso("estructura.administrar") ||
    tienePermiso("equipos.administrar"),
);
const puedeGestionarEstructura = computed(
  () => esPerfilDireccion.value || esPerfilAdministracion.value,
);

function idsUnidadYDescendientes(unidadId: string) {
  const ids = new Set([unidadId]);
  let cambio = true;
  while (cambio) {
    cambio = false;
    unidades.value.forEach((unidad) => {
      if (unidad.unidadPadreId && ids.has(unidad.unidadPadreId) && !ids.has(unidad.id)) {
        ids.add(unidad.id);
        cambio = true;
      }
    });
  }
  return ids;
}

function cantidadMiembros(unidadId: string, descendientes = false) {
  const ids = descendientes
    ? idsUnidadYDescendientes(unidadId)
    : new Set([unidadId]);
  return new Set(
    vinculacionesActivas.value
      .filter((item) => ids.has(item.unidadId))
      .map((item) => item.usuarioId),
  ).size;
}

function puedeEditarUnidad(unidadId: string) {
  if (esPerfilDireccion.value) return true;
  if (!esPerfilAdministracion.value) return false;
  return !esUnidadGobiernoPorId(unidadId);
}

function esUnidadGobiernoPorId(unidadId: string) {
  return Boolean(unidadesPorId.value.get(unidadId)?.esSistema);
}

function puedeCrearEnUnidad(unidadId: string) {
  return puedeGestionarEstructura.value && !esUnidadGobiernoPorId(unidadId);
}

function unidadPermiteSubunidades(unidad: UnidadOrganizacional) {
  return (
    unidad.permiteSubunidades ??
    tiposPorId.value.get(unidad.tipoUnidadId)?.permiteSubunidades ??
    true
  );
}

function puedeCrearAlMismoNivel(unidad: UnidadOrganizacional) {
  if (!unidad.unidadPadreId) return puedeGestionarEstructura.value;
  if (!puedeCrearEnUnidad(unidad.unidadPadreId)) return false;
  const padre = unidadesPorId.value.get(unidad.unidadPadreId);
  return padre ? unidadPermiteSubunidades(padre) : false;
}

function construirNodosOrganigrama(
  padreId: string | null,
): NodoOrganigramaEntidad[] {
  const hermanas = unidadesEstructura.value
    .filter(
      (unidad) =>
        unidad.unidadPadreId === padreId && unidad.estado === "ACTIVA",
    )
    .sort((a, b) => a.orden - b.orden);
  return hermanas.map((unidad) => {
      const tipo = tiposPorId.value.get(unidad.tipoUnidadId);
      const responsable = usuariosPorId.value.get(
        unidad.responsableUsuarioId ?? "",
      );
      return {
        id: unidad.id,
        nombre: unidad.nombre,
        codigo: unidad.codigo,
        tipo: tipo?.nombreSingular ?? "Nodo",
        nivel: niveles.value.find((item) => item.id === unidad.nivelId)?.nombre,
        numeroNivel: niveles.value.find((item) => item.id === unidad.nivelId)?.orden,
        responsable: responsable?.nombre || "Sin responsable",
        responsableIniciales: responsable?.iniciales,
        miembros: cantidadMiembros(unidad.id, true),
        color: tipo?.color ?? "#0B3A78",
        permiteSubunidades: unidadPermiteSubunidades(unidad),
        editable: puedeEditarUnidad(unidad.id),
        puedeAgregarSubunidad: puedeCrearEnUnidad(unidad.id),
        puedeAgregarMismoNivel: puedeCrearAlMismoNivel(unidad),
        hijos: construirNodosOrganigrama(unidad.id),
      };
    });
}

function construirNodosTabla(
  padreId: string | null,
  prefijo = "",
): NodoTablaEstructura[] {
  return unidadesEstructura.value
    .filter(
      (unidad) =>
        unidad.unidadPadreId === padreId && unidad.estado === "ACTIVA",
    )
    .sort((a, b) => a.orden - b.orden)
    .map((unidad, indice) => {
      const numeracion = prefijo ? `${prefijo}.${indice + 1}` : `${indice + 1}`;
      return {
        key: unidad.id,
        data: { ...unidad, numeracion },
        children: construirNodosTabla(unidad.id, numeracion),
      };
    });
}

function alternarNodoTabla(id: string) {
  nodosTablaExpandidos.value = {
    ...nodosTablaExpandidos.value,
    [id]: !nodosTablaExpandidos.value[id],
  };
}

function tipoHeredadoDelPadre(padreId?: string | null) {
  if (!padreId || esUnidadGobiernoPorId(padreId)) return "";
  return unidadesPorId.value.get(padreId)?.tipoUnidadId ?? "";
}

async function obtenerOAsegurarNivel(estructuraId: string, ordenDeseado: number): Promise<string> {
  const lista = niveles.value
    .filter((item) => item.estructuraId === estructuraId && item.estado === "ACTIVO")
    .sort((a, b) => a.orden - b.orden);
  const existente = lista.find((item) => item.orden === ordenDeseado);
  if (existente) return existente.id;

  const nuevo = await organizacionService.estructura.niveles.crear({
    id: `nivel-${Date.now()}-${ordenDeseado}`,
    estructuraId,
    nombre: `Nivel ${ordenDeseado}`,
    orden: ordenDeseado,
    estado: "ACTIVO",
  });
  niveles.value.push(nuevo);
  return nuevo.id;
}

async function abrirUnidad() {
  if (!puedeGestionarEstructura.value || !estructuraSeleccionadaId.value) return;
  unidadEditandoId.value = null;
  tipoCreacionUnidad.value = "LIBRE";
  unidadReferenciaId.value = null;
  ladoInsercion.value = null;
  busquedaDni.value = "";
  const nivel1Id = await obtenerOAsegurarNivel(estructuraSeleccionadaId.value, 1);
  Object.assign(formularioUnidad, {
    nombre: "",
    descripcion: "",
    codigo: "",
    tipoUnidadId: "",
    estructuraId: estructuraSeleccionadaId.value,
    nivelId: nivel1Id,
    unidadPadreId: "",
    responsableUsuarioId: "",
    politicaIncorporacionId: politicas.value[0]?.id ?? "",
    permiteSubunidades: true,
  });
  modalUnidad.value = true;
}

function abrirEditarUnidad(nodo: NodoOrganigramaEntidad) {
  const unidad = unidadesPorId.value.get(nodo.id);
  if (!unidad || !puedeEditarUnidad(unidad.id)) return;
  unidadEditandoId.value = unidad.id;
  tipoCreacionUnidad.value = "LIBRE";
  unidadReferenciaId.value = null;
  ladoInsercion.value = null;
  busquedaDni.value = "";
  Object.assign(formularioUnidad, {
    nombre: unidad.nombre,
    descripcion: unidad.descripcion ?? "",
    codigo: unidad.codigo ?? "",
    tipoUnidadId: unidad.tipoUnidadId,
    estructuraId: unidad.estructuraId ?? "",
    nivelId: unidad.nivelId ?? "",
    unidadPadreId: unidad.unidadPadreId ?? "",
    responsableUsuarioId: unidad.responsableUsuarioId ?? "",
    politicaIncorporacionId: unidad.politicaIncorporacionId ?? "",
    permiteSubunidades: unidadPermiteSubunidades(unidad),
  });
  modalUnidad.value = true;
}

function abrirEditarUnidadPorId(id: string) {
  abrirEditarUnidad({ id } as NodoOrganigramaEntidad);
}

function abrirConfirmacionEliminar() {
  if (!puedeEliminarUnidad.value) {
    if (unidadEditandoTieneHijos.value) {
      mensaje.value =
        "No se puede eliminar un nodo que contiene descendientes. Elimina primero los nodos del último nivel.";
    }
    return;
  }
  modalEliminarUnidad.value = true;
}

async function eliminarUnidad() {
  const id = unidadEditandoId.value;
  if (!id || !puedeEliminarUnidad.value) return;
  eliminando.value = true;
  try {
    const resultado =
      await organizacionService.estructura.eliminarUnidadConDependencias(id);
    [unidades.value, vinculaciones.value, usuarios.value, reglasAccesoCursos.value] =
      await Promise.all([
        organizacionService.estructura.unidades.listar(),
        organizacionService.estructura.vinculaciones.listar(),
        organizacionService.usuarios.listar(),
        organizacionService.estructura.reglasAccesoCursos.listar(),
      ]);
    modalEliminarUnidad.value = false;
    modalUnidad.value = false;
    unidadEditandoId.value = null;
    mensaje.value = `${resultado.unidadesEliminadas} ${
      resultado.unidadesEliminadas === 1 ? "nodo fue eliminado" : "nodos fueron eliminados"
    }. Se limpiaron ${resultado.vinculacionesEliminadas} vinculaciones y se actualizaron ${resultado.reglasAccesoActualizadas} reglas de acceso.`;
  } catch (error) {
    mensaje.value =
      error instanceof Error
        ? error.message
        : "No fue posible eliminar el nodo seleccionado.";
  } finally {
    eliminando.value = false;
  }
}

async function abrirCrearSubunidad(nodo: NodoOrganigramaEntidad) {
  const padre = unidadesPorId.value.get(nodo.id);
  if (!padre || !puedeCrearEnUnidad(padre.id)) return;
  if (!unidadPermiteSubunidades(padre)) return;
  unidadEditandoId.value = null;
  tipoCreacionUnidad.value = "SUBNIVEL";
  unidadReferenciaId.value = padre.id;
  ladoInsercion.value = null;

  const estId = padre.estructuraId ?? estructuraSeleccionadaId.value;
  const ordenPadre = niveles.value.find((item) => item.id === padre.nivelId)?.orden ?? 1;
  const subNivelId = await obtenerOAsegurarNivel(estId, ordenPadre + 1);

  Object.assign(formularioUnidad, {
    nombre: "",
    descripcion: "",
    codigo: "",
    tipoUnidadId: tipoHeredadoDelPadre(padre.id),
    estructuraId: estId,
    nivelId: subNivelId,
    unidadPadreId: padre.id,
    responsableUsuarioId: "",
    politicaIncorporacionId: politicas.value[0]?.id ?? "",
    permiteSubunidades: true,
  });
  modalUnidad.value = true;
}

async function abrirCrearMismoNivel(
  nodo: NodoOrganigramaEntidad,
  lado: "IZQUIERDA" | "DERECHA",
) {
  const referencia = unidadesPorId.value.get(nodo.id);
  if (!referencia || !puedeCrearAlMismoNivel(referencia)) return;
  unidadEditandoId.value = null;
  tipoCreacionUnidad.value = "MISMO_NIVEL";
  unidadReferenciaId.value = referencia.id;
  ladoInsercion.value = lado;

  const estId = referencia.estructuraId ?? estructuraSeleccionadaId.value;
  const ordenRef = niveles.value.find((item) => item.id === referencia.nivelId)?.orden ?? 1;
  const nivelId = referencia.nivelId || (await obtenerOAsegurarNivel(estId, ordenRef));

  Object.assign(formularioUnidad, {
    nombre: "",
    descripcion: "",
    codigo: "",
    tipoUnidadId: tipoHeredadoDelPadre(referencia.unidadPadreId),
    estructuraId: estId,
    nivelId: nivelId,
    unidadPadreId: referencia.unidadPadreId ?? "",
    responsableUsuarioId: "",
    politicaIncorporacionId: politicas.value[0]?.id ?? "",
    permiteSubunidades: true,
  });
  modalUnidad.value = true;
}

async function guardarUnidad() {
  if (!formularioUnidad.nombre.trim()) return;
  if (!formularioUnidad.estructuraId) {
    formularioUnidad.estructuraId = estructuraSeleccionadaId.value;
  }
  if (!formularioUnidad.nivelId && formularioUnidad.estructuraId) {
    let ordenDeseado = 1;
    if (formularioUnidad.unidadPadreId) {
      const p = unidadesPorId.value.get(formularioUnidad.unidadPadreId);
      const pOrden = niveles.value.find((n) => n.id === p?.nivelId)?.orden ?? 1;
      ordenDeseado = pOrden + 1;
    }
    formularioUnidad.nivelId = await obtenerOAsegurarNivel(formularioUnidad.estructuraId, ordenDeseado);
  }
  if (!formularioUnidad.tipoUnidadId) {
    formularioUnidad.tipoUnidadId = tiposUnidad.value[0]?.id ?? "";
  }
  if (formularioUnidad.tipoUnidadId === OPCION_NUEVO_TIPO) {
    abrirModalTipo(true);
    return;
  }
  guardando.value = true;
  try {
    if (unidadEditandoId.value) {
      if (!puedeEditarUnidad(unidadEditandoId.value)) return;
      if (unidadEditandoTieneHijos.value && !formularioUnidad.permiteSubunidades) {
        mensaje.value =
          "No puedes convertir este nodo en terminal mientras conserve nodos descendientes activos.";
        return;
      }
      const cambios: Partial<UnidadOrganizacional> = {
        descripcion: formularioUnidad.descripcion.trim() || undefined,
        codigo: formularioUnidad.codigo.trim() || undefined,
        responsableUsuarioId: formularioUnidad.responsableUsuarioId || undefined,
        politicaIncorporacionId: formularioUnidad.politicaIncorporacionId || undefined,
        permiteSubunidades: formularioUnidad.permiteSubunidades,
      };
      if (!esUnidadGobierno.value) {
        cambios.nombre = formularioUnidad.nombre.trim();
        cambios.tipoUnidadId = formularioUnidad.tipoUnidadId;
        cambios.estructuraId = formularioUnidad.estructuraId;
        cambios.nivelId = formularioUnidad.nivelId;
        cambios.unidadPadreId = formularioUnidad.unidadPadreId || null;
      }
      const actualizada = await organizacionService.estructura.unidades.actualizar(
        unidadEditandoId.value,
        cambios,
      );
      const indice = unidades.value.findIndex((item) => item.id === actualizada.id);
      if (indice >= 0) unidades.value[indice] = actualizada;
      modalUnidad.value = false;
      mensaje.value = "Los cambios del nodo se guardaron en la estructura.";
      return;
    }

    const referenciaCreacion = unidadReferenciaId.value
      ? unidadesPorId.value.get(unidadReferenciaId.value)
      : undefined;
    const unidadPadreIdDestino =
      tipoCreacionUnidad.value === "SUBNIVEL"
        ? referenciaCreacion?.id
        : tipoCreacionUnidad.value === "MISMO_NIVEL"
          ? referenciaCreacion?.unidadPadreId
          : formularioUnidad.unidadPadreId;

    if (unidadPadreIdDestino && !puedeCrearEnUnidad(unidadPadreIdDestino)) {
      mensaje.value = "No puedes crear nodos dentro de una función protegida.";
      return;
    }

    const hermanas = unidadesEstructura.value
      .filter(
        (unidad) =>
          unidad.unidadPadreId === (unidadPadreIdDestino || null),
      )
      .sort((a, b) => a.orden - b.orden);
    let indiceInsercion = hermanas.length;
    if (tipoCreacionUnidad.value === "MISMO_NIVEL" && unidadReferenciaId.value) {
      const indiceReferencia = hermanas.findIndex(
        (hermana) => hermana.id === unidadReferenciaId.value,
      );
      if (indiceReferencia >= 0) {
        indiceInsercion =
          indiceReferencia + (ladoInsercion.value === "DERECHA" ? 1 : 0);
      }
    }
    const hermanasDesplazadas = hermanas.slice(indiceInsercion);
    if (hermanasDesplazadas.length) {
      const actualizadas = await Promise.all(
        hermanasDesplazadas.map((hermana, indice) =>
          organizacionService.estructura.unidades.actualizar(hermana.id, {
            orden: indiceInsercion + indice + 2,
          }),
        ),
      );
      actualizadas.forEach((actualizada) => {
        const indice = unidades.value.findIndex(
          (item) => item.id === actualizada.id,
        );
        if (indice >= 0) unidades.value[indice] = actualizada;
      });
    }
    const creada = await organizacionService.estructura.unidades.crear({
      id: `unidad-${Date.now()}`,
      nombre: formularioUnidad.nombre.trim(),
      descripcion: formularioUnidad.descripcion.trim() || undefined,
      codigo: formularioUnidad.codigo.trim() || undefined,
      tipoUnidadId: formularioUnidad.tipoUnidadId,
      estructuraId: formularioUnidad.estructuraId,
      nivelId: formularioUnidad.nivelId,
      unidadPadreId: unidadPadreIdDestino || null,
      responsableUsuarioId: formularioUnidad.responsableUsuarioId || undefined,
      politicaIncorporacionId: formularioUnidad.politicaIncorporacionId || undefined,
      permiteSubunidades: formularioUnidad.permiteSubunidades,
      orden: indiceInsercion + 1,
      estado: "ACTIVA",
    });
    unidades.value.push(creada);
    modalUnidad.value = false;
    mensaje.value = "El nodo se agregó a la estructura institucional.";
  } finally {
    guardando.value = false;
  }
}

function abrirEstructura() {
  Object.assign(formularioEstructura, {
    nombre: "",
    descripcion: "",
    tipo: "FUNCIONAL",
    modoJerarquia: "FLEXIBLE",
  });
  modalEstructura.value = true;
}

async function crearEstructura() {
  if (!formularioEstructura.nombre.trim()) return;
  const id = `estructura-${Date.now()}`;
  const nombreEst = formularioEstructura.nombre.trim();
  const creada = await organizacionService.estructura.estructuras.crear({
    id,
    nombre: nombreEst,
    descripcion: formularioEstructura.descripcion.trim() || undefined,
    tipo: formularioEstructura.tipo,
    modoJerarquia: formularioEstructura.modoJerarquia,
    esSistema: false,
    estado: "ACTIVA",
  });
  estructuras.value.push(creada);
  estructuraSeleccionadaId.value = creada.id;
  const nivel1Id = await obtenerOAsegurarNivel(creada.id, 1);

  // Crear automáticamente el nodo raíz inicial de la nueva estructura
  const tipoDefectoId = tiposUnidadPersonalizables.value[0]?.id ?? tiposUnidad.value[0]?.id ?? "";
  const nodoRaiz = await organizacionService.estructura.unidades.crear({
    id: `unidad-${Date.now()}`,
    nombre: nombreEst,
    codigo: nombreEst.slice(0, 6).toUpperCase().replace(/\s+/g, ""),
    estructuraId: creada.id,
    nivelId: nivel1Id,
    tipoUnidadId: tipoDefectoId,
    unidadPadreId: null,
    politicaIncorporacionId: politicas.value[0]?.id ?? "",
    orden: 1,
    estado: "ACTIVA",
    permiteSubunidades: true,
  });
  unidades.value.push(nodoRaiz);

  modalEstructura.value = false;
  mensaje.value = `Estructura "${creada.nombre}" creada exitosamente con su nodo principal.`;
}

function abrirNivel() {
  if (!estructuraSeleccionadaId.value) return;
  formularioNivel.nombre = "";
  modalNivel.value = true;
}

async function crearNivel() {
  if (!formularioNivel.nombre.trim() || !estructuraSeleccionadaId.value) return;
  const creado = await organizacionService.estructura.niveles.crear({
    id: `nivel-${Date.now()}`,
    estructuraId: estructuraSeleccionadaId.value,
    nombre: formularioNivel.nombre.trim(),
    orden: nivelesEstructura.value.length + 1,
    estado: "ACTIVO",
  });
  niveles.value.push(creado);
  modalNivel.value = false;
  mensaje.value = `Nivel “${creado.nombre}” agregado a ${estructuraSeleccionada.value?.nombre}.`;
}

function abrirModalTipo(desdeUnidad = false) {
  creandoTipoDesdeUnidad.value = desdeUnidad;
  if (desdeUnidad) formularioUnidad.tipoUnidadId = "";
  Object.assign(formularioTipo, {
    nombre: "",
    descripcion: "",
  });
  modalTipo.value = true;
}

function seleccionarTipoUnidad(valor: string) {
  if (valor === OPCION_NUEVO_TIPO) abrirModalTipo(true);
}

async function crearTipoUnidad() {
  if (!formularioTipo.nombre.trim()) return;
  const nombre = formularioTipo.nombre.trim();
  const creado = await organizacionService.estructura.tiposUnidad.crear({
    id: `tipo-${Date.now()}`,
    nombreSingular: nombre,
    nombrePlural: nombre,
    descripcion: formularioTipo.descripcion.trim() || undefined,
    color: "#0B3A78",
    permiteSubunidades: true,
    estado: "ACTIVO",
  });
  tiposUnidad.value.push(creado);
  if (creandoTipoDesdeUnidad.value) {
    formularioUnidad.tipoUnidadId = creado.id;
  }
  modalTipo.value = false;
  creandoTipoDesdeUnidad.value = false;
  Object.assign(formularioTipo, { nombre: "", descripcion: "" });
  mensaje.value = "El nuevo tipo de nodo ya puede utilizarse en el organigrama.";
}

async function crearPerfil() {
  if (!formularioPerfil.nombre.trim()) return;
  const permisos = permisosPorPlantilla[formularioPerfil.plantilla] ?? [];
  const creado = await organizacionService.estructura.perfiles.crear({
    id: `perfil-${Date.now()}`,
    nombre: formularioPerfil.nombre.trim(),
    descripcion: formularioPerfil.descripcion.trim(),
    tipo: "PERSONALIZADO",
    plantilla: formularioPerfil.plantilla,
    nivelAutoridad: 500,
    permisos,
    alcanceDefecto:
      formularioPerfil.plantilla === "DOCENCIA"
        ? "CURSOS_PROPIOS"
        : formularioPerfil.plantilla === "APRENDIZAJE"
          ? "PROPIO"
          : "UNIDAD",
    rutaInicial:
      formularioPerfil.plantilla === "DOCENCIA"
        ? "/docente/inicio"
        : formularioPerfil.plantilla === "APRENDIZAJE"
          ? "/tukuy-academy/cursos"
          : "/organizacion/inicio",
    esSistema: false,
    estado: "ACTIVO",
  });
  perfiles.value.push(creado);
  modalPerfil.value = false;
  Object.assign(formularioPerfil, { nombre: "", descripcion: "", plantilla: "SUPERVISION" });
  mensaje.value = "El perfil personalizado fue creado debajo de Administración.";
}

function abrirReglaCurso() {
  Object.assign(formularioReglaCurso, {
    cursoId: cursosDisponibles.value[0]?.id ?? "",
    publico: "TODA_LA_ENTIDAD",
    publicoIds: [],
    incluirDescendientes: true,
    modalidad: "LIBRE",
    cupo: null,
  });
  modalReglaCurso.value = true;
}

async function crearReglaCurso() {
  const curso = cursosDisponibles.value.find(
    (item) => item.id === formularioReglaCurso.cursoId,
  );
  if (!curso) return;
  const creada = await organizacionService.estructura.reglasAccesoCursos.crear({
    id: `regla-${Date.now()}`,
    cursoId: curso.id,
    cursoTitulo: curso.title,
    publico: formularioReglaCurso.publico,
    publicoIds:
      formularioReglaCurso.publico === "TODA_LA_ENTIDAD"
        ? []
        : [...formularioReglaCurso.publicoIds],
    incluirDescendientes: formularioReglaCurso.incluirDescendientes,
    modalidad: formularioReglaCurso.modalidad,
    cupo: formularioReglaCurso.cupo ?? undefined,
    estado: "ACTIVA",
  });
  const indice = reglasAccesoCursos.value.findIndex(
    (item) => item.cursoId === creada.cursoId,
  );
  if (indice >= 0) reglasAccesoCursos.value[indice] = creada;
  else reglasAccesoCursos.value.unshift(creada);
  modalReglaCurso.value = false;
  mensaje.value = "La regla de acceso al curso quedó activa para la entidad.";
}

function etiquetaPublico(regla: ReglaAccesoCursoEntidad) {
  if (regla.publico === "TODA_LA_ENTIDAD") return "Toda la entidad";
  if (regla.publico === "UNIDADES") {
    return regla.publicoIds.map(nombreUnidad).join(", ");
  }
  if (regla.publico === "ESPECIALIDADES") return regla.publicoIds.join(", ");
  return regla.publicoIds
    .map((id) => perfiles.value.find((perfil) => perfil.id === id)?.nombre ?? id)
    .join(", ");
}

function nombreUsuario(id?: string) {
  return (id && usuariosPorId.value.get(id)?.nombre) || "Sin responsable";
}

function nombreUnidad(id: string) {
  return unidadesPorId.value.get(id)?.nombre ?? "Nodo no disponible";
}


function etiquetaEstado(estado: VinculacionUnidad["estado"]) {
  return estado === "ACTIVA" ? "Activa" : estado === "PENDIENTE" ? "Pendiente" : estado;
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <TituloConAyuda
          eyebrow="Gobierno institucional"
          titulo="Organización y accesos"
          ayuda="Define cómo se organiza la entidad, vincula personas y configura los perfiles bajo Dirección y Administración."
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <Button v-if="puedeGestionarEstructura" @click="abrirUnidad"><Plus class="h-4 w-4" />Nuevo nodo</Button>
      </div>
    </header>

    <p v-if="mensaje" class="border-l-4 border-l-emerald-600 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{{ mensaje }}</p>

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-24 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card v-for="item in [
        { nombre: 'Nodos configurados', valor: unidades.length, icono: GitBranch },
        { nombre: 'Personas vinculadas', valor: usuariosVinculados, icono: UsersRound },
        { nombre: 'Solicitudes pendientes', valor: solicitudesPendientes.length, icono: UserPlus },
        { nombre: 'Perfiles institucionales', valor: perfiles.length, icono: ShieldCheck },
      ]" :key="item.nombre" class="border-border border-t-4 border-t-primary bg-card">
        <CardContent class="flex items-center gap-4 p-5">
          <span class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"><component :is="item.icono" class="h-5 w-5" /></span>
          <div><strong class="text-2xl">{{ item.valor }}</strong><p class="text-xs text-muted-foreground">{{ item.nombre }}</p></div>
        </CardContent>
      </Card>
    </div>

    <nav class="flex flex-wrap border border-border bg-card p-1" aria-label="Secciones de organización y accesos">
      <button v-for="item in secciones" :key="item.id" class="flex items-center gap-2 px-4 py-3 text-sm font-bold transition" :class="seccion === item.id ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted hover:text-foreground'" @click="seccion = item.id">
        <component :is="item.icono" class="h-4 w-4" />{{ item.nombre }}
      </button>
    </nav>

    <section v-if="seccion === 'estructura'" class="overflow-hidden border border-border bg-card">
      <div class="border-b border-border bg-muted/20 p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><p class="text-xs font-black uppercase tracking-[.16em] text-primary">Gobierno protegido</p><p class="mt-1 text-xs text-muted-foreground">Estas funciones son obligatorias, independientes y no forman la rama operativa.</p></div>
          <Tag value="3 funciones del sistema" severity="warn" />
        </div>
        <div class="mt-4 grid gap-3 md:grid-cols-3">
          <button v-for="unidad in unidadesGobierno" :key="unidad.id" type="button" class="flex items-start gap-3 border border-border bg-card p-4 text-left transition hover:border-primary" @click="abrirEditarUnidadPorId(unidad.id)">
            <span class="grid h-10 w-10 shrink-0 place-items-center bg-accent/15 text-accent"><Building2 class="h-5 w-5" /></span>
            <span><b class="block">{{ unidad.nombre }}</b><small class="mt-1 block text-muted-foreground">{{ nombreUsuario(unidad.responsableUsuarioId) }} · {{ unidad.codigoSistema }}</small></span>
          </button>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div class="flex items-center gap-2">
          <h2 class="font-black">Estructura organizacional</h2>
          <IconoAyuda texto="Organigrama y jerarquía de nodos de la entidad." />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex border border-border bg-background p-1">
            <button
              class="flex items-center gap-2 px-3 py-2 text-xs font-bold transition"
              :class="vistaEstructura === 'ORGANIGRAMA' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'"
              @click="vistaEstructura = 'ORGANIGRAMA'"
            >
              <LayoutDashboard class="h-4 w-4" />Organigrama
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 text-xs font-bold transition"
              :class="vistaEstructura === 'TABLA' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'"
              @click="vistaEstructura = 'TABLA'"
            >
              <ListTree class="h-4 w-4" />Tabla
            </button>
          </div>
          <Button v-if="puedeGestionarEstructura" size="sm" @click="abrirUnidad"><Plus class="h-4 w-4" />Agregar nodo</Button>
        </div>
      </div>
      <div v-if="estructuraSeleccionada" class="flex flex-wrap items-center gap-2 border-b border-border bg-background px-5 py-3">
        <span class="mr-2 text-xs font-black uppercase tracking-wide text-muted-foreground">Niveles:</span>
        <Tag v-for="nivel in nivelesEstructura" :key="nivel.id" :value="`${nivel.orden}. ${nivel.nombre}`" severity="info" />
        <span v-if="!nivelesEstructura.length" class="text-xs text-amber-700">Define al menos un nivel antes de crear nodos.</span>
      </div>
      <div v-if="!estructuraSeleccionada" class="p-10 text-center text-sm text-muted-foreground">Crea o selecciona una estructura para organizar al personal.</div>
      <OrganigramaOrganizacion
        v-else-if="vistaEstructura === 'ORGANIGRAMA'"
        :nombre-entidad="nombreEntidad"
        :nombre-estructura="estructuraSeleccionada.nombre"
        :logo-entidad="logoEntidad"
        :nodos="nodosOrganigrama"
        :niveles="nivelesEstructura"
        @seleccionar="abrirEditarUnidad"
        @agregar-subnivel="abrirCrearSubunidad"
        @agregar-mismo-nivel="abrirCrearMismoNivel"
      />
      <TreeTable
        v-else
        v-model:expanded-keys="nodosTablaExpandidos"
        :value="nodosTablaEstructura"
        data-key="key"
        table-style="min-width: 72rem"
      >
        <Column expander header="N.º / Nodo" style="min-width: 23rem">
          <template #body="{ node }">
            <div class="flex items-center gap-3">
              <button
                class="grid min-w-12 place-items-center border border-primary/25 bg-primary/8 px-2 py-1.5 text-xs font-black text-primary hover:bg-primary hover:text-white"
                :class="node.children?.length ? 'cursor-pointer' : 'cursor-default'"
                :aria-label="node.children?.length ? `Desplegar nivel ${node.data.numeracion}` : undefined"
                @click="node.children?.length && alternarNodoTabla(node.key)"
              >
                {{ node.data.numeracion }}
              </button>
              <div>
                <b>{{ node.data.nombre }}</b>
                <p class="text-[11px] text-muted-foreground">
                  {{ node.data.codigo || "Sin código" }}
                  <span v-if="node.children?.length">
                    · {{ node.children.length }}
                    {{ node.children.length === 1 ? "nodo descendiente" : "nodos descendientes" }}
                  </span>
                </p>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Tipo" style="min-width: 12rem">
          <template #body="{ node }">
            {{ tiposPorId.get(node.data.tipoUnidadId)?.nombreSingular }}
          </template>
        </Column>
        <Column header="Responsable" style="min-width: 14rem">
          <template #body="{ node }">
            {{ nombreUsuario(node.data.responsableUsuarioId) }}
          </template>
        </Column>
        <Column header="Incorporación" style="min-width: 14rem">
          <template #body="{ node }">
            {{ politicasPorId.get(node.data.politicaIncorporacionId)?.nombre || "Sin política" }}
          </template>
        </Column>
        <Column header="Miembros" style="min-width: 11rem">
          <template #body="{ node }">
            <b>{{ cantidadMiembros(node.data.id, true) }}</b>
            <span class="text-xs text-muted-foreground">
              totales · {{ cantidadMiembros(node.data.id) }} directos
            </span>
          </template>
        </Column>
        <Column header="Estado">
          <template #body="{ node }">
            <Tag
              :value="node.data.estado"
              :severity="node.data.estado === 'ACTIVA' ? 'success' : 'secondary'"
            />
          </template>
        </Column>
      </TreeTable>
    </section>

    <section v-else-if="seccion === 'perfiles'" class="grid gap-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h2 class="font-black">Perfiles institucionales</h2>
          <IconoAyuda texto="Dirección y Administración son protegidos; los demás nombres los define la entidad." />
        </div>
        <Button size="sm" @click="modalPerfil = true"><Plus class="h-4 w-4" />Crear perfil</Button>
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card v-for="perfil in perfiles" :key="perfil.id" class="border-border bg-card" :class="perfil.esSistema ? 'border-t-4 border-t-accent' : ''">
          <CardContent class="p-5"><div class="flex items-start justify-between gap-3"><span class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"><ShieldCheck class="h-5 w-5" /></span><Tag :value="perfil.esSistema ? 'Protegido' : perfil.plantilla" :severity="perfil.esSistema ? 'warn' : 'info'" /></div><h3 class="mt-5 text-lg font-black">{{ perfil.nombre }}</h3><p class="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{{ perfil.descripcion }}</p><div class="mt-4 border-t border-border pt-4"><p class="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{{ perfil.permisos.length }} permisos · alcance {{ perfil.alcanceDefecto }}</p><p class="mt-2 text-xs text-muted-foreground">Nivel de autoridad {{ perfil.nivelAutoridad }}</p></div></CardContent>
        </Card>
      </div>
    </section>

    <section v-else-if="seccion === 'acceso-cursos'" class="overflow-hidden border border-border bg-card">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="font-black">Reglas de acceso y matrícula</h2>
            <IconoAyuda texto="La entidad decide qué nodos, especialidades o perfiles pueden acceder a cada curso." />
          </div>
        </div>
        <Button size="sm" @click="abrirReglaCurso">
          <Plus class="h-4 w-4" />Configurar curso
        </Button>
      </div>
      <DataTable
        :value="reglasAccesoCursos"
        data-key="id"
        size="small"
        :paginator="reglasAccesoCursos.length > 8"
        :rows="8"
        table-style="min-width: 70rem"
      >
        <Column field="cursoTitulo" header="Curso" style="min-width: 20rem" />
        <Column header="Público habilitado" style="min-width: 22rem">
          <template #body="{ data }">{{ etiquetaPublico(data) }}</template>
        </Column>
        <Column header="Modalidad" style="min-width: 12rem">
          <template #body="{ data }">
            <Tag :value="data.modalidad.replaceAll('_', ' ')" severity="info" />
          </template>
        </Column>
        <Column header="Cupo">
          <template #body="{ data }">{{ data.cupo || "Sin límite" }}</template>
        </Column>
        <Column header="Nodos descendientes">
          <template #body="{ data }">{{ data.incluirDescendientes ? "Incluidas" : "No incluidas" }}</template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <Tag :value="data.estado" :severity="data.estado === 'ACTIVA' ? 'success' : 'secondary'" />
          </template>
        </Column>
      </DataTable>
    </section>

    <Dialog v-model:visible="modalUnidad" modal :header="tituloModalUnidad" :style="{ width: 'min(42rem, calc(100vw - 2rem))' }">
      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-if="!unidadEditandoId && tipoCreacionUnidad !== 'LIBRE'"
          class="sm:col-span-2 border-l-4 border-l-primary bg-primary/8 p-3 text-xs text-muted-foreground"
        >
          <b class="text-foreground">
            {{ tipoCreacionUnidad === "MISMO_NIVEL" ? "Mismo nivel" : "Subnivel" }}.
          </b>
          {{
            tipoCreacionUnidad === "MISMO_NIVEL"
              ? `El nuevo nodo compartirá el nivel jerárquico y se insertará a la ${ladoInsercion === "IZQUIERDA" ? "izquierda" : "derecha"} de la tarjeta seleccionada.`
              : "El nuevo nodo dependerá directamente de la tarjeta seleccionada."
          }}
        </div>
        <div v-if="esUnidadGobierno" class="sm:col-span-2 border-l-4 border-l-accent bg-accent/10 p-3 text-xs text-muted-foreground">
          <b class="text-foreground">Nivel de gobierno protegido.</b>
          Puedes cambiar responsable, código y política, pero no su nombre ni su posición jerárquica.
        </div>
        <label class="sm:col-span-2">
          <span class="filtro-label">Nombre</span>
          <InputText v-model="formularioUnidad.nombre" :disabled="esUnidadGobierno" class="filtro-control w-full" placeholder="Ej. Capítulo de Ingeniería Civil" />
        </label>

        <label>
          <span class="filtro-label">Nombre abreviado</span>
          <InputText
            v-model="formularioUnidad.codigo"
            class="filtro-control w-full"
            maxlength="12"
            placeholder="Ej. CIC"
          />
        </label>
        <label>
          <span class="filtro-label">Tipo de nodo</span>
          <Select
            v-model="formularioUnidad.tipoUnidadId"
            :disabled="esUnidadGobierno"
            :options="opcionesTipoUnidadFormulario"
            option-label="nombreSingular"
            option-value="id"
            class="filtro-control w-full"
            placeholder="Selecciona el tipo heredado o agrega uno nuevo"
            @update:model-value="seleccionarTipoUnidad"
          >
            <template #option="{ option }">
              <div
                class="w-full py-1"
                :title="option.descripcion || option.nombreSingular"
              >
                <span>{{ option.nombreSingular }}</span>
              </div>
            </template>
          </Select>
        </label>
        <label class="sm:col-span-2">
          <span class="filtro-label">Descripción del nodo</span>
          <Textarea
            v-model="formularioUnidad.descripcion"
            rows="3"
            auto-resize
            class="filtro-control w-full"
            placeholder="Describe la función y el alcance de este nodo dentro de la entidad"
          />
        </label>
        <label>
          <span class="filtro-label">Depende de</span>
          <Select v-model="formularioUnidad.unidadPadreId" :disabled="esUnidadGobierno || tipoCreacionUnidad !== 'LIBRE'" :options="[{ id: '', nombre: 'Nodo raíz' }, ...unidadesPadreDisponibles]" option-label="nombre" option-value="id" class="filtro-control w-full" />
        </label>
        <label>
          <span class="filtro-label">Responsable</span>
          <!-- Responsable ya seleccionado -->
          <div
            v-if="responsableSeleccionado"
            class="filtro-control flex w-full items-center justify-between gap-3 bg-primary/6 px-3 py-2"
          >
            <div class="flex items-center gap-2">
              <span class="grid h-8 w-8 shrink-0 place-items-center bg-primary/15 text-[0.6rem] font-black text-primary">
                {{ responsableSeleccionado.iniciales?.slice(0, 3) || responsableSeleccionado.nombre?.slice(0, 2).toUpperCase() }}
              </span>
              <div>
                <p class="text-sm font-bold leading-none">{{ responsableSeleccionado.nombre }}</p>
                <p class="mt-0.5 text-[11px] text-muted-foreground">DNI: {{ responsableSeleccionado.dni || '—' }}</p>
              </div>
            </div>
            <button type="button" class="text-xs font-bold text-red-500 hover:text-red-700" @click="limpiarResponsable">Quitar</button>
          </div>
          <!-- Buscador por DNI o nombre -->
          <div v-else class="relative">
            <InputText
              v-model="busquedaDni"
              class="filtro-control w-full"
              placeholder="Buscar por DNI o nombre..."
              autocomplete="off"
            />
            <ul
              v-if="busquedaResultados.length"
              class="absolute z-50 mt-1 w-full border border-border bg-card shadow-xl"
            >
              <li
                v-for="u in busquedaResultados"
                :key="u.id"
                class="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-primary/8"
                @click="seleccionarResponsable(u)"
              >
                <span class="grid h-8 w-8 shrink-0 place-items-center bg-primary/15 text-[0.6rem] font-black text-primary">
                  {{ u.iniciales?.slice(0, 3) || u.nombre?.slice(0, 2).toUpperCase() }}
                </span>
                <div>
                  <p class="text-sm font-bold leading-none">{{ u.nombre }}</p>
                  <p class="mt-0.5 text-[11px] text-muted-foreground">DNI: {{ u.dni || '—' }}</p>
                </div>
              </li>
            </ul>
            <p v-else-if="busquedaDni.trim()" class="mt-1 text-[11px] text-muted-foreground">Sin resultados para «{{ busquedaDni.trim() }}»</p>
          </div>
        </label>
        <label class="sm:col-span-2">
          <span class="filtro-label">Política de incorporación</span>
          <Select v-model="formularioUnidad.politicaIncorporacionId" :options="politicas" option-label="nombre" option-value="id" class="filtro-control w-full" />
        </label>
        <div class="sm:col-span-2 flex items-center justify-between gap-4 border border-border bg-muted/30 p-4">
          <div>
            <p class="text-sm font-black">Permitir nodos descendientes</p>
          </div>
          <ToggleSwitch
            v-model="formularioUnidad.permiteSubunidades"
            :disabled="unidadEditandoTieneHijos && formularioUnidad.permiteSubunidades"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex w-full flex-wrap items-center justify-between gap-3">
          <Button
            v-if="puedeSolicitarEliminarUnidad"
            variant="destructive"
            :disabled="guardando || unidadEditandoTieneHijos"
            :title="
              unidadEditandoTieneHijos
                ? 'Elimina primero todos los nodos descendientes'
                : 'Eliminar este nodo'
            "
            @click="abrirConfirmacionEliminar"
          >
            <Trash2 class="h-4 w-4" />Eliminar nodo
          </Button>
          <span v-else />
          <div class="flex gap-2">
            <Button variant="outline" @click="modalUnidad = false">Cancelar</Button>
            <Button :disabled="guardando || !formularioUnidad.nombre" @click="guardarUnidad">
              {{ unidadEditandoId ? "Guardar cambios" : "Crear nodo" }}
            </Button>
          </div>
        </div>
      </template>
    </Dialog>



    <Dialog v-model:visible="modalNivel" modal header="Agregar nivel" :style="{ width: 'min(34rem, calc(100vw - 2rem))' }">
      <div class="grid gap-4">
        <p class="text-sm text-muted-foreground">El nivel {{ nivelesEstructura.length + 1 }} se agregará a <b class="text-foreground">{{ estructuraSeleccionada?.nombre }}</b>.</p>
        <label><span class="filtro-label">Nombre del nivel</span><InputText v-model="formularioNivel.nombre" class="filtro-control w-full" placeholder="Ej. Gerencia, Área, Proyecto o Equipo" /></label>
      </div>
      <template #footer><Button variant="outline" @click="modalNivel = false">Cancelar</Button><Button :disabled="!formularioNivel.nombre.trim()" @click="crearNivel">Agregar nivel</Button></template>
    </Dialog>

    <Dialog
      v-model:visible="modalEliminarUnidad"
      modal
      header="Confirmar eliminación"
      :closable="!eliminando"
      :style="{ width: 'min(38rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-5">
        <div class="flex gap-3 border-l-4 border-l-red-600 bg-red-500/10 p-4">
          <TriangleAlert class="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <h3 class="font-black text-foreground">
              ¿Estás seguro de eliminar el nodo <b>{{ unidadEditando?.nombre }}</b>?
            </h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Esta acción es irreversible y modificará la estructura institucional.
            </p>
          </div>
        </div>

        <div
          v-if="unidadEditandoTieneHijos"
          class="flex gap-3 border-l-4 border-l-amber-500 bg-amber-500/10 p-4 text-sm"
        >
          <TriangleAlert class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <b>Este nodo todavía contiene descendientes.</b>
            <p class="mt-1 text-xs text-muted-foreground">
              Para conservar la integridad del organigrama, elimina primero los nodos del último
              nivel y continúa hacia arriba.
            </p>
          </div>
        </div>

        <div>
          <p class="text-xs font-black uppercase tracking-[.16em] text-foreground">
            Posibles riesgos e impacto
          </p>
          <ul class="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li class="flex gap-2">
              <span class="font-black text-red-600">•</span>
              {{ impactoEliminacion.personas }} personas perderán su vínculo con los nodos eliminados
              ({{ impactoEliminacion.vinculaciones }} vinculaciones).
            </li>
            <li v-if="impactoEliminacion.reglas" class="flex gap-2">
              <span class="font-black text-red-600">•</span>
              Se actualizarán {{ impactoEliminacion.reglas }} reglas de acceso a cursos; las que queden sin destino serán desactivadas.
            </li>
            <li class="flex gap-2">
              <span class="font-black text-red-600">•</span>
              Las asignaciones de perfil vinculadas exclusivamente a estos nodos quedarán inactivas.
            </li>
            <li class="flex gap-2">
              <span class="font-black text-red-600">•</span>
              Los reportes históricos podrían dejar de agrupar información bajo esta rama.
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <Button variant="outline" :disabled="eliminando" @click="modalEliminarUnidad = false">
          Conservar nodo
        </Button>
        <Button variant="destructive" :disabled="eliminando" @click="eliminarUnidad">
          <Trash2 class="h-4 w-4" />
          {{ eliminando ? "Eliminando..." : "Sí, eliminar definitivamente" }}
        </Button>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="modalTipo"
      modal
      header="Nuevo tipo de nodo"
      :style="{ width: 'min(34rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-4">
        <label>
          <span class="filtro-label">Nombre</span>
          <InputText
            v-model="formularioTipo.nombre"
            class="filtro-control w-full"
            placeholder="Ej. Comité técnico"
          />
        </label>
        <label>
          <span class="filtro-label">Descripción</span>
          <Textarea
            v-model="formularioTipo.descripcion"
            rows="3"
            auto-resize
            class="filtro-control w-full"
            placeholder="Explica para qué se utiliza este tipo de nodo"
          />
        </label>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalTipo = false">Cancelar</Button>
        <Button :disabled="!formularioTipo.nombre.trim()" @click="crearTipoUnidad">
          Crear tipo
        </Button>
      </template>
    </Dialog>

    <Dialog v-model:visible="modalPerfil" modal header="Crear perfil debajo de Administración" :style="{ width: 'min(38rem, calc(100vw - 2rem))' }"><div class="grid gap-4"><div class="border-l-4 border-l-accent bg-accent/10 p-4 text-sm"><b>Dirección y Administración permanecen protegidos.</b><p class="mt-1 text-xs text-muted-foreground">Este perfil tendrá un nivel inferior y solo recibirá los permisos de la plantilla seleccionada.</p></div><label><span class="filtro-label">Nombre definido por la entidad</span><InputText v-model="formularioPerfil.nombre" class="filtro-control w-full" placeholder="Ej. Presidente de capítulo" /></label><label><span class="filtro-label">Descripción</span><InputText v-model="formularioPerfil.descripcion" class="filtro-control w-full" /></label><label><span class="filtro-label">Plantilla funcional</span><Select v-model="formularioPerfil.plantilla" :options="opcionesPlantilla" option-label="label" option-value="value" class="filtro-control w-full" /></label></div><template #footer><Button variant="outline" @click="modalPerfil = false">Cancelar</Button><Button @click="crearPerfil">Crear perfil</Button></template></Dialog>

    <Dialog
      v-model:visible="modalReglaCurso"
      modal
      header="Configurar acceso a un curso"
      :style="{ width: 'min(42rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="sm:col-span-2">
          <span class="filtro-label">Curso</span>
          <Select
            v-model="formularioReglaCurso.cursoId"
            :options="cursosDisponibles"
            option-label="title"
            option-value="id"
            class="filtro-control w-full"
          />
        </label>
        <label>
          <span class="filtro-label">Público habilitado</span>
          <Select
            v-model="formularioReglaCurso.publico"
            :options="opcionesPublicoCurso"
            option-label="label"
            option-value="value"
            class="filtro-control w-full"
            @change="formularioReglaCurso.publicoIds = []"
          />
        </label>
        <label>
          <span class="filtro-label">Modalidad de acceso</span>
          <Select
            v-model="formularioReglaCurso.modalidad"
            :options="opcionesModalidadCurso"
            option-label="label"
            option-value="value"
            class="filtro-control w-full"
          />
        </label>
        <label v-if="formularioReglaCurso.publico !== 'TODA_LA_ENTIDAD'" class="sm:col-span-2">
          <span class="filtro-label">Destinatarios</span>
          <MultiSelect
            v-model="formularioReglaCurso.publicoIds"
            :options="opcionesDestinoRegla"
            option-label="nombre"
            option-value="id"
            display="chip"
            class="filtro-control w-full"
          />
        </label>
        <label>
          <span class="filtro-label">Cupo opcional</span>
          <InputNumber
            v-model="formularioReglaCurso.cupo"
            :min="1"
            class="filtro-control w-full"
          />
        </label>
        <label class="flex items-end gap-2 pb-3 text-sm">
          <input v-model="formularioReglaCurso.incluirDescendientes" type="checkbox" />
          Incluir nodos descendientes
        </label>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalReglaCurso = false">Cancelar</Button>
        <Button
          :disabled="
            !formularioReglaCurso.cursoId ||
            (formularioReglaCurso.publico !== 'TODA_LA_ENTIDAD' &&
              !formularioReglaCurso.publicoIds.length)
          "
          @click="crearReglaCurso"
        >
          Guardar regla
        </Button>
      </template>
    </Dialog>
  </section>
</template>
