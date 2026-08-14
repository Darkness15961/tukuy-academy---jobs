import { env } from "@/lib/env";
import { supabasePrincipal } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AsignacionOrganizacion,
  ComprobanteOrganizacion,
  FacturacionOrganizacion,
  LicenciaOrganizacion,
  NotificacionOrganizacion,
  RutaOrganizacion,
  SedeOrganizacion,
  UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import type {
  CategoriaCursoEntidad,
  EntidadPublicaComunidad,
} from "@/modulos/comunidad/types/entidad-publica.types";
import type {
  AsignacionPerfilUsuario,
  EstructuraOrganizacional,
  NivelOrganizacional,
  PerfilEntidad,
  PoliticaIncorporacionUnidad,
  ReglaAccesoCursoEntidad,
  TipoUnidadEntidad,
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";

const cliente = () => supabasePrincipal() as SupabaseClient<any>;

const ORGANIGRAMA_FRESH_MS = 45_000;
const ORGANIGRAMA_STALE_MS = 5 * 60_000;

export type OrganigramaPrincipal = {
  estructuras: EstructuraOrganizacional[];
  niveles: NivelOrganizacional[];
  tiposUnidad: TipoUnidadEntidad[];
  unidades: UnidadOrganizacional[];
  politicasIncorporacion: PoliticaIncorporacionUnidad[];
  vinculaciones: VinculacionUnidad[];
};

type CacheOrganigrama = {
  instalacionId: string;
  at: number;
  data: OrganigramaPrincipal;
};

let cacheOrganigrama: CacheOrganigrama | null = null;
let inflightOrganigrama: Promise<OrganigramaPrincipal> | null = null;
/** null = desconocido; false = RPC aún no desplegada (usar localStorage). */
let organigramaRpcDisponible: boolean | null = null;

const PERFILES_FRESH_MS = 45_000;
const PERFILES_STALE_MS = 5 * 60_000;

export type PerfilesEntidadPrincipal = {
  perfiles: PerfilEntidad[];
  asignaciones: AsignacionPerfilUsuario[];
};

type CachePerfilesEntidad = {
  instalacionId: string;
  at: number;
  data: PerfilesEntidadPrincipal;
};

let cachePerfilesEntidad: CachePerfilesEntidad | null = null;
let inflightPerfilesEntidad: Promise<PerfilesEntidadPrincipal> | null = null;
/** null = desconocido; false = RPC aún no desplegada (usar localStorage). */
let perfilesEntidadRpcDisponible: boolean | null = null;

const PRESENCIA_FRESH_MS = 45_000;
const PRESENCIA_STALE_MS = 5 * 60_000;

export type PresenciaOrganizacionPrincipal = EntidadPublicaComunidad & {
  ruc: string;
  dominio: string;
  zonaHoraria: string;
  restringirDominio: boolean;
};

type CachePresencia = {
  instalacionId: string;
  at: number;
  data: PresenciaOrganizacionPrincipal;
};

let cachePresencia: CachePresencia | null = null;
let inflightPresencia: Promise<PresenciaOrganizacionPrincipal> | null = null;
let cachePresenciasPublicas: {
  at: number;
  data: EntidadPublicaComunidad[];
} | null = null;
let inflightPresenciasPublicas: Promise<EntidadPublicaComunidad[]> | null =
  null;
/** null = desconocido; false = RPC aún no desplegada (usar localStorage). */
let presenciaRpcDisponible: boolean | null = null;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizarPresencia(
  raw: Record<string, unknown>,
  fallbackId = "",
): PresenciaOrganizacionPrincipal {
  return {
    id: String(raw.id ?? fallbackId),
    nombre: String(raw.nombre ?? raw.nombrePublico ?? ""),
    slug: String(raw.slug ?? ""),
    tipo: (raw.tipo as EntidadPublicaComunidad["tipo"]) ?? "EMPRESA",
    sector: String(raw.sector ?? ""),
    ciudad: String(raw.ciudad ?? ""),
    region: String(raw.region ?? ""),
    descripcionCorta: String(raw.descripcionCorta ?? ""),
    descripcion: String(raw.descripcion ?? ""),
    logo: String(raw.logo ?? ""),
    portada: String(raw.portada ?? ""),
    verificada: Boolean(raw.verificada),
    miembros: Number(raw.miembros ?? 0),
    publicaciones: Number(raw.publicaciones ?? 0),
    cursosActivos: Number(raw.cursosActivos ?? 0),
    vacantesAbiertas: Number(raw.vacantesAbiertas ?? 0),
    sitioWeb: String(raw.sitioWeb ?? "") || undefined,
    correoContacto: String(raw.correoContacto ?? ""),
    etiquetas: asArray<string>(raw.etiquetas),
    requiereDniEnrolamiento: Boolean(
      raw.requiereDniEnrolamiento ?? true,
    ),
    ruc: String(raw.ruc ?? ""),
    dominio: String(raw.dominio ?? ""),
    zonaHoraria: String(raw.zonaHoraria ?? "America/Lima"),
    restringirDominio: Boolean(raw.restringirDominio),
  };
}

function normalizarPerfilEntidad(raw: Record<string, unknown>): PerfilEntidad {
  return {
    id: String(raw.id ?? ""),
    nombre: String(raw.nombre ?? ""),
    descripcion: String(raw.descripcion ?? ""),
    tipo: (raw.tipo as PerfilEntidad["tipo"]) ?? "PERSONALIZADO",
    plantilla: (raw.plantilla as PerfilEntidad["plantilla"]) ?? "PERSONALIZADO",
    nivelAutoridad: Number(raw.nivelAutoridad ?? 100),
    permisos: asArray<string>(raw.permisos),
    alcanceDefecto:
      (raw.alcanceDefecto as PerfilEntidad["alcanceDefecto"]) ?? "PROPIO",
    rutaInicial: String(raw.rutaInicial ?? "/organizacion/inicio"),
    esSistema: Boolean(raw.esSistema),
    estado: (raw.estado as PerfilEntidad["estado"]) ?? "ACTIVO",
  };
}

function normalizarAsignacionPerfil(
  raw: Record<string, unknown>,
): AsignacionPerfilUsuario {
  return {
    id: String(raw.id ?? ""),
    usuarioId: String(raw.usuarioId ?? ""),
    perfilId: String(raw.perfilId ?? ""),
    unidadIds: asArray<string>(raw.unidadIds),
    sedeIds: asArray<string>(raw.sedeIds),
    incluirDescendientes: Boolean(raw.incluirDescendientes),
    esPrincipal: Boolean(raw.esPrincipal),
    estado: (raw.estado as AsignacionPerfilUsuario["estado"]) ?? "ACTIVA",
  };
}

export function organigramaBdDisponible(): boolean {
  return organigramaRpcDisponible !== false;
}

export function marcarOrganigramaBdDisponible(disponible: boolean) {
  organigramaRpcDisponible = disponible;
  if (!disponible) {
    cacheOrganigrama = null;
    inflightOrganigrama = null;
  }
}

export function esErrorRpcOrganigramaAusente(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const mensaje = e.message ?? String(error);
  return (
    e.code === "PGRST202" ||
    /Could not find the function.*org_.*organigrama/i.test(mensaje) ||
    /org_listar_organigrama|schema cache/i.test(mensaje) ||
    mensaje === "ORGANIGRAMA_BD_AUSENTE"
  );
}

export function perfilesEntidadBdDisponible(): boolean {
  return perfilesEntidadRpcDisponible !== false;
}

export function marcarPerfilesEntidadBdDisponible(disponible: boolean) {
  perfilesEntidadRpcDisponible = disponible;
  if (!disponible) {
    cachePerfilesEntidad = null;
    inflightPerfilesEntidad = null;
  }
}

export function esErrorRpcPerfilesEntidadAusente(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const mensaje = e.message ?? String(error);
  return (
    e.code === "PGRST202" ||
    /Could not find the function.*org_.*perfil/i.test(mensaje) ||
    /org_listar_perfiles|schema cache/i.test(mensaje) ||
    mensaje === "PERFILES_ENTIDAD_BD_AUSENTE"
  );
}

export function presenciaBdDisponible(): boolean {
  return presenciaRpcDisponible !== false;
}

export function marcarPresenciaBdDisponible(disponible: boolean) {
  presenciaRpcDisponible = disponible;
  if (!disponible) {
    cachePresencia = null;
    inflightPresencia = null;
    cachePresenciasPublicas = null;
    inflightPresenciasPublicas = null;
  }
}

export function esErrorRpcPresenciaAusente(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const mensaje = e.message ?? String(error);
  return (
    e.code === "PGRST202" ||
    /Could not find the function.*org_.*presencia/i.test(mensaje) ||
    /org_obtener_presencia|org_guardar_presencia|org_listar_presencias|schema cache/i.test(
      mensaje,
    ) ||
    mensaje === "PRESENCIA_BD_AUSENTE"
  );
}

const SEDES_REGLAS_FRESH_MS = 45_000;
const SEDES_REGLAS_STALE_MS = 5 * 60_000;

export type SedesReglasPrincipal = {
  sedes: SedeOrganizacion[];
  reglas: ReglaAccesoCursoEntidad[];
};

type CacheSedesReglas = {
  instalacionId: string;
  at: number;
  data: SedesReglasPrincipal;
};

let cacheSedesReglas: CacheSedesReglas | null = null;
let inflightSedesReglas: Promise<SedesReglasPrincipal> | null = null;
let sedesReglasRpcDisponible: boolean | null = null;

export function sedesReglasBdDisponible(): boolean {
  return sedesReglasRpcDisponible !== false;
}

export function esErrorRpcSedesReglasAusente(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const mensaje = e.message ?? String(error);
  return (
    e.code === "PGRST202" ||
    /Could not find the function.*org_.*(sede|regla)/i.test(mensaje) ||
    /org_listar_sedes_reglas|org_guardar_sede|org_guardar_regla|schema cache/i.test(
      mensaje,
    ) ||
    mensaje === "SEDES_REGLAS_BD_AUSENTE"
  );
}

function normalizarSede(raw: Record<string, unknown>): SedeOrganizacion {
  return {
    id: String(raw.id ?? ""),
    nombre: String(raw.nombre ?? ""),
    ciudad: String(raw.ciudad ?? ""),
    usuarios: Number(raw.usuarios ?? 0),
    areas: Number(raw.areas ?? 0),
  };
}

function normalizarReglaAcceso(
  raw: Record<string, unknown>,
): ReglaAccesoCursoEntidad {
  const cupoRaw = raw.cupo;
  return {
    id: String(raw.id ?? ""),
    cursoId: String(raw.cursoId ?? ""),
    cursoTitulo: String(raw.cursoTitulo ?? ""),
    publico:
      (raw.publico as ReglaAccesoCursoEntidad["publico"]) ?? "TODA_LA_ENTIDAD",
    publicoIds: asArray<string>(raw.publicoIds),
    incluirDescendientes: Boolean(raw.incluirDescendientes),
    modalidad:
      (raw.modalidad as ReglaAccesoCursoEntidad["modalidad"]) ?? "LIBRE",
    cupo:
      cupoRaw === null || cupoRaw === undefined || cupoRaw === ""
        ? undefined
        : Number(cupoRaw),
    estado: (raw.estado as ReglaAccesoCursoEntidad["estado"]) ?? "ACTIVA",
  };
}

const ASIGNACIONES_RUTAS_FRESH_MS = 45_000;
const ASIGNACIONES_RUTAS_STALE_MS = 5 * 60_000;

export type AsignacionesRutasPrincipal = {
  asignaciones: AsignacionOrganizacion[];
  rutas: RutaOrganizacion[];
};

type CacheAsignacionesRutas = {
  instalacionId: string;
  at: number;
  data: AsignacionesRutasPrincipal;
};

let cacheAsignacionesRutas: CacheAsignacionesRutas | null = null;
let inflightAsignacionesRutas: Promise<AsignacionesRutasPrincipal> | null = null;
let asignacionesRutasRpcDisponible: boolean | null = null;

export function asignacionesRutasBdDisponible(): boolean {
  return asignacionesRutasRpcDisponible !== false;
}

export function esErrorRpcAsignacionesRutasAusente(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  const mensaje = e.message ?? String(error);
  return (
    e.code === "PGRST202" ||
    /Could not find the function.*org_.*(asignacion|ruta)/i.test(mensaje) ||
    /org_listar_asignaciones_rutas|org_guardar_asignacion|org_guardar_ruta|schema cache/i.test(
      mensaje,
    ) ||
    mensaje === "ASIGNACIONES_RUTAS_BD_AUSENTE"
  );
}

function normalizarAsignacion(
  raw: Record<string, unknown>,
): AsignacionOrganizacion {
  const cursoId = raw.cursoId;
  return {
    id: String(raw.id ?? ""),
    cursoId:
      cursoId === null || cursoId === undefined || cursoId === ""
        ? undefined
        : String(cursoId),
    curso: String(raw.curso ?? ""),
    destino: String(raw.destino ?? ""),
    asignados: Number(raw.asignados ?? 0),
    completados: Number(raw.completados ?? 0),
    vence: String(raw.vence ?? "Sin fecha límite"),
    obligatorio: Boolean(raw.obligatorio),
    destinoUnidadId: raw.destinoUnidadId
      ? String(raw.destinoUnidadId)
      : undefined,
    incluirDescendientes:
      raw.incluirDescendientes === undefined
        ? undefined
        : Boolean(raw.incluirDescendientes),
    estado:
      (raw.estado as AsignacionOrganizacion["estado"]) ?? "ACTIVA",
    creadaEn: raw.creadaEn ? String(raw.creadaEn) : undefined,
  };
}

function normalizarRuta(raw: Record<string, unknown>): RutaOrganizacion {
  const cursosSeleccionados = asArray<Record<string, unknown>>(
    raw.cursosSeleccionados,
  ).map((item, index) => ({
    id: String(item.id ?? ""),
    titulo: String(item.titulo ?? ""),
    docente: item.docente ? String(item.docente) : undefined,
    orden: Number(item.orden ?? index + 1),
  }));
  const precioRaw = raw.precio;
  const descuentoInternoRaw = raw.descuentoInterno;
  return {
    id: String(raw.id ?? ""),
    nombre: String(raw.nombre ?? ""),
    descripcion: raw.descripcion ? String(raw.descripcion) : undefined,
    imagen: raw.imagen ? String(raw.imagen) : undefined,
    cursos: Number(raw.cursos ?? cursosSeleccionados.length),
    cursosSeleccionados:
      cursosSeleccionados.length > 0 ? cursosSeleccionados : undefined,
    usuarios: Number(raw.usuarios ?? 0),
    progreso: Number(raw.progreso ?? 0),
    certificado: Boolean(raw.certificado),
    precio:
      precioRaw === null || precioRaw === undefined || precioRaw === ""
        ? undefined
        : Number(precioRaw),
    gratuito:
      raw.gratuito === undefined ? undefined : Boolean(raw.gratuito),
    moneda: (raw.moneda as RutaOrganizacion["moneda"]) ?? undefined,
    alcance: (raw.alcance as RutaOrganizacion["alcance"]) ?? undefined,
    destinoArea:
      raw.destinoArea === null || raw.destinoArea === undefined
        ? undefined
        : String(raw.destinoArea),
    descuentoInterno:
      descuentoInternoRaw === null ||
      descuentoInternoRaw === undefined ||
      descuentoInternoRaw === ""
        ? undefined
        : Number(descuentoInternoRaw),
    descuentoAplicaA:
      (raw.descuentoAplicaA as RutaOrganizacion["descuentoAplicaA"]) ??
      undefined,
    descuentoArea:
      raw.descuentoArea === null || raw.descuentoArea === undefined
        ? undefined
        : String(raw.descuentoArea),
    politicaDescuentos:
      (raw.politicaDescuentos as RutaOrganizacion["politicaDescuentos"]) ??
      undefined,
    descuentos:
      (raw.descuentos as RutaOrganizacion["descuentos"]) ?? undefined,
    estado: (raw.estado as RutaOrganizacion["estado"]) ?? "BORRADOR",
  };
}

/** Avisa al FE para recargar permisos de sesión tras sync org_perfil → funcion. */
function notificarMembresiasActualizadas() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("tukuy:membresias-actualizar"));
}

