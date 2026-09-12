<script setup lang="ts">
import {
  CheckCircle2,
  GitBranch,
  Search,
  UserPlus,
  UserRoundCheck,
  UsersRound,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import Tag from "primevue/tag";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import {
  organizacionService,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { PERMISOS_POR_PLANTILLA } from "@/lib/control-acceso";
import { ORG_ESTRUCTURA_SELECCIONADA_KEY } from "@/lib/constants";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { notificacionesCorreoService } from "@/api/services/notificaciones-correo.service";
import { env } from "@/lib/env";
import type {
  EstructuraOrganizacional,
  NivelOrganizacional,
  PerfilEntidad,
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";

const route = useRoute();
const { contextoActivo, tienePermiso } = useContextoSesion();

const operadorId = computed(
  () => contextoActivo.value?.usuarioId?.trim() || "",
);
const puedeCrearPerfiles = computed(
  () =>
    tienePermiso("perfiles.administrar") ||
    tienePermiso("equipos.administrar") ||
    tienePermiso("entidad.gobernar") ||
    tienePermiso("usuarios.administrar"),
);

function leerEstructuraSeleccionada() {
  const guardada = localStorage.getItem(ORG_ESTRUCTURA_SELECCIONADA_KEY);
  if (guardada) return guardada;
  const legacy = localStorage.getItem("tukuy_demo_organizacion_estructura_seleccionada");
  if (legacy) {
    localStorage.setItem(ORG_ESTRUCTURA_SELECCIONADA_KEY, legacy);
    localStorage.removeItem("tukuy_demo_organizacion_estructura_seleccionada");
  }
  return legacy;
}

const cargando = ref(true);
const mensaje = ref("");
const modalVinculacion = ref(false);
const modalSolicitudes = ref(false);

const estructuras = ref<EstructuraOrganizacional[]>([]);
const niveles = ref<NivelOrganizacional[]>([]);
const unidades = ref<UnidadOrganizacional[]>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const requiereDniEnrolamiento = ref(true);

const estructuraSeleccionadaId = ref("");
const filtrosNodosVinculaciones = ref<string[]>([]);
const filtroEstadoAsignacion = ref<"TODOS" | "SIN_ASIGNAR" | "ASIGNADOS" | "PENDIENTES">(
  "TODOS",
);
const buscarPersonaVinculacion = ref("");
const mostrarFiltrosAvanzados = ref(false);

/** Búsqueda para vincular: nombre o correo de alguien que ya tiene cuenta. */
const criterioBusqueda = ref("");
const personaEncontrada = ref<UsuarioOrganizacion | null>(null);
const candidatosVinculacion = ref<
  Array<{
    usuario: UsuarioOrganizacion;
    enDirectorioStaff: boolean;
    esAlumno: boolean;
  }>
>([]);
const errorBusqueda = ref("");
const busquedaRealizada = ref(false);
const buscandoCuenta = ref(false);
/** Si solo es alumno (u otra cuenta sin rol de staff), hay que asignar perfil. */
const requierePerfilStaff = ref(false);
const perfilesDisponibles = ref<PerfilEntidad[]>([]);
const perfilIdVinculacion = ref("");
const guardandoVinculacion = ref(false);

const opcionesEstadoAsignacion = [
  { label: "Todas las personas", value: "TODOS" as const },
  { label: "Sin asignar", value: "SIN_ASIGNAR" as const },
  { label: "Asignadas", value: "ASIGNADOS" as const },
  { label: "Solicitud pendiente", value: "PENDIENTES" as const },
];

type FilaPersonaVinculacion = {
  id: string;
  usuario: UsuarioOrganizacion;
  estadoAsignacion: "SIN_ASIGNAR" | "ASIGNADO" | "PENDIENTE";
  vinculacionPrincipal?: VinculacionUnidad;
  vinculacionPendiente?: VinculacionUnidad;
  nodosResumen: string;
  totalVinculos: number;
};

type FilaSolicitud = {
  id: string;
  tipo: "ADMISION" | "NODO";
  usuario: UsuarioOrganizacion;
  vinculacion?: VinculacionUnidad;
  detalle: string;
  origen: string;
};

const formularioVinculacion = reactive({
  usuarioId: "",
  unidadId: "",
  tipo: "PRINCIPAL" as VinculacionUnidad["tipo"],
  origen: "ASIGNACION_ADMINISTRATIVA" as VinculacionUnidad["origen"],
});
const notificarPorCorreo = ref(true);
const opcionesTipoVinculacion = ["PRINCIPAL", "SECUNDARIA", "TEMPORAL"];
const opcionesPerfilVinculacion = computed(() =>
  perfilesDisponibles.value
    .filter((perfil) => perfil.estado === "ACTIVO")
    .map((perfil) => ({
      label: `${perfil.nombre}${perfil.plantilla === "DOCENCIA" ? " (docente)" : ""}`,
      value: perfil.id,
    })),
);
const faltaPerfilDocente = computed(
  () =>
    !perfilesDisponibles.value.some(
      (perfil) =>
        perfil.estado === "ACTIVO" &&
        (perfil.plantilla === "DOCENCIA" ||
          /docente|instructor/i.test(perfil.nombre)),
    ),
);
const creandoPerfilDocente = ref(false);

function perfilDocenciaPorDefecto(lista: PerfilEntidad[]) {
  return (
    lista.find((p) => p.plantilla === "DOCENCIA" && p.estado === "ACTIVO") ??
    lista.find((p) => /docente|instructor/i.test(p.nombre) && p.estado === "ACTIVO") ??
    lista.find((p) => p.estado === "ACTIVO" && !["DIRECCION", "ADMINISTRACION"].includes(p.plantilla)) ??
    lista.find((p) => p.estado === "ACTIVO")
  );
}

async function asegurarPerfilesVinculacion() {
  try {
    perfilesDisponibles.value = await organizacionService.estructura.perfiles.listar();
  } catch {
    perfilesDisponibles.value = [];
  }
}

async function crearPerfilDocenteDesdeVinculacion() {
  if (!puedeCrearPerfiles.value) {
    toast.error(
      "Tu rol no puede crear perfiles. Pide a Dirección o Administración que cree el perfil Docente en Estructura → Perfiles.",
    );
    return;
  }
  creandoPerfilDocente.value = true;
  try {
    const creado = await organizacionService.estructura.perfiles.crear({
      id: `perfil-docente-${Date.now()}`,
      nombre: "Docente",
      descripcion: "Imparte cursos, evalúa estudiantes y gestiona su portal docente.",
      tipo: "PERSONALIZADO",
      plantilla: "DOCENCIA",
      nivelAutoridad: 400,
      permisos: [...PERMISOS_POR_PLANTILLA.DOCENCIA],
      alcanceDefecto: "CURSOS_PROPIOS",
      rutaInicial: "/docente/inicio",
      esSistema: false,
      estado: "ACTIVO",
    });
    await asegurarPerfilesVinculacion();
    const docencia =
      perfilesDisponibles.value.find((p) => p.id === creado.id) ??
      perfilDocenciaPorDefecto(perfilesDisponibles.value);
    perfilIdVinculacion.value = docencia?.id ?? creado.id;
    toast.success("Perfil Docente creado. Ya puedes incorporarlo.");
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "No se pudo crear el perfil Docente.",
    );
  } finally {
    creandoPerfilDocente.value = false;
  }
}

onMounted(cargar);

async function cargar() {
  try {
    // Primero el directorio (RPC cacheado): desbloquea la tabla cuanto antes.
    usuarios.value = await organizacionService.usuarios.listar();
    cargando.value = false;

    const [snap, configuracion] = await Promise.all([
      organizacionService.estructura.obtenerSnapshot(),
      organizacionService.obtenerConfiguracion(),
    ]);
    estructuras.value = snap.estructuras;
    niveles.value = snap.niveles;
    unidades.value = snap.unidades;
    vinculaciones.value = snap.vinculaciones;
    requiereDniEnrolamiento.value = configuracion.requiereDniEnrolamiento;

    const guardadaId = leerEstructuraSeleccionada();
    if (guardadaId && estructuras.value.some((e) => e.id === guardadaId && !e.esSistema)) {
      estructuraSeleccionadaId.value = guardadaId;
    } else {
      estructuraSeleccionadaId.value =
        estructuras.value.find((item) => !item.esSistema && item.estado === "ACTIVA")?.id ?? "";
    }

    const unidadQuery = String(route.query.unidad ?? "").trim();
    const unidadDestino = unidadQuery
      ? unidades.value.find((unidad) => unidad.id === unidadQuery)
      : undefined;
    if (unidadDestino) {
      estructuraSeleccionadaId.value = unidadDestino.estructuraId ?? estructuraSeleccionadaId.value;
      await nextTick();
      filtrosNodosVinculaciones.value = rutaIdsUnidad(unidadDestino.id);
      toast.success(`Mostrando personas de “${unidadDestino.nombre}”.`);
    }
  } catch (error) {
    toast.success(error instanceof Error
        ? error.message
        : "No se pudo cargar el directorio de personas");
  } finally {
    cargando.value = false;
  }
}

watch(estructuraSeleccionadaId, (nuevoId) => {
  filtrosNodosVinculaciones.value = [];
  if (nuevoId) {
    localStorage.setItem(ORG_ESTRUCTURA_SELECCIONADA_KEY, nuevoId);
  }
});

async function recargarDirectorio() {
  const [snap, listaUsuarios] = await Promise.all([
    organizacionService.estructura.obtenerSnapshot(true),
    organizacionService.usuarios.listar(true),
  ]);
  estructuras.value = snap.estructuras;
  niveles.value = snap.niveles;
  unidades.value = snap.unidades;
  vinculaciones.value = snap.vinculaciones;
  usuarios.value = listaUsuarios;
}

const usuariosPorId = computed(
  () => new Map(usuarios.value.map((usuario) => [String(usuario.id), usuario])),
);
const unidadesPorId = computed(
  () => new Map(unidades.value.map((unidad) => [unidad.id, unidad])),
);
const estructurasConfigurables = computed(() =>
  estructuras.value.filter((item) => !item.esSistema && item.estado === "ACTIVA"),
);
const nivelesEstructura = computed(() =>
  niveles.value
    .filter(
      (item) =>
        item.estructuraId === estructuraSeleccionadaId.value && item.estado === "ACTIVO",
    )
    .sort((a, b) => a.orden - b.orden),
);
const unidadesEstructura = computed(() =>
  unidades.value.filter(
    (item) => item.estructuraId === estructuraSeleccionadaId.value && !item.esSistema,
  ),
);

function rutaIdsUnidad(id: string): string[] {
  const cadena: string[] = [];
  let actual = unidadesPorId.value.get(id);
  while (actual) {
    cadena.unshift(actual.id);
    actual = actual.unidadPadreId ? unidadesPorId.value.get(actual.unidadPadreId) : undefined;
  }
  return cadena;
}

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

const vinculacionesActivas = computed(() =>
  vinculaciones.value.filter((item) => item.estado === "ACTIVA"),
);
const filtrosJerarquicosVinculaciones = computed(() => {
  const nivelesOrdenados = nivelesEstructura.value;
  const nodosActivos = unidadesEstructura.value.filter(
    (item) => item.estado === "ACTIVA",
  );
  const primerNivel = nivelesOrdenados[0];
  if (!primerNivel) return [];

  const filtros: Array<{
    nivelId: string;
    nombre: string;
    orden: number;
    opciones: UnidadOrganizacional[];
  }> = [
    {
      nivelId: primerNivel.id,
      nombre: primerNivel.nombre,
      orden: primerNivel.orden,
      opciones: nodosActivos
        .filter(
          (nodo) =>
            nodo.nivelId === primerNivel.id && !nodo.unidadPadreId,
        )
        .sort((a, b) => a.orden - b.orden),
    },
  ];

  let indiceFiltro = 0;
  while (indiceFiltro < filtros.length) {
    const nodoSeleccionadoId = filtrosNodosVinculaciones.value[indiceFiltro];
    if (!nodoSeleccionadoId) break;

    const hijosDirectos = nodosActivos.filter(
      (nodo) => nodo.unidadPadreId === nodoSeleccionadoId,
    );
    if (!hijosDirectos.length) break;

    const siguienteNivel = nivelesOrdenados.find(
      (nivel) =>
        nivel.orden > filtros[indiceFiltro]!.orden &&
        hijosDirectos.some((nodo) => nodo.nivelId === nivel.id),
    );
    if (!siguienteNivel) break;

    filtros.push({
      nivelId: siguienteNivel.id,
      nombre: siguienteNivel.nombre,
      orden: siguienteNivel.orden,
      opciones: hijosDirectos
        .filter((nodo) => nodo.nivelId === siguienteNivel.id)
        .sort((a, b) => a.orden - b.orden),
    });
    indiceFiltro += 1;
  }

  return filtros;
});
const vinculacionesFiltradasPorNodo = computed(() => {
  const idsEstructura = new Set(
    unidadesEstructura.value.map((nodo) => nodo.id),
  );
  const vinculacionesDeEstructura = vinculaciones.value.filter(
    (vinculacion) =>
      !estructuraSeleccionadaId.value ||
      idsEstructura.has(vinculacion.unidadId),
  );
  const ultimoNodoSeleccionado = [...filtrosNodosVinculaciones.value]
    .reverse()
    .find(Boolean);
  if (!ultimoNodoSeleccionado) return vinculacionesDeEstructura;

  const ramaSeleccionada = idsUnidadYDescendientes(ultimoNodoSeleccionado);
  return vinculacionesDeEstructura.filter((vinculacion) =>
    ramaSeleccionada.has(vinculacion.unidadId),
  );
});

const filasPersonasVinculacion = computed<FilaPersonaVinculacion[]>(() => {
  const vinculosPorUsuario = new Map<string, VinculacionUnidad[]>();
  for (const vinculacion of vinculaciones.value) {
    const lista = vinculosPorUsuario.get(vinculacion.usuarioId) ?? [];
    lista.push(vinculacion);
    vinculosPorUsuario.set(vinculacion.usuarioId, lista);
  }

  const idsEnRamaFiltrada = new Set(
    vinculacionesFiltradasPorNodo.value.map((item) => item.usuarioId),
  );
  const hayFiltroNodo = filtrosNodosVinculaciones.value.some(Boolean);
  const texto = buscarPersonaVinculacion.value.trim().toLowerCase();

  return usuarios.value
    .map((usuario) => {
      const id = String(usuario.id);
      const vinculos = vinculosPorUsuario.get(id) ?? [];
      const activas = vinculos.filter((item) => item.estado === "ACTIVA");
      const pendientes = vinculos.filter((item) => item.estado === "PENDIENTE");
      const estadoAsignacion: FilaPersonaVinculacion["estadoAsignacion"] =
        activas.length > 0
          ? "ASIGNADO"
          : pendientes.length > 0
            ? "PENDIENTE"
            : "SIN_ASIGNAR";
      const vinculacionPrincipal =
        activas.find((item) => item.tipo === "PRINCIPAL") ?? activas[0];
      const nodosResumen = activas.length
        ? activas.map((item) => nombreUnidad(item.unidadId)).join(" · ")
        : pendientes.length
          ? pendientes.map((item) => nombreUnidad(item.unidadId)).join(" · ")
          : "Sin nodo";

      return {
        id,
        usuario,
        estadoAsignacion,
        vinculacionPrincipal,
        vinculacionPendiente: pendientes[0],
        nodosResumen,
        totalVinculos: vinculos.length,
      };
    })
    .filter((fila) => {
      if (filtroEstadoAsignacion.value === "SIN_ASIGNAR") {
        return fila.estadoAsignacion === "SIN_ASIGNAR";
      }
      if (filtroEstadoAsignacion.value === "ASIGNADOS") {
        if (fila.estadoAsignacion !== "ASIGNADO") return false;
        return !hayFiltroNodo || idsEnRamaFiltrada.has(fila.id);
      }
      if (filtroEstadoAsignacion.value === "PENDIENTES") {
        if (fila.estadoAsignacion !== "PENDIENTE") return false;
        return !hayFiltroNodo || idsEnRamaFiltrada.has(fila.id);
      }
      // TODOS: con filtro de nodo solo quienes tienen vínculo en la rama;
      // sin filtro de nodo, toda la entidad.
      if (hayFiltroNodo && fila.estadoAsignacion === "SIN_ASIGNAR") return false;
      if (hayFiltroNodo && !idsEnRamaFiltrada.has(fila.id)) return false;
      return true;
    })
    .filter((fila) => {
      if (!texto) return true;
      return (
        fila.usuario.nombre.toLowerCase().includes(texto) ||
        fila.usuario.correo.toLowerCase().includes(texto) ||
        fila.usuario.iniciales.toLowerCase().includes(texto) ||
        (fila.usuario.dni ?? "").toLowerCase().includes(texto)
      );
    })
    .sort((a, b) => a.usuario.nombre.localeCompare(b.usuario.nombre, "es"));
});

const resumenFiltroVinculaciones = computed(() => {
  const total = filasPersonasVinculacion.value.length;
  const sinAsignar = filasPersonasVinculacion.value.filter(
    (fila) => fila.estadoAsignacion === "SIN_ASIGNAR",
  ).length;
  const asignadas = filasPersonasVinculacion.value.filter(
    (fila) => fila.estadoAsignacion === "ASIGNADO",
  ).length;
  const pendientes = filasPersonasVinculacion.value.filter(
    (fila) => fila.estadoAsignacion === "PENDIENTE",
  ).length;
  return { total, sinAsignar, asignadas, pendientes };
});

const solicitudesPendientes = computed(() =>
  vinculaciones.value.filter((item) => item.estado === "PENDIENTE"),
);
const usuariosVinculados = computed(
  () => new Set(vinculacionesActivas.value.map((item) => item.usuarioId)).size,
);

const nodosDisponiblesVinculacion = computed(() =>
  unidadesEstructura.value
    .filter((nodo) => nodo.estado === "ACTIVA")
    .sort((a, b) => {
      const ordenNivelA = niveles.value.find((nivel) => nivel.id === a.nivelId)?.orden ?? 0;
      const ordenNivelB = niveles.value.find((nivel) => nivel.id === b.nivelId)?.orden ?? 0;
      return ordenNivelA - ordenNivelB || a.orden - b.orden;
    }),
);

const pendientesAdmision = computed(() =>
  usuarios.value
    .filter((usuario) => usuario.estado === "INVITADO")
    .sort((a, b) => {
      const peso = (u: UsuarioOrganizacion) => (u.origenIngreso === "COMUNIDAD" ? 0 : 1);
      return peso(a) - peso(b) || a.nombre.localeCompare(b.nombre, "es");
    }),
);

/** Cola unificada: admisión de invitados + solicitudes de nodo de miembros activos. */
const filasSolicitudes = computed((): FilaSolicitud[] => {
  const admisiones: FilaSolicitud[] = pendientesAdmision.value.map((usuario) => ({
    id: `admision-${usuario.id}`,
    tipo: "ADMISION" as const,
    usuario,
    detalle:
      usuario.origenIngreso === "COMUNIDAD"
        ? "Pidió unirse desde Comunidad"
        : "Pendiente de aceptación en la entidad",
    origen:
      usuario.origenIngreso === "COMUNIDAD"
        ? "Comunidad"
        : usuario.origenIngreso === "INVITACION_ADMIN"
          ? "Invitación"
          : "Directorio",
  }));

  const nodos: FilaSolicitud[] = [];
  for (const vinculacion of solicitudesPendientes.value) {
    const usuario = usuariosPorId.value.get(vinculacion.usuarioId);
    if (!usuario || usuario.estado === "INVITADO") continue;
    nodos.push({
      id: `nodo-${vinculacion.id}`,
      tipo: "NODO",
      usuario,
      vinculacion,
      detalle: `Solicita pertenecer a ${nombreUnidad(vinculacion.unidadId)}`,
      origen:
        vinculacion.origen === "SOLICITUD_USUARIO" ? "Solicitud" : "Admin",
    });
  }

  return [...admisiones, ...nodos];
});

const totalSolicitudes = computed(() => filasSolicitudes.value.length);

function actualizarFiltroNodoVinculacion(
  indice: number,
  nodoId: string | null | undefined,
) {
  filtrosNodosVinculaciones.value.splice(
    indice,
    filtrosNodosVinculaciones.value.length - indice,
    nodoId ?? "",
  );
}

function limpiarFiltrosVinculaciones() {
  filtrosNodosVinculaciones.value = [];
  filtroEstadoAsignacion.value = "TODOS";
  buscarPersonaVinculacion.value = "";
}

function etiquetaEstadoAsignacion(
  estado: FilaPersonaVinculacion["estadoAsignacion"],
) {
  if (estado === "SIN_ASIGNAR") return "Sin asignar";
  if (estado === "PENDIENTE") return "Pendiente";
  return "Asignada";
}

function severidadEstadoAsignacion(
  estado: FilaPersonaVinculacion["estadoAsignacion"],
) {
  if (estado === "SIN_ASIGNAR") return "secondary";
  if (estado === "PENDIENTE") return "warn";
  return "success";
}

function nombreUnidad(id: string) {
  return unidadesPorId.value.get(id)?.nombre ?? "Nodo no disponible";
}

function resetBusquedaVinculacion() {
  criterioBusqueda.value = "";
  personaEncontrada.value = null;
  candidatosVinculacion.value = [];
  errorBusqueda.value = "";
  busquedaRealizada.value = false;
  buscandoCuenta.value = false;
  requierePerfilStaff.value = false;
  perfilIdVinculacion.value = "";
  Object.assign(formularioVinculacion, {
    usuarioId: "",
    unidadId: nodosDisponiblesVinculacion.value[0]?.id ?? "",
    tipo: "PRINCIPAL",
    origen: "ASIGNACION_ADMINISTRATIVA",
  });
}

function abrirSolicitudes() {
  modalSolicitudes.value = true;
}

function inicialesDeNombre(nombre: string) {
  return (
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0] ?? "")
      .join("")
      .toUpperCase() || "UT"
  );
}

