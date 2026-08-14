import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import {
  asignacionesRutasBdDisponible,
  esErrorRpcAsignacionesRutasAusente,
  esErrorRpcOrganigramaAusente,
  esErrorRpcPerfilesEntidadAusente,
  esErrorRpcPresenciaAusente,
  esErrorRpcSedesReglasAusente,
  organigramaBdDisponible,
  organizacionPrincipalService,
  perfilesEntidadBdDisponible,
  presenciaAConfiguracion,
  presenciaBdDisponible,
  sedesReglasBdDisponible,
} from "@/api/services/organizacion-principal.service";
import {
  asignacionesPerfilUsuario,
  estructurasOrganizacionales,
  nivelesOrganizacionales,
  perfilesEntidad,
  politicasIncorporacionEntidad,
  reglasAccesoCursoEntidad,
  tiposUnidadEntidad,
  unidadesOrganizacionales,
  vinculacionesUnidad,
} from "@/portal-organizacion/data/estructura-organizacional.mock";
import type {
  AsignacionPerfilUsuario,
  EstructuraOrganizacional,
  NivelOrganizacional,
  PerfilEntidad,
  PoliticaIncorporacionUnidad,
  EvaluacionAccesoCursoEntidad,
  ReglaAccesoCursoEntidad,
  TipoUnidadEntidad,
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";
import {
  crearAlmacenDocumento,
  crearRepositorioLocal,
} from "@/api/repositorio-local";
import { resolveMock } from "@/api/mock";
import { CONTEXTO_SESION_KEY } from "@/lib/constants";
import {
  areasOrganizacion,
  asignacionesOrganizacion,
  catalogoCursosOrganizacion,
  certificadosOrganizacion,
  certificadosPendientesOrganizacion,
  matriculasOrganizacion,
  rutasOrganizacion,
  usuariosOrganizacion,
} from "@/portal-organizacion/data/organizacion.mock";
import { sesionesEnVivoCompartidas } from "@/api/services/sesiones-en-vivo-compartidas.service";
import type {
  ProgramarSesionEnVivoInput,
  SesionEnVivoOrganizacion,
} from "@/portal-organizacion/types/sesiones-en-vivo.types";
import type { ContextoSesion } from "@/types/membresia.types";
import type {
  CertificadoEmitidoDocente,
  CertificadoPendienteDocente,
  EstadoCursoDocente,
} from "@/portal-docente/types/docente.types";

type Identificador = string | number;
type RegistroIdentificable = { id: Identificador };

export interface UsuarioOrganizacion {
  /** En mock es number; con Supabase es el UUID de identidad_principal. */
  id: string | number;
  nombre: string;
  iniciales: string;
  correo: string;
  area: string;
  sede: string;
  rol: string;
  progreso: number;
  estado: "ACTIVO" | "INVITADO" | "SUSPENDIDO";
  especialidad?: string;
  colegiaturaActiva?: boolean;
  unidadPrincipalId?: string | null;
  sedeId?: string;
  dni?: string;
  /** Cómo llegó la persona al directorio de la entidad. */
  origenIngreso?: "COMUNIDAD" | "INVITACION_ADMIN" | "IMPORTACION";
}

export interface IncorporacionPersonaOrganizacion {
  nombre: string;
  correo: string;
  dni?: string;
  unidadId: string;
  sedeId?: string;
  perfilId: string;
  especialidad?: string;
}

export interface ResultadoIncorporacionPersona {
  usuario: UsuarioOrganizacion;
  vinculacion: VinculacionUnidad;
  asignacionPerfil: AsignacionPerfilUsuario;
}

/** Una inscripción por alumno y curso dentro de la organización. */
export interface MatriculaAlumnoOrganizacion {
  id: string;
  alumnoId: string;
  cursoId: string;
  nombre: string;
  iniciales: string;
  curso: string;
  organizacion: string;
  progreso: number;
  ultimoAcceso: string;
  ultimoAccesoFecha: string;
  fechaInscripcion: string;
  estado: "ACTIVO" | "COMPLETADO" | "EN_RIESGO" | "PENDIENTE";
  /** Interno: persona vinculada a la entidad. Externo: lleva cursos sin pertenecer a la estructura. */
  tipo: "INTERNO" | "EXTERNO";
  /** Instantánea auditable: la condición no cambia si luego cambia la estructura. */
  condicionAlInscribirse?: "INTERNO" | "EXTERNO";
  origenAcceso?:
    | "CURSO_PUBLICO"
    | "NODO_INTERNO"
    | "ASIGNACION"
    | "APROBACION";
  unidadOrigenId?: string;
  modalidad?: "LIBRE" | "ASIGNADA" | "SOLICITADA" | "INVITACION";
}

export interface AreaOrganizacion {
  id: string;
  nombre: string;
  usuarios: number;
  responsable: string;
  progreso: number;
  color: string;
}

export interface SedeOrganizacion {
  id: string;
  nombre: string;
  ciudad: string;
  usuarios: number;
  areas: number;
}

export interface AsignacionOrganizacion {
  id: string;
  /** Id del curso (docente/secundaria) cuando se conoce; el título sigue en `curso`. */
  cursoId?: string;
  curso: string;
  destino: string;
  asignados: number;
  completados: number;
  vence: string;
  obligatorio: boolean;
  destinoUnidadId?: string;
  incluirDescendientes?: boolean;
  estado?: "ACTIVA" | "FINALIZADA" | "CANCELADA";
  creadaEn?: string;
}

export interface CursoEnRutaOrganizacion {
  id: string;
  titulo: string;
  docente?: string;
  orden: number;
}

export interface RutaOrganizacion {
  id: string;
  nombre: string;
  descripcion?: string;
  /** Portada visual de la ruta (URL). */
  imagen?: string;
  cursos: number;
  cursosSeleccionados?: CursoEnRutaOrganizacion[];
  usuarios: number;
  progreso: number;
  certificado: boolean;
  precio?: number;
  gratuito?: boolean;
  moneda?: "PEN" | "USD";
  alcance?: AlcanceCursoOrganizacion;
  destinoArea?: string | null;
  descuentoInterno?: number;
  descuentoAplicaA?: DestinatarioDescuento;
  descuentoArea?: string | null;
  /** Política de combinación (mismo motor que aprobación de cursos). */
  politicaDescuentos?: import("@/types/comercializacion-curso.types").PoliticaCombinacionDescuentos;
  /** Reglas editables de descuento (automáticos, códigos, nodo, persona). */
  descuentos?: import("@/types/comercializacion-curso.types").ReglaDescuentoCurso[];
  estado?: "BORRADOR" | "PUBLICADA" | "ARCHIVADA";
}

export interface ConfiguracionOrganizacion {
  nombre: string;
  logo?: string;
  ruc: string;
  dominio: string;
  zonaHoraria: string;
  restringirDominio: boolean;
  /** Si es true, el enrolamiento exige DNI. Algunas entidades lo desactivan. */
  requiereDniEnrolamiento: boolean;
}

export interface IntegracionOrganizacion {
  id: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  endpoint: string;
}

export interface ConsumoLicenciaOrganizacion {
  id: string;
  etiqueta: string;
  utilizado: number;
  limite: number;
  unidad: string;
}

export interface LicenciaOrganizacion {
  plan: string;
  descripcion: string;
  inicio: string;
  fin: string;
  estado: "ACTIVA" | "POR_VENCER" | "VENCIDA";
  consumos: ConsumoLicenciaOrganizacion[];
  /** true cuando la licencia vive en BD (ampliar/renovar no es local). */
  soloLectura?: boolean;
}

export interface FacturacionOrganizacion {
  plan: string;
  periodicidad: "MENSUAL" | "ANUAL";
  proximoCobro: string;
  importe: number;
  moneda: "PEN" | "USD";
  tarjetaMarca: string;
  tarjetaUltimos4: string;
  tarjetaVencimiento: string;
  /** true cuando plan/medio de pago los gestiona administración Tukuy. */
  soloLectura?: boolean;
  mensajeGestion?: string;
}

export interface ComprobanteOrganizacion {
  id: string;
  numero: string;
  fecha: string;
  concepto: string;
  importe: number;
  moneda: "PEN" | "USD";
  estado: "PAGADO" | "PENDIENTE" | "ANULADO";
}

export interface NotificacionOrganizacion {
  id: string;
  titulo: string;
  detalle: string;
  fecha: string;
  leida: boolean;
  ruta?: string;
}

export type EstadoPropuestaCursoOrganizacion =
  | "EN_REVISION"
  | "CONTENIDO_REVISADO"
  | "APROBADO"
  | "OBSERVADO"
  | "PUBLICADO";

export type AlcanceCursoOrganizacion =
  | "ORGANIZACION"
  | "AREA"
  | "EXTERNO"
  | "TODOS";

/** A quién se le aplica el descuento (independiente del alcance de acceso). */
export type DestinatarioDescuento =
  | "NINGUNO"
  | "ORGANIZACION"
  | "AREA"
  | "EXTERNO";

export interface PropuestaCursoOrganizacion {
  id: string;
  cursoDocenteId: string;
  titulo: string;
  imagen: string;
  docente: string;
  docenteResponsableId?: string;
  cargadoPor?: string;
  origenCarga?: "DOCENTE" | "ADMINISTRACION";
  categoria: string;
  enviado: string;
  lecciones: number;
  duracion: string;
  estado: EstadoPropuestaCursoOrganizacion;
  observacion?: string;
  precio?: number;
  moneda?: "PEN" | "USD";
  gratuito?: boolean;
  alcance?: AlcanceCursoOrganizacion;
  destinoArea?: string | null;
  /** % de descuento. */
  descuentoInterno?: number;
  /** A quién beneficia el descuento. */
  descuentoAplicaA?: DestinatarioDescuento;
  /** Área beneficiaria cuando descuentoAplicaA === AREA. */
  descuentoArea?: string | null;
  /** Configuración comercial completa del wizard (demo / mock). */
  configuracionPublicacion?: import("@/types/comercializacion-curso.types").ConfiguracionPublicacionCurso;
  /** El docente propuso precio al enviar a revisión (permiso cursos.definir_precio). */
  precioPropuestoPorDocente?: boolean;
}

export interface AprobacionCursoOrganizacion {
  precio: number;
  moneda?: "PEN" | "USD";
  alcance: AlcanceCursoOrganizacion;
  destinoArea?: string | null;
  descuentoInterno?: number;
  descuentoAplicaA?: DestinatarioDescuento;
  descuentoArea?: string | null;
  obligatorio?: boolean;
  vence?: string;
  publicar?: boolean;
  /** Snapshot completo para simular guardado de descuentos y precios. */
  configuracionPublicacion?: import("@/types/comercializacion-curso.types").ConfiguracionPublicacionCurso;
}

export function etiquetaAlcanceCorto(
  alcance: AlcanceCursoOrganizacion | undefined,
): string {
  if (alcance === "AREA") return "Solo un nodo";
  if (alcance === "EXTERNO") return "Público externo";
  if (alcance === "ORGANIZACION") return "Toda la organización";
  if (alcance === "TODOS") return "Todo el público";
  return "Sin alcance";
}

export function etiquetaDescuentoAplicaA(
  aplicaA: DestinatarioDescuento | undefined,
  area?: string | null,
): string {
  if (!aplicaA || aplicaA === "NINGUNO") return "Sin descuento";
  if (aplicaA === "ORGANIZACION") return "Colaboradores";
  if (aplicaA === "EXTERNO") return "Público externo";
  return area ? `Nodo ${area}` : "Un nodo";
}

/** Precio con descuento para el grupo beneficiario. */
export function calcularPrecioConDescuento(
  precio: number,
  descuento: number | undefined,
  aplicaA: DestinatarioDescuento | undefined,
): number {
  if (precio <= 0) return 0;
  if (!aplicaA || aplicaA === "NINGUNO" || !descuento) return precio;
  const factor = Math.min(Math.max(descuento, 0), 100) / 100;
  return Math.round(precio * (1 - factor) * 100) / 100;
}

/**
 * Precio según el comprador. Si no es el beneficiario del descuento,
 * paga el precio completo (p. ej. externos sin descuento).
 */
export function calcularPrecioParaComprador(
  precio: number,
  descuento: number | undefined,
  aplicaA: DestinatarioDescuento | undefined,
  descuentoArea: string | null | undefined,
  comprador: DestinatarioDescuento,
  areaComprador?: string | null,
): number {
  if (precio <= 0) return 0;
  if (!aplicaA || aplicaA === "NINGUNO" || !descuento) return precio;
  if (aplicaA === "AREA") {
    if (
      comprador !== "AREA" ||
      !descuentoArea ||
      areaComprador !== descuentoArea
    ) {
      return precio;
    }
  } else if (aplicaA !== comprador) {
    return precio;
  }
  return calcularPrecioConDescuento(precio, descuento, aplicaA);
}

/** Compatibilidad: precio del grupo con descuento. */
export function calcularPrecioFinal(
  precio: number,
  _alcance: AlcanceCursoOrganizacion | undefined,
  descuento: number | undefined,
  aplicaA: DestinatarioDescuento | undefined = descuento
    ? "ORGANIZACION"
    : "NINGUNO",
): number {
  return calcularPrecioConDescuento(precio, descuento, aplicaA);
}

const contextoPredeterminado: ContextoSesion = {
  membresiaId: "mem-org-admin",
  funcionId: "mem-org-admin",
  rolId: "ORGANIZATION_ADMIN",
  usuarioId: "usuario-actual",
  organizacionId: "org-empresa-abc",
  organizacionNombre: "COLEGIO DE INGENIEROS CUSCO",
  rol: "ORGANIZATION_ADMIN",
  permisos: [],
  portal: "organizacion",
};

function contextoActual(): ContextoSesion {
  const guardado = localStorage.getItem(CONTEXTO_SESION_KEY);
  if (!guardado) return contextoPredeterminado;
  try {
    return JSON.parse(guardado) as ContextoSesion;
  } catch {
    localStorage.removeItem(CONTEXTO_SESION_KEY);
    return contextoPredeterminado;
  }
}

function claveContextual(recurso: string) {
  const contexto = contextoActual();
  const ambito = contexto.organizacionId ?? contexto.membresiaId;
  return `tukuy_demo_organizacion_${ambito}_${recurso}`;
}

function usarOrgPrincipal() {
  return (
    organizacionPrincipalService.activo() &&
    Boolean(contextoActual().organizacionId)
  );
}

function emitirCambio(recurso: string) {
  invalidarCachesOrganizacion(recurso);
  window.dispatchEvent(
    new CustomEvent("tukuy:organizacion-datos", { detail: { recurso } }),
  );
}

const ORG_DATOS_FRESH_MS = 45_000;
const ORG_DATOS_STALE_MS = 5 * 60_000;

export type SnapshotEstructuraOrganizacion = {
  estructuras: EstructuraOrganizacional[];
  niveles: NivelOrganizacional[];
  tiposUnidad: TipoUnidadEntidad[];
  unidades: UnidadOrganizacional[];
  politicasIncorporacion: PoliticaIncorporacionUnidad[];
  vinculaciones: VinculacionUnidad[];
};

type CacheEntrada<T> = {
  clave: string;
  at: number;
  data: T;
};

let cacheSnapshotEstructura: CacheEntrada<SnapshotEstructuraOrganizacion> | null =
  null;
let inflightSnapshotEstructura: Promise<SnapshotEstructuraOrganizacion> | null =
  null;
let cacheUsuariosOrg: CacheEntrada<UsuarioOrganizacion[]> | null = null;
let inflightUsuariosOrg: Promise<UsuarioOrganizacion[]> | null = null;

function claveCacheOrg(): string {
  return contextoActual().organizacionId ?? contextoActual().membresiaId ?? "local";
}

function invalidarCachesOrganizacion(recurso?: string) {
  const afectaEstructura =
    !recurso ||
    [
      "estructuras",
      "niveles",
      "tiposUnidad",
      "unidades",
      "politicasIncorporacion",
      "vinculaciones",
      "estructuras-organizacion",
      "niveles-organizacion",
      "tipos-unidad",
      "unidades-organizacionales",
      "politicas-incorporacion",
      "vinculaciones-unidad",
    ].includes(recurso);
  const afectaUsuarios = !recurso || recurso === "usuarios";
  if (afectaEstructura) {
    cacheSnapshotEstructura = null;
    inflightSnapshotEstructura = null;
    organizacionPrincipalService.invalidarOrganigrama(
      contextoActual().organizacionId,
    );
  }
  if (afectaUsuarios) {
    cacheUsuariosOrg = null;
    inflightUsuariosOrg = null;
  }
}

async function cargarSnapshotEstructuraLocal(): Promise<SnapshotEstructuraOrganizacion> {
  const [
    estructurasLista,
    nivelesLista,
    tiposLista,
    unidadesLista,
    politicasLista,
    vinculacionesLista,
  ] = await Promise.all([
    estructurasLocal.listar(),
    nivelesLocal.listar(),
    tiposUnidadLocal.listar(),
    unidadesLocal.listar(),
    politicasIncorporacionLocal.listar(),
    vinculacionesLocal.listar(),
  ]);
  return {
    estructuras: estructurasLista,
    niveles: nivelesLista,
    tiposUnidad: tiposLista,
    unidades: unidadesLista,
    politicasIncorporacion: politicasLista,
    vinculaciones: vinculacionesLista,
  };
}

async function obtenerSnapshotEstructura(
  forzar = false,
): Promise<SnapshotEstructuraOrganizacion> {
  const clave = claveCacheOrg();
  const ahora = Date.now();
  if (
    !forzar &&
    cacheSnapshotEstructura &&
    cacheSnapshotEstructura.clave === clave &&
    ahora - cacheSnapshotEstructura.at < ORG_DATOS_FRESH_MS
  ) {
    return cacheSnapshotEstructura.data;
  }
  if (
    !forzar &&
    cacheSnapshotEstructura &&
    cacheSnapshotEstructura.clave === clave &&
    ahora - cacheSnapshotEstructura.at < ORG_DATOS_STALE_MS
  ) {
    void refrescarSnapshotEstructura(true).catch(() => undefined);
    return cacheSnapshotEstructura.data;
  }
  return refrescarSnapshotEstructura(forzar);
}

async function refrescarSnapshotEstructura(
  forzar = false,
): Promise<SnapshotEstructuraOrganizacion> {
  if (!forzar && inflightSnapshotEstructura) return inflightSnapshotEstructura;
  const clave = claveCacheOrg();
  const promesa = (async () => {
    let data: SnapshotEstructuraOrganizacion;
    if (usaOrganigramaBd()) {
      try {
        const instalacionId = contextoActual().organizacionId!;
        data = await organizacionPrincipalService.listarOrganigrama(
          instalacionId,
          forzar,
        );
      } catch (error) {
        if (!esErrorRpcOrganigramaAusente(error)) throw error;
        data = await cargarSnapshotEstructuraLocal();
      }
    } else {
      data = await cargarSnapshotEstructuraLocal();
    }
    cacheSnapshotEstructura = { clave, at: Date.now(), data };
    return data;
  })().finally(() => {
    inflightSnapshotEstructura = null;
  });
  inflightSnapshotEstructura = promesa;
  return promesa;
}

async function listarUsuariosConCache(forzar = false): Promise<UsuarioOrganizacion[]> {
  const clave = claveCacheOrg();
  const ahora = Date.now();
  if (
    !forzar &&
    cacheUsuariosOrg &&
    cacheUsuariosOrg.clave === clave &&
    ahora - cacheUsuariosOrg.at < ORG_DATOS_FRESH_MS
  ) {
    return cacheUsuariosOrg.data;
  }
  if (
    !forzar &&
    cacheUsuariosOrg &&
    cacheUsuariosOrg.clave === clave &&
    ahora - cacheUsuariosOrg.at < ORG_DATOS_STALE_MS
  ) {
    void refrescarUsuariosOrg(true).catch(() => undefined);
    return cacheUsuariosOrg.data;
  }
  return refrescarUsuariosOrg(forzar);
}

async function refrescarUsuariosOrg(
  forzar = false,
): Promise<UsuarioOrganizacion[]> {
  if (!forzar && inflightUsuariosOrg) return inflightUsuariosOrg;
  const clave = claveCacheOrg();
  const promesa = (async () => {
    let data: UsuarioOrganizacion[];
    if (usarOrgPrincipal()) {
      const instalacionId = contextoActual().organizacionId;
      if (!instalacionId) {
        throw new Error("No hay organización activa en el contexto de sesión");
      }
      data = await organizacionPrincipalService.listarMiembros(instalacionId);
    } else {
      const registros = await usuariosRepositorio.listar();
      if (!apiConfig.useMock) {
        data = registros;
      } else {
        data = registros.map((usuario) => ({
          ...usuario,
          correo: usuario.correo.replace(
            "@andinaconstructora.pe",
            "@cipcusco.org.pe",
          ),
        }));
        if (
          data.some(
            (usuario, indice) => usuario.correo !== registros[indice]?.correo,
          )
        ) {
          await usuariosRepositorio.reemplazar(data);
        }
      }
    }
    cacheUsuariosOrg = { clave, at: Date.now(), data };
    return data;
  })().finally(() => {
    inflightUsuariosOrg = null;
  });
  inflightUsuariosOrg = promesa;
  return promesa;
}

/** Prefetch en segundo plano al entrar al portal organización. */
export function prefetchPortalOrganizacion(): void {
  void obtenerSnapshotEstructura().catch(() => undefined);
  void listarUsuariosConCache().catch(() => undefined);
  if (usarOrgPrincipal() && perfilesEntidadBdDisponible()) {
    const instalacionId = contextoActual().organizacionId;
    if (instalacionId) {
      void organizacionPrincipalService
        .listarPerfilesEntidad(instalacionId)
        .catch(() => undefined);
    }
  }
}

function crearRepositorioOrganizacion<T extends RegistroIdentificable>(
  recurso: string,
  ruta: string,
  semilla: readonly T[],
  /** Semilla mínima sin demos CIP; si falta, arranca vacío. */
  semillaPrincipal: readonly T[] = [],
) {
  function actual() {
    const sinDemo = apiConfig.sinDatosDemo || usarOrgPrincipal();
    return crearRepositorioLocal<T>({
      clave: claveContextual(recurso),
      ruta,
      // Auth Supabase / org real: sin Colegio/Andina; vacío hasta BD o alta manual.
      semilla: sinDemo ? semillaPrincipal : semilla,
      // v40: invalida localStorage con demos CIP/Andina.
      version: sinDemo ? 40 : 21,
    });
  }

  return {
    listar: () => actual().listar(),
    obtener: (id: Identificador) => actual().obtener(id),
    crear: async (registro: T) => {
      const creado = await actual().crear(registro);
      emitirCambio(recurso);
      return creado;
    },
    actualizar: async (id: Identificador, cambios: Partial<T>) => {
      const actualizado = await actual().actualizar(id, cambios);
      emitirCambio(recurso);
      return actualizado;
    },
    eliminar: async (id: Identificador) => {
      await actual().eliminar(id);
      emitirCambio(recurso);
    },
    reemplazar: async (registros: T[]) => {
      const resultado = await actual().reemplazar(registros);
      emitirCambio(recurso);
      return resultado;
    },
    reiniciar: () => actual().reiniciar(),
  };
}

const usuariosRepositorio = crearRepositorioOrganizacion<UsuarioOrganizacion>(
  "usuarios",
  API.organizacion.usuarios,
  usuariosOrganizacion.map((usuario) => ({
    ...usuario,
    estado: usuario.estado as UsuarioOrganizacion["estado"],
  })),
);

const usuarios = {
  ...usuariosRepositorio,
  async listar(forzar = false) {
    return listarUsuariosConCache(forzar);
  },
  async obtener(id: Identificador) {
    const lista = await listarUsuariosConCache();
    const clave = String(id);
    return lista.find((item) => String(item.id) === clave) ?? null;
  },
};

/** Catálogos mínimos para editar organigrama sin demos del Colegio. */
const tiposUnidadPrincipal: TipoUnidadEntidad[] = [
  {
    id: "tipo-direccion",
    nombreSingular: "Dirección",
    nombrePlural: "Direcciones",
    descripcion: "Unidad de conducción institucional.",
    color: "#B87A00",
    permiteSubunidades: true,
    estado: "ACTIVO",
  },
  {
    id: "tipo-administracion",
    nombreSingular: "Administración",
    nombrePlural: "Administraciones",
    descripcion: "Ejecuta la operación y administra la estructura.",
    color: "#C58A00",
    permiteSubunidades: true,
    estado: "ACTIVO",
  },
  {
    id: "tipo-area",
    nombreSingular: "Área",
    nombrePlural: "Áreas",
    descripcion: "Unidad operativa de la organización.",
    color: "#0B3A78",
    permiteSubunidades: true,
    estado: "ACTIVO",
  },
  {
    id: "tipo-equipo",
    nombreSingular: "Equipo",
    nombrePlural: "Equipos",
    descripcion: "Grupo de trabajo dentro de un área.",
    color: "#0E7490",
    permiteSubunidades: true,
    estado: "ACTIVO",
  },
];

const politicasIncorporacionPrincipal: PoliticaIncorporacionUnidad[] = [
  {
    id: "pol-admin",
    nombre: "Solo un administrador las agrega",
    modalidad: "ASIGNACION_ADMIN",
    estado: "ACTIVA",
  },
  {
    id: "pol-abierta",
    nombre: "Cualquiera puede unirse",
    modalidad: "ABIERTA",
    capacidadMaxima: 500,
    estado: "ACTIVA",
  },
];

const estructurasPrincipal: EstructuraOrganizacional[] = [
  {
    id: "estructura-gobierno",
    nombre: "Gobierno y administración",
    descripcion: "Funciones protegidas necesarias para operar la entidad.",
    tipo: "GOBIERNO",
    modoJerarquia: "FLEXIBLE",
    esSistema: true,
    estado: "ACTIVA",
  },
];

const nivelesPrincipal: NivelOrganizacional[] = [
  {
    id: "nivel-gobierno",
    estructuraId: "estructura-gobierno",
    nombre: "Gobierno",
    orden: 1,
    estado: "ACTIVO",
  },
];

const unidadesPrincipal: UnidadOrganizacional[] = [
  {
    id: "unidad-direccion-gobierno",
    nombre: "Dirección",
    codigo: "DIR",
    codigoSistema: "DIRECCION",
    esSistema: true,
    estructuraId: "estructura-gobierno",
    nivelId: "nivel-gobierno",
    tipoUnidadId: "tipo-direccion",
    unidadPadreId: null,
    politicaIncorporacionId: "pol-admin",
    orden: 1,
    estado: "ACTIVA",
  },
  {
    id: "unidad-administracion",
    nombre: "Administración",
    codigo: "ADM",
    codigoSistema: "ADMINISTRACION",
    esSistema: true,
    estructuraId: "estructura-gobierno",
    nivelId: "nivel-gobierno",
    tipoUnidadId: "tipo-administracion",
    unidadPadreId: null,
    politicaIncorporacionId: "pol-admin",
    orden: 2,
    estado: "ACTIVA",
  },
];

const perfilesPrincipal: PerfilEntidad[] = [];

const areas = crearRepositorioOrganizacion<AreaOrganizacion>(
  "areas",
  API.organizacion.areas,
  areasOrganizacion,
  [],
);

const tiposUnidadLocal = crearRepositorioOrganizacion<TipoUnidadEntidad>(
  "tipos-unidad",
  API.organizacion.tiposUnidad,
  tiposUnidadEntidad,
  tiposUnidadPrincipal,
);

const unidadesLocal = crearRepositorioOrganizacion<UnidadOrganizacional>(
  "unidades-organizacionales",
  API.organizacion.unidades,
  unidadesOrganizacionales,
  unidadesPrincipal,
);

const vinculacionesLocal = crearRepositorioOrganizacion<VinculacionUnidad>(
  "vinculaciones-unidad",
  API.organizacion.vinculaciones,
  vinculacionesUnidad,
  [],
);

const politicasIncorporacionLocal =
  crearRepositorioOrganizacion<PoliticaIncorporacionUnidad>(
    "politicas-incorporacion",
    API.organizacion.politicasIncorporacion,
    politicasIncorporacionEntidad,
    politicasIncorporacionPrincipal,
  );

const estructurasLocal = crearRepositorioOrganizacion<EstructuraOrganizacional>(
  "estructuras-organizacion",
  `${API.organizacion.unidades}/estructuras`,
  estructurasOrganizacionales,
  estructurasPrincipal,
);

const nivelesLocal = crearRepositorioOrganizacion<NivelOrganizacional>(
  "niveles-organizacion",
  `${API.organizacion.unidades}/niveles`,
  nivelesOrganizacionales,
  nivelesPrincipal,
);

type ClaveOrganigrama =
  | "estructuras"
  | "niveles"
  | "tiposUnidad"
  | "unidades"
  | "politicasIncorporacion"
  | "vinculaciones";

async function snapshotOrganigramaPrincipal() {
  const instalacionId = contextoActual().organizacionId;
  if (!instalacionId) {
    throw new Error("No hay organización activa en el contexto de sesión");
  }
  return organizacionPrincipalService.listarOrganigrama(instalacionId);
}

function usaOrganigramaBd() {
  return usarOrgPrincipal() && organigramaBdDisponible();
}

function crearRepoOrganigramaBd<T extends RegistroIdentificable>(
  local: ReturnType<typeof crearRepositorioOrganizacion<T>>,
  clave: ClaveOrganigrama,
  guardar: (instalacionId: string, registro: T) => Promise<T>,
  eliminarBd?: (instalacionId: string, id: string) => Promise<void>,
) {
  return {
    listar: async () => {
      if (!usaOrganigramaBd()) return local.listar();
      try {
        const snap = await snapshotOrganigramaPrincipal();
        return snap[clave] as unknown as T[];
      } catch (error) {
        if (esErrorRpcOrganigramaAusente(error)) return local.listar();
        throw error;
      }
    },
    obtener: async (id: Identificador) => {
      if (!usaOrganigramaBd()) return local.obtener(id);
      try {
        const snap = await snapshotOrganigramaPrincipal();
        const lista = snap[clave] as unknown as T[];
        return lista.find((item) => item.id === id) ?? null;
      } catch (error) {
        if (esErrorRpcOrganigramaAusente(error)) return local.obtener(id);
        throw error;
      }
    },
    crear: async (registro: T) => {
      if (!usaOrganigramaBd()) return local.crear(registro);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const creado = await guardar(instalacionId, registro);
        emitirCambio(clave);
        return creado;
      } catch (error) {
        if (esErrorRpcOrganigramaAusente(error)) return local.crear(registro);
        throw error;
      }
    },
    actualizar: async (id: Identificador, cambios: Partial<T>) => {
      if (!usaOrganigramaBd()) return local.actualizar(id, cambios);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const snap = await snapshotOrganigramaPrincipal();
        const lista = snap[clave] as unknown as T[];
        const actual = lista.find((item) => item.id === id);
        if (!actual) throw new Error("Registro no encontrado en organigrama");
        const fusionado = { ...actual, ...cambios, id } as T;
        const actualizado = await guardar(instalacionId, fusionado);
        emitirCambio(clave);
        return actualizado;
      } catch (error) {
        if (esErrorRpcOrganigramaAusente(error)) {
          return local.actualizar(id, cambios);
        }
        throw error;
      }
    },
    eliminar: async (id: Identificador) => {
      if (!usaOrganigramaBd()) return local.eliminar(id);
      if (!eliminarBd) {
        throw new Error("Eliminación no disponible para este recurso en BD");
      }
      try {
        const instalacionId = contextoActual().organizacionId!;
        await eliminarBd(instalacionId, String(id));
        emitirCambio(clave);
      } catch (error) {
        if (esErrorRpcOrganigramaAusente(error)) {
          await local.eliminar(id);
          return;
        }
        throw error;
      }
    },
    reemplazar: async (registros: T[]) => {
      if (!usaOrganigramaBd()) return local.reemplazar(registros);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const guardados: T[] = [];
        for (const registro of registros) {
          guardados.push(await guardar(instalacionId, registro));
        }
        emitirCambio(clave);
        return guardados;
      } catch (error) {
        if (esErrorRpcOrganigramaAusente(error)) {
          return local.reemplazar(registros);
        }
        throw error;
      }
    },
    reiniciar: () => local.reiniciar(),
  };
}