export type PerfilOrgPrincipal = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  portal: string;
  nivel: string;
  permisos: string[];
};

export type MiembroOrgPrincipal = {
  identidadId: string;
  membresiaId: string;
  funcionId: string | null;
  nombre: string;
  correo: string;
  avatarUrl: string | null;
  estadoIdentidad: string;
  estadoMembresia: string;
  roles: Array<{
    funcionId: string;
    codigo: string;
    nombre: string;
    portal: string;
    estado: string;
  }>;
};

type MiembroRpc = {
  identidadId: string;
  membresiaId: string;
  funcionId: string | null;
  nombre: string;
  correo: string;
  avatarUrl: string | null;
  estadoIdentidad: string;
  estadoMembresia: string;
  roles: MiembroOrgPrincipal["roles"] | null;
};

function inicialesDe(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const a = partes[0]?.[0] ?? "U";
  const b = partes[1]?.[0] ?? partes[0]?.[1] ?? "T";
  return `${a}${b}`.toUpperCase();
}

function estadoUsuario(
  miembro: MiembroRpc,
): UsuarioOrganizacion["estado"] {
  if (miembro.estadoMembresia === "PENDIENTE") return "INVITADO";
  if (miembro.estadoMembresia === "SUSPENDIDA") return "SUSPENDIDO";
  const roles = miembro.roles ?? [];
  if (roles.some((r) => r.estado === "SUSPENDIDA") && !roles.some((r) => r.estado === "ACTIVA")) {
    return "SUSPENDIDO";
  }
  return "ACTIVO";
}

