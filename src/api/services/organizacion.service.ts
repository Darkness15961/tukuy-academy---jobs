import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import {
  crearAlmacenDocumento,
  crearRepositorioLocal,
} from "@/api/repositorio-local";
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
import type { ContextoSesion } from "@/types/membresia.types";
import type {
  CertificadoEmitidoDocente,
  CertificadoPendienteDocente,
  EstadoCursoDocente,
} from "@/portal-docente/types/docente.types";

type Identificador = string | number;
type RegistroIdentificable = { id: Identificador };

export interface UsuarioOrganizacion {
  id: number;
  nombre: string;
  iniciales: string;
  correo: string;
  area: string;
  sede: string;
  rol: string;
  progreso: number;
  estado: "ACTIVO" | "INVITADO" | "SUSPENDIDO";
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
  estado: "ACTIVO" | "COMPLETADO" | "EN_RIESGO";
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
  curso: string;
  destino: string;
  asignados: number;
  completados: number;
  vence: string;
  obligatorio: boolean;
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
  estado?: "BORRADOR" | "PUBLICADA" | "ARCHIVADA";
}

export interface ConfiguracionOrganizacion {
  nombre: string;
  ruc: string;
  dominio: string;
  zonaHoraria: string;
  restringirDominio: boolean;
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
}

export function etiquetaAlcanceCorto(
  alcance: AlcanceCursoOrganizacion | undefined,
): string {
  if (alcance === "AREA") return "Solo un área";
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
  return area ? `Área ${area}` : "Un área";
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
  return `tukuy_demo_organizacion_${contextoActual().membresiaId}_${recurso}`;
}

function emitirCambio(recurso: string) {
  window.dispatchEvent(
    new CustomEvent("tukuy:organizacion-datos", { detail: { recurso } }),
  );
}