const tiposUnidad = crearRepoOrganigramaBd(
  tiposUnidadLocal,
  "tiposUnidad",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarTipoUnidad(instalacionId, registro),
);

const unidades = crearRepoOrganigramaBd(
  unidadesLocal,
  "unidades",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarUnidad(instalacionId, registro),
  (instalacionId, id) =>
    organizacionPrincipalService.eliminarUnidad(instalacionId, id),
);

const vinculaciones = crearRepoOrganigramaBd(
  vinculacionesLocal,
  "vinculaciones",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarVinculacion(instalacionId, registro),
  (instalacionId, id) =>
    organizacionPrincipalService.eliminarVinculacion(instalacionId, id),
);

const politicasIncorporacion = crearRepoOrganigramaBd(
  politicasIncorporacionLocal,
  "politicasIncorporacion",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarPolitica(instalacionId, registro),
);

const estructuras = crearRepoOrganigramaBd(
  estructurasLocal,
  "estructuras",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarEstructura(instalacionId, registro),
);

const niveles = crearRepoOrganigramaBd(
  nivelesLocal,
  "niveles",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarNivel(instalacionId, registro),
);

const perfilesLocal = crearRepositorioOrganizacion<PerfilEntidad>(
  "perfiles-entidad",
  API.organizacion.perfilesEntidad,
  perfilesEntidad,
  perfilesPrincipal,
);

const asignacionesPerfilLocal =
  crearRepositorioOrganizacion<AsignacionPerfilUsuario>(
    "asignaciones-perfil",
    API.organizacion.asignacionesPerfil,
    asignacionesPerfilUsuario,
    [],
  );

type ClavePerfilesEntidad = "perfiles" | "asignaciones";