export function mapMiembroAUsuarioOrganizacion(
  miembro: MiembroRpc,
): UsuarioOrganizacion {
  const roles = miembro.roles ?? [];
  const rolPrincipal =
    roles.find((r) => r.estado === "ACTIVA") ?? roles[0];
  return {
    id: miembro.identidadId,
    nombre: miembro.nombre,
    iniciales: inicialesDe(miembro.nombre),
    correo: miembro.correo,
    area: rolPrincipal?.nombre ?? "Sin perfil",
    sede: "—",
    rol: roles.map((r) => r.nombre).join(", ") || "Sin perfil",
    progreso: 0,
    estado: estadoUsuario(miembro),
    especialidad: rolPrincipal?.codigo,
    origenIngreso: "INVITACION_ADMIN",
  };
}

function normalizarCategoria(
  raw: Record<string, unknown>,
): CategoriaCursoEntidad {
  const estadoRaw = String(raw.estado ?? "ACTIVA").toUpperCase();
  return {
    id: String(raw.id ?? ""),
    organizacionId: String(raw.organizacionId ?? ""),
    nombre: String(raw.nombre ?? ""),
    descripcion: String(raw.descripcion ?? ""),
    color: String(raw.color ?? "#0B3A78"),
    visibleEnCatalogo: raw.visibleEnCatalogo !== false,
    seleccionableComoInteres: raw.seleccionableComoInteres !== false,
    orden: Number(raw.orden ?? 1),
    estado: estadoRaw === "INACTIVA" ? "INACTIVA" : "ACTIVA",
  };
}

function normalizarCategorias(
  payload: Record<string, unknown>,
): CategoriaCursoEntidad[] {
  const lista = Array.isArray(payload.categorias)
    ? (payload.categorias as Array<Record<string, unknown>>)
    : Array.isArray(payload)
      ? (payload as Array<Record<string, unknown>>)
      : [];
  return lista.map(normalizarCategoria);
}