async function seleccionarCandidatoVinculacion(entrada: {
  usuario: UsuarioOrganizacion;
  enDirectorioStaff: boolean;
  esAlumno: boolean;
}) {
  if (entrada.usuario.estado === "SUSPENDIDO") {
    errorBusqueda.value =
      "Esta cuenta está suspendida. Reactívala antes de vincularla a un nodo.";
    personaEncontrada.value = null;
    formularioVinculacion.usuarioId = "";
    return;
  }
  errorBusqueda.value = "";
  personaEncontrada.value = entrada.usuario;
  formularioVinculacion.usuarioId = String(entrada.usuario.id);
  const yaTieneActiva = vinculaciones.value.some(
    (item) =>
      item.usuarioId === String(entrada.usuario.id) && item.estado === "ACTIVA",
  );
  formularioVinculacion.tipo = yaTieneActiva ? "SECUNDARIA" : "PRINCIPAL";
  requierePerfilStaff.value = !entrada.enDirectorioStaff;
  if (requierePerfilStaff.value) {
    await asegurarPerfilesVinculacion();
    perfilIdVinculacion.value =
      perfilDocenciaPorDefecto(perfilesDisponibles.value)?.id ?? "";
  } else {
    perfilIdVinculacion.value = "";
  }
}

async function abrirVinculacion(usuario?: UsuarioOrganizacion) {
  resetBusquedaVinculacion();
  const nodoFiltrado = [...filtrosNodosVinculaciones.value]
    .reverse()
    .find(Boolean);
  const nodoInicial = nodosDisponiblesVinculacion.value.some(
    (nodo) => nodo.id === nodoFiltrado,
  )
    ? nodoFiltrado
    : nodosDisponiblesVinculacion.value[0]?.id;

  formularioVinculacion.unidadId = nodoInicial ?? "";

  if (usuario) {
    busquedaRealizada.value = true;
    criterioBusqueda.value = usuario.correo || usuario.nombre;
    await seleccionarCandidatoVinculacion({
      usuario,
      enDirectorioStaff: true,
      esAlumno: false,
    });
  }

  modalVinculacion.value = true;
  await asegurarPerfilesVinculacion();
}

