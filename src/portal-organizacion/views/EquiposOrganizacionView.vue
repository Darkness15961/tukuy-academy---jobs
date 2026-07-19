<script setup lang="ts">
import {
  BookOpenCheck,
  CheckCircle2,
  GitBranch,
  LayoutDashboard,
  ListTree,
  MapPin,
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
import { computed, onMounted, reactive, ref } from "vue";

import {
  organizacionService,
  type SedeOrganizacion,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { cursosService } from "@/api/services/cursos.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useContextoSesion } from "@/composables/useContextoSesion";
import OrganigramaOrganizacion from "@/portal-organizacion/components/OrganigramaOrganizacion.vue";
import type { NodoOrganigramaEntidad } from "@/portal-organizacion/components/NodoOrganigrama.vue";
import type {
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
  | "vinculaciones"
  | "perfiles"
  | "acceso-cursos"
  | "sedes";
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
const creandoTipoDesdeUnidad = ref(false);
const modalVinculacion = ref(false);
const modalPerfil = ref(false);
const modalReglaCurso = ref(false);
const unidades = ref<UnidadOrganizacional[]>([]);
const tiposUnidad = ref<TipoUnidadEntidad[]>([]);
const politicas = ref<PoliticaIncorporacionUnidad[]>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const perfiles = ref<PerfilEntidad[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const sedes = ref<SedeOrganizacion[]>([]);
const reglasAccesoCursos = ref<ReglaAccesoCursoEntidad[]>([]);
const cursosDisponibles = ref<Course[]>([]);

const formularioUnidad = reactive({
  nombre: "",
  descripcion: "",
  codigo: "",
  tipoUnidadId: "",
  unidadPadreId: "",
  responsableUsuarioId: "",
  politicaIncorporacionId: "",
  permiteSubunidades: true,
});
const formularioTipo = reactive({
  nombre: "",
  descripcion: "",
});
const formularioVinculacion = reactive({
  usuarioId: "",
  unidadId: "",
  sedeId: "",
  tipo: "PRINCIPAL" as VinculacionUnidad["tipo"],
  origen: "ASIGNACION_ADMINISTRATIVA" as VinculacionUnidad["origen"],
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
  { id: "vinculaciones" as const, nombre: "Vinculaciones", icono: UsersRound },
  { id: "perfiles" as const, nombre: "Perfiles y permisos", icono: ShieldCheck },
  { id: "acceso-cursos" as const, nombre: "Acceso a cursos", icono: BookOpenCheck },
  { id: "sedes" as const, nombre: "Sedes", icono: MapPin },
];
const opcionesPublicoCurso = [
  { label: "Toda la entidad", value: "TODA_LA_ENTIDAD" },
  { label: "Unidades seleccionadas", value: "UNIDADES" },
  { label: "Especialidades", value: "ESPECIALIDADES" },
  { label: "Perfiles institucionales", value: "PERFILES" },
];
const opcionesModalidadCurso = [
  { label: "Matrícula libre", value: "LIBRE" },
  { label: "Con aprobación", value: "CON_APROBACION" },
  { label: "Solo por asignación", value: "SOLO_ASIGNACION" },
  { label: "Solo por invitación", value: "INVITACION" },
];
const opcionesTipoVinculacion = ["PRINCIPAL", "SECUNDARIA", "TEMPORAL"];
const opcionesPlantilla = [
  { label: "Gestión", value: "GESTION" },
  { label: "Supervisión", value: "SUPERVISION" },
  { label: "Docencia", value: "DOCENCIA" },
  { label: "Aprendizaje", value: "APRENDIZAJE" },
  { label: "Personalizado", value: "PERSONALIZADO" },
];
const permisosPorPlantilla: Record<string, string[]> = {
  GESTION: ["cursos.ver", "asignaciones.crear", "certificados.emitir", "reportes.ver"],
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
      unidades.value,
      tiposUnidad.value,
      politicas.value,
      vinculaciones.value,
      perfiles.value,
      usuarios.value,
      sedes.value,
      reglasAccesoCursos.value,
      cursosDisponibles.value,
    ] = await Promise.all([
      organizacionService.estructura.unidades.listar(),
      organizacionService.estructura.tiposUnidad.listar(),
      organizacionService.estructura.politicasIncorporacion.listar(),
      organizacionService.estructura.vinculaciones.listar(),
      organizacionService.estructura.perfiles.listar(),
      organizacionService.usuarios.listar(),
      organizacionService.sedes.listar(),
      organizacionService.estructura.reglasAccesoCursos.listar(),
      cursosService.getAll(),
    ]);
  } finally {
    cargando.value = false;
  }
}

const usuariosPorId = computed(
  () => new Map(usuarios.value.map((usuario) => [String(usuario.id), usuario])),
);
const unidadesPorId = computed(
  () => new Map(unidades.value.map((unidad) => [unidad.id, unidad])),
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
  ["unidad-direccion-gobierno", "unidad-administracion"].includes(
    unidadEditandoId.value ?? "",
  ),
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
  return unidades.value.filter(
    (unidad) =>
      !excluidas.has(unidad.id) && puedeCrearEnUnidad(unidad.id),
  );
});
const tituloModalUnidad = computed(() => {
  if (unidadEditandoId.value) {
    return `Editar ${unidadEditando.value?.nombre ?? "unidad"}`;
  }
  const padre = unidadesPorId.value.get(formularioUnidad.unidadPadreId);
  const referencia = unidadReferenciaId.value
    ? unidadesPorId.value.get(unidadReferenciaId.value)
    : undefined;
  if (tipoCreacionUnidad.value === "MISMO_NIVEL" && referencia) {
    return `Nueva unidad a la ${
      ladoInsercion.value === "IZQUIERDA" ? "izquierda" : "derecha"
    } de ${referencia.nombre}`;
  }
  return padre
    ? `Nueva subunidad de ${padre.nombre}`
    : "Nueva unidad organizacional";
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
    ...heredados,
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
const sedesPorId = computed(
  () => new Map(sedes.value.map((sede) => [sede.id, sede])),
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
  if (unidadId === "unidad-administracion") return false;
  return idsUnidadYDescendientes("unidad-administracion").has(unidadId);
}

function esUnidadGobiernoPorId(unidadId: string) {
  return ["unidad-direccion-gobierno", "unidad-administracion"].includes(
    unidadId,
  );
}

function puedeCrearEnUnidad(unidadId: string) {
  if (esPerfilDireccion.value) return true;
  if (!esPerfilAdministracion.value) return false;
  return idsUnidadYDescendientes("unidad-administracion").has(unidadId);
}

function unidadPermiteSubunidades(unidad: UnidadOrganizacional) {
  return (
    unidad.permiteSubunidades ??
    tiposPorId.value.get(unidad.tipoUnidadId)?.permiteSubunidades ??
    true
  );
}

function puedeCrearAlMismoNivel(unidad: UnidadOrganizacional) {
  if (!unidad.unidadPadreId || !puedeCrearEnUnidad(unidad.unidadPadreId)) {
    return false;
  }
  const padre = unidadesPorId.value.get(unidad.unidadPadreId);
  return padre ? unidadPermiteSubunidades(padre) : false;
}

function construirNodosOrganigrama(
  padreId: string | null,
): NodoOrganigramaEntidad[] {
  const hermanas = unidades.value
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
        tipo: tipo?.nombreSingular ?? "Unidad",
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
  return unidades.value
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

function abrirUnidad() {
  if (!esPerfilDireccion.value && !esPerfilAdministracion.value) return;
  unidadEditandoId.value = null;
  tipoCreacionUnidad.value = "LIBRE";
  unidadReferenciaId.value = null;
  ladoInsercion.value = null;
  Object.assign(formularioUnidad, {
    nombre: "",
    descripcion: "",
    codigo: "",
    tipoUnidadId: "",
    unidadPadreId: esPerfilAdministracion.value
      ? "unidad-administracion"
      : "",
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
  Object.assign(formularioUnidad, {
    nombre: unidad.nombre,
    descripcion: unidad.descripcion ?? "",
    codigo: unidad.codigo ?? "",
    tipoUnidadId: unidad.tipoUnidadId,
    unidadPadreId: unidad.unidadPadreId ?? "",
    responsableUsuarioId: unidad.responsableUsuarioId ?? "",
    politicaIncorporacionId: unidad.politicaIncorporacionId ?? "",
    permiteSubunidades: unidadPermiteSubunidades(unidad),
  });
  modalUnidad.value = true;
}

function abrirConfirmacionEliminar() {
  if (!puedeEliminarUnidad.value) {
    if (unidadEditandoTieneHijos.value) {
      mensaje.value =
        "No se puede eliminar una unidad que contiene subniveles. Elimina primero sus últimos hijos y continúa de forma ascendente.";
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
      resultado.unidadesEliminadas === 1 ? "unidad fue eliminada" : "unidades fueron eliminadas"
    }. Se limpiaron ${resultado.vinculacionesEliminadas} vinculaciones y se actualizaron ${resultado.reglasAccesoActualizadas} reglas de acceso.`;
  } catch (error) {
    mensaje.value =
      error instanceof Error
        ? error.message
        : "No fue posible eliminar la unidad seleccionada.";
  } finally {
    eliminando.value = false;
  }
}

function abrirCrearSubunidad(nodo: NodoOrganigramaEntidad) {
  const padre = unidadesPorId.value.get(nodo.id);
  if (!padre || !puedeCrearEnUnidad(padre.id)) return;
  if (!unidadPermiteSubunidades(padre)) return;
  unidadEditandoId.value = null;
  tipoCreacionUnidad.value = "SUBNIVEL";
  unidadReferenciaId.value = padre.id;
  ladoInsercion.value = null;
  Object.assign(formularioUnidad, {
    nombre: "",
    descripcion: "",
    codigo: "",
    tipoUnidadId: tipoHeredadoDelPadre(padre.id),
    unidadPadreId: padre.id,
    responsableUsuarioId: "",
    politicaIncorporacionId: politicas.value[0]?.id ?? "",
    permiteSubunidades: true,
  });
  modalUnidad.value = true;
}

function abrirCrearMismoNivel(
  nodo: NodoOrganigramaEntidad,
  lado: "IZQUIERDA" | "DERECHA",
) {
  const referencia = unidadesPorId.value.get(nodo.id);
  if (!referencia || !puedeCrearAlMismoNivel(referencia)) return;
  unidadEditandoId.value = null;
  tipoCreacionUnidad.value = "MISMO_NIVEL";
  unidadReferenciaId.value = referencia.id;
  ladoInsercion.value = lado;
  Object.assign(formularioUnidad, {
    nombre: "",
    descripcion: "",
    codigo: "",
    tipoUnidadId: tipoHeredadoDelPadre(referencia.unidadPadreId),
    unidadPadreId: referencia.unidadPadreId ?? "",
    responsableUsuarioId: "",
    politicaIncorporacionId: politicas.value[0]?.id ?? "",
    permiteSubunidades: true,
  });
  modalUnidad.value = true;
}

async function guardarUnidad() {
  if (!formularioUnidad.nombre.trim() || !formularioUnidad.tipoUnidadId) return;
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
          "No puedes convertir este nivel en terminal mientras conserve subniveles activos.";
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
        cambios.unidadPadreId = formularioUnidad.unidadPadreId || null;
      }
      const actualizada = await organizacionService.estructura.unidades.actualizar(
        unidadEditandoId.value,
        cambios,
      );
      const indice = unidades.value.findIndex((item) => item.id === actualizada.id);
      if (indice >= 0) unidades.value[indice] = actualizada;
      modalUnidad.value = false;
      mensaje.value = "Los cambios de la unidad se guardaron en la estructura.";
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

    if (!unidadPadreIdDestino || !puedeCrearEnUnidad(unidadPadreIdDestino)) {
      mensaje.value = "Tu perfil solo puede crear unidades debajo de Administración.";
      return;
    }

    const hermanas = unidades.value
      .filter(
        (unidad) =>
          unidad.unidadPadreId === unidadPadreIdDestino,
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
      unidadPadreId: unidadPadreIdDestino,
      responsableUsuarioId: formularioUnidad.responsableUsuarioId || undefined,
      politicaIncorporacionId: formularioUnidad.politicaIncorporacionId || undefined,
      permiteSubunidades: formularioUnidad.permiteSubunidades,
      orden: indiceInsercion + 1,
      estado: "ACTIVA",
    });
    unidades.value.push(creada);
    modalUnidad.value = false;
    mensaje.value = "La unidad se agregó a la estructura institucional.";
  } finally {
    guardando.value = false;
  }
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
  mensaje.value = "El nuevo tipo de unidad ya puede utilizarse en el organigrama.";
}

function abrirVinculacion() {
  Object.assign(formularioVinculacion, {
    usuarioId: String(usuarios.value[0]?.id ?? ""),
    unidadId: unidades.value[0]?.id ?? "",
    sedeId: sedes.value[0]?.id ?? "",
    tipo: "PRINCIPAL",
    origen: "ASIGNACION_ADMINISTRATIVA",
  });
  modalVinculacion.value = true;
}

async function crearVinculacion() {
  if (!formularioVinculacion.usuarioId || !formularioVinculacion.unidadId) return;
  const creada = await organizacionService.estructura.vinculaciones.crear({
    id: `vin-${Date.now()}`,
    usuarioId: formularioVinculacion.usuarioId,
    unidadId: formularioVinculacion.unidadId,
    sedeId: formularioVinculacion.sedeId || undefined,
    tipo: formularioVinculacion.tipo,
    origen: formularioVinculacion.origen,
    estado: "ACTIVA",
    fechaInicio: new Date().toISOString().slice(0, 10),
    aprobadaPor: "usuario-demo",
  });
  vinculaciones.value.unshift(creada);
  modalVinculacion.value = false;
  mensaje.value = "La persona fue vinculada a la unidad seleccionada.";
}

async function aprobarSolicitud(vinculacion: VinculacionUnidad) {
  const actualizada = await organizacionService.estructura.aprobarVinculacion(
    vinculacion.id,
    "usuario-demo",
  );
  const indice = vinculaciones.value.findIndex((item) => item.id === actualizada.id);
  if (indice >= 0) vinculaciones.value[indice] = actualizada;
  mensaje.value = "La solicitud de incorporación fue aprobada.";
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
  return unidadesPorId.value.get(id)?.nombre ?? "Unidad no disponible";
}

function nombreSede(id?: string) {
  return (id && sedesPorId.value.get(id)?.nombre) || "Sin sede";
}

function etiquetaEstado(estado: VinculacionUnidad["estado"]) {
  return estado === "ACTIVA" ? "Activa" : estado === "PENDIENTE" ? "Pendiente" : estado;
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[.2em] text-primary">Gobierno institucional</p>
        <h1 class="mt-2 text-3xl font-black">Organización y accesos</h1>
        <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
          Define cómo se organiza la entidad, vincula personas y configura los perfiles que operan debajo de Dirección y Administración.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button v-if="puedeGestionarEstructura" @click="abrirUnidad"><Plus class="h-4 w-4" />Nueva unidad</Button>
      </div>
    </header>

    <p v-if="mensaje" class="border-l-4 border-l-emerald-600 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{{ mensaje }}</p>

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-24 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card v-for="item in [
        { nombre: 'Unidades configuradas', valor: unidades.length, icono: GitBranch },
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
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div><h2 class="font-black">Organigrama configurable</h2><p class="text-xs text-muted-foreground">Los nombres y niveles pertenecen a la entidad; no se imponen áreas ni departamentos.</p></div>
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
          <Button v-if="puedeGestionarEstructura" size="sm" @click="abrirUnidad"><Plus class="h-4 w-4" />Agregar unidad</Button>
        </div>
      </div>
      <OrganigramaOrganizacion
        v-if="vistaEstructura === 'ORGANIGRAMA'"
        :nombre-entidad="contextoActivo?.organizacionNombre || 'Organización'"
        :logo-entidad="logoEntidad"
        :nodos="nodosOrganigrama"
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
        <Column expander header="N.º / Unidad" style="min-width: 23rem">
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
                    {{ node.children.length === 1 ? "subnivel" : "subniveles" }}
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

    <section v-else-if="seccion === 'vinculaciones'" class="overflow-hidden border border-border bg-card">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 class="font-black">Personas y unidades</h2><p class="text-xs text-muted-foreground">Una persona puede tener una vinculación principal y otras secundarias o temporales.</p></div><Button size="sm" @click="abrirVinculacion"><UserPlus class="h-4 w-4" />Vincular persona</Button></div>
      <DataTable :value="vinculaciones" data-key="id" size="small" :paginator="vinculaciones.length > 8" :rows="8" table-style="min-width: 70rem">
        <Column header="Persona" style="min-width: 15rem"><template #body="{ data }"><b>{{ nombreUsuario(data.usuarioId) }}</b></template></Column>
        <Column header="Unidad" style="min-width: 18rem"><template #body="{ data }">{{ nombreUnidad(data.unidadId) }}</template></Column>
        <Column header="Sede" style="min-width: 11rem"><template #body="{ data }">{{ nombreSede(data.sedeId) }}</template></Column>
        <Column field="tipo" header="Vinculación" />
        <Column field="origen" header="Origen" style="min-width: 15rem" />
        <Column header="Estado"><template #body="{ data }"><Tag :value="etiquetaEstado(data.estado)" :severity="data.estado === 'ACTIVA' ? 'success' : data.estado === 'PENDIENTE' ? 'warn' : 'secondary'" /></template></Column>
        <Column header="Acción"><template #body="{ data }"><Button v-if="data.estado === 'PENDIENTE'" size="sm" variant="outline" @click="aprobarSolicitud(data)"><CheckCircle2 class="h-4 w-4" />Aprobar</Button></template></Column>
      </DataTable>
    </section>

    <section v-else-if="seccion === 'perfiles'" class="grid gap-5">
      <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-black">Perfiles institucionales</h2><p class="text-xs text-muted-foreground">Dirección y Administración son protegidos; los demás nombres los define la entidad.</p></div><Button size="sm" @click="modalPerfil = true"><Plus class="h-4 w-4" />Crear perfil</Button></div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card v-for="perfil in perfiles" :key="perfil.id" class="border-border bg-card" :class="perfil.esSistema ? 'border-t-4 border-t-accent' : ''">
          <CardContent class="p-5"><div class="flex items-start justify-between gap-3"><span class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"><ShieldCheck class="h-5 w-5" /></span><Tag :value="perfil.esSistema ? 'Protegido' : perfil.plantilla" :severity="perfil.esSistema ? 'warn' : 'info'" /></div><h3 class="mt-5 text-lg font-black">{{ perfil.nombre }}</h3><p class="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{{ perfil.descripcion }}</p><div class="mt-4 border-t border-border pt-4"><p class="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{{ perfil.permisos.length }} permisos · alcance {{ perfil.alcanceDefecto }}</p><p class="mt-2 text-xs text-muted-foreground">Nivel de autoridad {{ perfil.nivelAutoridad }}</p></div></CardContent>
        </Card>
      </div>
    </section>

    <section v-else-if="seccion === 'acceso-cursos'" class="overflow-hidden border border-border bg-card">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 class="font-black">Reglas de acceso y matrícula</h2>
          <p class="text-xs text-muted-foreground">
            La entidad decide qué unidades, especialidades o perfiles pueden tomar cada curso.
          </p>
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
        <Column header="Subunidades">
          <template #body="{ data }">{{ data.incluirDescendientes ? "Incluidas" : "No incluidas" }}</template>
        </Column>
        <Column header="Estado">
          <template #body="{ data }">
            <Tag :value="data.estado" :severity="data.estado === 'ACTIVA' ? 'success' : 'secondary'" />
          </template>
        </Column>
      </DataTable>
    </section>

    <section v-else class="overflow-hidden border border-border bg-card">
      <div class="border-b border-border p-5"><h2 class="font-black">Sedes de la entidad</h2><p class="text-xs text-muted-foreground">La ubicación se administra por separado de la jerarquía organizacional.</p></div>
      <DataTable :value="sedes" data-key="id" size="small"><Column field="nombre" header="Sede" /><Column field="ciudad" header="Ciudad" /><Column field="usuarios" header="Usuarios registrados" /><Column header="Unidades con presencia"><template #body="{ data }">{{ new Set(vinculaciones.filter((v) => v.sedeId === data.id).map((v) => v.unidadId)).size }}</template></Column></DataTable>
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
              ? `La nueva unidad compartirá el nivel jerárquico y se insertará a la ${ladoInsercion === "IZQUIERDA" ? "izquierda" : "derecha"} de la tarjeta seleccionada.`
              : "La nueva unidad dependerá directamente de la tarjeta seleccionada."
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
          <span class="filtro-label">Tipo de unidad</span>
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
          <small v-if="!esUnidadGobierno" class="mt-1 block text-[11px] text-muted-foreground">
            Solo se muestra el tipo heredado de esta rama. Puedes agregar uno nuevo sin mezclar
            configuraciones de otras ramas principales.
          </small>
        </label>
        <label class="sm:col-span-2">
          <span class="filtro-label">Descripción</span>
          <Textarea
            v-model="formularioUnidad.descripcion"
            rows="3"
            auto-resize
            class="filtro-control w-full"
            placeholder="Describe la función y el alcance de esta unidad dentro de la entidad"
          />
        </label>
        <label>
          <span class="filtro-label">Depende de</span>
          <Select v-model="formularioUnidad.unidadPadreId" :disabled="esUnidadGobierno || tipoCreacionUnidad !== 'LIBRE'" :options="[{ id: '', nombre: 'Nivel principal' }, ...unidadesPadreDisponibles]" option-label="nombre" option-value="id" class="filtro-control w-full" />
        </label>
        <label>
          <span class="filtro-label">Responsable</span>
          <Select v-model="formularioUnidad.responsableUsuarioId" :options="usuarios" option-label="nombre" :option-value="(u) => String(u.id)" filter class="filtro-control w-full" />
        </label>
        <label class="sm:col-span-2">
          <span class="filtro-label">Política de incorporación</span>
          <Select v-model="formularioUnidad.politicaIncorporacionId" :options="politicas" option-label="nombre" option-value="id" class="filtro-control w-full" />
        </label>
        <div class="sm:col-span-2 flex items-center justify-between gap-4 border border-border bg-muted/30 p-4">
          <div>
            <p class="text-sm font-black">Permitir subniveles</p>
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
                ? 'Elimina primero todos los subniveles de esta unidad'
                : 'Eliminar esta unidad'
            "
            @click="abrirConfirmacionEliminar"
          >
            <Trash2 class="h-4 w-4" />Eliminar unidad
          </Button>
          <span v-else />
          <div class="flex gap-2">
            <Button variant="outline" @click="modalUnidad = false">Cancelar</Button>
            <Button :disabled="guardando || !formularioUnidad.nombre" @click="guardarUnidad">
              {{ unidadEditandoId ? "Guardar cambios" : "Crear unidad" }}
            </Button>
          </div>
        </div>
      </template>
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
              ¿Estás seguro de eliminar {{ unidadEditando?.nombre }}?
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
            <b>Esta unidad todavía contiene subniveles.</b>
            <p class="mt-1 text-xs text-muted-foreground">
              Para conservar la integridad del organigrama, elimina primero las unidades del último
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
              {{ impactoEliminacion.personas }} personas perderán su vínculo con las unidades eliminadas
              ({{ impactoEliminacion.vinculaciones }} vinculaciones).
            </li>
            <li v-if="impactoEliminacion.reglas" class="flex gap-2">
              <span class="font-black text-red-600">•</span>
              Se actualizarán {{ impactoEliminacion.reglas }} reglas de acceso a cursos; las que queden sin destino serán desactivadas.
            </li>
            <li class="flex gap-2">
              <span class="font-black text-red-600">•</span>
              Las asignaciones de perfil vinculadas exclusivamente a estas unidades quedarán inactivas.
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
          Conservar unidad
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
      header="Nuevo tipo de unidad"
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
            placeholder="Explica para qué se utiliza este tipo de unidad"
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

    <Dialog v-model:visible="modalVinculacion" modal header="Vincular persona a una unidad" :style="{ width: 'min(38rem, calc(100vw - 2rem))' }"><div class="grid gap-4 sm:grid-cols-2"><label class="sm:col-span-2"><span class="filtro-label">Persona</span><Select v-model="formularioVinculacion.usuarioId" :options="usuarios" option-label="nombre" :option-value="(u) => String(u.id)" class="filtro-control w-full" /></label><label class="sm:col-span-2"><span class="filtro-label">Unidad</span><Select v-model="formularioVinculacion.unidadId" :options="unidades" option-label="nombre" option-value="id" class="filtro-control w-full" /></label><label><span class="filtro-label">Sede</span><Select v-model="formularioVinculacion.sedeId" :options="sedes" option-label="nombre" option-value="id" class="filtro-control w-full" /></label><label><span class="filtro-label">Tipo de vínculo</span><Select v-model="formularioVinculacion.tipo" :options="opcionesTipoVinculacion" class="filtro-control w-full" /></label></div><template #footer><Button variant="outline" @click="modalVinculacion = false">Cancelar</Button><Button @click="crearVinculacion">Vincular persona</Button></template></Dialog>

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
            filter
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
            filter
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
          Incluir subunidades
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