export const organizacionPrincipalService = {
  activo() {
    return env.authProvider === "supabase";
  },

  async catalogoPerfiles(instalacionId: string): Promise<PerfilOrgPrincipal[]> {
    const { data, error } = await cliente().rpc("org_catalogo_perfiles", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id),
      codigo: String(item.codigo),
      nombre: String(item.nombre),
      descripcion: (item.descripcion as string | null) ?? null,
      portal: String(item.portal),
      nivel: String(item.nivel),
      permisos: Array.isArray(item.permisos)
        ? (item.permisos as string[])
        : [],
    }));
  },

  async listarMiembros(instalacionId: string): Promise<UsuarioOrganizacion[]> {
    const { data, error } = await cliente().rpc("org_listar_miembros", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as MiembroRpc[]).map(mapMiembroAUsuarioOrganizacion);
  },

  async asignarAcceso(
    instalacionId: string,
    correo: string,
    perfilCodigo: string,
  ): Promise<string> {
    const { data, error } = await cliente().rpc("org_asignar_acceso", {
      p_instalacion_id: instalacionId,
      p_correo: correo,
      p_perfil_codigo: perfilCodigo,
    });
    if (error) throw new Error(error.message);
    return String(data);
  },

  async incorporarPersonaPerfil(
    instalacionId: string,
    entrada: {
      correo: string;
      perfilOrgId: string;
      unidadId?: string;
      sedeId?: string;
    },
  ): Promise<{
    funcionId: string | null;
    identidadId: string;
    asignacion: AsignacionPerfilUsuario;
  }> {
    const { data, error } = await cliente().rpc("org_incorporar_persona_perfil", {
      p_instalacion_id: instalacionId,
      p_correo: entrada.correo,
      p_perfil_org_id: entrada.perfilOrgId,
      p_unidad_id: entrada.unidadId ?? null,
      p_sede_id: entrada.sedeId ?? null,
    });
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Record<string, unknown>;
    const asignacionRaw = (raw.asignacion ?? {}) as Record<string, unknown>;
    return {
      funcionId: raw.funcionId ? String(raw.funcionId) : null,
      identidadId: String(raw.identidadId ?? ""),
      asignacion: normalizarAsignacionPerfil(asignacionRaw),
    };
  },

  async cambiarEstadoAcceso(
    instalacionId: string,
    funcionId: string,
    estado: "ACTIVA" | "SUSPENDIDA" | "REVOCADA",
  ): Promise<void> {
    const { error } = await cliente().rpc("org_cambiar_estado_acceso", {
      p_instalacion_id: instalacionId,
      p_funcion_id: funcionId,
      p_estado: estado,
    });
    if (error) throw new Error(error.message);
  },

  async obtenerLicencia(instalacionId: string): Promise<LicenciaOrganizacion> {
    const { data, error } = await cliente().rpc("org_obtener_licencia", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Record<string, unknown>;
    const consumos = Array.isArray(raw.consumos)
      ? (raw.consumos as Array<Record<string, unknown>>)
      : [];
    const estadoRaw = String(raw.estado ?? "ACTIVA");
    const estado =
      estadoRaw === "POR_VENCER" || estadoRaw === "VENCIDA"
        ? estadoRaw
        : "ACTIVA";

    return {
      plan: String(raw.plan ?? "Sin plan"),
      descripcion: String(raw.descripcion ?? ""),
      inicio: String(raw.inicio ?? ""),
      fin: String(raw.fin ?? ""),
      estado,
      soloLectura: raw.soloLectura !== false,
      consumos: consumos.map((item) => ({
        id: String(item.id),
        etiqueta: String(item.etiqueta),
        utilizado: Number(item.utilizado ?? 0),
        limite: Number(item.limite ?? 0),
        unidad: String(item.unidad ?? ""),
      })),
    };
  },

  async obtenerFacturacion(
    instalacionId: string,
  ): Promise<FacturacionOrganizacion> {
    const { data, error } = await cliente().rpc("org_obtener_facturacion", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Record<string, unknown>;
    const periodicidadRaw = String(raw.periodicidad ?? "MENSUAL").toUpperCase();
    const monedaRaw = String(raw.moneda ?? "PEN").toUpperCase();
    return {
      plan: String(raw.plan ?? "Sin plan comercial"),
      periodicidad: periodicidadRaw === "ANUAL" ? "ANUAL" : "MENSUAL",
      proximoCobro: String(raw.proximoCobro ?? "—"),
      importe: Number(raw.importe ?? 0),
      moneda: monedaRaw === "USD" ? "USD" : "PEN",
      tarjetaMarca: String(raw.tarjetaMarca ?? "—"),
      tarjetaUltimos4: String(raw.tarjetaUltimos4 ?? "—"),
      tarjetaVencimiento: String(raw.tarjetaVencimiento ?? "—"),
      soloLectura: raw.soloLectura !== false,
      mensajeGestion: raw.mensajeGestion
        ? String(raw.mensajeGestion)
        : undefined,
    };
  },

  async listarComprobantes(
    instalacionId: string,
  ): Promise<ComprobanteOrganizacion[]> {
    const { data, error } = await cliente().rpc("org_listar_comprobantes", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Record<string, unknown>;
    const lista = Array.isArray(raw.comprobantes)
      ? (raw.comprobantes as Array<Record<string, unknown>>)
      : [];
    return lista.map((item) => {
      const estadoRaw = String(item.estado ?? "PENDIENTE").toUpperCase();
      const estado =
        estadoRaw === "PAGADO" || estadoRaw === "ANULADO"
          ? estadoRaw
          : "PENDIENTE";
      const monedaRaw = String(item.moneda ?? "PEN").toUpperCase();
      return {
        id: String(item.id ?? ""),
        numero: String(item.numero ?? ""),
        fecha: String(item.fecha ?? ""),
        concepto: String(item.concepto ?? ""),
        importe: Number(item.importe ?? 0),
        moneda: monedaRaw === "USD" ? "USD" : "PEN",
        estado,
      };
    });
  },

  async listarAlertasOperativas(
    instalacionId: string,
  ): Promise<NotificacionOrganizacion[]> {
    const { data, error } = await cliente().rpc(
      "org_listar_alertas_operativas",
      { p_instalacion_id: instalacionId },
    );
    if (error) {
      const mensaje = error.message ?? "";
      const codigo = String((error as { code?: string }).code ?? "");
      // RPC aún no desplegada en principal: no romper el portal org.
      if (
        codigo === "PGRST202" ||
        /org_listar_alertas_operativas|Could not find the function|schema cache/i.test(
          mensaje,
        )
      ) {
        return [];
      }
      throw new Error(mensaje);
    }
    const raw = (data ?? {}) as Record<string, unknown>;
    const lista = Array.isArray(raw.alertas)
      ? (raw.alertas as Array<Record<string, unknown>>)
      : [];
    return lista.map((item) => ({
      id: String(item.id ?? ""),
      titulo: String(item.titulo ?? ""),
      detalle: String(item.detalle ?? ""),
      fecha: String(item.fecha ?? new Date().toISOString()),
      leida: Boolean(item.leida),
      ruta: item.ruta ? String(item.ruta) : undefined,
    }));
  },

  invalidarOrganigrama(instalacionId?: string) {
    if (
      !instalacionId ||
      cacheOrganigrama?.instalacionId === instalacionId
    ) {
      cacheOrganigrama = null;
    }
    inflightOrganigrama = null;
  },

  async listarOrganigrama(
    instalacionId: string,
    forzar = false,
  ): Promise<OrganigramaPrincipal> {
    if (organigramaRpcDisponible === false) {
      throw new Error("ORGANIGRAMA_BD_AUSENTE");
    }
    const fresco =
      !forzar &&
      cacheOrganigrama &&
      cacheOrganigrama.instalacionId === instalacionId &&
      Date.now() - cacheOrganigrama.at < ORGANIGRAMA_FRESH_MS;
    if (fresco && cacheOrganigrama) {
      return cacheOrganigrama.data;
    }

    const usableStale =
      !forzar &&
      cacheOrganigrama &&
      cacheOrganigrama.instalacionId === instalacionId &&
      Date.now() - cacheOrganigrama.at < ORGANIGRAMA_STALE_MS;

    const dispararRed = () => {
      if (inflightOrganigrama) return inflightOrganigrama;
      const promesa = (async () => {
        const { data, error } = await cliente().rpc("org_listar_organigrama", {
          p_instalacion_id: instalacionId,
        });
        if (error) {
          if (esErrorRpcOrganigramaAusente(error)) {
            organigramaRpcDisponible = false;
            console.warn(
              "[organigrama] Falta ejecutar supabase/migrations/20260811150000_org_organigrama.sql en PRINCIPAL. Usando almacenamiento local.",
            );
            throw new Error("ORGANIGRAMA_BD_AUSENTE");
          }
          throw new Error(error.message);
        }
        organigramaRpcDisponible = true;
        const raw = (data ?? {}) as Record<string, unknown>;
        const snapshot: OrganigramaPrincipal = {
          estructuras: asArray<EstructuraOrganizacional>(raw.estructuras),
          niveles: asArray<NivelOrganizacional>(raw.niveles),
          tiposUnidad: asArray<TipoUnidadEntidad>(raw.tiposUnidad),
          unidades: asArray<UnidadOrganizacional>(raw.unidades),
          politicasIncorporacion: asArray<PoliticaIncorporacionUnidad>(
            raw.politicasIncorporacion,
          ),
          vinculaciones: asArray<VinculacionUnidad>(raw.vinculaciones),
        };
        cacheOrganigrama = {
          instalacionId,
          at: Date.now(),
          data: snapshot,
        };
        return snapshot;
      })().finally(() => {
        inflightOrganigrama = null;
      });
      inflightOrganigrama = promesa;
      return promesa;
    };

    if (usableStale && cacheOrganigrama) {
      void dispararRed().catch(() => undefined);
      return cacheOrganigrama.data;
    }

    return dispararRed();
  },

  async guardarEstructura(
    instalacionId: string,
    estructura: EstructuraOrganizacional,
  ): Promise<EstructuraOrganizacional> {
    if (organigramaRpcDisponible === false) {
      throw new Error("ORGANIGRAMA_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_estructura", {
      p_instalacion_id: instalacionId,
      p_estructura: estructura,
    });
    if (error) {
      if (esErrorRpcOrganigramaAusente(error)) {
        organigramaRpcDisponible = false;
        throw new Error("ORGANIGRAMA_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarOrganigrama(instalacionId);
    return data as EstructuraOrganizacional;
  },

  async guardarNivel(
    instalacionId: string,
    nivel: NivelOrganizacional,
  ): Promise<NivelOrganizacional> {
    if (organigramaRpcDisponible === false) {
      throw new Error("ORGANIGRAMA_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_nivel", {
      p_instalacion_id: instalacionId,
      p_nivel: nivel,
    });
    if (error) {
      if (esErrorRpcOrganigramaAusente(error)) {
        organigramaRpcDisponible = false;
        throw new Error("ORGANIGRAMA_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarOrganigrama(instalacionId);
    return data as NivelOrganizacional;
  },

  async guardarTipoUnidad(
    instalacionId: string,
    tipo: TipoUnidadEntidad,
  ): Promise<TipoUnidadEntidad> {
    if (organigramaRpcDisponible === false) {
      throw new Error("ORGANIGRAMA_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_tipo_unidad", {
      p_instalacion_id: instalacionId,
      p_tipo: tipo,
    });
    if (error) {
      if (esErrorRpcOrganigramaAusente(error)) {
        organigramaRpcDisponible = false;
        throw new Error("ORGANIGRAMA_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarOrganigrama(instalacionId);
    return data as TipoUnidadEntidad;
  },

  async guardarPolitica(
    instalacionId: string,
    politica: PoliticaIncorporacionUnidad,
  ): Promise<PoliticaIncorporacionUnidad> {
    if (organigramaRpcDisponible === false) {
      throw new Error("ORGANIGRAMA_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc(
      "org_guardar_politica_incorporacion",
      {
        p_instalacion_id: instalacionId,
        p_politica: politica,
      },
    );
    if (error) {
      if (esErrorRpcOrganigramaAusente(error)) {
        organigramaRpcDisponible = false;
        throw new Error("ORGANIGRAMA_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarOrganigrama(instalacionId);
    return data as PoliticaIncorporacionUnidad;
  },

  async guardarUnidad(
    instalacionId: string,
    unidad: UnidadOrganizacional,
  ): Promise<UnidadOrganizacional> {
    if (organigramaRpcDisponible === false) {
      throw new Error("ORGANIGRAMA_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_unidad", {
      p_instalacion_id: instalacionId,
      p_unidad: unidad,
    });
    if (error) {
      if (esErrorRpcOrganigramaAusente(error)) {
        organigramaRpcDisponible = false;
        throw new Error("ORGANIGRAMA_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarOrganigrama(instalacionId);
    return data as UnidadOrganizacional;
  },

  async eliminarUnidad(
    instalacionId: string,
    unidadId: string,
  ): Promise<void> {
    if (organigramaRpcDisponible === false) {
      throw new Error("ORGANIGRAMA_BD_AUSENTE");
    }
    const { error } = await cliente().rpc("org_eliminar_unidad", {
      p_instalacion_id: instalacionId,
      p_unidad_id: unidadId,
    });
    if (error) {
      if (esErrorRpcOrganigramaAusente(error)) {
        organigramaRpcDisponible = false;
        throw new Error("ORGANIGRAMA_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarOrganigrama(instalacionId);
  },

  async guardarVinculacion(
    instalacionId: string,
    vinculacion: VinculacionUnidad,
  ): Promise<VinculacionUnidad> {
    if (organigramaRpcDisponible === false) {
      throw new Error("ORGANIGRAMA_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_vinculacion", {
      p_instalacion_id: instalacionId,
      p_vinculacion: vinculacion,
    });
    if (error) {
      if (esErrorRpcOrganigramaAusente(error)) {
        organigramaRpcDisponible = false;
        throw new Error("ORGANIGRAMA_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarOrganigrama(instalacionId);
    return data as VinculacionUnidad;
  },

  async eliminarVinculacion(
    instalacionId: string,
    vinculacionId: string,
  ): Promise<void> {
    if (organigramaRpcDisponible === false) {
      throw new Error("ORGANIGRAMA_BD_AUSENTE");
    }
    const { error } = await cliente().rpc("org_eliminar_vinculacion", {
      p_instalacion_id: instalacionId,
      p_vinculacion_id: vinculacionId,
    });
    if (error) {
      if (esErrorRpcOrganigramaAusente(error)) {
        organigramaRpcDisponible = false;
        throw new Error("ORGANIGRAMA_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarOrganigrama(instalacionId);
  },

  invalidarPerfilesEntidad(instalacionId?: string) {
    if (
      !instalacionId ||
      cachePerfilesEntidad?.instalacionId === instalacionId
    ) {
      cachePerfilesEntidad = null;
    }
    inflightPerfilesEntidad = null;
  },

  async listarPerfilesEntidad(
    instalacionId: string,
    forzar = false,
  ): Promise<PerfilesEntidadPrincipal> {
    if (perfilesEntidadRpcDisponible === false) {
      throw new Error("PERFILES_ENTIDAD_BD_AUSENTE");
    }
    const fresco =
      !forzar &&
      cachePerfilesEntidad &&
      cachePerfilesEntidad.instalacionId === instalacionId &&
      Date.now() - cachePerfilesEntidad.at < PERFILES_FRESH_MS;
    if (fresco && cachePerfilesEntidad) {
      return cachePerfilesEntidad.data;
    }

    const usableStale =
      !forzar &&
      cachePerfilesEntidad &&
      cachePerfilesEntidad.instalacionId === instalacionId &&
      Date.now() - cachePerfilesEntidad.at < PERFILES_STALE_MS;

    const dispararRed = () => {
      if (inflightPerfilesEntidad) return inflightPerfilesEntidad;
      const promesa = (async () => {
        const { data, error } = await cliente().rpc("org_listar_perfiles", {
          p_instalacion_id: instalacionId,
        });
        if (error) {
          if (esErrorRpcPerfilesEntidadAusente(error)) {
            perfilesEntidadRpcDisponible = false;
            console.warn(
              "[perfiles] Falta ejecutar supabase/migrations/20260811151000_org_perfiles.sql en PRINCIPAL. Usando almacenamiento local.",
            );
            throw new Error("PERFILES_ENTIDAD_BD_AUSENTE");
          }
          throw new Error(error.message);
        }
        perfilesEntidadRpcDisponible = true;
        const raw = (data ?? {}) as Record<string, unknown>;
        const snapshot: PerfilesEntidadPrincipal = {
          perfiles: asArray<Record<string, unknown>>(raw.perfiles).map(
            normalizarPerfilEntidad,
          ),
          asignaciones: asArray<Record<string, unknown>>(raw.asignaciones).map(
            normalizarAsignacionPerfil,
          ),
        };
        cachePerfilesEntidad = {
          instalacionId,
          at: Date.now(),
          data: snapshot,
        };
        return snapshot;
      })().finally(() => {
        inflightPerfilesEntidad = null;
      });
      inflightPerfilesEntidad = promesa;
      return promesa;
    };

    if (usableStale && cachePerfilesEntidad) {
      void dispararRed().catch(() => undefined);
      return cachePerfilesEntidad.data;
    }

    return dispararRed();
  },

  async guardarPerfilEntidad(
    instalacionId: string,
    perfil: PerfilEntidad,
  ): Promise<PerfilEntidad> {
    if (perfilesEntidadRpcDisponible === false) {
      throw new Error("PERFILES_ENTIDAD_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_perfil", {
      p_instalacion_id: instalacionId,
      p_perfil: perfil,
    });
    if (error) {
      if (esErrorRpcPerfilesEntidadAusente(error)) {
        perfilesEntidadRpcDisponible = false;
        throw new Error("PERFILES_ENTIDAD_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarPerfilesEntidad(instalacionId);
    notificarMembresiasActualizadas();
    return normalizarPerfilEntidad((data ?? {}) as Record<string, unknown>);
  },

  async guardarAsignacionPerfil(
    instalacionId: string,
    asignacion: AsignacionPerfilUsuario,
  ): Promise<AsignacionPerfilUsuario> {
    if (perfilesEntidadRpcDisponible === false) {
      throw new Error("PERFILES_ENTIDAD_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc(
      "org_guardar_asignacion_perfil",
      {
        p_instalacion_id: instalacionId,
        p_asignacion: asignacion,
      },
    );
    if (error) {
      if (esErrorRpcPerfilesEntidadAusente(error)) {
        perfilesEntidadRpcDisponible = false;
        throw new Error("PERFILES_ENTIDAD_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarPerfilesEntidad(instalacionId);
    notificarMembresiasActualizadas();
    return normalizarAsignacionPerfil((data ?? {}) as Record<string, unknown>);
  },

  async eliminarAsignacionPerfil(
    instalacionId: string,
    asignacionId: string,
  ): Promise<void> {
    if (perfilesEntidadRpcDisponible === false) {
      throw new Error("PERFILES_ENTIDAD_BD_AUSENTE");
    }
    const { error } = await cliente().rpc("org_eliminar_asignacion_perfil", {
      p_instalacion_id: instalacionId,
      p_asignacion_id: asignacionId,
    });
    if (error) {
      if (esErrorRpcPerfilesEntidadAusente(error)) {
        perfilesEntidadRpcDisponible = false;
        throw new Error("PERFILES_ENTIDAD_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarPerfilesEntidad(instalacionId);
    notificarMembresiasActualizadas();
  },

  invalidarPresencia(instalacionId?: string) {
    if (!instalacionId || cachePresencia?.instalacionId === instalacionId) {
      cachePresencia = null;
    }
    inflightPresencia = null;
    cachePresenciasPublicas = null;
    inflightPresenciasPublicas = null;
  },

  async obtenerPresencia(
    instalacionId: string,
    forzar = false,
  ): Promise<PresenciaOrganizacionPrincipal> {
    if (presenciaRpcDisponible === false) {
      throw new Error("PRESENCIA_BD_AUSENTE");
    }
    const fresco =
      !forzar &&
      cachePresencia &&
      cachePresencia.instalacionId === instalacionId &&
      Date.now() - cachePresencia.at < PRESENCIA_FRESH_MS;
    if (fresco && cachePresencia) return cachePresencia.data;

    const usableStale =
      !forzar &&
      cachePresencia &&
      cachePresencia.instalacionId === instalacionId &&
      Date.now() - cachePresencia.at < PRESENCIA_STALE_MS;

    const dispararRed = () => {
      if (inflightPresencia) return inflightPresencia;
      const promesa = (async () => {
        const { data, error } = await cliente().rpc("org_obtener_presencia", {
          p_instalacion_id: instalacionId,
        });
        if (error) {
          if (esErrorRpcPresenciaAusente(error)) {
            presenciaRpcDisponible = false;
            console.warn(
              "[presencia] Falta ejecutar supabase/migrations/20260811152000_org_presencia.sql en PRINCIPAL. Usando almacenamiento local.",
            );
            throw new Error("PRESENCIA_BD_AUSENTE");
          }
          throw new Error(error.message);
        }
        presenciaRpcDisponible = true;
        const snapshot = normalizarPresencia(
          (data ?? {}) as Record<string, unknown>,
          instalacionId,
        );
        cachePresencia = {
          instalacionId,
          at: Date.now(),
          data: snapshot,
        };
        return snapshot;
      })().finally(() => {
        inflightPresencia = null;
      });
      inflightPresencia = promesa;
      return promesa;
    };

    if (usableStale && cachePresencia) {
      void dispararRed().catch(() => undefined);
      return cachePresencia.data;
    }
    return dispararRed();
  },

  async guardarPresencia(
    instalacionId: string,
    presencia: Partial<PresenciaOrganizacionPrincipal>,
  ): Promise<PresenciaOrganizacionPrincipal> {
    if (presenciaRpcDisponible === false) {
      throw new Error("PRESENCIA_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_presencia", {
      p_instalacion_id: instalacionId,
      p_presencia: presencia,
    });
    if (error) {
      if (esErrorRpcPresenciaAusente(error)) {
        presenciaRpcDisponible = false;
        throw new Error("PRESENCIA_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarPresencia(instalacionId);
    return normalizarPresencia(
      (data ?? {}) as Record<string, unknown>,
      instalacionId,
    );
  },

  async listarPresenciasPublicas(
    forzar = false,
  ): Promise<EntidadPublicaComunidad[]> {
    if (presenciaRpcDisponible === false) {
      throw new Error("PRESENCIA_BD_AUSENTE");
    }
    const fresco =
      !forzar &&
      cachePresenciasPublicas &&
      Date.now() - cachePresenciasPublicas.at < PRESENCIA_FRESH_MS;
    if (fresco && cachePresenciasPublicas) {
      return cachePresenciasPublicas.data;
    }

    if (inflightPresenciasPublicas) return inflightPresenciasPublicas;
    const promesa = (async () => {
      const { data, error } = await cliente().rpc(
        "org_listar_presencias_publicas",
      );
      if (error) {
        if (esErrorRpcPresenciaAusente(error)) {
          presenciaRpcDisponible = false;
          throw new Error("PRESENCIA_BD_AUSENTE");
        }
        throw new Error(error.message);
      }
      presenciaRpcDisponible = true;
      const raw = (data ?? {}) as Record<string, unknown>;
      const lista = asArray<Record<string, unknown>>(raw.entidades).map((item) =>
        normalizarPresencia(item, String(item.id ?? "")),
      );
      cachePresenciasPublicas = { at: Date.now(), data: lista };
      return lista;
    })().finally(() => {
      inflightPresenciasPublicas = null;
    });
    inflightPresenciasPublicas = promesa;
    return promesa;
  },

  invalidarSedesReglas(instalacionId?: string) {
    if (!instalacionId || cacheSedesReglas?.instalacionId === instalacionId) {
      cacheSedesReglas = null;
    }
    inflightSedesReglas = null;
  },

  async listarSedesReglas(
    instalacionId: string,
    forzar = false,
  ): Promise<SedesReglasPrincipal> {
    if (sedesReglasRpcDisponible === false) {
      throw new Error("SEDES_REGLAS_BD_AUSENTE");
    }
    const fresco =
      !forzar &&
      cacheSedesReglas &&
      cacheSedesReglas.instalacionId === instalacionId &&
      Date.now() - cacheSedesReglas.at < SEDES_REGLAS_FRESH_MS;
    if (fresco && cacheSedesReglas) return cacheSedesReglas.data;

    const usableStale =
      !forzar &&
      cacheSedesReglas &&
      cacheSedesReglas.instalacionId === instalacionId &&
      Date.now() - cacheSedesReglas.at < SEDES_REGLAS_STALE_MS;

    const dispararRed = () => {
      if (inflightSedesReglas) return inflightSedesReglas;
      const promesa = (async () => {
        const { data, error } = await cliente().rpc("org_listar_sedes_reglas", {
          p_instalacion_id: instalacionId,
        });
        if (error) {
          if (esErrorRpcSedesReglasAusente(error)) {
            sedesReglasRpcDisponible = false;
            console.warn(
              "[sedes-reglas] Falta ejecutar supabase/migrations/20260811154000_org_sedes_reglas_acceso.sql en PRINCIPAL. Usando almacenamiento local.",
            );
            throw new Error("SEDES_REGLAS_BD_AUSENTE");
          }
          throw new Error(error.message);
        }
        sedesReglasRpcDisponible = true;
        const raw = (data ?? {}) as Record<string, unknown>;
        const snapshot: SedesReglasPrincipal = {
          sedes: asArray<Record<string, unknown>>(raw.sedes).map(normalizarSede),
          reglas: asArray<Record<string, unknown>>(raw.reglas).map(
            normalizarReglaAcceso,
          ),
        };
        cacheSedesReglas = {
          instalacionId,
          at: Date.now(),
          data: snapshot,
        };
        return snapshot;
      })().finally(() => {
        inflightSedesReglas = null;
      });
      inflightSedesReglas = promesa;
      return promesa;
    };

    if (usableStale && cacheSedesReglas) {
      void dispararRed().catch(() => undefined);
      return cacheSedesReglas.data;
    }
    return dispararRed();
  },

  async guardarSede(
    instalacionId: string,
    sede: SedeOrganizacion,
  ): Promise<SedeOrganizacion> {
    if (sedesReglasRpcDisponible === false) {
      throw new Error("SEDES_REGLAS_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_sede", {
      p_instalacion_id: instalacionId,
      p_sede: sede,
    });
    if (error) {
      if (esErrorRpcSedesReglasAusente(error)) {
        sedesReglasRpcDisponible = false;
        throw new Error("SEDES_REGLAS_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarSedesReglas(instalacionId);
    return normalizarSede((data ?? {}) as Record<string, unknown>);
  },

  async eliminarSede(instalacionId: string, sedeId: string): Promise<void> {
    if (sedesReglasRpcDisponible === false) {
      throw new Error("SEDES_REGLAS_BD_AUSENTE");
    }
    const { error } = await cliente().rpc("org_eliminar_sede", {
      p_instalacion_id: instalacionId,
      p_sede_id: sedeId,
    });
    if (error) {
      if (esErrorRpcSedesReglasAusente(error)) {
        sedesReglasRpcDisponible = false;
        throw new Error("SEDES_REGLAS_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarSedesReglas(instalacionId);
  },

  async guardarReglaAcceso(
    instalacionId: string,
    regla: ReglaAccesoCursoEntidad,
  ): Promise<ReglaAccesoCursoEntidad> {
    if (sedesReglasRpcDisponible === false) {
      throw new Error("SEDES_REGLAS_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_regla_acceso", {
      p_instalacion_id: instalacionId,
      p_regla: regla,
    });
    if (error) {
      if (esErrorRpcSedesReglasAusente(error)) {
        sedesReglasRpcDisponible = false;
        throw new Error("SEDES_REGLAS_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarSedesReglas(instalacionId);
    return normalizarReglaAcceso((data ?? {}) as Record<string, unknown>);
  },

  async eliminarReglaAcceso(
    instalacionId: string,
    reglaId: string,
  ): Promise<void> {
    if (sedesReglasRpcDisponible === false) {
      throw new Error("SEDES_REGLAS_BD_AUSENTE");
    }
    const { error } = await cliente().rpc("org_eliminar_regla_acceso", {
      p_instalacion_id: instalacionId,
      p_regla_id: reglaId,
    });
    if (error) {
      if (esErrorRpcSedesReglasAusente(error)) {
        sedesReglasRpcDisponible = false;
        throw new Error("SEDES_REGLAS_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarSedesReglas(instalacionId);
  },

  invalidarAsignacionesRutas(instalacionId?: string) {
    if (
      !instalacionId ||
      cacheAsignacionesRutas?.instalacionId === instalacionId
    ) {
      cacheAsignacionesRutas = null;
    }
    inflightAsignacionesRutas = null;
  },

  async listarAsignacionesRutas(
    instalacionId: string,
    forzar = false,
  ): Promise<AsignacionesRutasPrincipal> {
    if (asignacionesRutasRpcDisponible === false) {
      throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
    }
    const fresco =
      !forzar &&
      cacheAsignacionesRutas &&
      cacheAsignacionesRutas.instalacionId === instalacionId &&
      Date.now() - cacheAsignacionesRutas.at < ASIGNACIONES_RUTAS_FRESH_MS;
    if (fresco && cacheAsignacionesRutas) return cacheAsignacionesRutas.data;

    const usableStale =
      !forzar &&
      cacheAsignacionesRutas &&
      cacheAsignacionesRutas.instalacionId === instalacionId &&
      Date.now() - cacheAsignacionesRutas.at < ASIGNACIONES_RUTAS_STALE_MS;

    const dispararRed = () => {
      if (inflightAsignacionesRutas) return inflightAsignacionesRutas;
      const promesa = (async () => {
        const { data, error } = await cliente().rpc(
          "org_listar_asignaciones_rutas",
          { p_instalacion_id: instalacionId },
        );
        if (error) {
          if (esErrorRpcAsignacionesRutasAusente(error)) {
            asignacionesRutasRpcDisponible = false;
            console.warn(
              "[asignaciones-rutas] Falta ejecutar supabase/migrations/20260811155000_org_asignaciones_rutas.sql en PRINCIPAL. Usando almacenamiento local.",
            );
            throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
          }
          throw new Error(error.message);
        }
        asignacionesRutasRpcDisponible = true;
        const raw = (data ?? {}) as Record<string, unknown>;
        const snapshot: AsignacionesRutasPrincipal = {
          asignaciones: asArray<Record<string, unknown>>(raw.asignaciones).map(
            normalizarAsignacion,
          ),
          rutas: asArray<Record<string, unknown>>(raw.rutas).map(normalizarRuta),
        };
        cacheAsignacionesRutas = {
          instalacionId,
          at: Date.now(),
          data: snapshot,
        };
        return snapshot;
      })().finally(() => {
        inflightAsignacionesRutas = null;
      });
      inflightAsignacionesRutas = promesa;
      return promesa;
    };

    if (usableStale && cacheAsignacionesRutas) {
      void dispararRed().catch(() => undefined);
      return cacheAsignacionesRutas.data;
    }
    return dispararRed();
  },

  async guardarAsignacion(
    instalacionId: string,
    asignacion: AsignacionOrganizacion,
  ): Promise<AsignacionOrganizacion> {
    if (asignacionesRutasRpcDisponible === false) {
      throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_asignacion", {
      p_instalacion_id: instalacionId,
      p_asignacion: asignacion,
    });
    if (error) {
      if (esErrorRpcAsignacionesRutasAusente(error)) {
        asignacionesRutasRpcDisponible = false;
        throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarAsignacionesRutas(instalacionId);
    return normalizarAsignacion((data ?? {}) as Record<string, unknown>);
  },

  async eliminarAsignacion(
    instalacionId: string,
    asignacionId: string,
  ): Promise<void> {
    if (asignacionesRutasRpcDisponible === false) {
      throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
    }
    const { error } = await cliente().rpc("org_eliminar_asignacion", {
      p_instalacion_id: instalacionId,
      p_asignacion_id: asignacionId,
    });
    if (error) {
      if (esErrorRpcAsignacionesRutasAusente(error)) {
        asignacionesRutasRpcDisponible = false;
        throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarAsignacionesRutas(instalacionId);
  },

  async guardarRuta(
    instalacionId: string,
    ruta: RutaOrganizacion,
  ): Promise<RutaOrganizacion> {
    if (asignacionesRutasRpcDisponible === false) {
      throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
    }
    const { data, error } = await cliente().rpc("org_guardar_ruta", {
      p_instalacion_id: instalacionId,
      p_ruta: ruta,
    });
    if (error) {
      if (esErrorRpcAsignacionesRutasAusente(error)) {
        asignacionesRutasRpcDisponible = false;
        throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarAsignacionesRutas(instalacionId);
    return normalizarRuta((data ?? {}) as Record<string, unknown>);
  },

  async eliminarRuta(instalacionId: string, rutaId: string): Promise<void> {
    if (asignacionesRutasRpcDisponible === false) {
      throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
    }
    const { error } = await cliente().rpc("org_eliminar_ruta", {
      p_instalacion_id: instalacionId,
      p_ruta_id: rutaId,
    });
    if (error) {
      if (esErrorRpcAsignacionesRutasAusente(error)) {
        asignacionesRutasRpcDisponible = false;
        throw new Error("ASIGNACIONES_RUTAS_BD_AUSENTE");
      }
      throw new Error(error.message);
    }
    this.invalidarAsignacionesRutas(instalacionId);
  },

  async listarCategoriasCursos(
    instalacionId: string,
  ): Promise<CategoriaCursoEntidad[]> {
    const { data, error } = await cliente().rpc("org_listar_categorias_cursos", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    return normalizarCategorias((data ?? {}) as Record<string, unknown>);
  },

  async listarCategoriasCatalogo(
    instalacionId: string,
  ): Promise<CategoriaCursoEntidad[]> {
    const { data, error } = await cliente().rpc(
      "org_listar_categorias_catalogo",
      { p_instalacion_id: instalacionId },
    );
    if (error) throw new Error(error.message);
    return normalizarCategorias((data ?? {}) as Record<string, unknown>);
  },

  async guardarCategoriaCurso(
    instalacionId: string,
    categoria: CategoriaCursoEntidad | Record<string, unknown>,
  ): Promise<CategoriaCursoEntidad> {
    const { data, error } = await cliente().rpc("org_guardar_categoria_curso", {
      p_instalacion_id: instalacionId,
      p_categoria: categoria,
    });
    if (error) throw new Error(error.message);
    return normalizarCategoria((data ?? {}) as Record<string, unknown>);
  },

  async eliminarCategoriaCurso(
    instalacionId: string,
    categoriaId: string,
  ): Promise<void> {
    const { error } = await cliente().rpc("org_eliminar_categoria_curso", {
      p_instalacion_id: instalacionId,
      p_categoria_id: categoriaId,
    });
    if (error) throw new Error(error.message);
  },

  async listarExcepcionesPermiso(instalacionId: string): Promise<
    Array<{
      id: string;
      identidadRef: string;
      permisoCodigo: string;
      efecto: "CONCEDER" | "DENEGAR";
      motivo: string;
      correo?: string | null;
      nombre?: string | null;
      actualizadoEn?: string;
    }>
  > {
    const { data, error } = await cliente().rpc("org_listar_excepciones_permiso", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    const payload = (data ?? {}) as { excepciones?: unknown };
    const lista = Array.isArray(payload.excepciones) ? payload.excepciones : [];
    return lista.map((item) => {
      const raw = item as Record<string, unknown>;
      return {
        id: String(raw.id ?? ""),
        identidadRef: String(raw.identidadRef ?? ""),
        permisoCodigo: String(raw.permisoCodigo ?? ""),
        efecto: String(raw.efecto ?? "DENEGAR").toUpperCase() === "CONCEDER"
          ? "CONCEDER"
          : "DENEGAR",
        motivo: String(raw.motivo ?? ""),
        correo: raw.correo == null ? null : String(raw.correo),
        nombre: raw.nombre == null ? null : String(raw.nombre),
        actualizadoEn: raw.actualizadoEn
          ? String(raw.actualizadoEn)
          : undefined,
      };
    });
  },

  async guardarExcepcionPermiso(
    instalacionId: string,
    excepcion: {
      id?: string;
      identidadRef: string;
      permisoCodigo: string;
      efecto: "CONCEDER" | "DENEGAR";
      motivo?: string;
    },
  ) {
    const { data, error } = await cliente().rpc("org_guardar_excepcion_permiso", {
      p_instalacion_id: instalacionId,
      p_excepcion: excepcion,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async eliminarExcepcionPermiso(instalacionId: string, excepcionId: string) {
    const { error } = await cliente().rpc("org_eliminar_excepcion_permiso", {
      p_instalacion_id: instalacionId,
      p_excepcion_id: excepcionId,
    });
    if (error) throw new Error(error.message);
  },
};

export function presenciaAConfiguracion(presencia: PresenciaOrganizacionPrincipal) {
  return {
    nombre: presencia.nombre,
    logo: presencia.logo,
    ruc: presencia.ruc,
    dominio: presencia.dominio,
    zonaHoraria: presencia.zonaHoraria,
    restringirDominio: presencia.restringirDominio,
    requiereDniEnrolamiento: presencia.requiereDniEnrolamiento,
  };
}