async function snapshotPerfilesEntidadPrincipal() {
  const instalacionId = contextoActual().organizacionId;
  if (!instalacionId) {
    throw new Error("No hay organización activa en el contexto de sesión");
  }
  return organizacionPrincipalService.listarPerfilesEntidad(instalacionId);
}

function usaPerfilesEntidadBd() {
  return usarOrgPrincipal() && perfilesEntidadBdDisponible();
}

function crearRepoPerfilesEntidadBd<T extends RegistroIdentificable>(
  local: ReturnType<typeof crearRepositorioOrganizacion<T>>,
  clave: ClavePerfilesEntidad,
  recursoEmit: string,
  guardar: (instalacionId: string, registro: T) => Promise<T>,
  eliminarBd?: (instalacionId: string, id: string) => Promise<void>,
) {
  return {
    listar: async () => {
      if (!usaPerfilesEntidadBd()) return local.listar();
      try {
        const snap = await snapshotPerfilesEntidadPrincipal();
        return snap[clave] as unknown as T[];
      } catch (error) {
        if (esErrorRpcPerfilesEntidadAusente(error)) return local.listar();
        throw error;
      }
    },
    obtener: async (id: Identificador) => {
      if (!usaPerfilesEntidadBd()) return local.obtener(id);
      try {
        const snap = await snapshotPerfilesEntidadPrincipal();
        const lista = snap[clave] as unknown as T[];
        return lista.find((item) => item.id === id) ?? null;
      } catch (error) {
        if (esErrorRpcPerfilesEntidadAusente(error)) return local.obtener(id);
        throw error;
      }
    },
    crear: async (registro: T) => {
      if (!usaPerfilesEntidadBd()) return local.crear(registro);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const creado = await guardar(instalacionId, registro);
        emitirCambio(recursoEmit);
        return creado;
      } catch (error) {
        if (esErrorRpcPerfilesEntidadAusente(error)) return local.crear(registro);
        throw error;
      }
    },
    actualizar: async (id: Identificador, cambios: Partial<T>) => {
      if (!usaPerfilesEntidadBd()) return local.actualizar(id, cambios);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const snap = await snapshotPerfilesEntidadPrincipal();
        const lista = snap[clave] as unknown as T[];
        const actual = lista.find((item) => item.id === id);
        if (!actual) throw new Error("Registro no encontrado en perfiles");
        const fusionado = { ...actual, ...cambios, id } as T;
        const actualizado = await guardar(instalacionId, fusionado);
        emitirCambio(recursoEmit);
        return actualizado;
      } catch (error) {
        if (esErrorRpcPerfilesEntidadAusente(error)) {
          return local.actualizar(id, cambios);
        }
        throw error;
      }
    },
    eliminar: async (id: Identificador) => {
      if (!usaPerfilesEntidadBd()) return local.eliminar(id);
      if (!eliminarBd) {
        throw new Error("Eliminación no disponible para este recurso en BD");
      }
      try {
        const instalacionId = contextoActual().organizacionId!;
        await eliminarBd(instalacionId, String(id));
        emitirCambio(recursoEmit);
      } catch (error) {
        if (esErrorRpcPerfilesEntidadAusente(error)) {
          await local.eliminar(id);
          return;
        }
        throw error;
      }
    },
    reemplazar: async (registros: T[]) => {
      if (!usaPerfilesEntidadBd()) return local.reemplazar(registros);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const guardados: T[] = [];
        for (const registro of registros) {
          guardados.push(await guardar(instalacionId, registro));
        }
        emitirCambio(recursoEmit);
        return guardados;
      } catch (error) {
        if (esErrorRpcPerfilesEntidadAusente(error)) {
          return local.reemplazar(registros);
        }
        throw error;
      }
    },
    reiniciar: () => local.reiniciar(),
  };
}

const perfiles = crearRepoPerfilesEntidadBd(
  perfilesLocal,
  "perfiles",
  "perfiles-entidad",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarPerfilEntidad(instalacionId, registro),
);

const asignacionesPerfil = crearRepoPerfilesEntidadBd(
  asignacionesPerfilLocal,
  "asignaciones",
  "asignaciones-perfil",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarAsignacionPerfil(
      instalacionId,
      registro,
    ),
  (instalacionId, id) =>
    organizacionPrincipalService.eliminarAsignacionPerfil(instalacionId, id),
);

/** Migra el árbol histórico a gobierno protegido + estructuras independientes.
 *  Solo toca nodos del mock original; los creados por el usuario pasan intactos. */
async function normalizarJerarquiaOrganizacional() {
  if (!apiConfig.useMock || usarOrgPrincipal()) return;
  const perfilesActuales = await perfiles.listar();
  const perfilesProtegidos = perfilesEntidad.filter((perfil) => perfil.esSistema);
  const perfilesNormalizados = [...perfilesActuales];
  perfilesProtegidos.forEach((perfil) => {
    if (!perfilesNormalizados.some((item) => item.id === perfil.id)) {
      perfilesNormalizados.push(perfil);
    }
  });
  if (JSON.stringify(perfilesActuales) !== JSON.stringify(perfilesNormalizados)) {
    await perfiles.reemplazar(perfilesNormalizados);
  }
  const actuales = await unidades.listar();

  // IDs de la semilla original: solo estos se normalizan
  const idsOriginales = new Set(unidadesOrganizacionales.map((item) => item.id));

  const protegidas = new Map(
    unidadesOrganizacionales
      .filter((item) => item.esSistema)
      .map((item) => [item.id, item]),
  );
  const idsGobierno = new Set(protegidas.keys());

  const normalizadas: UnidadOrganizacional[] = actuales
    .filter((item) => item.id !== "unidad-direccion-academica")
    .map((item) => {
      // Nodo creado por el usuario → no tocar
      if (!idsOriginales.has(item.id)) return item;

      const base = protegidas.get(item.id);
      if (base) {
        return {
          ...item,
          ...base,
          responsableUsuarioId: item.responsableUsuarioId ?? base.responsableUsuarioId,
        };
      }
      const padreOperativo =
        item.unidadPadreId && !idsGobierno.has(item.unidadPadreId)
          ? item.unidadPadreId
          : null;
      const tienePadreOperativo = Boolean(padreOperativo);
      return {
        ...item,
        estructuraId: item.estructuraId ?? "estructura-funcional",
        nivelId: item.nivelId ?? (tienePadreOperativo ? "nivel-equipo" : "nivel-area"),
        unidadPadreId: padreOperativo,
        esSistema: false,
      };
    });

  protegidas.forEach((unidad, id) => {
    if (!normalizadas.some((item) => item.id === id)) normalizadas.push(unidad);
  });
  if (JSON.stringify(actuales) !== JSON.stringify(normalizadas)) {
    await unidades.reemplazar(normalizadas);
  }

  // Toda persona activa del equipo protegido de certificación recibe la
  // recomendación de firmante sin perder sus demás perfiles.
  const [vinculacionesActuales, asignacionesActuales] = await Promise.all([
    vinculaciones.listar(),
    asignacionesPerfil.listar(),
  ]);
  const unidadFirmas = normalizadas.find(
    (unidad) => unidad.codigoSistema === "CERTIFICACION",
  );
  if (unidadFirmas) {
    const nuevasAsignaciones = [...asignacionesActuales];
    vinculacionesActuales
      .filter(
        (vinculacion) =>
          vinculacion.unidadId === unidadFirmas.id && vinculacion.estado === "ACTIVA",
      )
      .forEach((vinculacion) => {
        const yaAsignado = nuevasAsignaciones.some(
          (asignacion) =>
            asignacion.usuarioId === vinculacion.usuarioId &&
            asignacion.perfilId === "perfil-firmante-certificados" &&
            asignacion.estado === "ACTIVA",
        );
        if (!yaAsignado) {
          nuevasAsignaciones.push({
            id: `apu-firma-${vinculacion.usuarioId}`,
            usuarioId: vinculacion.usuarioId,
            perfilId: "perfil-firmante-certificados",
            unidadIds: [unidadFirmas.id],
            sedeIds: vinculacion.sedeId ? [vinculacion.sedeId] : [],
            incluirDescendientes: false,
            esPrincipal: false,
            estado: "ACTIVA",
          });
        }
      });
    if (JSON.stringify(asignacionesActuales) !== JSON.stringify(nuevasAsignaciones)) {
      await asignacionesPerfil.reemplazar(nuevasAsignaciones);
    }
  }
}


const reglasAccesoCursosLocal =
  crearRepositorioOrganizacion<ReglaAccesoCursoEntidad>(
    "reglas-acceso-cursos",
    API.organizacion.reglasAccesoCursos,
    reglasAccesoCursoEntidad,
    [],
  );

const sedesLocal = crearRepositorioOrganizacion<SedeOrganizacion>(
  "sedes",
  API.organizacion.sedes,
  [
    { id: "sede-lima", nombre: "Sede Lima", ciudad: "Lima", usuarios: 263, areas: 3 },
    { id: "sede-cusco", nombre: "Sede Cusco", ciudad: "Cusco", usuarios: 118, areas: 2 },
  ],
  [],
);

type ClaveSedesReglas = "sedes" | "reglas";

async function snapshotSedesReglasPrincipal() {
  const instalacionId = contextoActual().organizacionId;
  if (!instalacionId) {
    throw new Error("No hay organización activa en el contexto de sesión");
  }
  return organizacionPrincipalService.listarSedesReglas(instalacionId);
}

function usaSedesReglasBd() {
  return usarOrgPrincipal() && sedesReglasBdDisponible();
}

function crearRepoSedesReglasBd<T extends RegistroIdentificable>(
  local: ReturnType<typeof crearRepositorioOrganizacion<T>>,
  clave: ClaveSedesReglas,
  recursoEmit: string,
  guardar: (instalacionId: string, registro: T) => Promise<T>,
  eliminarBd?: (instalacionId: string, id: string) => Promise<void>,
) {
  return {
    listar: async () => {
      if (!usaSedesReglasBd()) return local.listar();
      try {
        const snap = await snapshotSedesReglasPrincipal();
        return (clave === "sedes" ? snap.sedes : snap.reglas) as unknown as T[];
      } catch (error) {
        if (esErrorRpcSedesReglasAusente(error)) return local.listar();
        throw error;
      }
    },
    obtener: async (id: Identificador) => {
      if (!usaSedesReglasBd()) return local.obtener(id);
      try {
        const snap = await snapshotSedesReglasPrincipal();
        const lista = (clave === "sedes" ? snap.sedes : snap.reglas) as unknown as T[];
        return lista.find((item) => item.id === id) ?? null;
      } catch (error) {
        if (esErrorRpcSedesReglasAusente(error)) return local.obtener(id);
        throw error;
      }
    },
    crear: async (registro: T) => {
      if (!usaSedesReglasBd()) return local.crear(registro);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const creado = await guardar(instalacionId, registro);
        emitirCambio(recursoEmit);
        return creado;
      } catch (error) {
        if (esErrorRpcSedesReglasAusente(error)) return local.crear(registro);
        throw error;
      }
    },
    actualizar: async (id: Identificador, cambios: Partial<T>) => {
      if (!usaSedesReglasBd()) return local.actualizar(id, cambios);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const snap = await snapshotSedesReglasPrincipal();
        const lista = (clave === "sedes" ? snap.sedes : snap.reglas) as unknown as T[];
        const actual = lista.find((item) => item.id === id);
        if (!actual) throw new Error("Registro no encontrado");
        const fusionado = { ...actual, ...cambios, id } as T;
        const actualizado = await guardar(instalacionId, fusionado);
        emitirCambio(recursoEmit);
        return actualizado;
      } catch (error) {
        if (esErrorRpcSedesReglasAusente(error)) {
          return local.actualizar(id, cambios);
        }
        throw error;
      }
    },
    eliminar: async (id: Identificador) => {
      if (!usaSedesReglasBd()) return local.eliminar(id);
      if (!eliminarBd) {
        throw new Error("Eliminación no disponible para este recurso en BD");
      }
      try {
        const instalacionId = contextoActual().organizacionId!;
        await eliminarBd(instalacionId, String(id));
        emitirCambio(recursoEmit);
      } catch (error) {
        if (esErrorRpcSedesReglasAusente(error)) {
          await local.eliminar(id);
          return;
        }
        throw error;
      }
    },
    reemplazar: async (registros: T[]) => {
      if (!usaSedesReglasBd()) return local.reemplazar(registros);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const guardados: T[] = [];
        for (const registro of registros) {
          guardados.push(await guardar(instalacionId, registro));
        }
        emitirCambio(recursoEmit);
        return guardados;
      } catch (error) {
        if (esErrorRpcSedesReglasAusente(error)) {
          return local.reemplazar(registros);
        }
        throw error;
      }
    },
    reiniciar: () => local.reiniciar(),
  };
}

const reglasAccesoCursos = crearRepoSedesReglasBd(
  reglasAccesoCursosLocal,
  "reglas",
  "reglas-acceso-cursos",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarReglaAcceso(instalacionId, registro),
  (instalacionId, id) =>
    organizacionPrincipalService.eliminarReglaAcceso(instalacionId, id),
);

const sedes = crearRepoSedesReglasBd(
  sedesLocal,
  "sedes",
  "sedes",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarSede(instalacionId, registro),
  (instalacionId, id) =>
    organizacionPrincipalService.eliminarSede(instalacionId, id),
);

async function idsDescendientes(unidadId: string) {
  const lista = await unidades.listar();
  const resultado = new Set<string>([unidadId]);
  let cambio = true;
  while (cambio) {
    cambio = false;
    lista.forEach((unidad) => {
      if (
        unidad.unidadPadreId &&
        resultado.has(unidad.unidadPadreId) &&
        !resultado.has(unidad.id)
      ) {
        resultado.add(unidad.id);
        cambio = true;
      }
    });
  }
  return resultado;
}

export interface ResultadoEliminacionUnidad {
  unidadesEliminadas: number;
  vinculacionesEliminadas: number;
  asignacionesPerfilActualizadas: number;
  reglasAccesoActualizadas: number;
  usuariosSinUnidadPrincipal: number;
}

async function eliminarUnidadConDependencias(
  unidadId: string,
): Promise<ResultadoEliminacionUnidad> {
  const listaUnidades = await unidades.listar();
  if (listaUnidades.find((item) => item.id === unidadId)?.esSistema) {
    throw new Error(
      "Dirección, Administración y Certificación son funciones protegidas.",
    );
  }
  const hijosDirectos = listaUnidades.filter(
    (unidad) => unidad.unidadPadreId === unidadId,
  );
  if (hijosDirectos.length) {
    throw new Error(
      `No se puede eliminar esta unidad porque contiene ${hijosDirectos.length} ${
        hijosDirectos.length === 1 ? "nodo descendiente" : "nodos descendientes"
      }. Elimina primero los nodos del último nivel.`,
    );
  }

  if (usarOrgPrincipal()) {
    const instalacionId = contextoActual().organizacionId;
    if (!instalacionId) {
      throw new Error("No hay organización activa en el contexto de sesión");
    }
    const [relaciones, asignaciones, reglas] = await Promise.all([
      vinculaciones.listar(),
      asignacionesPerfil.listar(),
      reglasAccesoCursos.listar(),
    ]);
    const relacionesAEliminar = relaciones.filter(
      (item) => item.unidadId === unidadId,
    );

    if (organigramaBdDisponible()) {
      try {
        await organizacionPrincipalService.eliminarUnidad(
          instalacionId,
          unidadId,
        );
      } catch (error) {
        if (!esErrorRpcOrganigramaAusente(error)) throw error;
        await unidades.eliminar(unidadId);
      }
    } else {
      await unidades.eliminar(unidadId);
    }

    const asignacionesAActualizar = asignaciones.filter((item) =>
      item.unidadIds.includes(unidadId),
    );
    await Promise.all(
      asignacionesAActualizar.map((item) => {
        const unidadIds = item.unidadIds.filter((id) => id !== unidadId);
        return asignacionesPerfil.actualizar(item.id, {
          unidadIds,
          estado: unidadIds.length ? item.estado : "INACTIVA",
        });
      }),
    );

    const reglasAActualizar = reglas.filter(
      (item) =>
        item.publico === "UNIDADES" && item.publicoIds.includes(unidadId),
    );
    await Promise.all(
      reglasAActualizar.map((item) => {
        const publicoIds = item.publicoIds.filter((id) => id !== unidadId);
        return reglasAccesoCursos.actualizar(item.id, {
          publicoIds,
          estado: publicoIds.length ? item.estado : "INACTIVA",
        });
      }),
    );

    return {
      unidadesEliminadas: 1,
      vinculacionesEliminadas: relacionesAEliminar.length,
      asignacionesPerfilActualizadas: asignacionesAActualizar.length,
      reglasAccesoActualizadas: reglasAActualizar.length,
      usuariosSinUnidadPrincipal: 0,
    };
  }

  const ids = new Set([unidadId]);
  const [relaciones, asignaciones, reglas, personas] = await Promise.all([
    vinculaciones.listar(),
    asignacionesPerfil.listar(),
    reglasAccesoCursos.listar(),
    usuarios.listar(),
  ]);

  const relacionesAEliminar = relaciones.filter((item) => ids.has(item.unidadId));
  await Promise.all(
    relacionesAEliminar.map((item) => vinculaciones.eliminar(item.id)),
  );

  const asignacionesAActualizar = asignaciones.filter((item) =>
    item.unidadIds.some((id) => ids.has(id)),
  );
  await Promise.all(
    asignacionesAActualizar.map((item) => {
      const unidadIds = item.unidadIds.filter((id) => !ids.has(id));
      return asignacionesPerfil.actualizar(item.id, {
        unidadIds,
        estado: unidadIds.length ? item.estado : "INACTIVA",
      });
    }),
  );

  const reglasAActualizar = reglas.filter(
    (item) =>
      item.publico === "UNIDADES" && item.publicoIds.some((id) => ids.has(id)),
  );
  await Promise.all(
    reglasAActualizar.map((item) => {
      const publicoIds = item.publicoIds.filter((id) => !ids.has(id));
      return reglasAccesoCursos.actualizar(item.id, {
        publicoIds,
        estado: publicoIds.length ? item.estado : "INACTIVA",
      });
    }),
  );

  const personasAActualizar = personas.filter(
    (item) => item.unidadPrincipalId && ids.has(item.unidadPrincipalId),
  );
  await Promise.all(
    personasAActualizar.map((item) =>
      usuarios.actualizar(item.id, {
        unidadPrincipalId: null,
        area: "Sin nodo asignado",
      }),
    ),
  );

  const profundidad = (unidad: UnidadOrganizacional) => {
    let nivel = 0;
    let padreId = unidad.unidadPadreId;
    while (padreId) {
      nivel += 1;
      padreId = listaUnidades.find((item) => item.id === padreId)?.unidadPadreId ?? null;
    }
    return nivel;
  };
  const unidadesAEliminar = listaUnidades
    .filter((item) => ids.has(item.id))
    .sort((a, b) => profundidad(b) - profundidad(a));
  for (const unidad of unidadesAEliminar) {
    await unidades.eliminar(unidad.id);
  }

  return {
    unidadesEliminadas: unidadesAEliminar.length,
    vinculacionesEliminadas: relacionesAEliminar.length,
    asignacionesPerfilActualizadas: asignacionesAActualizar.length,
    reglasAccesoActualizadas: reglasAActualizar.length,
    usuariosSinUnidadPrincipal: personasAActualizar.length,
  };
}