async function buscarPersonaParaVincular() {
  errorBusqueda.value = "";
  personaEncontrada.value = null;
  candidatosVinculacion.value = [];
  requierePerfilStaff.value = false;
  perfilIdVinculacion.value = "";
  formularioVinculacion.usuarioId = "";
  busquedaRealizada.value = true;
  const texto = criterioBusqueda.value.trim().toLowerCase();
  if (!texto) {
    errorBusqueda.value = "Ingresa un nombre o un correo para buscar.";
    return;
  }
  if (texto.length < 2) {
    errorBusqueda.value = "Escribe al menos 2 caracteres.";
    return;
  }

  const enDirectorio = usuarios.value
    .filter((usuario) => {
      return (
        usuario.correo.trim().toLowerCase().includes(texto) ||
        usuario.nombre.trim().toLowerCase().includes(texto)
      );
    })
    .slice(0, 12)
    .map((usuario) => ({
      usuario,
      enDirectorioStaff: true,
      esAlumno: false,
    }));

  buscandoCuenta.value = true;
  try {
    const cuentas = await organizacionService.usuarios.buscarCuentaRegistrada(
      criterioBusqueda.value.trim(),
    );
    const idsLocales = new Set(enDirectorio.map((c) => String(c.usuario.id)));
    const remotas = cuentas
      .filter((cuenta) => cuenta.identidadId && !idsLocales.has(cuenta.identidadId))
      .map((cuenta) => ({
        usuario: {
          id: cuenta.identidadId,
          nombre: cuenta.nombre,
          iniciales: inicialesDeNombre(cuenta.nombre),
          correo: cuenta.correo,
          area:
            cuenta.esAlumno && !cuenta.enDirectorioStaff
              ? "Alumno"
              : "Cuenta Tukuy",
          sede: "—",
          rol:
            cuenta.roles.map((r) => r.nombre).filter(Boolean).join(", ") ||
            (cuenta.esAlumno ? "Alumno" : "Sin perfil de equipo"),
          progreso: 0,
          estado: "ACTIVO" as const,
          origenIngreso: "INVITACION_ADMIN" as const,
        },
        enDirectorioStaff: cuenta.enDirectorioStaff,
        esAlumno: cuenta.esAlumno,
      }));

    candidatosVinculacion.value = [...enDirectorio, ...remotas];
    if (!candidatosVinculacion.value.length) {
      errorBusqueda.value =
        "No hay nadie con ese nombre o correo registrado en Tukuy. La persona debe crear su cuenta (correo o Google) o pedir unirse desde Comunidad.";
      return;
    }
    if (candidatosVinculacion.value.length === 1) {
      await seleccionarCandidatoVinculacion(candidatosVinculacion.value[0]!);
    }
  } catch (error) {
    errorBusqueda.value =
      error instanceof Error
        ? error.message
        : "No se pudo buscar la cuenta en Tukuy.";
  } finally {
    buscandoCuenta.value = false;
  }
}