function crearRepositorioOrganizacion<T extends RegistroIdentificable>(
  recurso: string,
  ruta: string,
  semilla: readonly T[],
) {
  function actual() {
    return crearRepositorioLocal<T>({
      clave: claveContextual(recurso),
      ruta,
      semilla,
      version: 10,
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
  async listar() {
    const registros = await usuariosRepositorio.listar();
    if (!apiConfig.useMock) return registros;
    const actualizados = registros.map((usuario) => ({
      ...usuario,
      correo: usuario.correo.replace(
        "@andinaconstructora.pe",
        "@cipcusco.org.pe",
      ),
    }));
    if (
      actualizados.some(
        (usuario, indice) => usuario.correo !== registros[indice]?.correo,
      )
    ) {
      await usuariosRepositorio.reemplazar(actualizados);
    }
    return actualizados;
  },
};

const areas = crearRepositorioOrganizacion<AreaOrganizacion>(
  "areas",
  API.organizacion.areas,
  areasOrganizacion,
);

const matriculas =
  crearRepositorioOrganizacion<MatriculaAlumnoOrganizacion>(
    "matriculas-alumnos",
    API.organizacion.alumnos,
    matriculasOrganizacion.map((matricula) => ({
      ...matricula,
      estado: matricula.estado as MatriculaAlumnoOrganizacion["estado"],
    })),
  );

const certificados =
  crearRepositorioOrganizacion<CertificadoEmitidoDocente>(
    "certificados",
    API.organizacion.certificados,
    certificadosOrganizacion,
  );

const certificadosPendientes =
  crearRepositorioOrganizacion<CertificadoPendienteDocente>(
    "certificados-pendientes",
    API.organizacion.certificadosPendientes,
    certificadosPendientesOrganizacion,
  );

async function emitirCertificadoInstitucional(id: string) {
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

const sedes = crearRepositorioOrganizacion<SedeOrganizacion>(
  "sedes",
  API.organizacion.sedes,
  [
    { id: "sede-lima", nombre: "Sede Lima", ciudad: "Lima", usuarios: 263, areas: 3 },
    { id: "sede-cusco", nombre: "Sede Cusco", ciudad: "Cusco", usuarios: 118, areas: 2 },
  ],
);

const asignaciones = crearRepositorioOrganizacion<AsignacionOrganizacion>(
  "asignaciones",
  API.organizacion.asignaciones,
  asignacionesOrganizacion.map((asignacion) => ({
    ...asignacion,
    estado: "ACTIVA",
    creadaEn: "2026-07-01",
  })),
);

const rutas = crearRepositorioOrganizacion<RutaOrganizacion>(
  "rutas",
  API.organizacion.rutas,
  rutasOrganizacion.map((ruta) => ({ ...ruta, estado: "PUBLICADA" })),
);

const comprobantes = crearRepositorioOrganizacion<ComprobanteOrganizacion>(
  "comprobantes",
  API.organizacion.comprobantes,
  [
    { id: "comp-1842", numero: "F001-0001842", fecha: "2026-07-01", concepto: "Suscripción Empresa Pro", importe: 2490, moneda: "PEN", estado: "PAGADO" },
    { id: "comp-1721", numero: "F001-0001721", fecha: "2026-06-01", concepto: "Suscripción Empresa Pro", importe: 2490, moneda: "PEN", estado: "PAGADO" },
    { id: "comp-1605", numero: "F001-0001605", fecha: "2026-05-01", concepto: "Suscripción Empresa Pro", importe: 2490, moneda: "PEN", estado: "PAGADO" },
  ],
);

const notificaciones = crearRepositorioOrganizacion<NotificacionOrganizacion>(
  "notificaciones",
  API.organizacion.notificaciones,
  [
    { id: "org-not-1", titulo: "Asignación próxima a vencer", detalle: "Seguridad y salud tiene participantes pendientes.", fecha: "2026-07-16T09:00:00-05:00", leida: false, ruta: "/organizacion/asignaciones" },
    { id: "org-not-2", titulo: "Consumo de licencias", detalle: "La organización superó el 85% de licencias disponibles.", fecha: "2026-07-15T16:30:00-05:00", leida: false, ruta: "/organizacion/licencia" },
    { id: "org-not-3", titulo: "Cursos por revisar", detalle: "Hay propuestas de docentes esperando tu visto bueno.", fecha: "2026-07-16T08:15:00-05:00", leida: false, ruta: "/organizacion/cursos" },
  ],
);

const catalogoCursos = crearRepositorioOrganizacion<PropuestaCursoOrganizacion>(
  "catalogo-cursos",
  API.organizacion.catalogoCursos,
  catalogoCursosOrganizacion,
);

async function sincronizarEstadoDocente(
  cursoDocenteId: string,
  estado: EstadoCursoDocente,
) {
  if (!apiConfig.useMock) return;
  try {
    const { docenteService } = await import("@/api/services/docente.service");
    await docenteService.actualizarEstadoCurso(cursoDocenteId, estado);
  } catch {
    // El portal docente puede no tener ese curso en el contexto activo.
  }
}

async function aprobarCursoPropuesto(
  id: string,
  configuracion?: AprobacionCursoOrganizacion,
) {
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

  const actualizado = await catalogoCursos.actualizar(id, {
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
  });
  await sincronizarEstadoDocente(
    actualizado.cursoDocenteId,
    publicar ? "PUBLICADO" : "APROBADO",
  );
  return actualizado;
}

async function observarCursoPropuesto(id: string, observacion: string) {
  if (!apiConfig.useMock) {
    const { data } = await api.post<PropuestaCursoOrganizacion>(
      API.organizacion.observarCurso(id),
      { observacion },
    );
    return data;
  }
  const actualizado = await catalogoCursos.actualizar(id, {
    estado: "OBSERVADO",
    observacion,
  });
  await sincronizarEstadoDocente(actualizado.cursoDocenteId, "BORRADOR");
  return actualizado;
}

async function publicarCursoPropuesto(
  id: string,
  configuracion?: Partial<AprobacionCursoOrganizacion>,
) {
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
  return crearAlmacenDocumento<ConfiguracionOrganizacion>(
    claveContextual("configuracion"),
    {
      nombre: contexto.organizacionNombre || "COLEGIO DE INGENIEROS CUSCO",
      ruc: "20601234567",
      dominio: "cipcusco.org.pe",
      zonaHoraria: "America/Lima",
      restringirDominio: true,
    },
    3,
  );
}

function almacenIntegraciones() {
  return crearAlmacenDocumento<IntegracionOrganizacion[]>(
    claveContextual("integraciones"),
    [
      { id: "tukuy-obra", nombre: "Tukuy Obra", descripcion: "Sincronización de proyectos, equipos y especialidades.", activa: true, endpoint: "https://api.tukuyobra.com/v1" },
      { id: "siadeg", nombre: "SIADEG", descripcion: "Intercambio de personal y estructura organizacional.", activa: false, endpoint: "" },
      { id: "api", nombre: "API empresarial", descripcion: "Integración personalizada con sistemas internos.", activa: false, endpoint: "" },
    ],
    2,
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
  return crearAlmacenDocumento<FacturacionOrganizacion>(
    claveContextual("facturacion"),
    {
      plan: "Empresa Pro",
      periodicidad: "MENSUAL",
      proximoCobro: "2026-08-01",
      importe: 2490,
      moneda: "PEN",
      tarjetaMarca: "Visa",
      tarjetaUltimos4: "4821",
      tarjetaVencimiento: "08/2028",
    },
    2,
  );
}

async function leerDocumento<T>(ruta: string, almacen: ReturnType<typeof crearAlmacenDocumento<T>>) {
  if (apiConfig.useMock) return almacen.leer();
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
  matriculas,
  certificados,
  certificadosPendientes,
  emitirCertificado: emitirCertificadoInstitucional,
  areas,
  sedes,
  asignaciones,
  rutas,
  comprobantes,
  notificaciones,
  catalogoCursos: {
    listar: () => catalogoCursos.listar(),
    obtener: (id: Identificador) => catalogoCursos.obtener(id),
    aprobar: aprobarCursoPropuesto,
    observar: observarCursoPropuesto,
    publicar: publicarCursoPropuesto,
  },
  obtenerConfiguracion: () =>
    leerDocumento(API.organizacion.configuracion, almacenConfiguracion()),
  guardarConfiguracion: (datos: ConfiguracionOrganizacion) =>
    guardarDocumento(API.organizacion.configuracion, almacenConfiguracion(), datos),
  obtenerIntegraciones: () =>
    leerDocumento(API.organizacion.integraciones, almacenIntegraciones()),
  guardarIntegraciones: (datos: IntegracionOrganizacion[]) =>
    guardarDocumento(API.organizacion.integraciones, almacenIntegraciones(), datos),
  obtenerLicencia: () =>
    leerDocumento(API.organizacion.licencia, almacenLicencia()),
  guardarLicencia: (datos: LicenciaOrganizacion) =>
    guardarDocumento(API.organizacion.licencia, almacenLicencia(), datos),
  obtenerFacturacion: () =>
    leerDocumento(API.organizacion.facturacion, almacenFacturacion()),
  guardarFacturacion: (datos: FacturacionOrganizacion) =>
    guardarDocumento(API.organizacion.facturacion, almacenFacturacion(), datos),
};