async function usuariosDeUnidad(
  unidadId: string,
  incluirDescendientes = false,
) {
  const ids = incluirDescendientes
    ? await idsDescendientes(unidadId)
    : new Set([unidadId]);
  const [relaciones, personas] = await Promise.all([
    vinculaciones.listar(),
    usuarios.listar(),
  ]);
  const usuariosIds = new Set(
    relaciones
      .filter(
        (relacion) =>
          relacion.estado === "ACTIVA" && ids.has(relacion.unidadId),
      )
      .map((relacion) => relacion.usuarioId),
  );
  return personas.filter((persona) => usuariosIds.has(String(persona.id)));
}

async function aprobarVinculacion(id: string, aprobadaPor: string) {
  return vinculaciones.actualizar(id, {
    estado: "ACTIVA",
    fechaInicio: new Date().toISOString().slice(0, 10),
    aprobadaPor,
  });
}

async function vincularPersonaANodo(
  entrada: Omit<VinculacionUnidad, "id" | "estado" | "fechaInicio">,
) {
  const [persona, unidad, relaciones, listaUnidades] = await Promise.all([
    usuarios.obtener(Number(entrada.usuarioId)),
    unidades.obtener(entrada.unidadId),
    vinculaciones.listar(),
    unidades.listar(),
  ]);
  if (!persona) throw new Error("La persona seleccionada no existe.");
  if (!unidad || unidad.estado !== "ACTIVA" || !unidad.estructuraId) {
    throw new Error("Selecciona un nodo activo de una estructura válida.");
  }
  if (
    relaciones.some(
      (item) =>
        item.usuarioId === entrada.usuarioId &&
        item.unidadId === entrada.unidadId &&
        ["ACTIVA", "PENDIENTE"].includes(item.estado),
    )
  ) {
    throw new Error("La persona ya está vinculada a este nodo.");
  }
  if (entrada.tipo === "PRINCIPAL") {
    const unidadesEstructura = new Set(
      listaUnidades
        .filter((item) => item.estructuraId === unidad.estructuraId)
        .map((item) => item.id),
    );
    const principalExistente = relaciones.find(
      (item) =>
        item.usuarioId === entrada.usuarioId &&
        item.tipo === "PRINCIPAL" &&
        item.estado === "ACTIVA" &&
        unidadesEstructura.has(item.unidadId),
    );
    if (principalExistente) {
      throw new Error(
        "La persona ya tiene un nodo principal en esta estructura. Usa una vinculación secundaria o temporal.",
      );
    }
  }
  return vinculaciones.crear({
    ...entrada,
    id: `vin-${Date.now()}`,
    estado: "ACTIVA",
    fechaInicio: new Date().toISOString().slice(0, 10),
  });
}