async function crearVinculacion() {
  if (!formularioVinculacion.usuarioId || !formularioVinculacion.unidadId) return;
  if (requierePerfilStaff.value && !perfilIdVinculacion.value) {
    toast.error(
      "Elige un perfil (por ejemplo Docente) para incorporar a la persona.",
    );
    return;
  }
  const persona = personaEncontrada.value;
  const unidad = unidadesPorId.value.get(formularioVinculacion.unidadId);
  const fueIncorporacion = requierePerfilStaff.value;
  guardandoVinculacion.value = true;
  try {
    if (fueIncorporacion && persona?.correo) {
      await organizacionService.incorporarPersona({
        nombre: persona.nombre,
        correo: persona.correo,
        unidadId: formularioVinculacion.unidadId,
        perfilId: perfilIdVinculacion.value,
      });
    } else {
      await organizacionService.estructura.vincularPersonaANodo({
        usuarioId: formularioVinculacion.usuarioId,
        unidadId: formularioVinculacion.unidadId,
        tipo: formularioVinculacion.tipo,
        origen: formularioVinculacion.origen,
        aprobadaPor: operadorId.value || undefined,
      });
    }
    await recargarDirectorio();
    modalVinculacion.value = false;
    toast.success(
      fueIncorporacion
        ? "La persona fue incorporada al equipo y vinculada al nodo."
        : "La persona fue vinculada al nodo seleccionado.",
    );

    if (
      notificarPorCorreo.value &&
      persona?.correo &&
      unidad &&
      formularioVinculacion.origen !== "SOLICITUD_USUARIO"
    ) {
      const resultado = await notificacionesCorreoService.enviarNodoAsignado({
        para: persona.correo,
        datos: {
          nombrePersona: persona.nombre,
          nombreOrganizacion:
            contextoActivo.value?.organizacionNombre?.trim() ||
            "tu organización",
          nombreNodo: unidad.nombre,
          urlPortal: env.appUrl,
        },
      });
      if (!resultado.ok) {
        toast.warning(
          resultado.error
            ? `Vinculación guardada, pero el correo no se envió: ${resultado.error}`
            : "Vinculación guardada, pero el correo no se envió.",
        );
      } else {
        toast.success("Correo de asignación enviado.");
      }
    }
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "No se pudo crear la vinculación.",
    );
  } finally {
    guardandoVinculacion.value = false;
  }
}

