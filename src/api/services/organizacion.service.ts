import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import {
  asignacionesPerfilUsuario,
  perfilesEntidad,
  politicasIncorporacionEntidad,
  reglasAccesoCursoEntidad,
  tiposUnidadEntidad,
  unidadesOrganizacionales,
  vinculacionesUnidad,
} from "@/portal-organizacion/data/estructura-organizacional.mock";
import type {
  AsignacionPerfilUsuario,
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
  especialidad?: string;
  colegiaturaActiva?: boolean;
  unidadPrincipalId?: string | null;
  sedeId?: string;
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
  logo?: string;
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
  const contexto = contextoActual();
  const ambito = contexto.organizacionId ?? contexto.membresiaId;
  return `tukuy_demo_organizacion_${ambito}_${recurso}`;
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
      version: 13,
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

const tiposUnidad = crearRepositorioOrganizacion<TipoUnidadEntidad>(
  "tipos-unidad",
  API.organizacion.tiposUnidad,
  tiposUnidadEntidad,
);

const unidades = crearRepositorioOrganizacion<UnidadOrganizacional>(
  "unidades-organizacionales",
  API.organizacion.unidades,
  unidadesOrganizacionales,
);

const vinculaciones = crearRepositorioOrganizacion<VinculacionUnidad>(
  "vinculaciones-unidad",
  API.organizacion.vinculaciones,
  vinculacionesUnidad,
);

const politicasIncorporacion =
  crearRepositorioOrganizacion<PoliticaIncorporacionUnidad>(
    "politicas-incorporacion",
    API.organizacion.politicasIncorporacion,
    politicasIncorporacionEntidad,
  );

const perfiles = crearRepositorioOrganizacion<PerfilEntidad>(
  "perfiles-entidad",
  API.organizacion.perfilesEntidad,
  perfilesEntidad,
);

const asignacionesPerfil =
  crearRepositorioOrganizacion<AsignacionPerfilUsuario>(
    "asignaciones-perfil",
    API.organizacion.asignacionesPerfil,
    asignacionesPerfilUsuario,
  );

/**
 * Migra datos demostrativos creados con la jerarquía anterior. Mantiene las
 * unidades personalizadas, pero garantiza una única cadena de gobierno:
 * Entidad > Dirección > Administración > unidades operativas.
 */
async function normalizarJerarquiaOrganizacional() {
  if (!apiConfig.useMock) return;

  const idAnterior = "unidad-direccion-academica";
  const idDireccion = "unidad-direccion-gobierno";
  const idAdministracion = "unidad-administracion";
  const idCertificacion = "unidad-comision-certificacion";
  const [actuales, relacionesActuales, perfilesActuales, personasActuales] =
    await Promise.all([
      unidades.listar(),
      vinculaciones.listar(),
      asignacionesPerfil.listar(),
      usuarios.listar(),
    ]);

  const direccionBase = unidadesOrganizacionales.find(
    (item) => item.id === idDireccion,
  );
  const administracionBase = unidadesOrganizacionales.find(
    (item) => item.id === idAdministracion,
  );
  if (!direccionBase || !administracionBase) return;

  const mapa = new Map(
    actuales
      .filter((item) => item.id !== idAnterior)
      .map((item) => [item.id, { ...item }]),
  );
  mapa.set(idDireccion, {
    ...direccionBase,
    ...mapa.get(idDireccion),
    nombre: "Dirección",
    unidadPadreId: null,
    orden: 1,
    estado: "ACTIVA",
  });
  mapa.set(idAdministracion, {
    ...administracionBase,
    ...mapa.get(idAdministracion),
    nombre: "Administración",
    unidadPadreId: idDireccion,
    orden: 1,
    estado: "ACTIVA",
  });
  const comisionCertificacion = mapa.get(idCertificacion);
  if (
    comisionCertificacion &&
    comisionCertificacion.permiteSubunidades === undefined
  ) {
    comisionCertificacion.permiteSubunidades = true;
  }

  const ordenPreferido = new Map([
    ["unidad-capitulo-civil", 1],
    ["unidad-capitulo-industrial", 2],
    ["unidad-capitulo-sistemas", 3],
    [idCertificacion, 4],
  ]);
  mapa.forEach((unidad, id) => {
    if (id === idDireccion || id === idAdministracion) return;
    const padreExiste = unidad.unidadPadreId && mapa.has(unidad.unidadPadreId);
    if (
      !padreExiste ||
      unidad.unidadPadreId === idAnterior ||
      ordenPreferido.has(id)
    ) {
      unidad.unidadPadreId = idAdministracion;
    }
    unidad.orden = ordenPreferido.get(id) ?? unidad.orden;
  });

  const unidadesNormalizadas = [...mapa.values()];
  if (JSON.stringify(actuales) !== JSON.stringify(unidadesNormalizadas)) {
    await unidades.reemplazar(unidadesNormalizadas);
  }

  const destinoPorUsuario: Record<string, string> = {
    "3": idDireccion,
    "5": idCertificacion,
    "9": idAdministracion,
    "13": idAdministracion,
  };
  const relacionesMigradas = relacionesActuales
    .map((relacion) =>
      relacion.unidadId === idAnterior
        ? {
            ...relacion,
            unidadId: destinoPorUsuario[relacion.usuarioId] ?? idAdministracion,
          }
        : relacion,
    )
    .filter(
      (relacion, indice, lista) =>
        lista.findIndex(
          (item) =>
            item.usuarioId === relacion.usuarioId &&
            item.unidadId === relacion.unidadId,
        ) === indice,
    );
  if (JSON.stringify(relacionesActuales) !== JSON.stringify(relacionesMigradas)) {
    await vinculaciones.reemplazar(relacionesMigradas);
  }

  const perfilesMigrados = perfilesActuales.map((asignacion) => ({
    ...asignacion,
    unidadIds: asignacion.unidadIds.map((unidadId) =>
      unidadId === idAnterior
        ? asignacion.perfilId === "perfil-direccion"
          ? idDireccion
          : asignacion.perfilId === "perfil-director-academico"
            ? idCertificacion
            : idAdministracion
        : unidadId,
    ),
  }));
  if (JSON.stringify(perfilesActuales) !== JSON.stringify(perfilesMigrados)) {
    await asignacionesPerfil.reemplazar(perfilesMigrados);
  }

  const personasMigradas = personasActuales.map((persona) => {
    if (persona.unidadPrincipalId !== idAnterior) return persona;
    const unidadPrincipalId = destinoPorUsuario[String(persona.id)] ?? idAdministracion;
    const area =
      unidadPrincipalId === idDireccion
        ? "Dirección"
        : unidadPrincipalId === idCertificacion
          ? "Comisión de Certificación"
          : "Administración";
    return { ...persona, unidadPrincipalId, area };
  });
  if (JSON.stringify(personasActuales) !== JSON.stringify(personasMigradas)) {
    await usuarios.reemplazar(personasMigradas);
  }
}

const reglasAccesoCursos =
  crearRepositorioOrganizacion<ReglaAccesoCursoEntidad>(
    "reglas-acceso-cursos",
    API.organizacion.reglasAccesoCursos,
    reglasAccesoCursoEntidad,
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
  if (["unidad-direccion-gobierno", "unidad-administracion"].includes(unidadId)) {
    throw new Error("Los niveles de Dirección y Administración están protegidos.");
  }

  const listaUnidades = await unidades.listar();
  const hijosDirectos = listaUnidades.filter(
    (unidad) => unidad.unidadPadreId === unidadId,
  );
  if (hijosDirectos.length) {
    throw new Error(
      `No se puede eliminar esta unidad porque contiene ${hijosDirectos.length} ${
        hijosDirectos.length === 1 ? "subnivel" : "subniveles"
      }. Elimina primero las unidades del último nivel.`,
    );
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
        area: "Sin unidad asignada",
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

async function evaluarAccesoCurso(
  usuarioId: string,
  cursoId: string,
): Promise<EvaluacionAccesoCursoEntidad> {
  const [persona, reglas, relaciones, asignaciones, inscripciones] =
    await Promise.all([
      usuarios.obtener(Number(usuarioId)),
      reglasAccesoCursos.listar(),
      vinculaciones.listar(),
      asignacionesPerfil.listar(),
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
    coincide = asignaciones.some(
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
        "El curso está dirigido a otra unidad, especialidad o perfil institucional.",
      reglaId: regla.id,
    };
  }

  const requiereAprobacion = regla.modalidad === "CON_APROBACION";
  const accesoDirecto = regla.modalidad === "LIBRE";
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

async function matricularUsuarioEnCurso(datos: {
  usuarioId: string;
  cursoId: string;
  curso: string;
  unidadOrigenId?: string;
  modalidad: NonNullable<MatriculaAlumnoOrganizacion["modalidad"]>;
  estadoInicial?: MatriculaAlumnoOrganizacion["estado"];
}) {
  const [persona, existentes] = await Promise.all([
    usuarios.obtener(Number(datos.usuarioId)),
    matriculas.listar(),
  ]);
  if (!persona) throw new Error("No se encontró la persona a matricular.");
  const alumnoId = `alu-${String(persona.id).padStart(3, "0")}`;
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
  return matriculas.actualizar(id, {
    estado: "ACTIVO",
    fechaInscripcion: new Date().toISOString().slice(0, 10),
  });
}

const matriculas =
  crearRepositorioOrganizacion<MatriculaAlumnoOrganizacion>(
    "matriculas-alumnos",
    API.organizacion.alumnos,
    matriculasOrganizacion.map((matricula) => ({
      ...matricula,
      estado: matricula.estado as MatriculaAlumnoOrganizacion["estado"],
      unidadOrigenId:
        usuariosOrganizacion.find(
          (usuario) =>
            `alu-${String(usuario.id).padStart(3, "0")}` === matricula.alumnoId,
        )?.unidadPrincipalId ?? undefined,
      modalidad: "ASIGNADA",
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
  const existentes = await catalogoCursos.listar();
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
    ? catalogoCursos.actualizar(existente.id, propuesta)
    : catalogoCursos.crear(propuesta);
}

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
      logo: "/img/LogoColegioING.png",
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
  matricularUsuarioEnCurso,
  solicitarMatriculaCurso,
  aprobarSolicitudMatricula,
  areas,
  estructura: {
    tiposUnidad,
    unidades,
    vinculaciones,
    politicasIncorporacion,
    perfiles,
    asignacionesPerfil,
    usuariosDeUnidad,
    idsDescendientes,
    eliminarUnidadConDependencias,
    aprobarVinculacion,
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