function inicialesPersona(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * Crea de forma coherente el directorio, la pertenencia estructural y el
 * perfil de acceso. En producción este contrato debe resolverse en una única
 * transacción del backend.
 */
function puedeDesignarGobiernoOrganizacion() {
  const contexto = contextoActual();
  return (
    contexto.permisos.includes("administradores.designar") ||
    contexto.permisos.includes("entidad.gobernar") ||
    contexto.rol === "ORGANIZATION_OWNER" ||
    contexto.rol === "OWNER"
  );
}

function esPerfilGobiernoOrganizacion(perfil: {
  plantilla?: string;
  tipo?: string;
  codigo?: string;
}) {
  return (
    perfil.plantilla === "DIRECCION" ||
    perfil.plantilla === "ADMINISTRACION" ||
    perfil.tipo === "DIRECCION" ||
    perfil.tipo === "ADMINISTRADOR" ||
    perfil.codigo === "ORGANIZATION_OWNER" ||
    perfil.codigo === "ORGANIZATION_ADMIN"
  );
}

async function incorporarPersona(
  entrada: IncorporacionPersonaOrganizacion,
): Promise<ResultadoIncorporacionPersona> {
  if (usarOrgPrincipal()) {
    const instalacionId = contextoActual().organizacionId!;
    // Preferir perfiles de Equipos (org_perfil) → sync real a funcion_principal.
    try {
      if (perfilesEntidadBdDisponible()) {
        const snap =
          await organizacionPrincipalService.listarPerfilesEntidad(
            instalacionId,
          );
        const perfilOrg =
          snap.perfiles.find((item) => item.id === entrada.perfilId) ??
          snap.perfiles.find(
            (item) =>
              item.nombre.trim().toLowerCase() ===
              String(entrada.perfilId).trim().toLowerCase(),
          );
        if (perfilOrg) {
          if (
            esPerfilGobiernoOrganizacion(perfilOrg) &&
            !puedeDesignarGobiernoOrganizacion()
          ) {
            throw new Error(
              "Solo Dirección puede designar los perfiles de Dirección o Administración.",
            );
          }
          const resultado =
            await organizacionPrincipalService.incorporarPersonaPerfil(
              instalacionId,
              {
                correo: entrada.correo,
                perfilOrgId: perfilOrg.id,
                unidadId: entrada.unidadId,
                sedeId: entrada.sedeId,
              },
            );
          const miembros =
            await organizacionPrincipalService.listarMiembros(instalacionId);
          const usuario =
            miembros.find(
              (item) =>
                item.correo.toLowerCase() ===
                  entrada.correo.trim().toLowerCase() ||
                String(item.id) === resultado.identidadId,
            ) ?? miembros[0];
          if (!usuario) {
            throw new Error(
              "Acceso asignado, pero no se pudo recargar el directorio.",
            );
          }
          let vinculacion: VinculacionUnidad = {
            id: `vinculo-pendiente-${usuario.id}`,
            usuarioId: String(usuario.id),
            unidadId: entrada.unidadId || "",
            tipo: "PRINCIPAL",
            origen: "ASIGNACION_ADMINISTRATIVA",
            estado: "ACTIVA",
            fechaInicio: new Date().toISOString().slice(0, 10),
          };
          if (entrada.unidadId) {
            try {
              if (organigramaBdDisponible()) {
                vinculacion =
                  await organizacionPrincipalService.guardarVinculacion(
                    instalacionId,
                    {
                      ...vinculacion,
                      id: `vinc-${usuario.id}-${entrada.unidadId}`,
                      sedeId: entrada.sedeId,
                    },
                  );
              } else {
                vinculacion = await vinculaciones.crear({
                  ...vinculacion,
                  id: `vinc-${usuario.id}-${entrada.unidadId}`,
                  sedeId: entrada.sedeId,
                });
              }
            } catch (error) {
              if (esErrorRpcOrganigramaAusente(error)) {
                vinculacion = await vinculaciones.crear({
                  ...vinculacion,
                  id: `vinc-${usuario.id}-${entrada.unidadId}`,
                  sedeId: entrada.sedeId,
                });
              } else {
                throw error;
              }
            }
          }
          return {
            usuario,
            vinculacion,
            asignacionPerfil: resultado.asignacion,
          };
        }
      }
    } catch (error) {
      if (
        !(
          typeof error === "object" &&
          error &&
          "message" in error &&
          /PERFILES_ENTIDAD_BD_AUSENTE|PGRST202|org_incorporar_persona_perfil/i.test(
            String((error as { message?: string }).message),
          )
        )
      ) {
        // Si el perfil org existe pero falló auth sync, propagar.
        if (
          error instanceof Error &&
          !/PERFILES_ENTIDAD_BD_AUSENTE|Could not find the function/i.test(
            error.message,
          )
        ) {
          throw error;
        }
      }
    }

    const perfiles = await organizacionPrincipalService.catalogoPerfiles(
      instalacionId,
    );
    const perfil =
      perfiles.find((item) => item.id === entrada.perfilId) ??
      perfiles.find((item) => item.codigo === entrada.perfilId) ??
      perfiles.find((item) => item.codigo === "STUDENT");
    if (!perfil) {
      throw new Error(
        "No hay perfiles asignables. Verifica que exista STUDENT u otro perfil de organización.",
      );
    }
    if (
      esPerfilGobiernoOrganizacion(perfil) &&
      !puedeDesignarGobiernoOrganizacion()
    ) {
      throw new Error(
        "Solo Dirección puede designar los perfiles de Dirección o Administración.",
      );
    }
    await organizacionPrincipalService.asignarAcceso(
      instalacionId,
      entrada.correo,
      perfil.codigo,
    );
    const miembros = await organizacionPrincipalService.listarMiembros(
      instalacionId,
    );
    const usuario =
      miembros.find(
        (item) =>
          item.correo.toLowerCase() === entrada.correo.trim().toLowerCase(),
      ) ?? miembros[0];
    if (!usuario) {
      throw new Error("Acceso asignado, pero no se pudo recargar el directorio.");
    }
    // Persistir vínculo a nodo cuando el alta incluye unidad.
    let vinculacion: VinculacionUnidad = {
      id: `vinculo-pendiente-${usuario.id}`,
      usuarioId: String(usuario.id),
      unidadId: entrada.unidadId || "",
      tipo: "PRINCIPAL",
      origen: "ASIGNACION_ADMINISTRATIVA",
      estado: "ACTIVA",
      fechaInicio: new Date().toISOString().slice(0, 10),
    };
    if (entrada.unidadId) {
      try {
        if (organigramaBdDisponible()) {
          vinculacion = await organizacionPrincipalService.guardarVinculacion(
            instalacionId,
            {
              ...vinculacion,
              id: `vinc-${usuario.id}-${entrada.unidadId}`,
              sedeId: entrada.sedeId,
            },
          );
        } else {
          vinculacion = await vinculaciones.crear({
            ...vinculacion,
            id: `vinc-${usuario.id}-${entrada.unidadId}`,
            sedeId: entrada.sedeId,
          });
        }
      } catch (error) {
        if (esErrorRpcOrganigramaAusente(error)) {
          vinculacion = await vinculaciones.crear({
            ...vinculacion,
            id: `vinc-${usuario.id}-${entrada.unidadId}`,
            sedeId: entrada.sedeId,
          });
        } else {
          throw error;
        }
      }
    }
    return {
      usuario,
      vinculacion,
      asignacionPerfil: {
        id: `asig-pendiente-${usuario.id}`,
        usuarioId: String(usuario.id),
        perfilId: perfil.id,
        unidadIds: entrada.unidadId ? [entrada.unidadId] : [],
        sedeIds: entrada.sedeId ? [entrada.sedeId] : [],
        incluirDescendientes: false,
        esPrincipal: true,
        estado: "ACTIVA",
      },
    };
  }
  if (!apiConfig.useMock) {
    const { data } = await api.post<ResultadoIncorporacionPersona>(
      `${API.organizacion.usuarios}/incorporaciones`,
      entrada,
    );
    return data;
  }

  const [personas, listaUnidades, listaEstructuras, listaNiveles, listaPerfiles, listaSedes] =
    await Promise.all([
      usuarios.listar(),
      unidades.listar(),
      estructuras.listar(),
      niveles.listar(),
      perfiles.listar(),
      sedes.listar(),
    ]);
  const correo = entrada.correo.trim().toLowerCase();
  const dni = entrada.dni?.trim();
  if (!entrada.nombre.trim() || !correo) {
    throw new Error("Nombre y correo son obligatorios.");
  }
  const configuracion = await almacenConfiguracion().leer();
  if (configuracion.requiereDniEnrolamiento) {
    if (!dni) {
      throw new Error("Esta entidad exige DNI para enrolar personas.");
    }
    if (!/^\d{8}$/.test(dni)) {
      throw new Error("El DNI debe contener 8 dígitos.");
    }
  }
  if (personas.some((item) => item.correo.trim().toLowerCase() === correo)) {
    throw new Error("Ya existe una persona registrada con este correo.");
  }
  if (dni && personas.some((item) => item.dni === dni)) {
    throw new Error("Ya existe una persona registrada con este DNI.");
  }

  const unidad = listaUnidades.find(
    (item) => item.id === entrada.unidadId && item.estado === "ACTIVA",
  );
  if (!unidad?.estructuraId || !unidad.nivelId) {
    throw new Error("Selecciona un nodo activo perteneciente a una estructura y nivel.");
  }
  const estructura = listaEstructuras.find(
    (item) => item.id === unidad.estructuraId && item.estado === "ACTIVA",
  );
  const nivel = listaNiveles.find(
    (item) => item.id === unidad.nivelId && item.estructuraId === unidad.estructuraId,
  );
  if (!estructura || !nivel) {
    throw new Error("El nodo seleccionado tiene una estructura incompleta.");
  }
  const perfil = listaPerfiles.find(
    (item) => item.id === entrada.perfilId && item.estado === "ACTIVO",
  );
  if (!perfil) throw new Error("Selecciona un perfil institucional activo.");
  if (
    esPerfilGobiernoOrganizacion(perfil) &&
    !puedeDesignarGobiernoOrganizacion()
  ) {
    throw new Error(
      "Solo Dirección puede designar los perfiles de Dirección o Administración.",
    );
  }
  const sede = entrada.sedeId
    ? listaSedes.find((item) => item.id === entrada.sedeId)
    : undefined;
  if (entrada.sedeId && !sede) throw new Error("La sede seleccionada no existe.");

  const perfilGobierno: Partial<Record<NonNullable<UnidadOrganizacional["codigoSistema"]>, PerfilEntidad["plantilla"]>> = {
    DIRECCION: "DIRECCION",
    ADMINISTRACION: "ADMINISTRACION",
  };
  const plantillaRequerida = unidad.codigoSistema
    ? perfilGobierno[unidad.codigoSistema]
    : undefined;
  if (plantillaRequerida && perfil.plantilla !== plantillaRequerida) {
    throw new Error(
      `${unidad.nombre} solo puede incorporar personas con el perfil protegido correspondiente.`,
    );
  }

  const id = Date.now();
  const usuario: UsuarioOrganizacion = {
    id,
    dni: dni || undefined,
    nombre: entrada.nombre.trim(),
    iniciales: inicialesPersona(entrada.nombre) || "NU",
    correo,
    area: unidad.nombre,
    sede: sede?.ciudad ?? sede?.nombre ?? "Sin sede",
    rol: perfil.nombre,
    progreso: 0,
    estado: "INVITADO",
    especialidad: entrada.especialidad?.trim() || undefined,
    colegiaturaActiva: false,
    unidadPrincipalId: unidad.id,
    sedeId: sede?.id,
  };
  const vinculacion: VinculacionUnidad = {
    id: `vin-incorporacion-${id}`,
    usuarioId: String(id),
    unidadId: unidad.id,
    sedeId: sede?.id,
    tipo: "PRINCIPAL",
    origen: "ASIGNACION_ADMINISTRATIVA",
    estado: "PENDIENTE",
  };
  const asignacion: AsignacionPerfilUsuario = {
    id: `apu-incorporacion-${id}`,
    usuarioId: String(id),
    perfilId: perfil.id,
    unidadIds: [unidad.id],
    sedeIds: sede ? [sede.id] : [],
    incluirDescendientes: false,
    esPrincipal: true,
    estado: "INACTIVA",
  };

  await usuarios.crear(usuario);
  await vinculaciones.crear(vinculacion);
  await asignacionesPerfil.crear(asignacion);
  return { usuario, vinculacion, asignacionPerfil: asignacion };
}

async function activarIncorporacion(usuarioId: string, aprobadaPor: string) {
  const [personas, relaciones, asignaciones] = await Promise.all([
    usuarios.listar(),
    vinculaciones.listar(),
    asignacionesPerfil.listar(),
  ]);
  const persona = personas.find((item) => String(item.id) === usuarioId);
  if (!persona) throw new Error("No se encontró la persona invitada.");
  const relacionesPendientes = relaciones.filter(
    (item) => item.usuarioId === usuarioId && item.estado === "PENDIENTE",
  );
  const perfilesPendientes = asignaciones.filter(
    (item) => item.usuarioId === usuarioId && item.estado === "INACTIVA",
  );
  await Promise.all([
    ...relacionesPendientes.map((item) => aprobarVinculacion(item.id, aprobadaPor)),
    ...perfilesPendientes.map((item) =>
      asignacionesPerfil.actualizar(item.id, { estado: "ACTIVA" }),
    ),
  ]);
  return usuarios.actualizar(persona.id, { estado: "ACTIVO" });
}

/**
 * Registra una solicitud de ingreso iniciada desde Comunidad / Explorar entidades.
 * Escribe en el directorio de la organización destino (clave fija por orgId).
 */
async function registrarSolicitudDesdeComunidad(entrada: {
  organizacionId: string;
  nombre: string;
  correo: string;
  dni?: string;
  iniciales?: string;
}): Promise<{
  estado: "SOLICITADA" | "MIEMBRO";
  usuario: UsuarioOrganizacion;
  yaExistia: boolean;
}> {
  if (!apiConfig.useMock) {
    const { data } = await api.post<{
      estado: "SOLICITADA" | "MIEMBRO";
      usuario: UsuarioOrganizacion;
      yaExistia: boolean;
    }>(`${API.organizacion.usuarios}/solicitudes-comunidad`, entrada);
    return data;
  }

  const organizacionId = entrada.organizacionId.trim();
  if (!organizacionId) throw new Error("Organización no válida.");

  const repo = crearRepositorioLocal<UsuarioOrganizacion>({
    clave: `tukuy_demo_organizacion_${organizacionId}_usuarios`,
    ruta: API.organizacion.usuarios,
    semilla: usuariosOrganizacion.map((usuario) => ({
      ...usuario,
      estado: usuario.estado as UsuarioOrganizacion["estado"],
    })),
    version: 18,
  });

  const correo = entrada.correo.trim().toLowerCase();
  const dni = entrada.dni?.trim();
  const nombre = entrada.nombre.trim();
  if (!nombre || !correo) {
    throw new Error("Nombre y correo son obligatorios para solicitar el ingreso.");
  }

  // Config de DNI: solo se exige con certeza para la org activa del portal;
  // en Comunidad usamos el flag de la entidad pública (pasado vía validación previa).
  if (dni && !/^\d{8}$/.test(dni)) {
    throw new Error("El DNI debe contener 8 dígitos.");
  }

  const personas = await repo.listar();
  const existente = personas.find(
    (item) => item.correo.trim().toLowerCase() === correo,
  );
  if (existente?.estado === "ACTIVO") {
    return resolveMock({
      estado: "MIEMBRO" as const,
      usuario: existente,
      yaExistia: true,
    });
  }
  if (existente?.estado === "INVITADO") {
    const actualizado = await repo.actualizar(existente.id, {
      nombre,
      dni: dni || existente.dni,
      origenIngreso: "COMUNIDAD",
      area: "Solicitud desde Comunidad",
    });
    return resolveMock({
      estado: "SOLICITADA" as const,
      usuario: actualizado,
      yaExistia: true,
    });
  }
  if (dni && personas.some((item) => item.dni === dni)) {
    throw new Error("Ya existe una persona registrada con este DNI.");
  }

  const id = Date.now();
  const usuario: UsuarioOrganizacion = {
    id,
    dni: dni || undefined,
    nombre,
    iniciales: entrada.iniciales?.trim() || inicialesPersona(nombre) || "SC",
    correo,
    area: "Solicitud desde Comunidad",
    sede: "Por definir",
    rol: "Colegiado",
    progreso: 0,
    estado: "INVITADO",
    colegiaturaActiva: false,
    origenIngreso: "COMUNIDAD",
  };
  const creado = await repo.crear(usuario);
  return resolveMock({
    estado: "SOLICITADA" as const,
    usuario: creado,
    yaExistia: false,
  });
}

async function evaluarAccesoCurso(
  usuarioId: string,
  cursoId: string,
): Promise<EvaluacionAccesoCursoEntidad> {
  const [persona, reglas, relaciones, perfilesAsignados, formacion, inscripciones] =
    await Promise.all([
      usuarios.obtener(usuarioId),
      reglasAccesoCursos.listar(),
      vinculaciones.listar(),
      asignacionesPerfil.listar(),
      asignaciones.listar(),
      matriculas.listar(),
    ]);

  if (!persona) {
    return {
      disponible: false,
      requiereAprobacion: false,
      modalidad: null,
      motivo: "La cuenta no está vinculada al directorio de la entidad.",
    };
  }

  const regla = reglas.find(
    (item) => item.cursoId === cursoId && item.estado === "ACTIVA",
  );
  if (!regla) {
    return {
      disponible: false,
      requiereAprobacion: false,
      modalidad: null,
      motivo: "Este curso no tiene una convocatoria activa para la entidad.",
    };
  }

  if (
    regla.cupo &&
    inscripciones.filter(
      (item) => item.cursoId === cursoId && item.estado !== "PENDIENTE",
    ).length >= regla.cupo
  ) {
    return {
      disponible: false,
      requiereAprobacion: false,
      modalidad: regla.modalidad,
      motivo: "El curso alcanzó el cupo configurado por la entidad.",
      reglaId: regla.id,
    };
  }

  const relacionesActivas = relaciones.filter(
    (item) => item.usuarioId === usuarioId && item.estado === "ACTIVA",
  );
  let coincide = regla.publico === "TODA_LA_ENTIDAD";
  let unidadOrigenId = relacionesActivas.find(
    (item) => item.tipo === "PRINCIPAL",
  )?.unidadId;

  if (regla.publico === "UNIDADES") {
    const unidadesAdmitidas = new Set<string>();
    for (const unidadId of regla.publicoIds) {
      if (regla.incluirDescendientes) {
        (await idsDescendientes(unidadId)).forEach((id) =>
          unidadesAdmitidas.add(id),
        );
      } else {
        unidadesAdmitidas.add(unidadId);
      }
    }
    const relacionCoincidente = relacionesActivas.find((item) =>
      unidadesAdmitidas.has(item.unidadId),
    );
    coincide = Boolean(relacionCoincidente);
    unidadOrigenId = relacionCoincidente?.unidadId ?? unidadOrigenId;
  }

  if (regla.publico === "ESPECIALIDADES") {
    coincide = Boolean(
      persona.especialidad && regla.publicoIds.includes(persona.especialidad),
    );
  }

  if (regla.publico === "PERFILES") {
    coincide = perfilesAsignados.some(
      (item) =>
        item.usuarioId === usuarioId &&
        item.estado === "ACTIVA" &&
        regla.publicoIds.includes(item.perfilId),
    );
  }

  if (!coincide) {
    return {
      disponible: false,
      requiereAprobacion: false,
      modalidad: regla.modalidad,
      motivo:
        "El curso está dirigido a otro nodo, especialidad o perfil institucional.",
      reglaId: regla.id,
    };
  }

  const requiereAprobacion = regla.modalidad === "CON_APROBACION";
  const accesoDirecto = regla.modalidad === "LIBRE";
  const soloAsignacion =
    regla.modalidad === "SOLO_ASIGNACION" || regla.modalidad === "INVITACION";
  let tieneAsignacionActiva = false;
  if (soloAsignacion) {
    const candidatas = formacion.filter(
      (item) =>
        item.estado !== "CANCELADA" &&
        item.estado !== "FINALIZADA" &&
        item.cursoId === cursoId,
    );
    for (const item of candidatas) {
      const destinatarios = await resolverDestinatariosAsignacion(item);
      if (destinatarios.includes(usuarioId)) {
        tieneAsignacionActiva = true;
        break;
      }
    }
    return {
      disponible: tieneAsignacionActiva,
      requiereAprobacion: false,
      modalidad: regla.modalidad,
      motivo: tieneAsignacionActiva
        ? "Tienes una asignación institucional activa para este curso."
        : "El acceso a este curso se realiza únicamente por asignación o invitación.",
      unidadOrigenId,
      reglaId: regla.id,
    };
  }

  return {
    disponible: accesoDirecto || requiereAprobacion,
    requiereAprobacion,
    modalidad: regla.modalidad,
    motivo: requiereAprobacion
      ? "Cumples el perfil requerido. La entidad debe aprobar tu solicitud."
      : accesoDirecto
        ? "Curso disponible por tu vinculación institucional."
        : "El acceso a este curso se realiza únicamente por asignación o invitación.",
    unidadOrigenId,
    reglaId: regla.id,
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolverDestinatariosAsignacion(
  asignacion: AsignacionOrganizacion,
): Promise<string[]> {
  const [miembros, relaciones] = await Promise.all([
    usuarios.listar(),
    vinculaciones.listar(),
  ]);
  const activos = new Set(
    miembros
      .filter((item) => item.estado === "ACTIVO")
      .map((item) => String(item.id)),
  );

  if (!asignacion.destinoUnidadId) {
    return [...activos];
  }

  const alcance =
    asignacion.incluirDescendientes === false
      ? new Set([asignacion.destinoUnidadId])
      : await idsDescendientes(asignacion.destinoUnidadId);

  const destinatarios = new Set<string>();
  for (const relacion of relaciones) {
    if (relacion.estado !== "ACTIVA") continue;
    if (!alcance.has(relacion.unidadId)) continue;
    const usuarioId = String(relacion.usuarioId);
    if (activos.has(usuarioId)) destinatarios.add(usuarioId);
  }
  return [...destinatarios];
}

async function sincronizarMatriculasDeAsignacion(
  asignacion: AsignacionOrganizacion,
): Promise<void> {
  const cursoId = asignacion.cursoId?.trim() ?? "";
  if (!cursoId || !UUID_RE.test(cursoId)) return;
  if (
    asignacion.estado === "CANCELADA" ||
    asignacion.estado === "FINALIZADA"
  ) {
    return;
  }
  if (!(usarOrgPrincipal() && apiConfig.secundariaCursos)) return;

  const destinatarios = await resolverDestinatariosAsignacion(asignacion);
  const resultados = await Promise.allSettled(
    destinatarios.map((usuarioId) =>
      matricularUsuarioEnCurso({
        usuarioId,
        cursoId,
        curso: asignacion.curso,
        unidadOrigenId: asignacion.destinoUnidadId,
        modalidad: "ASIGNADA",
        estadoInicial: "ACTIVO",
      }),
    ),
  );
  const fallos = resultados.filter((item) => item.status === "rejected");
  if (fallos.length) {
    console.warn(
      `[asignaciones] ${fallos.length}/${destinatarios.length} matrículas no sincronizadas`,
      fallos.slice(0, 3),
    );
  }
}

async function matricularUsuarioEnCurso(datos: {
  usuarioId: string;
  cursoId: string;
  curso: string;
  unidadOrigenId?: string;
  modalidad: NonNullable<MatriculaAlumnoOrganizacion["modalidad"]>;
  estadoInicial?: MatriculaAlumnoOrganizacion["estado"];
}): Promise<MatriculaAlumnoOrganizacion> {
  // Ruta real: gestor matricula a un miembro (identidad principal) en la secundaria.
  if (
    usarOrgPrincipal() &&
    apiConfig.secundariaCursos &&
    UUID_RE.test(datos.usuarioId) &&
    UUID_RE.test(datos.cursoId)
  ) {
    const { secundariaGatewayService } = await import(
      "@/api/services/secundaria-gateway.service"
    );
    const pendiente = datos.estadoInicial === "PENDIENTE";
    const resultado = pendiente
      ? await secundariaGatewayService.solicitarMatriculaEstudiante(
          datos.cursoId,
          datos.usuarioId,
        )
      : await secundariaGatewayService.matricularEstudiante(
          datos.cursoId,
          datos.usuarioId,
        );
    const miembros = await usuarios.listar();
    const persona = miembros.find(
      (item) => String(item.id) === datos.usuarioId,
    );
    emitirCambio("matriculas-alumnos");
    return {
      id: resultado.matriculaId,
      alumnoId: datos.usuarioId,
      cursoId: datos.cursoId,
      nombre: persona?.nombre ?? "Miembro de la organización",
      iniciales: persona?.iniciales ?? "MO",
      curso: datos.curso,
      organizacion: contextoActual().organizacionNombre,
      progreso: 0,
      ultimoAcceso: "Aún no ingresa",
      ultimoAccesoFecha: new Date().toISOString().slice(0, 10),
      fechaInscripcion: new Date().toISOString().slice(0, 10),
      estado: datos.estadoInicial ?? "ACTIVO",
      tipo: datos.unidadOrigenId ? "INTERNO" : "EXTERNO",
      condicionAlInscribirse: datos.unidadOrigenId ? "INTERNO" : "EXTERNO",
      origenAcceso: pendiente ? "APROBACION" : "ASIGNACION",
      unidadOrigenId: datos.unidadOrigenId,
      modalidad: datos.modalidad,
    };
  }

  const [persona, existentes] = await Promise.all([
    usuarios.obtener(datos.usuarioId),
    matriculas.listar(),
  ]);
  if (!persona) throw new Error("No se encontró la persona a matricular.");
  const alumnoId = UUID_RE.test(String(persona.id))
    ? String(persona.id)
    : `alu-${String(persona.id).padStart(3, "0")}`;
  const existente = existentes.find(
    (item) => item.alumnoId === alumnoId && item.cursoId === datos.cursoId,
  );
  if (existente) return existente;

  return matriculas.crear({
    id: `mat-${Date.now()}-${persona.id}`,
    alumnoId,
    cursoId: datos.cursoId,
    nombre: persona.nombre,
    iniciales: persona.iniciales,
    curso: datos.curso,
    organizacion: contextoActual().organizacionNombre,
    progreso: 0,
    ultimoAcceso: "Aún no ingresa",
    ultimoAccesoFecha: new Date().toISOString().slice(0, 10),
    fechaInscripcion: new Date().toISOString().slice(0, 10),
    estado: datos.estadoInicial ?? "ACTIVO",
    tipo: datos.unidadOrigenId ? "INTERNO" : "EXTERNO",
    condicionAlInscribirse: datos.unidadOrigenId ? "INTERNO" : "EXTERNO",
    origenAcceso:
      datos.modalidad === "ASIGNADA"
        ? "ASIGNACION"
        : datos.modalidad === "SOLICITADA"
          ? "APROBACION"
          : datos.unidadOrigenId
            ? "NODO_INTERNO"
            : "CURSO_PUBLICO",
    unidadOrigenId: datos.unidadOrigenId,
    modalidad: datos.modalidad,
  });
}

async function solicitarMatriculaCurso(datos: {
  usuarioId: string;
  cursoId: string;
  curso: string;
  unidadOrigenId?: string;
}) {
  return matricularUsuarioEnCurso({
    ...datos,
    modalidad: "SOLICITADA",
    estadoInicial: "PENDIENTE",
  });
}

async function aprobarSolicitudMatricula(id: string) {
  if (usarOrgPrincipal() && apiConfig.secundariaCursos && UUID_RE.test(id)) {
    const actuales = await matriculas.listar();
    const pendiente = actuales.find((item) => item.id === id);
    const { secundariaGatewayService } = await import(
      "@/api/services/secundaria-gateway.service"
    );
    await secundariaGatewayService.activarMatricula(
      id,
      pendiente?.alumnoId ? String(pendiente.alumnoId) : undefined,
    );
    emitirCambio("matriculas-alumnos");
    if (pendiente) {
      return {
        ...pendiente,
        estado: "ACTIVO" as const,
        fechaInscripcion: new Date().toISOString().slice(0, 10),
      };
    }
    return {
      id,
      alumnoId: "",
      cursoId: "",
      nombre: "",
      iniciales: "",
      curso: "",
      organizacion: contextoActual().organizacionNombre,
      progreso: 0,
      ultimoAcceso: "Aún no ingresa",
      ultimoAccesoFecha: new Date().toISOString().slice(0, 10),
      fechaInscripcion: new Date().toISOString().slice(0, 10),
      estado: "ACTIVO" as const,
      tipo: "INTERNO" as const,
      condicionAlInscribirse: "INTERNO" as const,
      origenAcceso: "APROBACION" as const,
      modalidad: "SOLICITADA" as const,
    };
  }

  return matriculas.actualizar(id, {
    estado: "ACTIVO",
    fechaInscripcion: new Date().toISOString().slice(0, 10),
  });
}

const matriculasRepositorio =
  crearRepositorioOrganizacion<MatriculaAlumnoOrganizacion>(
    "matriculas-alumnos",
    API.organizacion.alumnos,
    matriculasOrganizacion.map((matricula) => {
      const usuario = usuariosOrganizacion.find(
        (item) =>
          `alu-${String(item.id).padStart(3, "0")}` === matricula.alumnoId,
      );
      const unidadOrigenId = usuario?.unidadPrincipalId;
      const tipoExplicito = (
        matricula as { tipo?: MatriculaAlumnoOrganizacion["tipo"] }
      ).tipo;
      return {
        ...matricula,
        estado: matricula.estado as MatriculaAlumnoOrganizacion["estado"],
        tipo:
          tipoExplicito ??
          (unidadOrigenId ? ("INTERNO" as const) : ("EXTERNO" as const)),
        condicionAlInscribirse:
          tipoExplicito ??
          (unidadOrigenId ? ("INTERNO" as const) : ("EXTERNO" as const)),
        origenAcceso:
          (matricula as { origenAcceso?: MatriculaAlumnoOrganizacion["origenAcceso"] })
            .origenAcceso ??
          (unidadOrigenId ? "ASIGNACION" : "CURSO_PUBLICO"),
        unidadOrigenId,
        modalidad:
          ((matricula as { modalidad?: MatriculaAlumnoOrganizacion["modalidad"] })
            .modalidad ?? "ASIGNADA") as MatriculaAlumnoOrganizacion["modalidad"],
      };
    }),
    [],
  );

const matriculas = {
  ...matriculasRepositorio,
  async listar() {
    if (usarOrgPrincipal() && apiConfig.secundariaCursos) {
      const { docenteService } = await import("@/api/services/docente.service");
      const estudiantes = await docenteService.estudiantes.listar();
      const orgNombre =
        contextoActual().organizacionNombre || "Tukuy Academy";
      let internos = new Set<string>();
      try {
        const instalacionId = contextoActual().organizacionId;
        if (instalacionId) {
          const snap =
            await organizacionPrincipalService.listarOrganigrama(instalacionId);
          internos = new Set(
            snap.vinculaciones
              .filter((v) => v.estado === "ACTIVA")
              .map((v) => String(v.usuarioId)),
          );
        } else {
          const vinculos = await vinculaciones.listar();
          internos = new Set(
            vinculos
              .filter((v) => v.estado === "ACTIVA")
              .map((v) => String(v.usuarioId)),
          );
        }
      } catch {
        try {
          const vinculos = await vinculaciones.listar();
          internos = new Set(
            vinculos
              .filter((v) => v.estado === "ACTIVA")
              .map((v) => String(v.usuarioId)),
          );
        } catch {
          // sin organigrama: todos EXTERNO
        }
      }
      return estudiantes.map((item): MatriculaAlumnoOrganizacion => {
        const alumnoId = item.alumnoId ? item.alumnoId : item.id;
        const tipo: MatriculaAlumnoOrganizacion["tipo"] = internos.has(
          String(alumnoId),
        )
          ? "INTERNO"
          : "EXTERNO";
        return {
          id: item.id,
          alumnoId,
          cursoId: item.cursoId,
          nombre: item.nombre,
          iniciales: item.iniciales,
          curso: item.curso,
          organizacion: item.organizacion || orgNombre,
          progreso: Number(item.progreso ?? 0),
          ultimoAcceso: item.ultimoAcceso,
          ultimoAccesoFecha: item.ultimoAccesoFecha,
          fechaInscripcion: item.fechaInscripcion,
          estado: (["ACTIVO", "COMPLETADO", "EN_RIESGO", "PENDIENTE"].includes(
            item.estado,
          )
            ? item.estado
            : "ACTIVO") as MatriculaAlumnoOrganizacion["estado"],
          tipo,
          condicionAlInscribirse: tipo,
          origenAcceso: tipo === "INTERNO" ? "NODO_INTERNO" : "CURSO_PUBLICO",
          modalidad: "LIBRE",
        };
      });
    }
    return matriculasRepositorio.listar();
  },

  /** Portal org: 1 fila por alumno, paginado vía secundaria. */
  async listarResumen(entrada: {
    busqueda?: string;
    cursoId?: string | null;
    limite?: number;
    offset?: number;
  } = {}) {
    if (usarOrgPrincipal() && apiConfig.secundariaCursos) {
      const { secundariaGatewayService } = await import(
        "@/api/services/secundaria-gateway.service"
      );
      return secundariaGatewayService.listarAlumnosResumen(entrada);
    }
    const todas = await matriculasRepositorio.listar();
    const termino = (entrada.busqueda ?? "").trim().toLowerCase();
    const porPersona = new Map<string, MatriculaAlumnoOrganizacion[]>();
    for (const item of todas) {
      if (entrada.cursoId && item.cursoId !== entrada.cursoId) continue;
      const lista = porPersona.get(item.alumnoId) ?? [];
      lista.push(item);
      porPersona.set(item.alumnoId, lista);
    }
    let alumnos = [...porPersona.entries()].map(([alumnoId, lista]) => {
      const ordenadas = [...lista].sort((a, b) =>
        b.ultimoAccesoFecha.localeCompare(a.ultimoAccesoFecha),
      );
      const base = ordenadas[0]!;
      const pendientes = lista.filter((m) => m.estado === "PENDIENTE");
      return {
        alumnoId,
        nombre: base.nombre,
        iniciales: base.iniciales,
        correo: "",
        cursos: lista.length,
        cursosResumen: [...new Set(lista.map((m) => m.curso))].join(" · "),
        progreso: Math.round(
          lista.reduce((s, m) => s + m.progreso, 0) / lista.length,
        ),
        estado:
          lista.find((m) => m.estado === "EN_RIESGO")?.estado ??
          lista.find((m) => m.estado === "PENDIENTE")?.estado ??
          lista.find((m) => m.estado === "ACTIVO")?.estado ??
          "ACTIVO",
        fechaInscripcion:
          [...lista].map((m) => m.fechaInscripcion).sort()[0] ?? "",
        ultimoAcceso: base.ultimoAcceso,
        ultimoAccesoFecha: base.ultimoAccesoFecha,
        pendientes: pendientes.length,
        matriculasPendientes: pendientes.map((m) => ({
          id: m.id,
          cursoId: m.cursoId,
          curso: m.curso,
          progreso: m.progreso,
          estado: m.estado,
        })),
        organizacion: base.organizacion,
      };
    });
    if (termino) {
      alumnos = alumnos.filter(
        (a) =>
          a.nombre.toLowerCase().includes(termino) ||
          a.cursosResumen.toLowerCase().includes(termino),
      );
    }
    alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    const limite = entrada.limite ?? 50;
    const offset = entrada.offset ?? 0;
    const cursos = [
      ...new Map(
        todas.map((m) => [m.cursoId, { id: m.cursoId, titulo: m.curso }]),
      ).values(),
    ].sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
    return {
      ok: true as const,
      total: alumnos.length,
      limite,
      offset,
      alumnos: alumnos.slice(offset, offset + limite),
      cursos,
    };
  },
};

const certificados =
  crearRepositorioOrganizacion<CertificadoEmitidoDocente>(
    "certificados",
    API.organizacion.certificados,
    certificadosOrganizacion,
    [],
  );

const certificadosPendientes =
  crearRepositorioOrganizacion<CertificadoPendienteDocente>(
    "certificados-pendientes",
    API.organizacion.certificadosPendientes,
    certificadosPendientesOrganizacion,
    [],
  );

async function emitirCertificadoInstitucional(id: string) {
  if (apiConfig.secundariaCursos) {
    const { docenteService } = await import("@/api/services/docente.service");
    return docenteService.emitirCertificado(id);
  }
  if (!apiConfig.useMock) {
    const { data } = await api.post<CertificadoEmitidoDocente>(
      API.organizacion.emitirCertificado(id),
    );
    return data;
  }

  const pendiente = await certificadosPendientes.obtener(id);
  if (!pendiente) throw new Error("No se encontró el certificado pendiente.");
  if (pendiente.nota < 14) {
    throw new Error("El alumno todavía no cumple la nota mínima.");
  }

  const emitidos = await certificados.listar();
  const certificado: CertificadoEmitidoDocente = {
    id: `CIC-2026-${String(219 + emitidos.length).padStart(4, "0")}`,
    nombre: pendiente.nombre,
    curso: pendiente.curso,
    fecha: new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date()),
    estado: "EMITIDO",
    cursoId: pendiente.cursoId,
    estudianteId: pendiente.estudianteId,
    notaFinal: pendiente.nota,
    horasCertificadas: pendiente.horasRequeridas,
    modulosCompletados: pendiente.modulosTotales,
    versionPrograma: "2026.1",
    organizacionEmisora: "COLEGIO DE INGENIEROS CUSCO",
  };
  const creado = await certificados.crear(certificado);
  await certificadosPendientes.eliminar(id);
  return creado;
}

const asignacionesLocal = crearRepositorioOrganizacion<AsignacionOrganizacion>(
  "asignaciones",
  API.organizacion.asignaciones,
  asignacionesOrganizacion.map((asignacion) => ({
    ...asignacion,
    estado: "ACTIVA",
    creadaEn: "2026-07-01",
  })),
  [],
);

const rutasLocal = crearRepositorioOrganizacion<RutaOrganizacion>(
  "rutas",
  API.organizacion.rutas,
  rutasOrganizacion.map((ruta) => ({
    ...ruta,
    estado: ruta.estado ?? "PUBLICADA",
  })),
  [],
);

type ClaveAsignacionesRutas = "asignaciones" | "rutas";

async function snapshotAsignacionesRutasPrincipal() {
  const instalacionId = contextoActual().organizacionId;
  if (!instalacionId) {
    throw new Error("No hay organización activa en el contexto de sesión");
  }
  return organizacionPrincipalService.listarAsignacionesRutas(instalacionId);
}

function usaAsignacionesRutasBd() {
  return usarOrgPrincipal() && asignacionesRutasBdDisponible();
}

function crearRepoAsignacionesRutasBd<T extends RegistroIdentificable>(
  local: ReturnType<typeof crearRepositorioOrganizacion<T>>,
  clave: ClaveAsignacionesRutas,
  recursoEmit: string,
  guardar: (instalacionId: string, registro: T) => Promise<T>,
  eliminarBd?: (instalacionId: string, id: string) => Promise<void>,
) {
  return {
    listar: async () => {
      if (!usaAsignacionesRutasBd()) return local.listar();
      try {
        const snap = await snapshotAsignacionesRutasPrincipal();
        return (
          clave === "asignaciones" ? snap.asignaciones : snap.rutas
        ) as unknown as T[];
      } catch (error) {
        if (esErrorRpcAsignacionesRutasAusente(error)) return local.listar();
        throw error;
      }
    },
    obtener: async (id: Identificador) => {
      if (!usaAsignacionesRutasBd()) return local.obtener(id);
      try {
        const snap = await snapshotAsignacionesRutasPrincipal();
        const lista = (
          clave === "asignaciones" ? snap.asignaciones : snap.rutas
        ) as unknown as T[];
        return lista.find((item) => item.id === id) ?? null;
      } catch (error) {
        if (esErrorRpcAsignacionesRutasAusente(error)) return local.obtener(id);
        throw error;
      }
    },
    crear: async (registro: T) => {
      if (!usaAsignacionesRutasBd()) return local.crear(registro);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const creado = await guardar(instalacionId, registro);
        emitirCambio(recursoEmit);
        return creado;
      } catch (error) {
        if (esErrorRpcAsignacionesRutasAusente(error)) return local.crear(registro);
        throw error;
      }
    },
    actualizar: async (id: Identificador, cambios: Partial<T>) => {
      if (!usaAsignacionesRutasBd()) return local.actualizar(id, cambios);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const snap = await snapshotAsignacionesRutasPrincipal();
        const lista = (
          clave === "asignaciones" ? snap.asignaciones : snap.rutas
        ) as unknown as T[];
        const actual = lista.find((item) => item.id === id);
        if (!actual) throw new Error("Registro no encontrado");
        const fusionado = { ...actual, ...cambios, id } as T;
        const actualizado = await guardar(instalacionId, fusionado);
        emitirCambio(recursoEmit);
        return actualizado;
      } catch (error) {
        if (esErrorRpcAsignacionesRutasAusente(error)) {
          return local.actualizar(id, cambios);
        }
        throw error;
      }
    },
    eliminar: async (id: Identificador) => {
      if (!usaAsignacionesRutasBd()) return local.eliminar(id);
      if (!eliminarBd) {
        throw new Error("Eliminación no disponible para este recurso en BD");
      }
      try {
        const instalacionId = contextoActual().organizacionId!;
        await eliminarBd(instalacionId, String(id));
        emitirCambio(recursoEmit);
      } catch (error) {
        if (esErrorRpcAsignacionesRutasAusente(error)) {
          await local.eliminar(id);
          return;
        }
        throw error;
      }
    },
    reemplazar: async (registros: T[]) => {
      if (!usaAsignacionesRutasBd()) return local.reemplazar(registros);
      try {
        const instalacionId = contextoActual().organizacionId!;
        const guardados: T[] = [];
        for (const registro of registros) {
          guardados.push(await guardar(instalacionId, registro));
        }
        emitirCambio(recursoEmit);
        return guardados;
      } catch (error) {
        if (esErrorRpcAsignacionesRutasAusente(error)) {
          return local.reemplazar(registros);
        }
        throw error;
      }
    },
    reiniciar: () => local.reiniciar(),
  };
}