async function aprobarSolicitud(vinculacion: VinculacionUnidad) {
  await organizacionService.estructura.aprobarVinculacion(
    vinculacion.id,
    operadorId.value,
  );
  await recargarDirectorio();
  toast.success("La solicitud de nodo fue aprobada.");
}

async function activarIncorporacion(usuario: UsuarioOrganizacion) {
  const actualizado = await organizacionService.activarIncorporacion(
    String(usuario.id),
    operadorId.value,
  );
  const posicion = usuarios.value.findIndex((item) => item.id === usuario.id);
  if (posicion >= 0) usuarios.value[posicion] = actualizado;
  await recargarDirectorio();
  toast.success(`${actualizado.nombre}: ingreso aceptado.`);
  if (!filasSolicitudes.value.length) modalSolicitudes.value = false;
}

async function resolverSolicitud(fila: FilaSolicitud) {
  if (fila.tipo === "ADMISION") {
    await activarIncorporacion(fila.usuario);
    return;
  }
  if (fila.vinculacion) {
    await aprobarSolicitud(fila.vinculacion);
    if (!filasSolicitudes.value.length) modalSolicitudes.value = false;
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <TituloConAyuda
          eyebrow="Gobierno institucional"
          titulo="Usuarios"
          ayuda="Personal y colaboradores con acceso al portal. Aprueba solicitudes de ingreso, asigna personas a nodos y vincula cuentas. Los alumnos se gestionan en la sección Alumnos."
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="abrirSolicitudes">
          <UserRoundCheck class="h-4 w-4" />
          Solicitudes
          <Badge
            v-if="totalSolicitudes"
            variant="outline"
            class="ml-1 border-accent/40 bg-accent/15 text-[#B87A00]"
          >
            {{ totalSolicitudes }}
          </Badge>
        </Button>
        <Button @click="abrirVinculacion()">
          <UserPlus class="h-4 w-4" />
          Vincular
        </Button>
      </div>
    </header>

    <p v-if="mensaje" class="border-l-4 border-l-emerald-600 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{{ mensaje }}</p>

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-24 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card class="border-border border-t-4 border-t-primary bg-card">
        <CardContent class="flex items-center gap-4 p-5">
          <span class="grid h-11 w-11 place-items-center bg-primary/10 text-primary">
            <UsersRound class="h-5 w-5" />
          </span>
          <div>
            <strong class="text-2xl">{{ usuarios.length }}</strong>
            <p class="text-xs text-muted-foreground">Personas registradas</p>
          </div>
        </CardContent>
      </Card>
      <Card class="border-border border-t-4 border-t-primary bg-card">
        <CardContent class="flex items-center gap-4 p-5">
          <span class="grid h-11 w-11 place-items-center bg-primary/10 text-primary">
            <GitBranch class="h-5 w-5" />
          </span>
          <div>
            <strong class="text-2xl">{{ usuariosVinculados }}</strong>
            <p class="text-xs text-muted-foreground">Vinculadas a un nodo</p>
          </div>
        </CardContent>
      </Card>
      <button type="button" class="text-left" @click="abrirSolicitudes">
        <Card class="h-full border-border border-t-4 border-t-accent bg-card transition hover:bg-muted/30">
          <CardContent class="flex items-center gap-4 p-5">
            <span class="grid h-11 w-11 place-items-center bg-accent/20 text-[#B87A00]">
              <UserRoundCheck class="h-5 w-5" />
            </span>
            <div>
              <strong class="text-2xl">{{ totalSolicitudes }}</strong>
              <p class="text-xs text-muted-foreground">Solicitudes pendientes</p>
            </div>
          </CardContent>
        </Card>
      </button>
      <button type="button" class="text-left" @click="abrirVinculacion()">
        <Card class="h-full border-border border-t-4 border-t-primary bg-card transition hover:bg-muted/30">
          <CardContent class="flex items-center gap-4 p-5">
            <span class="grid h-11 w-11 place-items-center bg-primary/10 text-primary">
              <UserPlus class="h-5 w-5" />
            </span>
            <div>
              <strong class="text-2xl">{{ resumenFiltroVinculaciones.sinAsignar }}</strong>
              <p class="text-xs text-muted-foreground">Sin nodo · Vincular</p>
            </div>
          </CardContent>
        </Card>
      </button>
    </div>

    <section class="overflow-hidden border border-border bg-card">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 class="font-black">Directorio de personas</h2>
          <p class="text-xs text-muted-foreground">
            Busca por nombre o correo y asigna nodos. Los filtros por rama son opcionales.
          </p>
        </div>
      </div>
      <div class="border-b border-border bg-muted/20 p-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid min-w-0 gap-1.5">
            <span class="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
              Buscar
            </span>
            <div class="relative">
              <Search class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <InputText
                v-model="buscarPersonaVinculacion"
                class="filtro-control w-full pl-10"
                placeholder="Nombre o correo"
              />
            </div>
          </label>
          <label class="grid min-w-0 gap-1.5">
            <span class="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
              Asignación
            </span>
            <Select
              v-model="filtroEstadoAsignacion"
              :options="opcionesEstadoAsignacion"
              option-label="label"
              option-value="value"
              class="filtro-control w-full min-w-0"
            />
          </label>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            @click="mostrarFiltrosAvanzados = !mostrarFiltrosAvanzados"
          >
            {{ mostrarFiltrosAvanzados ? "Ocultar filtros por rama" : "Filtrar por rama" }}
          </Button>
          <p class="text-xs text-muted-foreground">
            {{ resumenFiltroVinculaciones.total }} personas
            <template v-if="resumenFiltroVinculaciones.sinAsignar">
              · {{ resumenFiltroVinculaciones.sinAsignar }} sin nodo
            </template>
          </p>
          <Button
            v-if="
              filtroEstadoAsignacion !== 'TODOS' ||
              buscarPersonaVinculacion ||
              filtrosNodosVinculaciones.some(Boolean)
            "
            size="sm"
            variant="ghost"
            class="ml-auto"
            @click="limpiarFiltrosVinculaciones"
          >
            Limpiar
          </Button>
        </div>
        <div
          v-if="mostrarFiltrosAvanzados"
          class="mt-3 grid gap-3 border-t border-border pt-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]"
        >
          <label v-if="estructurasConfigurables.length > 1" class="grid min-w-0 gap-1.5">
            <span class="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
              Estructura
            </span>
            <Select
              v-model="estructuraSeleccionadaId"
              :options="estructurasConfigurables"
              option-label="nombre"
              option-value="id"
              class="filtro-control w-full min-w-0"
            />
          </label>
          <label
            v-for="(filtro, indice) in filtrosJerarquicosVinculaciones"
            :key="filtro.nivelId"
            class="grid min-w-0 gap-1.5"
          >
            <span class="truncate text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
              {{ filtro.nombre }}
            </span>
            <Select
              v-model="filtrosNodosVinculaciones[indice]"
              :options="filtro.opciones"
              option-label="nombre"
              option-value="id"
              :placeholder="`Todos en ${filtro.nombre}`"
              :disabled="filtroEstadoAsignacion === 'SIN_ASIGNAR'"
              show-clear
              class="filtro-control w-full min-w-0"
              @update:model-value="actualizarFiltroNodoVinculacion(indice, $event)"
            />
          </label>
        </div>
      </div>
      <DataTable
        :value="filasPersonasVinculacion"
        data-key="id"
        size="small"
        :paginator="filasPersonasVinculacion.length > 10"
        :rows="10"
        table-style="min-width: 48rem"
      >
        <template #empty>
          <div class="py-10 text-center text-sm text-muted-foreground">
            No hay personas con los filtros actuales.
          </div>
        </template>
        <Column header="Persona" style="min-width: 16rem">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <span class="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-xs font-black text-primary">
                {{ data.usuario.iniciales }}
              </span>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <b>{{ data.usuario.nombre }}</b>
                  <Tag
                    v-if="data.usuario.estado !== 'ACTIVO'"
                    :value="data.usuario.estado"
                    :severity="data.usuario.estado === 'INVITADO' ? 'info' : 'secondary'"
                    class="text-[10px]"
                  />
                </div>
                <p class="text-xs text-muted-foreground">{{ data.usuario.correo }}</p>
                <p
                  v-if="data.usuario.dni || requiereDniEnrolamiento"
                  class="text-[11px]"
                  :class="
                    requiereDniEnrolamiento && !data.usuario.dni
                      ? 'font-semibold text-amber-700'
                      : 'text-muted-foreground'
                  "
                >
                  DNI {{ data.usuario.dni || "pendiente" }}
                </p>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Nodo" style="min-width: 14rem">
          <template #body="{ data }">
            <b class="block text-sm">{{ data.nodosResumen }}</b>
          </template>
        </Column>
        <Column header="Estado" style="min-width: 8rem">
          <template #body="{ data }">
            <Tag
              :value="etiquetaEstadoAsignacion(data.estadoAsignacion)"
              :severity="severidadEstadoAsignacion(data.estadoAsignacion)"
            />
          </template>
        </Column>
        <Column header="" style="min-width: 11rem">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-2">
              <Button
                v-if="data.estadoAsignacion === 'PENDIENTE' && data.vinculacionPendiente"
                size="sm"
                variant="outline"
                @click="aprobarSolicitud(data.vinculacionPendiente)"
              >
                <CheckCircle2 class="h-4 w-4" />Aprobar
              </Button>
              <Button
                v-if="data.usuario.estado === 'INVITADO'"
                size="sm"
                variant="outline"
                @click="activarIncorporacion(data.usuario)"
              >
                <UserRoundCheck class="h-4 w-4" />
                Aceptar
              </Button>
              <Button size="sm" @click="abrirVinculacion(data.usuario)">
                <UserPlus class="h-4 w-4" />
                {{ data.estadoAsignacion === "SIN_ASIGNAR" ? "Asignar" : "Vincular" }}
              </Button>
            </div>
          </template>
        </Column>
      </DataTable>
    </section>

    <!-- Solicitudes -->
    <Dialog
      v-model:visible="modalSolicitudes"
      modal
      header="Solicitudes pendientes"
      :style="{ width: 'min(56rem, calc(100vw - 2rem))' }"
      :pt="{
        root: { class: 'rounded-none' },
        header: { class: 'rounded-none border-b border-border' },
        content: { class: 'rounded-none' },
      }"
    >
      <p class="mb-4 text-sm text-muted-foreground">
        Admisión a la entidad (cuenta ya creada por la persona) y solicitudes de
        nodo. No se crean cuentas desde aquí.
      </p>
      <DataTable
        :value="filasSolicitudes"
        data-key="id"
        size="small"
        :paginator="filasSolicitudes.length > 6"
        :rows="6"
        table-style="min-width: 40rem"
      >
        <template #empty>
          <div class="py-10 text-center text-sm text-muted-foreground">
            No hay solicitudes pendientes.
          </div>
        </template>
        <Column header="Persona" style="min-width: 14rem">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <span
                class="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-xs font-black text-primary"
              >
                {{ data.usuario.iniciales }}
              </span>
              <div>
                <b class="block text-sm">{{ data.usuario.nombre }}</b>
                <p class="text-xs text-muted-foreground">
                  {{ data.usuario.correo }}
                  <span v-if="data.usuario.dni"> · DNI {{ data.usuario.dni }}</span>
                </p>
              </div>
            </div>
          </template>
        </Column>
        <Column header="Tipo" style="min-width: 8rem">
          <template #body="{ data }">
            <Tag
              :value="data.tipo === 'ADMISION' ? 'Admisión' : 'Nodo'"
              :severity="data.tipo === 'ADMISION' ? 'warn' : 'info'"
            />
          </template>
        </Column>
        <Column header="Detalle" style="min-width: 14rem">
          <template #body="{ data }">
            <p class="text-sm">{{ data.detalle }}</p>
            <p class="text-[11px] text-muted-foreground">Origen: {{ data.origen }}</p>
          </template>
        </Column>
        <Column header="Acción" style="min-width: 10rem">
          <template #body="{ data }">
            <Button size="sm" @click="resolverSolicitud(data)">
              <CheckCircle2 class="h-4 w-4" />
              {{ data.tipo === "ADMISION" ? "Aceptar ingreso" : "Aprobar nodo" }}
            </Button>
          </template>
        </Column>
      </DataTable>
      <template #footer>
        <Button variant="outline" @click="modalSolicitudes = false">Cerrar</Button>
      </template>
    </Dialog>

    <!-- Vincular por nombre / correo -->
    <Dialog
      v-model:visible="modalVinculacion"
      modal
      header="Vincular a la organización"
      :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
      :pt="{
        root: { class: 'rounded-none' },
        header: { class: 'rounded-none border-b border-border' },
        content: { class: 'rounded-none' },
      }"
    >
      <div class="grid gap-4">
        <div class="border-l-4 border-l-primary bg-primary/8 p-4 text-sm">
          <b>Busca una cuenta existente</b>
          <p class="mt-1 text-xs text-muted-foreground">
            Busca por nombre o correo. Sirve aunque la persona figure solo como
            alumno: eliges un perfil (p. ej. Docente) y se incorpora al nodo.
          </p>
        </div>

        <label class="grid gap-2">
          <span class="filtro-label">Nombre o correo</span>
          <div class="flex gap-2">
            <div class="relative min-w-0 flex-1">
              <Search
                class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <InputText
                v-model="criterioBusqueda"
                class="filtro-control w-full pl-10"
                placeholder="Ej. María Pérez o correo@dominio.com"
                :disabled="buscandoCuenta || guardandoVinculacion"
                @keyup.enter="buscarPersonaParaVincular"
              />
            </div>
            <Button
              type="button"
              :disabled="buscandoCuenta || guardandoVinculacion"
              @click="buscarPersonaParaVincular"
            >
              {{ buscandoCuenta ? "Buscando…" : "Buscar" }}
            </Button>
          </div>
        </label>

        <p v-if="errorBusqueda" class="border border-border border-l-4 border-l-accent bg-accent/10 px-3 py-2 text-xs text-[#7A5600]">
          {{ errorBusqueda }}
        </p>

        <div
          v-if="candidatosVinculacion.length > 1"
          class="grid max-h-48 gap-2 overflow-y-auto"
        >
          <button
            v-for="candidato in candidatosVinculacion"
            :key="String(candidato.usuario.id)"
            type="button"
            class="flex items-center gap-3 border border-border px-3 py-2 text-left transition hover:border-primary/40 hover:bg-primary/5"
            :class="
              String(personaEncontrada?.id) === String(candidato.usuario.id)
                ? 'border-l-4 border-l-primary bg-primary/5'
                : ''
            "
            @click="seleccionarCandidatoVinculacion(candidato)"
          >
            <span
              class="grid h-9 w-9 place-items-center bg-primary/10 text-[10px] font-black text-primary"
            >
              {{ candidato.usuario.iniciales }}
            </span>
            <span class="min-w-0 flex-1">
              <b class="block truncate text-sm">{{ candidato.usuario.nombre }}</b>
              <span class="block truncate text-xs text-muted-foreground">
                {{ candidato.usuario.correo }}
                <template v-if="candidato.esAlumno && !candidato.enDirectorioStaff">
                  · Alumno
                </template>
              </span>
            </span>
          </button>
        </div>

        <div
          v-if="personaEncontrada"
          class="flex items-center gap-3 border border-border border-l-4 border-l-emerald-600 bg-emerald-500/5 p-3"
        >
          <span
            class="grid h-10 w-10 place-items-center bg-primary/10 text-xs font-black text-primary"
          >
            {{ personaEncontrada.iniciales }}
          </span>
          <div class="min-w-0 flex-1">
            <b class="block text-sm">{{ personaEncontrada.nombre }}</b>
            <p class="text-xs text-muted-foreground">
              {{ personaEncontrada.correo }}
            </p>
          </div>
          <Tag
            :value="personaEncontrada.estado"
            :severity="
              personaEncontrada.estado === 'ACTIVO'
                ? 'success'
                : personaEncontrada.estado === 'INVITADO'
                  ? 'warn'
                  : 'secondary'
            "
          />
        </div>

        <p
          v-else-if="busquedaRealizada && !errorBusqueda && !candidatosVinculacion.length"
          class="text-xs text-muted-foreground"
        >
          Realiza una búsqueda para continuar.
        </p>

        <p
          v-else-if="candidatosVinculacion.length > 1 && !personaEncontrada"
          class="text-xs text-muted-foreground"
        >
          Elige una de las coincidencias para continuar.
        </p>

        <template v-if="personaEncontrada">
          <div
            v-if="requierePerfilStaff"
            class="border border-border border-l-4 border-l-accent bg-accent/10 px-3 py-2 text-xs text-[#7A5600]"
          >
            Esta cuenta existe (p. ej. como alumno) pero aún no está en el
            directorio de equipo. Elige un perfil para incorporarla.
          </div>
          <label v-if="requierePerfilStaff">
            <span class="filtro-label">Perfil / rol en la organización</span>
            <Select
              v-model="perfilIdVinculacion"
              :options="opcionesPerfilVinculacion"
              option-label="label"
              option-value="value"
              placeholder="Selecciona perfil (Docente…)"
              class="filtro-control w-full"
            />
            <div
              v-if="faltaPerfilDocente"
              class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
            >
              <span>No hay perfil Docente todavía.</span>
              <Button
                v-if="puedeCrearPerfiles"
                type="button"
                size="sm"
                variant="outline"
                :disabled="creandoPerfilDocente"
                @click="crearPerfilDocenteDesdeVinculacion"
              >
                {{ creandoPerfilDocente ? "Creando…" : "Crear perfil Docente" }}
              </Button>
              <RouterLink
                v-else
                class="font-semibold underline"
                to="/organizacion/equipos?seccion=perfiles"
              >
                Pedir a Administración en Estructura → Perfiles
              </RouterLink>
            </div>
          </label>
          <label>
            <span class="filtro-label">Nodo de destino</span>
            <Select
              v-model="formularioVinculacion.unidadId"
              :options="nodosDisponiblesVinculacion"
              option-label="nombre"
              option-value="id"
              class="filtro-control w-full"
            />
          </label>
          <label v-if="!requierePerfilStaff">
            <span class="filtro-label">Tipo de vínculo</span>
            <Select
              v-model="formularioVinculacion.tipo"
              :options="opcionesTipoVinculacion"
              class="filtro-control w-full"
            />
          </label>
          <label class="flex items-start gap-3 border border-border px-3 py-3">
            <input
              v-model="notificarPorCorreo"
              type="checkbox"
              class="mt-1 h-4 w-4 accent-[#0B3A78]"
            />
            <span>
              <span class="block text-sm font-semibold">Notificar por correo</span>
              <span class="mt-0.5 block text-xs text-muted-foreground">
                Avisa a la persona que quedó vinculada a este nodo.
              </span>
            </span>
          </label>
        </template>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalVinculacion = false">Cancelar</Button>
        <Button
          :disabled="
            !personaEncontrada ||
            !formularioVinculacion.usuarioId ||
            !formularioVinculacion.unidadId ||
            (requierePerfilStaff && !perfilIdVinculacion) ||
            guardandoVinculacion
          "
          @click="crearVinculacion"
        >
          {{
            guardandoVinculacion
              ? "Guardando…"
              : requierePerfilStaff
                ? "Incorporar y vincular"
                : "Guardar vinculación"
          }}
        </Button>
      </template>
    </Dialog>
  </section>
</template>
