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
import { useRoute } from "vue-router";

import {
  organizacionService,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import type {
  EstructuraOrganizacional,
  NivelOrganizacional,
  PoliticaIncorporacionUnidad,
  TipoUnidadEntidad,
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";

const route = useRoute();

const cargando = ref(true);
const mensaje = ref("");
const modalVinculacion = ref(false);
const modalSolicitudes = ref(false);

const estructuras = ref<EstructuraOrganizacional[]>([]);
const niveles = ref<NivelOrganizacional[]>([]);
const unidades = ref<UnidadOrganizacional[]>([]);
const tiposUnidad = ref<TipoUnidadEntidad[]>([]);
const politicas = ref<PoliticaIncorporacionUnidad[]>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const requiereDniEnrolamiento = ref(true);

const estructuraSeleccionadaId = ref("");
const filtrosNodosVinculaciones = ref<string[]>([]);
const filtroEstadoAsignacion = ref<"TODOS" | "SIN_ASIGNAR" | "ASIGNADOS" | "PENDIENTES">(
  "TODOS",
);
const buscarPersonaVinculacion = ref("");

/** Búsqueda para vincular: DNI o correo de alguien que ya tiene cuenta. */
const criterioBusqueda = ref("");
const personaEncontrada = ref<UsuarioOrganizacion | null>(null);
const errorBusqueda = ref("");
const busquedaRealizada = ref(false);

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
const opcionesTipoVinculacion = ["PRINCIPAL", "SECUNDARIA", "TEMPORAL"];

onMounted(cargar);

async function cargar() {
  try {
    [
      estructuras.value,
      niveles.value,
      unidades.value,
      tiposUnidad.value,
      politicas.value,
      vinculaciones.value,
      usuarios.value,
    ] = await Promise.all([
      organizacionService.estructura.estructuras.listar(),
      organizacionService.estructura.niveles.listar(),
      organizacionService.estructura.unidades.listar(),
      organizacionService.estructura.tiposUnidad.listar(),
      organizacionService.estructura.politicasIncorporacion.listar(),
      organizacionService.estructura.vinculaciones.listar(),
      organizacionService.usuarios.listar(),
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

    const unidadQuery = String(route.query.unidad ?? "").trim();
    const unidadDestino = unidadQuery
      ? unidades.value.find((unidad) => unidad.id === unidadQuery)
      : undefined;
    if (unidadDestino) {
      estructuraSeleccionadaId.value = unidadDestino.estructuraId ?? estructuraSeleccionadaId.value;
      // Espera a que el watcher de estructura limpie los filtros antes de fijar la ruta del nodo.
      await nextTick();
      filtrosNodosVinculaciones.value = rutaIdsUnidad(unidadDestino.id);
      mensaje.value = `Mostrando personas de “${unidadDestino.nombre}”.`;
    }
  } finally {
    cargando.value = false;
  }
}

watch(estructuraSeleccionadaId, (nuevoId) => {
  filtrosNodosVinculaciones.value = [];
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
  errorBusqueda.value = "";
  busquedaRealizada.value = false;
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

function abrirVinculacion(usuario?: UsuarioOrganizacion) {
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
    personaEncontrada.value = usuario;
    busquedaRealizada.value = true;
    criterioBusqueda.value = usuario.dni || usuario.correo;
    formularioVinculacion.usuarioId = String(usuario.id);
    const yaTieneActiva = vinculaciones.value.some(
      (item) =>
        item.usuarioId === String(usuario.id) && item.estado === "ACTIVA",
    );
    formularioVinculacion.tipo = yaTieneActiva ? "SECUNDARIA" : "PRINCIPAL";
  }

  modalVinculacion.value = true;
}

function buscarPersonaParaVincular() {
  errorBusqueda.value = "";
  personaEncontrada.value = null;
  busquedaRealizada.value = true;
  const texto = criterioBusqueda.value.trim().toLowerCase();
  if (!texto) {
    errorBusqueda.value = "Ingresa un DNI o un correo para buscar.";
    return;
  }

  const esDni = /^\d{8}$/.test(texto);
  const encontrada = usuarios.value.find((usuario) => {
    if (esDni) return (usuario.dni ?? "").toLowerCase() === texto;
    return usuario.correo.trim().toLowerCase() === texto;
  });

  if (!encontrada) {
    errorBusqueda.value =
      "No hay nadie con ese DNI o correo en el directorio. La persona debe registrarse en Tukuy o solicitar unirse desde Comunidad.";
    formularioVinculacion.usuarioId = "";
    return;
  }

  if (encontrada.estado === "SUSPENDIDO") {
    errorBusqueda.value =
      "Esta cuenta está suspendida. Reactívala antes de vincularla a un nodo.";
    return;
  }

  personaEncontrada.value = encontrada;
  formularioVinculacion.usuarioId = String(encontrada.id);
  const yaTieneActiva = vinculaciones.value.some(
    (item) =>
      item.usuarioId === String(encontrada.id) && item.estado === "ACTIVA",
  );
  formularioVinculacion.tipo = yaTieneActiva ? "SECUNDARIA" : "PRINCIPAL";
}

async function crearVinculacion() {
  if (!formularioVinculacion.usuarioId || !formularioVinculacion.unidadId) return;
  try {
    const creada = await organizacionService.estructura.vincularPersonaANodo({
      usuarioId: formularioVinculacion.usuarioId,
      unidadId: formularioVinculacion.unidadId,
      tipo: formularioVinculacion.tipo,
      origen: formularioVinculacion.origen,
      aprobadaPor: "usuario-demo",
    });
    vinculaciones.value.unshift(creada);
    modalVinculacion.value = false;
    mensaje.value = "La persona fue vinculada al nodo seleccionado.";
  } catch (error) {
    mensaje.value =
      error instanceof Error ? error.message : "No se pudo crear la vinculación.";
  }
}

async function aprobarSolicitud(vinculacion: VinculacionUnidad) {
  const actualizada = await organizacionService.estructura.aprobarVinculacion(
    vinculacion.id,
    "usuario-demo",
  );
  const indice = vinculaciones.value.findIndex((item) => item.id === actualizada.id);
  if (indice >= 0) vinculaciones.value[indice] = actualizada;
  mensaje.value = "La solicitud de nodo fue aprobada.";
}

async function activarIncorporacion(usuario: UsuarioOrganizacion) {
  const actualizado = await organizacionService.activarIncorporacion(
    String(usuario.id),
    "usuario-demo",
  );
  const posicion = usuarios.value.findIndex((item) => item.id === usuario.id);
  if (posicion >= 0) usuarios.value[posicion] = actualizado;
  vinculaciones.value = await organizacionService.estructura.vinculaciones.listar();
  mensaje.value = `${actualizado.nombre}: ingreso aceptado.`;
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
          ayuda="Las personas crean su cuenta en Tukuy. Aquí apruebas solicitudes de ingreso y vinculas a un nodo de la estructura por DNI o correo."
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
          <h2 class="font-black">Personas y nodos</h2>
          <p class="text-xs text-muted-foreground">
            Lista completa de personas inscritas en la entidad. Filtra por asignación o rama y asigna nodos desde la tabla.
          </p>
        </div>
      </div>
      <div class="border-b border-border bg-muted/20 p-4">
        <div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
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
          <label class="grid min-w-0 gap-1.5">
            <span class="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
              Estado de asignación
            </span>
            <Select
              v-model="filtroEstadoAsignacion"
              :options="opcionesEstadoAsignacion"
              option-label="label"
              option-value="value"
              class="filtro-control w-full min-w-0"
            />
          </label>
          <label class="grid min-w-0 gap-1.5">
            <span class="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
              Buscar persona
            </span>
            <div class="relative">
              <Search class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <InputText
                v-model="buscarPersonaVinculacion"
                class="filtro-control w-full pl-10"
                placeholder="Nombre, correo, DNI o iniciales"
              />
            </div>
          </label>
          <label
            v-for="(filtro, indice) in filtrosJerarquicosVinculaciones"
            :key="filtro.nivelId"
            class="grid min-w-0 gap-1.5"
          >
            <span class="truncate text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">
              Nivel {{ filtro.orden }} · {{ filtro.nombre }}
            </span>
            <Select
              v-model="filtrosNodosVinculaciones[indice]"
              :options="filtro.opciones"
              option-label="nombre"
              option-value="id"
              :placeholder="`Todos los nodos de ${filtro.nombre}`"
              :disabled="filtroEstadoAsignacion === 'SIN_ASIGNAR'"
              show-clear
              class="filtro-control w-full min-w-0"
              @update:model-value="actualizarFiltroNodoVinculacion(indice, $event)"
            />
          </label>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-muted-foreground">
            {{ resumenFiltroVinculaciones.total }} personas ·
            {{ resumenFiltroVinculaciones.sinAsignar }} sin asignar ·
            {{ resumenFiltroVinculaciones.asignadas }} asignadas ·
            {{ resumenFiltroVinculaciones.pendientes }} pendientes
          </p>
          <Button
            v-if="
              filtroEstadoAsignacion !== 'TODOS' ||
              buscarPersonaVinculacion ||
              filtrosNodosVinculaciones.some(Boolean)
            "
            size="sm"
            variant="outline"
            @click="limpiarFiltrosVinculaciones"
          >
            Limpiar filtros
          </Button>
        </div>
      </div>
      <DataTable
        :value="filasPersonasVinculacion"
        data-key="id"
        size="small"
        :paginator="filasPersonasVinculacion.length > 8"
        :rows="8"
        table-style="min-width: 72rem"
      >
        <template #empty>
          <div class="py-10 text-center text-sm text-muted-foreground">
            No hay personas con los filtros actuales.
          </div>
        </template>
        <Column header="Persona" style="min-width: 18rem">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <span class="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-xs font-black text-primary">
                {{ data.usuario.iniciales }}
              </span>
              <div>
                <b>{{ data.usuario.nombre }}</b>
                <p class="text-xs text-muted-foreground">{{ data.usuario.correo }}</p>
              </div>
            </div>
          </template>
        </Column>
        <Column header="DNI" style="min-width: 9rem">
          <template #body="{ data }">
            <span
              class="font-mono text-sm font-semibold"
              :class="
                requiereDniEnrolamiento && !data.usuario.dni
                  ? 'text-amber-700'
                  : 'text-foreground'
              "
            >
              {{ data.usuario.dni || "—" }}
            </span>
            <p
              v-if="requiereDniEnrolamiento && !data.usuario.dni"
              class="text-[10px] font-bold uppercase tracking-wide text-amber-700"
            >
              Requerido
            </p>
          </template>
        </Column>
        <Column header="Asignación" style="min-width: 9rem">
          <template #body="{ data }">
            <Tag
              :value="etiquetaEstadoAsignacion(data.estadoAsignacion)"
              :severity="severidadEstadoAsignacion(data.estadoAsignacion)"
            />
          </template>
        </Column>
        <Column header="Nodo / vínculos" style="min-width: 20rem">
          <template #body="{ data }">
            <b class="block text-sm">{{ data.nodosResumen }}</b>
            <p class="text-xs text-muted-foreground">
              {{ data.totalVinculos }}
              {{ data.totalVinculos === 1 ? "vínculo registrado" : "vínculos registrados" }}
            </p>
          </template>
        </Column>
        <Column header="Estado persona" style="min-width: 8rem">
          <template #body="{ data }">
            <Tag
              :value="data.usuario.estado"
              :severity="
                data.usuario.estado === 'ACTIVO'
                  ? 'success'
                  : data.usuario.estado === 'INVITADO'
                    ? 'info'
                    : 'secondary'
              "
            />
          </template>
        </Column>
        <Column header="Acción" style="min-width: 14rem">
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

    <!-- Vincular por DNI / correo -->
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
            La persona ya debió registrarse en Tukuy (correo o Google) o pedir
            unirse desde Comunidad. Aquí solo la vinculas a un nodo.
          </p>
        </div>

        <label class="grid gap-2">
          <span class="filtro-label">DNI o correo</span>
          <div class="flex gap-2">
            <div class="relative min-w-0 flex-1">
              <Search
                class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <InputText
                v-model="criterioBusqueda"
                class="filtro-control w-full pl-10"
                placeholder="Ej. 45678901 o correo@dominio.com"
                @keyup.enter="buscarPersonaParaVincular"
              />
            </div>
            <Button type="button" @click="buscarPersonaParaVincular">
              Buscar
            </Button>
          </div>
        </label>

        <p v-if="errorBusqueda" class="border border-border border-l-4 border-l-accent bg-accent/10 px-3 py-2 text-xs text-[#7A5600]">
          {{ errorBusqueda }}
        </p>

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
              <span v-if="personaEncontrada.dni">
                · DNI {{ personaEncontrada.dni }}
              </span>
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
          v-else-if="busquedaRealizada && !errorBusqueda"
          class="text-xs text-muted-foreground"
        >
          Realiza una búsqueda para continuar.
        </p>

        <template v-if="personaEncontrada">
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
          <label>
            <span class="filtro-label">Tipo de vínculo</span>
            <Select
              v-model="formularioVinculacion.tipo"
              :options="opcionesTipoVinculacion"
              class="filtro-control w-full"
            />
          </label>
        </template>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalVinculacion = false">Cancelar</Button>
        <Button
          :disabled="
            !personaEncontrada ||
            !formularioVinculacion.usuarioId ||
            !formularioVinculacion.unidadId
          "
          @click="crearVinculacion"
        >
          Guardar vinculación
        </Button>
      </template>
    </Dialog>
  </section>
</template>