const asignacionesBase = crearRepoAsignacionesRutasBd(
  asignacionesLocal,
  "asignaciones",
  "asignaciones",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarAsignacion(instalacionId, registro),
  (instalacionId, id) =>
    organizacionPrincipalService.eliminarAsignacion(instalacionId, id),
);

const asignaciones = {
  ...asignacionesBase,
  async crear(registro: AsignacionOrganizacion) {
    const creada = await asignacionesBase.crear({
      ...registro,
      estado: registro.estado ?? "ACTIVA",
      creadaEn: registro.creadaEn ?? new Date().toISOString().slice(0, 10),
    });
    await sincronizarMatriculasDeAsignacion(creada);
    return creada;
  },
};

const rutas = crearRepoAsignacionesRutasBd(
  rutasLocal,
  "rutas",
  "rutas",
  (instalacionId, registro) =>
    organizacionPrincipalService.guardarRuta(instalacionId, registro),
  (instalacionId, id) =>
    organizacionPrincipalService.eliminarRuta(instalacionId, id),
);

const comprobantesLocal = crearRepositorioOrganizacion<ComprobanteOrganizacion>(
  "comprobantes",
  API.organizacion.comprobantes,
  usarOrgPrincipal()
    ? []
    : [
        {
          id: "comp-1842",
          numero: "F001-0001842",
          fecha: "2026-07-01",
          concepto: "Suscripción Empresa Pro",
          importe: 2490,
          moneda: "PEN",
          estado: "PAGADO",
        },
        {
          id: "comp-1721",
          numero: "F001-0001721",
          fecha: "2026-06-01",
          concepto: "Suscripción Empresa Pro",
          importe: 2490,
          moneda: "PEN",
          estado: "PAGADO",
        },
        {
          id: "comp-1605",
          numero: "F001-0001605",
          fecha: "2026-05-01",
          concepto: "Suscripción Empresa Pro",
          importe: 2490,
          moneda: "PEN",
          estado: "PAGADO",
        },
      ],
  [],
);

const notificacionesLocal =
  crearRepositorioOrganizacion<NotificacionOrganizacion>(
    "notificaciones",
    API.organizacion.notificaciones,
    usarOrgPrincipal()
      ? []
      : [
          {
            id: "org-not-1",
            titulo: "Asignación próxima a vencer",
            detalle: "Seguridad y salud tiene participantes pendientes.",
            fecha: "2026-07-16T09:00:00-05:00",
            leida: false,
            ruta: "/organizacion/asignaciones",
          },
          {
            id: "org-not-2",
            titulo: "Consumo de licencias",
            detalle:
              "La organización superó el 85% de licencias disponibles.",
            fecha: "2026-07-15T16:30:00-05:00",
            leida: false,
            ruta: "/organizacion/licencia",
          },
          {
            id: "org-not-3",
            titulo: "Cursos por revisar",
            detalle: "Hay propuestas de docentes esperando tu visto bueno.",
            fecha: "2026-07-16T08:15:00-05:00",
            leida: false,
            ruta: "/organizacion/cursos",
          },
        ],
    [],
  );

function claveLeidasAlertas(instalacionId: string) {
  return `tukuy_org_alertas_leidas_${instalacionId}`;
}

function leerIdsAlertasLeidas(instalacionId: string): Set<string> {
  try {
    const bruto = localStorage.getItem(claveLeidasAlertas(instalacionId));
    const lista = bruto ? (JSON.parse(bruto) as unknown) : [];
    return new Set(
      Array.isArray(lista) ? lista.map((item) => String(item)) : [],
    );
  } catch {
    return new Set();
  }
}

function guardarIdsAlertasLeidas(instalacionId: string, ids: Set<string>) {
  localStorage.setItem(
    claveLeidasAlertas(instalacionId),
    JSON.stringify([...ids]),
  );
}

const comprobantes = {
  ...comprobantesLocal,
  async listar() {
    if (usarOrgPrincipal()) {
      const instalacionId = contextoActual().organizacionId;
      if (!instalacionId) return [];
      try {
        return await organizacionPrincipalService.listarComprobantes(
          instalacionId,
        );
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : String(error);
        if (/org_listar_comprobantes|Could not find the function|PGRST202/i.test(
          mensaje,
        )) {
          return [];
        }
        throw error;
      }
    }
    return comprobantesLocal.listar();
  },
};

const notificaciones = {
  ...notificacionesLocal,
  async listar() {
    if (usarOrgPrincipal()) {
      const instalacionId = contextoActual().organizacionId;
      if (!instalacionId) return [];
      try {
        const alertas =
          await organizacionPrincipalService.listarAlertasOperativas(
            instalacionId,
          );
        const leidas = leerIdsAlertasLeidas(instalacionId);
        return alertas.map((item) => ({
          ...item,
          leida: leidas.has(item.id),
        }));
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : String(error);
        if (
          /org_listar_alertas_operativas|Could not find the function|PGRST202/i.test(
            mensaje,
          )
        ) {
          return [];
        }
        throw error;
      }
    }
    return notificacionesLocal.listar();
  },
  async actualizar(
    id: Identificador,
    cambios: Partial<NotificacionOrganizacion>,
  ) {
    if (usarOrgPrincipal()) {
      const instalacionId = contextoActual().organizacionId;
      if (!instalacionId) {
        throw new Error("No hay organización activa en el contexto de sesión");
      }
      if (cambios.leida) {
        const leidas = leerIdsAlertasLeidas(instalacionId);
        leidas.add(String(id));
        guardarIdsAlertasLeidas(instalacionId, leidas);
      }
      const lista = await this.listar();
      const actual = lista.find((item) => item.id === String(id));
      return {
        ...(actual ?? {
          id: String(id),
          titulo: "",
          detalle: "",
          fecha: new Date().toISOString(),
          leida: false,
        }),
        ...cambios,
        id: String(id),
      };
    }
    return notificacionesLocal.actualizar(id, cambios);
  },
};

const catalogoCursosRepositorio =
  crearRepositorioOrganizacion<PropuestaCursoOrganizacion>(
    "catalogo-cursos",
    API.organizacion.catalogoCursos,
    catalogoCursosOrganizacion,
    [],
  );

const ESTADOS_PROPUESTA = new Set<EstadoPropuestaCursoOrganizacion>([
  "EN_REVISION",
  "CONTENIDO_REVISADO",
  "APROBADO",
  "OBSERVADO",
  "PUBLICADO",
]);

function mapearEstadoPropuesta(
  raw: unknown,
  historicos?: Record<string, unknown> | null,
): EstadoPropuestaCursoOrganizacion {
  const workflow = String(historicos?.workflowEstado ?? "").toUpperCase();
  if (ESTADOS_PROPUESTA.has(workflow as EstadoPropuestaCursoOrganizacion)) {
    return workflow as EstadoPropuestaCursoOrganizacion;
  }
  const estado = String(raw ?? "EN_REVISION").toUpperCase();
  if (ESTADOS_PROPUESTA.has(estado as EstadoPropuestaCursoOrganizacion)) {
    return estado as EstadoPropuestaCursoOrganizacion;
  }
  if (estado === "BORRADOR") return "EN_REVISION";
  if (estado === "RETIRADO") return "OBSERVADO";
  return "EN_REVISION";
}

function mapearCatalogoAPropuesta(
  item: Record<string, unknown>,
): PropuestaCursoOrganizacion {
  const historicos =
    item.datosHistoricos && typeof item.datosHistoricos === "object"
      ? (item.datosHistoricos as Record<string, unknown>)
      : {};
  const borrador =
    historicos.borradorResumen && typeof historicos.borradorResumen === "object"
      ? (historicos.borradorResumen as Record<string, unknown>)
      : {};
  const config =
    historicos.configuracionPublicacion &&
    typeof historicos.configuracionPublicacion === "object"
      ? (historicos.configuracionPublicacion as Record<string, unknown>)
      : {};
  const duracionMin = Number(item.duracionMinutos ?? 0);
  const actualizadoEn = String(item.actualizadoEn ?? item.creadoEn ?? "");
  const enviado = actualizadoEn
    ? new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(actualizadoEn))
    : "—";
  const cursoSecundarioRef = String(
    item.cursoSecundarioRef ?? item.curso_secundario_ref ?? "",
  );
  return {
    id: String(item.id),
    cursoDocenteId: cursoSecundarioRef,
    titulo: String(item.titulo ?? "Curso"),
    imagen: String(item.imagenPublicaRef ?? item.imagen_publica_ref ?? ""),
    docente: String(
      borrador.docenteResponsableNombre ??
        historicos.docenteNombre ??
        "Docente",
    ),
    categoria: String(borrador.categoria ?? item.modalidad ?? "General"),
    enviado,
    lecciones: Number(borrador.lecciones ?? Math.max(1, Math.round(duracionMin / 30))),
    duracion: duracionMin > 0
      ? `${Math.max(1, Math.round(duracionMin / 60))} h`
      : "—",
    estado: mapearEstadoPropuesta(item.estadoPublicacion, historicos),
    observacion:
      typeof historicos.observacion === "string"
        ? historicos.observacion
        : undefined,
    precio: Number(config.precio ?? historicos.precio ?? 0) || undefined,
    moneda: (config.moneda as "PEN" | "USD" | undefined) ?? "PEN",
    gratuito: Boolean(config.gratuito ?? historicos.gratuito),
    alcance: (config.alcance as AlcanceCursoOrganizacion | undefined) ??
      undefined,
    destinoArea: (config.destinoArea as string | null | undefined) ?? null,
    descuentoInterno: Number(config.descuentoInterno ?? 0) || undefined,
    descuentoAplicaA:
      (config.descuentoAplicaA as DestinatarioDescuento | undefined) ??
      undefined,
    descuentoArea: (config.descuentoArea as string | null | undefined) ?? null,
    configuracionPublicacion: config.configuracionPublicacion as
      | PropuestaCursoOrganizacion["configuracionPublicacion"]
      | undefined,
    precioPropuestoPorDocente: Boolean(
      historicos.precioPropuestoPorDocente ??
        config.precioPropuestoPorDocente,
    ),
  };
}

const catalogoCursos = {
  ...catalogoCursosRepositorio,
  async listar() {
    if (usarOrgPrincipal() && apiConfig.secundariaCursos) {
      const { secundariaGatewayService } = await import(
        "@/api/services/secundaria-gateway.service"
      );
      const data = await secundariaGatewayService.listarCursosRevision();
      return (data.cursos ?? []).map((item) =>
        mapearCatalogoAPropuesta(item as Record<string, unknown>)
      );
    }
    return catalogoCursosRepositorio.listar();
  },
  async obtener(id: Identificador) {
    if (usarOrgPrincipal() && apiConfig.secundariaCursos) {
      const lista = await this.listar();
      return (
        lista.find((item) => item.id === String(id)) ??
        lista.find((item) => item.cursoDocenteId === String(id)) ??
        null
      );
    }
    return catalogoCursosRepositorio.obtener(id);
  },
};

async function programarSesionEnVivo(
  input: Omit<ProgramarSesionEnVivoInput, "organizacionId" | "creadoPor"> & {
    organizacionId?: string;
    creadoPor?: ProgramarSesionEnVivoInput["creadoPor"];
  },
) {
  const contexto = contextoActual();
  const organizacionId =
    input.organizacionId ?? contexto.organizacionId ?? "org-empresa-abc";
  return sesionesEnVivoCompartidas.programar({
    ...input,
    organizacionId,
    creadoPor: input.creadoPor ?? {
      portal: "organizacion",
      nombre: contexto.organizacionNombre || "Administración",
    },
  });
}

async function iniciarSesionEnVivo(id: string) {
  const organizacionId =
    contextoActual().organizacionId ?? "org-empresa-abc";
  return sesionesEnVivoCompartidas.iniciar(organizacionId, id);
}

async function cancelarSesionEnVivo(id: string) {
  const organizacionId =
    contextoActual().organizacionId ?? "org-empresa-abc";
  return sesionesEnVivoCompartidas.cancelar(organizacionId, id);
}

async function reenviarInvitacionesSesion(id: string) {
  const organizacionId =
    contextoActual().organizacionId ?? "org-empresa-abc";
  return sesionesEnVivoCompartidas.reenviarInvitaciones(organizacionId, id);
}

async function registrarCursoParaRevision(datos: {
  cursoDocenteId: string;
  titulo: string;
  imagen: string;
  docenteResponsableId?: string;
  docenteResponsableNombre: string;
  cargadoPor?: string;
  origenCarga?: "DOCENTE" | "ADMINISTRACION";
  categoria: string;
  lecciones: number;
}) {
  // Con secundaria real, el indexado al catálogo lo hace el gateway
  // al guardar el curso con estado EN_REVISION.
  if (usarOrgPrincipal() && apiConfig.secundariaCursos) {
    if (!UUID_RE.test(datos.cursoDocenteId)) {
      throw new Error("cursoDocenteId inválido para registrar en revisión.");
    }
    const { secundariaGatewayService } = await import(
      "@/api/services/secundaria-gateway.service"
    );
    await secundariaGatewayService.publicarCurso({
      cursoId: datos.cursoDocenteId,
      estadoPublicacion: "EN_REVISION",
    });
    emitirCambio("catalogo-cursos");
    const lista = await catalogoCursos.listar();
    const existente = lista.find(
      (item) => item.cursoDocenteId === datos.cursoDocenteId,
    );
    if (existente) return existente;
    return {
      id: datos.cursoDocenteId,
      cursoDocenteId: datos.cursoDocenteId,
      titulo: datos.titulo,
      imagen: datos.imagen,
      docente: datos.docenteResponsableNombre,
      docenteResponsableId: datos.docenteResponsableId,
      cargadoPor: datos.cargadoPor,
      origenCarga: datos.origenCarga,
      categoria: datos.categoria,
      enviado: new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
      lecciones: datos.lecciones,
      duracion: `${Math.max(1, Math.ceil(datos.lecciones / 2))} h`,
      estado: "EN_REVISION" as const,
    };
  }

  const existentes = await catalogoCursosRepositorio.listar();
  const existente = existentes.find(
    (item) => item.cursoDocenteId === datos.cursoDocenteId,
  );
  const propuesta: PropuestaCursoOrganizacion = {
    id: existente?.id ?? `prop-${datos.cursoDocenteId}`,
    cursoDocenteId: datos.cursoDocenteId,
    titulo: datos.titulo,
    imagen: datos.imagen,
    docente: datos.docenteResponsableNombre,
    docenteResponsableId: datos.docenteResponsableId,
    cargadoPor: datos.cargadoPor,
    origenCarga: datos.origenCarga,
    categoria: datos.categoria,
    enviado: new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date()),
    lecciones: datos.lecciones,
    duracion: `${Math.max(1, Math.ceil(datos.lecciones / 2))} h`,
    estado: "EN_REVISION",
  };
  return existente
    ? catalogoCursosRepositorio.actualizar(existente.id, propuesta)
    : catalogoCursosRepositorio.crear(propuesta);
}

async function sincronizarEstadoDocente(
  cursoDocenteId: string,
  estado: EstadoCursoDocente,
  extras?: { observacion?: string },
) {
  if (apiConfig.secundariaCursos && estado === "PUBLICADO") {
    try {
      const { secundariaGatewayService } = await import(
        "@/api/services/secundaria-gateway.service"
      );
      await secundariaGatewayService.publicarCurso({
        cursoId: cursoDocenteId,
        estadoPublicacion: "PUBLICADO",
      });
    } catch {
      // Si falla el gateway, aún actualizamos la fila local del catálogo.
    }
    return;
  }
  if (!apiConfig.useMock) return;
  try {
    const { docenteService } = await import("@/api/services/docente.service");
    await docenteService.actualizarEstadoCurso(cursoDocenteId, estado, extras);
  } catch {
    // El portal docente puede no tener ese curso en el contexto activo.
  }
}

async function aprobarCursoPropuesto(
  id: string,
  configuracion?: AprobacionCursoOrganizacion,
) {
  if (usarOrgPrincipal() && apiConfig.secundariaCursos) {
    const propuesta = await catalogoCursos.obtener(id);
    if (!propuesta?.cursoDocenteId) {
      throw new Error("No se encontró el curso a aprobar.");
    }
    const publicar = configuracion?.publicar ?? false;
    const { secundariaGatewayService } = await import(
      "@/api/services/secundaria-gateway.service"
    );
    const resultado = await secundariaGatewayService.aprobarCurso(
      propuesta.cursoDocenteId,
      {
        publicar,
        configuracion: {
          precio: configuracion?.precio ?? 0,
          moneda: configuracion?.moneda ?? "PEN",
          alcance: configuracion?.alcance ?? "ORGANIZACION",
          destinoArea: configuracion?.destinoArea ?? null,
          descuentoInterno: configuracion?.descuentoInterno ?? 0,
          descuentoAplicaA: configuracion?.descuentoAplicaA ?? "NINGUNO",
          descuentoArea: configuracion?.descuentoArea ?? null,
          publicar,
          configuracionPublicacion: configuracion?.configuracionPublicacion,
        },
      },
    );
    emitirCambio("catalogo-cursos");
    return mapearCatalogoAPropuesta({
      ...(resultado.catalogo ?? {}),
      id: String(resultado.catalogo?.id ?? propuesta.id),
      cursoSecundarioRef: propuesta.cursoDocenteId,
      titulo: propuesta.titulo,
      estadoPublicacion: resultado.estado,
      datosHistoricos: {
        ...(typeof resultado.catalogo?.datosHistoricos === "object"
          ? (resultado.catalogo.datosHistoricos as Record<string, unknown>)
          : {}),
        workflowEstado: resultado.estado,
        configuracionPublicacion: configuracion,
      },
    });
  }

  if (!apiConfig.useMock) {
    const { data } = await api.post<PropuestaCursoOrganizacion>(
      API.organizacion.aprobarCurso(id),
      configuracion,
    );
    return data;
  }

  const publicar = configuracion?.publicar ?? false;
  const precio = Math.max(0, configuracion?.precio ?? 0);
  const alcance = configuracion?.alcance ?? "ORGANIZACION";
  const destinoArea =
    alcance === "AREA" ? (configuracion?.destinoArea ?? null) : null;
  const descuentoAplicaA = configuracion?.descuentoAplicaA ?? "NINGUNO";
  const descuentoArea =
    descuentoAplicaA === "AREA"
      ? (configuracion?.descuentoArea ?? null)
      : null;
  const descuentoInterno =
    descuentoAplicaA === "NINGUNO"
      ? 0
      : Math.min(Math.max(configuracion?.descuentoInterno ?? 0, 0), 100);
  const precioConDto = calcularPrecioConDescuento(
    precio,
    descuentoInterno,
    descuentoAplicaA,
  );

  const actualizado = await catalogoCursosRepositorio.actualizar(id, {
    estado: publicar ? "PUBLICADO" : "APROBADO",
    observacion: undefined,
    precio,
    gratuito: precioConDto <= 0 && descuentoAplicaA !== "NINGUNO",
    moneda: configuracion?.moneda ?? "PEN",
    alcance,
    destinoArea,
    descuentoInterno,
    descuentoAplicaA,
    descuentoArea,
    configuracionPublicacion: configuracion?.configuracionPublicacion,
  });
  await sincronizarEstadoDocente(
    actualizado.cursoDocenteId,
    publicar ? "PUBLICADO" : "APROBADO",
  );
  return actualizado;
}

async function marcarContenidoRevisado(id: string) {
  if (usarOrgPrincipal() && apiConfig.secundariaCursos) {
    const propuesta = await catalogoCursos.obtener(id);
    if (!propuesta?.cursoDocenteId) {
      throw new Error("No se encontró el curso a revisar.");
    }
    const { secundariaGatewayService } = await import(
      "@/api/services/secundaria-gateway.service"
    );
    const resultado = await secundariaGatewayService.revisarContenidoCurso(
      propuesta.cursoDocenteId,
    );
    emitirCambio("catalogo-cursos");
    return {
      ...propuesta,
      estado: "CONTENIDO_REVISADO" as const,
      observacion: undefined,
      id: String(resultado.catalogo?.id ?? propuesta.id),
    };
  }

  if (!apiConfig.useMock) {
    const { data } = await api.post<PropuestaCursoOrganizacion>(
      API.organizacion.revisarContenidoCurso(id),
    );
    return data;
  }
  const actualizado = await catalogoCursosRepositorio.actualizar(id, {
    estado: "CONTENIDO_REVISADO",
    observacion: undefined,
  });
  await sincronizarEstadoDocente(
    actualizado.cursoDocenteId,
    "CONTENIDO_REVISADO",
  );
  return actualizado;
}

async function observarCursoPropuesto(id: string, observacion: string) {
  if (usarOrgPrincipal() && apiConfig.secundariaCursos) {
    const propuesta = await catalogoCursos.obtener(id);
    if (!propuesta?.cursoDocenteId) {
      throw new Error("No se encontró el curso a observar.");
    }
    const { secundariaGatewayService } = await import(
      "@/api/services/secundaria-gateway.service"
    );
    const resultado = await secundariaGatewayService.observarCurso(
      propuesta.cursoDocenteId,
      observacion,
    );
    emitirCambio("catalogo-cursos");
    return {
      ...propuesta,
      estado: "OBSERVADO" as const,
      observacion,
      id: String(resultado.catalogo?.id ?? propuesta.id),
    };
  }

  if (!apiConfig.useMock) {
    const { data } = await api.post<PropuestaCursoOrganizacion>(
      API.organizacion.observarCurso(id),
      { observacion },
    );
    return data;
  }
  const actualizado = await catalogoCursosRepositorio.actualizar(id, {
    estado: "OBSERVADO",
    observacion,
  });
  await sincronizarEstadoDocente(actualizado.cursoDocenteId, "OBSERVADO", {
    observacion,
  });
  return actualizado;
}

async function publicarCursoPropuesto(
  id: string,
  configuracion?: Partial<AprobacionCursoOrganizacion>,
) {
  if (usarOrgPrincipal() && apiConfig.secundariaCursos) {
    const curso = await catalogoCursos.obtener(id);
    return aprobarCursoPropuesto(id, {
      precio: configuracion?.precio ?? curso?.precio ?? 0,
      moneda: configuracion?.moneda ?? curso?.moneda ?? "PEN",
      alcance: configuracion?.alcance ?? curso?.alcance ?? "ORGANIZACION",
      destinoArea: configuracion?.destinoArea ?? curso?.destinoArea ?? null,
      descuentoInterno:
        configuracion?.descuentoInterno ?? curso?.descuentoInterno ?? 0,
      descuentoAplicaA:
        configuracion?.descuentoAplicaA ?? curso?.descuentoAplicaA ?? "NINGUNO",
      descuentoArea: configuracion?.descuentoArea ?? curso?.descuentoArea ?? null,
      publicar: true,
      configuracionPublicacion:
        configuracion?.configuracionPublicacion ??
        curso?.configuracionPublicacion,
    });
  }

  if (!apiConfig.useMock) {
    const { data } = await api.put<PropuestaCursoOrganizacion>(
      `${API.organizacion.catalogoCursos}/${id}`,
      { estado: "PUBLICADO", ...configuracion },
    );
    return data;
  }

  const curso = await catalogoCursos.obtener(id);
  const precio = Math.max(0, configuracion?.precio ?? curso?.precio ?? 0);
  const alcance =
    configuracion?.alcance ?? curso?.alcance ?? "ORGANIZACION";
  const destinoArea =
    alcance === "AREA"
      ? (configuracion?.destinoArea ?? curso?.destinoArea ?? null)
      : null;
  const descuentoAplicaA =
    configuracion?.descuentoAplicaA ?? curso?.descuentoAplicaA ?? "NINGUNO";
  const descuentoArea =
    descuentoAplicaA === "AREA"
      ? (configuracion?.descuentoArea ?? curso?.descuentoArea ?? null)
      : null;
  const descuentoInterno =
    descuentoAplicaA === "NINGUNO"
      ? 0
      : Math.min(
          Math.max(
            configuracion?.descuentoInterno ?? curso?.descuentoInterno ?? 0,
            0,
          ),
          100,
        );
  const precioConDto = calcularPrecioConDescuento(
    precio,
    descuentoInterno,
    descuentoAplicaA,
  );

  const actualizado = await catalogoCursos.actualizar(id, {
    estado: "PUBLICADO",
    precio,
    gratuito: precioConDto <= 0 && descuentoAplicaA !== "NINGUNO",
    moneda: configuracion?.moneda ?? curso?.moneda ?? "PEN",
    alcance,
    destinoArea,
    descuentoInterno,
    descuentoAplicaA,
    descuentoArea,
  });
  await sincronizarEstadoDocente(actualizado.cursoDocenteId, "PUBLICADO");
  return actualizado;
}

function almacenConfiguracion() {
  const contexto = contextoActual();
  const semillaPrincipal: ConfiguracionOrganizacion = {
    nombre: contexto.organizacionNombre || "Tukuy Academy",
    logo: "/img/iconoTukuyAcademy.png",
    ruc: "",
    dominio: "",
    zonaHoraria: "America/Lima",
    restringirDominio: false,
    requiereDniEnrolamiento: false,
  };
  return crearAlmacenDocumento<ConfiguracionOrganizacion>(
    claveContextual("configuracion"),
    usarOrgPrincipal()
      ? semillaPrincipal
      : {
          nombre: contexto.organizacionNombre || "COLEGIO DE INGENIEROS CUSCO",
          logo: "/img/LogoColegioING.png",
          ruc: "20601234567",
          dominio: "cipcusco.org.pe",
          zonaHoraria: "America/Lima",
          restringirDominio: true,
          requiereDniEnrolamiento: true,
        },
    usarOrgPrincipal() ? 40 : 4,
  );
}

function almacenIntegraciones() {
  const demos: IntegracionOrganizacion[] = [
    { id: "tukuy-obra", nombre: "Tukuy Obra", descripcion: "Sincronización de proyectos, equipos y especialidades.", activa: true, endpoint: "https://api.tukuyobra.com/v1" },
    {
      id: "google-calendar-meet",
      nombre: "Google Calendar + Meet",
      descripcion:
        "Agenda sesiones en vivo, genera enlace Meet e invita alumnos por correo (attendees).",
      activa: true,
      endpoint: "https://www.googleapis.com/calendar/v3",
    },
    { id: "siadeg", nombre: "SIADEG", descripcion: "Intercambio de personal y estructura organizacional.", activa: false, endpoint: "" },
    { id: "api", nombre: "API empresarial", descripcion: "Integración personalizada con sistemas internos.", activa: false, endpoint: "" },
  ];
  return crearAlmacenDocumento<IntegracionOrganizacion[]>(
    claveContextual("integraciones"),
    usarOrgPrincipal() || apiConfig.sinDatosDemo ? [] : demos,
    usarOrgPrincipal() || apiConfig.sinDatosDemo ? 40 : 3,
  );
}

function almacenLicencia() {
  return crearAlmacenDocumento<LicenciaOrganizacion>(
    claveContextual("licencia"),
    {
      plan: "Empresa Pro",
      descripcion: "Capacitación avanzada para equipos en crecimiento.",
      inicio: "2026-01-01",
      fin: "2026-12-31",
      estado: "ACTIVA",
      consumos: [
        { id: "usuarios", etiqueta: "Usuarios activos", utilizado: 427, limite: 500, unidad: "usuarios" },
        { id: "docentes", etiqueta: "Docentes", utilizado: 12, limite: 20, unidad: "docentes" },
        { id: "cursos", etiqueta: "Cursos", utilizado: 32, limite: 100, unidad: "cursos" },
        { id: "almacenamiento", etiqueta: "Almacenamiento", utilizado: 142, limite: 200, unidad: "GB" },
      ],
    },
    2,
  );
}

function almacenFacturacion() {
  const vacia: FacturacionOrganizacion = {
    plan: "Sin plan comercial",
    periodicidad: "MENSUAL",
    proximoCobro: "—",
    importe: 0,
    moneda: "PEN",
    tarjetaMarca: "—",
    tarjetaUltimos4: "—",
    tarjetaVencimiento: "—",
  };
  return crearAlmacenDocumento<FacturacionOrganizacion>(
    claveContextual("facturacion"),
    usarOrgPrincipal()
      ? vacia
      : {
          plan: "Empresa Pro",
          periodicidad: "MENSUAL",
          proximoCobro: "2026-08-01",
          importe: 2490,
          moneda: "PEN",
          tarjetaMarca: "Visa",
          tarjetaUltimos4: "4821",
          tarjetaVencimiento: "08/2028",
        },
    usarOrgPrincipal() ? 30 : 2,
  );
}

async function leerDocumento<T>(ruta: string, almacen: ReturnType<typeof crearAlmacenDocumento<T>>) {
  if (usarOrgPrincipal() || apiConfig.useMock) return almacen.leer();
  const { data } = await api.get<T>(ruta);
  return data;
}

async function guardarDocumento<T>(ruta: string, almacen: ReturnType<typeof crearAlmacenDocumento<T>>, datos: T) {
  if (apiConfig.useMock) {
    const guardado = almacen.guardar(datos);
    emitirCambio(ruta);
    return guardado;
  }
  const { data } = await api.put<T>(ruta, datos);
  return data;
}

export const organizacionService = {
  usuarios,
  incorporarPersona,
  activarIncorporacion,
  registrarSolicitudDesdeComunidad,
  matriculas,
  certificados: {
    listar: async () => {
      if (apiConfig.secundariaCursos) {
        const { docenteService } = await import("@/api/services/docente.service");
        return docenteService.certificados.listar();
      }
      return certificados.listar();
    },
    obtener: (id: Identificador) => certificados.obtener(id),
    crear: certificados.crear.bind(certificados),
    actualizar: certificados.actualizar.bind(certificados),
    eliminar: certificados.eliminar.bind(certificados),
  },
  certificadosPendientes: {
    listar: async () => {
      if (apiConfig.secundariaCursos) {
        const { docenteService } = await import("@/api/services/docente.service");
        return docenteService.certificadosPendientes.listar();
      }
      return certificadosPendientes.listar();
    },
    obtener: (id: Identificador) => certificadosPendientes.obtener(id),
    crear: certificadosPendientes.crear.bind(certificadosPendientes),
    actualizar: certificadosPendientes.actualizar.bind(certificadosPendientes),
    eliminar: certificadosPendientes.eliminar.bind(certificadosPendientes),
  },
  emitirCertificado: emitirCertificadoInstitucional,
  listarPendientesFirma: async () => {
    if (!apiConfig.secundariaCursos) return [];
    const { docenteService } = await import("@/api/services/docente.service");
    return docenteService.listarPendientesFirma();
  },
  firmarCertificado: async (certificadoId: string, firmaId?: string) => {
    const { docenteService } = await import("@/api/services/docente.service");
    return docenteService.firmarCertificado(certificadoId, firmaId);
  },
  revocarCertificado: async (certificadoId: string, motivo?: string) => {
    const { docenteService } = await import("@/api/services/docente.service");
    return docenteService.revocarCertificado(certificadoId, motivo);
  },
  matricularUsuarioEnCurso,
  solicitarMatriculaCurso,
  aprobarSolicitudMatricula,
  areas,
  estructura: {
    estructuras,
    niveles,
    tiposUnidad,
    unidades,
    vinculaciones,
    politicasIncorporacion,
    obtenerSnapshot: obtenerSnapshotEstructura,
    prefetch: prefetchPortalOrganizacion,
    perfiles,
    asignacionesPerfil,
    usuariosDeUnidad,
    idsDescendientes,
    eliminarUnidadConDependencias,
    aprobarVinculacion,
    vincularPersonaANodo,
    normalizarJerarquia: normalizarJerarquiaOrganizacional,
    reglasAccesoCursos,
    evaluarAccesoCurso,
  },
  sedes,
  asignaciones,
  rutas,
  comprobantes,
  notificaciones,
  catalogoCursos: {
    listar: () => catalogoCursos.listar(),
    obtener: (id: Identificador) => catalogoCursos.obtener(id),
    registrarParaRevision: registrarCursoParaRevision,
    marcarContenidoRevisado,
    aprobar: aprobarCursoPropuesto,
    observar: observarCursoPropuesto,
    publicar: publicarCursoPropuesto,
  },
  sesionesEnVivo: {
    listar: () =>
      sesionesEnVivoCompartidas.listarParaContexto(contextoActual()),
    obtener: async (id: Identificador) => {
      const lista = await sesionesEnVivoCompartidas.listarParaContexto(
        contextoActual(),
      );
      return lista.find((item) => item.id === id) ?? null;
    },
    programar: programarSesionEnVivo,
    iniciar: iniciarSesionEnVivo,
    cancelar: cancelarSesionEnVivo,
    reenviarInvitaciones: reenviarInvitacionesSesion,
  },
  obtenerConfiguracion: async () => {
    if (usarOrgPrincipal() && presenciaBdDisponible()) {
      const instalacionId = contextoActual().organizacionId;
      if (!instalacionId) {
        throw new Error("No hay organización activa en el contexto de sesión");
      }
      try {
        const presencia =
          await organizacionPrincipalService.obtenerPresencia(instalacionId);
        const config = presenciaAConfiguracion(presencia);
        almacenConfiguracion().guardar(config);
        return config;
      } catch (error) {
        if (!esErrorRpcPresenciaAusente(error)) throw error;
      }
    }
    return leerDocumento(API.organizacion.configuracion, almacenConfiguracion());
  },
  guardarConfiguracion: async (datos: ConfiguracionOrganizacion) => {
    if (usarOrgPrincipal() && presenciaBdDisponible()) {
      const instalacionId = contextoActual().organizacionId;
      if (!instalacionId) {
        throw new Error("No hay organización activa en el contexto de sesión");
      }
      try {
        const presencia = await organizacionPrincipalService.guardarPresencia(
          instalacionId,
          {
            nombre: datos.nombre,
            logo: datos.logo ?? "",
            ruc: datos.ruc,
            dominio: datos.dominio,
            zonaHoraria: datos.zonaHoraria,
            restringirDominio: datos.restringirDominio,
            requiereDniEnrolamiento: datos.requiereDniEnrolamiento,
          },
        );
        const config = presenciaAConfiguracion(presencia);
        almacenConfiguracion().guardar(config);
        emitirCambio(API.organizacion.configuracion);
        return config;
      } catch (error) {
        if (!esErrorRpcPresenciaAusente(error)) throw error;
      }
    }
    return guardarDocumento(
      API.organizacion.configuracion,
      almacenConfiguracion(),
      datos,
    );
  },
  obtenerIntegraciones: () =>
    leerDocumento(API.organizacion.integraciones, almacenIntegraciones()),
  guardarIntegraciones: (datos: IntegracionOrganizacion[]) =>
    guardarDocumento(API.organizacion.integraciones, almacenIntegraciones(), datos),
  obtenerLicencia: async () => {
    if (usarOrgPrincipal()) {
      const instalacionId = contextoActual().organizacionId;
      if (!instalacionId) {
        throw new Error("No hay organización activa en el contexto de sesión");
      }
      return organizacionPrincipalService.obtenerLicencia(instalacionId);
    }
    return leerDocumento(API.organizacion.licencia, almacenLicencia());
  },
  catalogoPerfilesOrg: async () => {
    if (!usarOrgPrincipal()) return [];
    const instalacionId = contextoActual().organizacionId;
    if (!instalacionId) return [];
    return organizacionPrincipalService.catalogoPerfiles(instalacionId);
  },
  asignarAccesoOrg: async (correo: string, perfilCodigo: string) => {
    if (!usarOrgPrincipal()) {
      throw new Error("Asignación real solo disponible con Supabase Auth");
    }
    const instalacionId = contextoActual().organizacionId;
    if (!instalacionId) {
      throw new Error("No hay organización activa en el contexto de sesión");
    }
    return organizacionPrincipalService.asignarAcceso(
      instalacionId,
      correo,
      perfilCodigo,
    );
  },
  guardarLicencia: async (datos: LicenciaOrganizacion) => {
    if (usarOrgPrincipal()) {
      throw new Error(
        "La ampliación o renovación de licencia la gestiona administración Tukuy.",
      );
    }
    return guardarDocumento(
      API.organizacion.licencia,
      almacenLicencia(),
      datos,
    );
  },
  obtenerFacturacion: async () => {
    if (usarOrgPrincipal()) {
      const instalacionId = contextoActual().organizacionId;
      if (!instalacionId) {
        throw new Error("No hay organización activa en el contexto de sesión");
      }
      try {
        return await organizacionPrincipalService.obtenerFacturacion(
          instalacionId,
        );
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : String(error);
        if (
          /org_obtener_facturacion|Could not find the function|PGRST202/i.test(
            mensaje,
          )
        ) {
          return almacenFacturacion().leer();
        }
        throw error;
      }
    }
    return leerDocumento(API.organizacion.facturacion, almacenFacturacion());
  },
  guardarFacturacion: async (datos: FacturacionOrganizacion) => {
    if (usarOrgPrincipal()) {
      throw new Error(
        "Los cambios de plan y medio de pago los gestiona administración Tukuy.",
      );
    }
    return guardarDocumento(
      API.organizacion.facturacion,
      almacenFacturacion(),
      datos,
    );
  },
};
