import { useContextoSesion } from "@/composables/useContextoSesion";
import { AUTH_TOKEN_KEY, INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import { mensajeUsuarioDeError } from "@/lib/mensaje-error";
import { supabasePrincipal } from "@/lib/supabase";
import type {
  BootstrapAlumnoSecundaria,
  BootstrapDocenteSecundaria,
  CursoSecundaria,
  InventarioSecundaria,
  ListadoCursosSecundaria,
  ResultadoBorradorCursoSecundaria,
  ResultadoCalificarQuizSecundaria,
  ResultadoCompletarActividadSecundaria,
  ResultadoContenidoAprendizajeSecundaria,
  ResultadoCrearSesionSecundaria,
  ResultadoGuardarCursoSecundaria,
  ResultadoListarEntregasSecundaria,
  ResultadoListarEstudiantesSecundaria,
  ResultadoListarAlumnosResumenSecundaria,
  ResultadoListarSesionesSecundaria,
  ResultadoMisCursosSecundaria,
  ResultadoPublicarCurso,
  SesionEnVivoSecundaria,
} from "@/lib/contrato-secundaria";
import type { BorradorCursoDocente } from "@/portal-docente/types/docente.types";

/** Datos frescos: se sirven sin red. */
const CACHE_FRESH_MS = 45_000;
/** Tras fresh, se siguen sirviendo (SWR) hasta este tope mientras revalidan en fondo. */
const CACHE_STALE_MS = 5 * 60_000;

type FragmentoClave =
  | "cursos"
  | "misCursos"
  | "entregas"
  | "sesiones"
  | "estudiantes";

type FragmentosCache = {
  at: number;
  cursos?: ListadoCursosSecundaria;
  misCursos?: ResultadoMisCursosSecundaria;
  entregas?: ResultadoListarEntregasSecundaria;
  sesiones?: ResultadoListarSesionesSecundaria;
  estudiantes?: ResultadoListarEstudiantesSecundaria;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Estado por instalación (tenant) para no mezclar datos entre organizaciones.
const cachePorInstalacion = new Map<string, FragmentosCache>();
const inflightDocentePorInstalacion = new Map<
  string,
  Promise<BootstrapDocenteSecundaria>
>();
const inflightAlumnoPorInstalacion = new Map<
  string,
  Promise<BootstrapAlumnoSecundaria>
>();
const revalidacionPorClave = new Map<string, Promise<unknown>>();

/** Qué fragmentos invalidar por acción (evita vaciar todo el catálogo). */
const FRAGMENTOS_POR_ACCION: Record<string, FragmentoClave[] | "*"> = {
  "guardar-curso": ["cursos"],
  "publicar-curso": ["cursos"],
  "actualizar-estado-curso": ["cursos"],
  "eliminar-curso": ["cursos"],
  "revisar-contenido": ["cursos"],
  "observar-curso": ["cursos"],
  "aprobar-curso": ["cursos"],
  "matricular-curso": ["misCursos", "estudiantes", "cursos"],
  "matricular-estudiante": ["misCursos", "estudiantes", "cursos"],
  "confirmar-pago-orden": ["misCursos", "estudiantes", "cursos"],
  "completar-actividad": ["misCursos", "entregas"],
  "calificar-quiz": ["misCursos", "entregas"],
  "guardar-apuntes": ["misCursos"],
  "guardar-item-activo": [],
  "crear-sesion": ["sesiones"],
  "actualizar-sesion": ["sesiones"],
  "eliminar-sesion": ["sesiones"],
  "actualizar-estado-sesion": ["sesiones"],
  "crear-orden-compra": [],
  "marcar-asistencia-sesion": [],
  "emitir-certificado": [],
  "firmar-certificado": [],
  "calificar-entrega": ["entregas"],
  "enviar-entrega": ["entregas"],
  "solicitar-correccion-entrega": ["entregas"],
  "enviar-mensaje": [],
  "marcar-conversacion-leida": [],
};

export function instalacionSecundariaActiva(): string {
  const { contextoActivo } = useContextoSesion();
  const id = contextoActivo.value?.organizacionId ?? "";
  return UUID_RE.test(id) ? id : INSTALACION_TUKUY_ACADEMY_ID;
}

/** Solo con contexto de estudiante autenticado. Landing/org/docente/admin: no. */
function portalActivoEsAlumno(): boolean {
  const { contextoActivo } = useContextoSesion();
  return contextoActivo.value?.portal === "estudiante";
}

const vacioListadoCursos = (): ListadoCursosSecundaria => ({
  ok: true,
  total: 0,
  cursos: [],
  generadoEn: new Date().toISOString(),
});

const vacioMisCursos = (): ResultadoMisCursosSecundaria => ({
  ok: true,
  total: 0,
  cursos: [],
});

function obtenerCache(): FragmentosCache | null {
  const clave = instalacionSecundariaActiva();
  const cache = cachePorInstalacion.get(clave) ?? null;
  if (!cache) return null;
  if (Date.now() - cache.at > CACHE_STALE_MS) {
    cachePorInstalacion.delete(clave);
    return null;
  }
  return cache;
}

function cacheEsFresco(cache: FragmentosCache | null): boolean {
  return !!cache && Date.now() - cache.at <= CACHE_FRESH_MS;
}

function fusionarCache(parcial: Omit<FragmentosCache, "at">) {
  const clave = instalacionSecundariaActiva();
  const previo = cachePorInstalacion.get(clave);
  const base =
    previo && Date.now() - previo.at <= CACHE_STALE_MS
      ? previo
      : ({ at: 0 } as FragmentosCache);
  cachePorInstalacion.set(clave, {
    ...base,
    ...parcial,
    at: Date.now(),
  });
}

function invalidarFragmentos(...fragmentos: FragmentoClave[]) {
  const clave = instalacionSecundariaActiva();
  const cache = cachePorInstalacion.get(clave);
  if (!cache) return;
  const siguiente: FragmentosCache = { ...cache, at: cache.at };
  for (const fragmento of fragmentos) {
    delete siguiente[fragmento];
  }
  cachePorInstalacion.set(clave, siguiente);
  if (fragmentos.includes("cursos") || fragmentos.includes("misCursos")) {
    inflightAlumnoPorInstalacion.delete(clave);
  }
  if (
    fragmentos.includes("cursos") ||
    fragmentos.includes("entregas") ||
    fragmentos.includes("sesiones") ||
    fragmentos.includes("estudiantes")
  ) {
    inflightDocentePorInstalacion.delete(clave);
  }
}

export function invalidarCacheSecundaria() {
  const clave = instalacionSecundariaActiva();
  cachePorInstalacion.delete(clave);
  inflightDocentePorInstalacion.delete(clave);
  inflightAlumnoPorInstalacion.delete(clave);
  for (const k of [...revalidacionPorClave.keys()]) {
    if (k.startsWith(`${clave}:`)) revalidacionPorClave.delete(k);
  }
  void import("@/lib/storage-academia")
    .then((m) => m.invalidarCacheMedia())
    .catch(() => undefined);
}

function invalidarPorMutacion(action: string) {
  const mapa = FRAGMENTOS_POR_ACCION[action];
  if (mapa === undefined || mapa === "*") {
    invalidarCacheSecundaria();
    return;
  }
  if (mapa.length === 0) return;
  invalidarFragmentos(...mapa);
}

export class ErrorGatewaySecundaria extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(mensajeUsuarioDeError(message));
    this.name = "ErrorGatewaySecundaria";
    this.code = code;
  }
}

async function cuerpoErrorGateway(
  error: { context?: Response; message?: string } | null,
  data: unknown,
): Promise<{ message: string; code?: string }> {
  const desdeData = (candidato: unknown) => {
    if (!candidato || typeof candidato !== "object") return null;
    const cuerpo = candidato as {
      error?: string;
      details?: string;
      code?: string;
    };
    if (!cuerpo.error && !cuerpo.code) return null;
    return {
      message: mensajeUsuarioDeError(
        cuerpo.error || "La secundaria no respondió correctamente.",
      ),
      code: cuerpo.code,
    };
  };

  const directo = desdeData(data);
  if (directo) return directo;

  const ctx = error?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const cuerpo = await ctx.clone().json();
      const parseado = desdeData(cuerpo);
      if (parseado) return parseado;
    } catch {
      /* el body no era JSON */
    }
  }

  return {
    message: mensajeUsuarioDeError(
      error?.message || "La secundaria no respondió correctamente.",
    ),
  };
}

async function invocar<T>(action: string, extra: Record<string, unknown> = {}) {
  const accionesSoloAlumno = new Set([
    "bootstrap-alumno",
    "mis-cursos",
    "contenido-curso",
    "completar-actividad",
    "guardar-apuntes",
    "calificar-quiz",
  ]);
  if (
    accionesSoloAlumno.has(action) &&
    (!portalActivoEsAlumno() || !localStorage.getItem(AUTH_TOKEN_KEY))
  ) {
    throw new ErrorGatewaySecundaria(
      "Acción de alumno no disponible sin sesión de estudiante",
      "PORTAL_NO_ALUMNO",
    );
  }

  const { data, error } = await supabasePrincipal().functions.invoke(
    "secondary-gateway",
    {
      body: {
        action,
        instalacionId: instalacionSecundariaActiva(),
        ...extra,
      },
    },
  );
  if (error || !data?.ok) {
    const cuerpo = await cuerpoErrorGateway(error, data);
    throw new ErrorGatewaySecundaria(cuerpo.message, cuerpo.code);
  }
  return data as T;
}

async function invocarMutacion<T>(
  action: string,
  extra: Record<string, unknown> = {},
) {
  try {
    return await invocar<T>(action, extra);
  } finally {
    invalidarPorMutacion(action);
  }
}

function claveRevalidacion(fragmento: string): string {
  return `${instalacionSecundariaActiva()}:${fragmento}`;
}

/** Sirve cache (fresco o stale) y revalida en segundo plano si ya no es fresco. */
async function conCacheSWR<T>(opciones: {
  fragmento: FragmentoClave;
  leer: () => T | undefined;
  cargar: () => Promise<T>;
  guardar: (data: T) => void;
  forzar?: boolean;
}): Promise<T> {
  const existente = opciones.forzar ? undefined : opciones.leer();
  const cache = obtenerCache();
  const fresco = cacheEsFresco(cache);
  const clave = claveRevalidacion(opciones.fragmento);

  if (existente !== undefined) {
    if (!fresco) {
      if (!revalidacionPorClave.has(clave)) {
        const promesa = opciones
          .cargar()
          .then((data) => {
            opciones.guardar(data);
            return data;
          })
          .finally(() => {
            revalidacionPorClave.delete(clave);
          });
        revalidacionPorClave.set(clave, promesa);
      }
    }
    return existente;
  }

  const enCurso = revalidacionPorClave.get(clave) as Promise<T> | undefined;
  if (enCurso) return enCurso;

  const promesa = opciones
    .cargar()
    .then((data) => {
      opciones.guardar(data);
      return data;
    })
    .finally(() => {
      revalidacionPorClave.delete(clave);
    });
  revalidacionPorClave.set(clave, promesa);
  return promesa;
}

export const secundariaGatewayService = {
  invalidarCache: invalidarCacheSecundaria,

  async inventariar() {
    const data = await invocar<{ ok: true; inventario: InventarioSecundaria }>(
      "inventory",
    );
    return data.inventario;
  },

  async bootstrapDocente(forzar = false): Promise<BootstrapDocenteSecundaria> {
    const instalacion = instalacionSecundariaActiva();
    const dispararRed = () => {
      const existente = inflightDocentePorInstalacion.get(instalacion);
      if (existente) return existente;
      const promesa = invocar<BootstrapDocenteSecundaria>("bootstrap-docente")
        .then((data) => {
          fusionarCache({
            cursos: data.cursos,
            entregas: data.entregas,
            sesiones: data.sesiones,
            estudiantes: data.estudiantes,
          });
          return data;
        })
        .finally(() => {
          inflightDocentePorInstalacion.delete(instalacion);
        });
      inflightDocentePorInstalacion.set(instalacion, promesa);
      return promesa;
    };

    if (!forzar) {
      const cache = obtenerCache();
      if (
        cache?.cursos &&
        cache.entregas &&
        cache.sesiones &&
        cache.estudiantes
      ) {
        if (!cacheEsFresco(cache)) void dispararRed();
        return {
          ok: true,
          cursos: cache.cursos,
          entregas: cache.entregas,
          sesiones: cache.sesiones,
          estudiantes: cache.estudiantes,
        };
      }
      const enCurso = inflightDocentePorInstalacion.get(instalacion);
      if (enCurso) return enCurso;
    }

    return dispararRed();
  },

  async bootstrapAlumno(forzar = false): Promise<BootstrapAlumnoSecundaria> {
    if (!portalActivoEsAlumno()) {
      return {
        ok: true,
        cursos: vacioListadoCursos(),
        misCursos: vacioMisCursos(),
      };
    }
    const instalacion = instalacionSecundariaActiva();
    const dispararRed = () => {
      const existente = inflightAlumnoPorInstalacion.get(instalacion);
      if (existente) return existente;
      const promesa = invocar<BootstrapAlumnoSecundaria>("bootstrap-alumno")
        .then((data) => {
          // No cachear respuestas con advertencias (RPC fallida → vacío engañoso).
          const advertencias = (
            data as { advertencias?: string[] }
          ).advertencias;
          if (!advertencias?.length) {
            fusionarCache({
              cursos: data.cursos,
              misCursos: data.misCursos,
            });
          }
          return data;
        })
        .finally(() => {
          inflightAlumnoPorInstalacion.delete(instalacion);
        });
      inflightAlumnoPorInstalacion.set(instalacion, promesa);
      return promesa;
    };

    if (!forzar) {
      const cache = obtenerCache();
      if (cache?.cursos && cache.misCursos) {
        if (!cacheEsFresco(cache)) void dispararRed();
        return {
          ok: true,
          cursos: cache.cursos,
          misCursos: cache.misCursos,
        };
      }
      const enCurso = inflightAlumnoPorInstalacion.get(instalacion);
      if (enCurso) return enCurso;
    }

    return dispararRed();
  },

  /** Prefetch en segundo plano (layouts); no bloquea la UI. */
  prefetchAlumno(): void {
    if (!portalActivoEsAlumno()) return;
    void this.bootstrapAlumno().catch(() => undefined);
  },

  prefetchDocente(): void {
    void this.bootstrapDocente().catch(() => undefined);
  },

  /** Org: no prefetchear APIs de alumno/catálogo; cada vista carga lo suyo. */
  prefetchOrganizacion(): void {
    // Intencionalmente vacío: list-cursos / bootstrap-alumno / mis-cursos
    // no aplican al perfil Dirección/Administración.
  },

  async listarCursos(limite = 100): Promise<ListadoCursosSecundaria> {
    if (limite > 100) {
      const data = await invocar<{
        ok: true;
        cursos: ListadoCursosSecundaria;
      }>("list-cursos", { limite });
      return data.cursos;
    }

    return conCacheSWR({
      fragmento: "cursos",
      leer: () => obtenerCache()?.cursos,
      cargar: async () => {
        const data = await invocar<{
          ok: true;
          cursos: ListadoCursosSecundaria;
        }>("list-cursos", { limite });
        return data.cursos;
      },
      guardar: (cursos) => fusionarCache({ cursos }),
    });
  },

  async obtenerCurso(cursoId: string): Promise<CursoSecundaria> {
    const data = await invocar<{
      ok: true;
      curso: CursoSecundaria;
    }>("get-curso", { cursoId });
    return data.curso;
  },

  async obtenerBorrador(
    cursoId: string,
  ): Promise<ResultadoBorradorCursoSecundaria> {
    return invocar<ResultadoBorradorCursoSecundaria>("get-borrador", {
      cursoId,
    });
  },

  async guardarCurso(entrada: {
    cursoId?: string | null;
    borrador: BorradorCursoDocente;
    estado?: string | null;
  }): Promise<ResultadoGuardarCursoSecundaria> {
    return invocarMutacion<ResultadoGuardarCursoSecundaria>("guardar-curso", {
      cursoId: entrada.cursoId ?? null,
      borrador: entrada.borrador,
      estado: entrada.estado ?? null,
    });
  },

  async publicarCurso(entrada: {
    cursoId: string;
    estadoPublicacion?: string;
  }): Promise<ResultadoPublicarCurso> {
    return invocarMutacion<ResultadoPublicarCurso>("publicar-curso", {
      cursoId: entrada.cursoId,
      estadoPublicacion: entrada.estadoPublicacion ?? "PUBLICADO",
    });
  },

  async matricularCurso(cursoId: string) {
    return invocarMutacion<{
      ok: true;
      matriculaId: string;
      edicionId: string;
      cursoId: string;
    }>("matricular-curso", { cursoId });
  },

  /** Matrícula institucional: un gestor matricula a otra persona de su organización. */
  async matricularEstudiante(cursoId: string, estudianteId: string) {
    return invocarMutacion<{
      ok: true;
      matriculaId: string;
      edicionId: string;
      cursoId: string;
      estudianteIdentidadRef: string;
      advertenciaSync: string | null;
    }>("matricular-estudiante", { cursoId, estudianteId });
  },

  /** Solicitud de matrícula (queda PENDIENTE hasta aprobación). */
  async solicitarMatriculaEstudiante(cursoId: string, estudianteId: string) {
    return invocarMutacion<{
      ok: true;
      matriculaId: string;
      edicionId: string;
      cursoId: string;
      estudianteIdentidadRef: string;
      estado: string;
      yaExistia?: boolean;
    }>("solicitar-matricula", { cursoId, estudianteId });
  },

  /** Activa una matrícula pendiente (aprobación institucional). */
  async activarMatricula(matriculaId: string, estudianteId?: string) {
    return invocarMutacion<{
      ok: true;
      matriculaId: string;
      estado: string;
      estudianteId: string;
      cursoId: string | null;
    }>("activar-matricula", {
      matriculaId,
      estudianteId: estudianteId ?? null,
    });
  },

  async listarCursosRevision() {
    return invocar<{
      ok: true;
      total: number;
      cursos: Array<Record<string, unknown>>;
    }>("list-cursos-revision");
  },

  async revisarContenidoCurso(cursoId: string) {
    return invocarMutacion<{
      ok: true;
      estado: string;
      curso: CursoSecundaria;
      catalogo: Record<string, unknown>;
    }>("revisar-contenido", { cursoId });
  },

  async observarCurso(cursoId: string, observacion: string) {
    return invocarMutacion<{
      ok: true;
      estado: string;
      curso: CursoSecundaria;
      catalogo: Record<string, unknown>;
    }>("observar-curso", { cursoId, observacion });
  },

  async aprobarCurso(
    cursoId: string,
    entrada: {
      publicar?: boolean;
      configuracion?: Record<string, unknown>;
    } = {},
  ) {
    return invocarMutacion<{
      ok: true;
      estado: string;
      curso: CursoSecundaria;
      catalogo: Record<string, unknown>;
    }>("aprobar-curso", {
      cursoId,
      publicar: entrada.publicar === true,
      configuracion: entrada.configuracion ?? {},
    });
  },

  async crearOrdenCompra(entrada: {
    cursoIds?: string[];
    items?: Array<{
      cursoId: string;
      titulo?: string;
      importe?: number;
      totalCentavos?: number;
    }>;
    moneda?: string;
  }) {
    return invocarMutacion<{
      ok: true;
      ordenId: string;
      estado: string;
      moneda: string;
      totalCentavos: number;
      importe: number;
      cursoIds: string[];
      items: Array<Record<string, unknown>>;
    }>("crear-orden-compra", {
      cursoIds: entrada.cursoIds ?? [],
      items: entrada.items ?? [],
      moneda: entrada.moneda ?? "PEN",
    });
  },

  async obtenerOrdenCompra(ordenId: string) {
    return invocar<{
      ok: true;
      ordenId: string;
      estado: string;
      moneda: string;
      totalCentavos: number;
      importe: number;
      cursoIds: string[];
      items: Array<Record<string, unknown>>;
      pago?: Record<string, unknown> | null;
    }>("obtener-orden-compra", { ordenId });
  },

  async confirmarPagoOrden(
    ordenId: string,
    entrada: { code?: string; transactionId?: string } = {},
  ) {
    return invocarMutacion<{
      ok: true;
      ordenId: string;
      estado: string;
      mensaje?: string;
      cursoIds?: string[];
      matriculas?: Array<Record<string, unknown>>;
      importe?: number;
    }>("confirmar-pago-orden", {
      ordenId,
      code: entrada.code ?? "00",
      transactionId: entrada.transactionId ?? null,
    });
  },

  async listarAsistenciaSesion(sesionId: string) {
    return invocar<{
      ok: true;
      sesionId: string;
      cursoId?: string;
      total: number;
      presentes: number;
      asistencias: Array<{
        estudianteId: string;
        matriculaId?: string;
        nombre: string;
        correo?: string | null;
        iniciales: string;
        estado: string;
        marcadoEn?: string | null;
      }>;
    }>("list-asistencia-sesion", { sesionId });
  },

  async marcarAsistenciaSesion(
    sesionId: string,
    items: Array<{
      estudianteId: string;
      estado: string;
      matriculaId?: string;
    }>,
  ) {
    return invocarMutacion<{
      ok: true;
      sesionId: string;
      total: number;
      presentes: number;
      marcados?: number;
      asistencias: Array<{
        estudianteId: string;
        matriculaId?: string;
        nombre: string;
        iniciales?: string;
        estado: string;
      }>;
    }>("marcar-asistencia-sesion", { sesionId, items });
  },

  async listarMisCursos(): Promise<ResultadoMisCursosSecundaria> {
    if (!portalActivoEsAlumno()) {
      return vacioMisCursos();
    }
    return conCacheSWR({
      fragmento: "misCursos",
      leer: () => obtenerCache()?.misCursos,
      cargar: () => invocar<ResultadoMisCursosSecundaria>("mis-cursos"),
      guardar: (misCursos) => fusionarCache({ misCursos }),
    });
  },

  async obtenerContenidoAprendizaje(
    cursoId: string,
  ): Promise<ResultadoContenidoAprendizajeSecundaria> {
    return invocar<ResultadoContenidoAprendizajeSecundaria>("contenido-curso", {
      cursoId,
    });
  },

  async completarActividad(
    cursoId: string,
    actividadId: string,
    opciones: { nota?: number | null; marcarCompletada?: boolean } = {},
  ) {
    return invocarMutacion<ResultadoCompletarActividadSecundaria>(
      "completar-actividad",
      {
        cursoId,
        actividadId,
        nota: opciones.nota ?? null,
        marcarCompletada: opciones.marcarCompletada ?? true,
      },
    );
  },

  async calificarQuiz(
    cursoId: string,
    actividadId: string,
    respuestas: number[],
  ) {
    return invocarMutacion<ResultadoCalificarQuizSecundaria>("calificar-quiz", {
      cursoId,
      actividadId,
      respuestas,
    });
  },

  async guardarItemActivo(cursoId: string, actividadId: string) {
    try {
      return await invocarMutacion<{
        ok: boolean;
        matriculaId?: string;
        itemActivoId?: string;
      }>("guardar-item-activo", { cursoId, actividadId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Edge antigua sin la acción: no bloquear completar/progreso.
      if (/accion no soportada|non-2xx/i.test(msg)) {
        console.warn(
          "[Tukuy] guardar-item-activo no disponible en secondary-gateway. Redeploya la Edge.",
          msg,
        );
        return { ok: false, itemActivoId: actividadId };
      }
      throw err;
    }
  },

  async guardarApuntes(cursoId: string, apuntes: string) {
    return invocarMutacion<
      import("@/lib/contrato-secundaria").ResultadoApuntesSecundaria
    >("guardar-apuntes", { cursoId, apuntes });
  },

  async listarSesiones(cursoId?: string): Promise<ResultadoListarSesionesSecundaria> {
    if (cursoId) {
      return invocar<ResultadoListarSesionesSecundaria>("list-sesiones", {
        cursoId,
      });
    }

    return conCacheSWR({
      fragmento: "sesiones",
      leer: () => obtenerCache()?.sesiones,
      cargar: () =>
        invocar<ResultadoListarSesionesSecundaria>("list-sesiones", {
          cursoId: null,
        }),
      guardar: (sesiones) => fusionarCache({ sesiones }),
    });
  },

  async crearSesion(entrada: {
    cursoId: string;
    titulo: string;
    iniciaEn: string;
    terminaEn: string;
    urlAcceso?: string | null;
    attendees?: string[];
  }): Promise<ResultadoCrearSesionSecundaria> {
    return invocarMutacion<ResultadoCrearSesionSecundaria>(
      "crear-sesion",
      entrada,
    );
  },

  async probeGoogleCalendar() {
    return invocar<{
      ok: boolean;
      configurado: boolean;
      simulado?: boolean;
      meetUrl?: string;
      calendarEventId?: string;
      motivo?: string;
      error?: string;
    }>("probe-google-calendar");
  },

  async actualizarSesion(entrada: {
    sesionId: string;
    titulo?: string | null;
    iniciaEn?: string | null;
    terminaEn?: string | null;
    urlAcceso?: string | null;
  }): Promise<{ ok: true; sesion: SesionEnVivoSecundaria }> {
    return invocarMutacion<{ ok: true; sesion: SesionEnVivoSecundaria }>(
      "actualizar-sesion",
      entrada,
    );
  },

  async eliminarSesion(sesionId: string): Promise<{ ok: true; sesionId: string }> {
    return invocarMutacion<{ ok: true; sesionId: string }>("eliminar-sesion", {
      sesionId,
    });
  },

  async actualizarEstadoSesion(
    sesionId: string,
    estado: string,
  ): Promise<{ ok: true; sesion: SesionEnVivoSecundaria }> {
    return invocarMutacion<{ ok: true; sesion: SesionEnVivoSecundaria }>(
      "actualizar-estado-sesion",
      { sesionId, estado },
    );
  },

  async listarEstudiantes(
    cursoId?: string,
  ): Promise<ResultadoListarEstudiantesSecundaria> {
    if (cursoId) {
      return invocar<ResultadoListarEstudiantesSecundaria>("list-estudiantes", {
        cursoId,
      });
    }

    return conCacheSWR({
      fragmento: "estudiantes",
      leer: () => obtenerCache()?.estudiantes,
      cargar: () =>
        invocar<ResultadoListarEstudiantesSecundaria>("list-estudiantes", {
          cursoId: null,
        }),
      guardar: (estudiantes) => fusionarCache({ estudiantes }),
    });
  },

  async listarAlumnosResumen(entrada: {
    busqueda?: string;
    cursoId?: string | null;
    limite?: number;
    offset?: number;
  } = {}) {
    return invocar<ResultadoListarAlumnosResumenSecundaria>("list-alumnos-resumen", {
      busqueda: entrada.busqueda ?? null,
      cursoId: entrada.cursoId ?? null,
      limite: entrada.limite ?? 50,
      offset: entrada.offset ?? 0,
    });
  },

  async actualizarEstadoCurso(
    cursoId: string,
    estado: string,
  ): Promise<{ ok: true; curso: CursoSecundaria }> {
    return invocarMutacion<{ ok: true; curso: CursoSecundaria }>(
      "actualizar-estado-curso",
      { cursoId, estado },
    );
  },

  async eliminarCurso(
    cursoId: string,
  ): Promise<{ ok: true; curso: CursoSecundaria }> {
    return invocarMutacion<{ ok: true; curso: CursoSecundaria }>(
      "eliminar-curso",
      { cursoId },
    );
  },

  async eliminarCursoPermanente(
    cursoId: string,
  ): Promise<{ ok: true; curso: CursoSecundaria }> {
    return invocarMutacion<{ ok: true; curso: CursoSecundaria }>(
      "eliminar-curso-permanente",
      { cursoId },
    );
  },

  async listarCertificadosEmitidos() {
    return invocar<{
      ok: true;
      total: number;
      emitidos: import("@/lib/contrato-secundaria").CertificadoEmitidoSecundaria[];
    }>("list-certificados");
  },

  async listarMisCertificados() {
    return invocar<{
      ok: true;
      total: number;
      emitidos: import("@/lib/contrato-secundaria").CertificadoEmitidoSecundaria[];
    }>("list-mis-certificados");
  },

  async listarCertificadosPendientes(progresoMinimo = 100) {
    return invocar<{
      ok: true;
      total: number;
      pendientes: import("@/lib/contrato-secundaria").CertificadoPendienteSecundaria[];
    }>("list-certificados-pendientes", { progresoMinimo });
  },

  async emitirCertificado(matriculaId: string) {
    return invocarMutacion<{
      ok: true;
      certificadoId: string;
      codigoVerificacion?: string;
      documentoId?: string;
      yaExistia?: boolean;
      requiereFirmaInstitucional?: boolean;
      firmas?: Record<string, unknown>;
      emitidos: import("@/lib/contrato-secundaria").CertificadoEmitidoSecundaria[];
    }>("emitir-certificado", { matriculaId });
  },

  async actualizarDocumentoCertificado(entrada: {
    certificadoId: string;
    claveAlmacenamiento: string;
    tamanoBytes?: number;
    huellaDocumento?: string;
    /** Snapshot plantilla Principal → datos_historicos.plantilla */
    datosPlantilla?: {
      id: string;
      nombre?: string;
      cantidadFirmantes?: number;
      versionPlantilla?: string;
      instalacionId?: string;
    } | null;
  }) {
    return invocarMutacion<{
      ok: true;
      certificadoId: string;
      documentoId?: string;
      claveAlmacenamiento: string;
      plantillaId?: string | null;
    }>("actualizar-documento-certificado", {
      certificadoId: entrada.certificadoId,
      claveAlmacenamiento: entrada.claveAlmacenamiento,
      tamanoBytes: entrada.tamanoBytes ?? null,
      huellaDocumento: entrada.huellaDocumento ?? null,
      datosPlantilla: entrada.datosPlantilla ?? null,
    });
  },

  async revocarCertificado(entrada: {
    certificadoId: string;
    motivo?: string;
  }) {
    return invocarMutacion<{
      ok: true;
      certificadoId: string;
      codigoVerificacion?: string;
      yaRevocado?: boolean;
      revocadoEn?: string;
      indicePublico?: unknown;
      advertenciaIndice?: string | null;
    }>("revocar-certificado", {
      certificadoId: entrada.certificadoId,
      motivo: entrada.motivo ?? null,
    });
  },

  async listarCertificadosPendientesFirma() {
    return invocar<{
      ok: true;
      total: number;
      pendientesFirma: Array<{
        firmaId: string;
        certificadoId: string;
        documentoId?: string;
        codigoVerificacion?: string;
        matriculaId?: string;
        nombre: string;
        curso: string;
        rolFirma: string;
        estadoFirma: string;
        preparadoEn?: string;
      }>;
    }>("list-certificados-pendientes-firma");
  },

  async firmarCertificado(entrada: {
    certificadoId: string;
    firmaId?: string;
  }) {
    return invocarMutacion<{
      ok: true;
      certificadoId: string;
      firmaId?: string;
      listoParaIndice?: boolean;
      pendientes?: number;
      indicePublico?: unknown;
    }>("firmar-certificado", {
      certificadoId: entrada.certificadoId,
      firmaId: entrada.firmaId ?? null,
    });
  },

  async listarEntregas(entrada: {
    cursoId?: string | null;
    soloPropias?: boolean;
    incluirArchivo?: boolean;
  } = {}) {
    const sinFiltros =
      !entrada.cursoId &&
      entrada.soloPropias !== true &&
      entrada.incluirArchivo !== true;

    if (!sinFiltros) {
      return invocar<{
        ok: true;
        total: number;
        entregas: import("@/lib/contrato-secundaria").EntregaActividadSecundaria[];
      }>("list-entregas", {
        cursoId: entrada.cursoId ?? null,
        soloPropias: entrada.soloPropias === true,
        incluirArchivo: entrada.incluirArchivo === true,
      });
    }

    return conCacheSWR({
      fragmento: "entregas",
      leer: () => obtenerCache()?.entregas,
      cargar: async () => {
        const data = await invocar<{
          ok: true;
          total: number;
          entregas: import("@/lib/contrato-secundaria").EntregaActividadSecundaria[];
        }>("list-entregas", {
          cursoId: null,
          soloPropias: false,
          incluirArchivo: false,
        });
        return {
          ok: true as const,
          total: data.total,
          entregas: data.entregas,
        };
      },
      guardar: (entregas) => fusionarCache({ entregas }),
    });
  },

  async obtenerEntrega(entregaId: string, incluirArchivo = true) {
    return invocar<{
      ok: true;
      entrega: import("@/lib/contrato-secundaria").EntregaActividadSecundaria;
    }>("get-entrega", { entregaId, incluirArchivo });
  },

  async enviarEntrega(entrada: {
    cursoId: string;
    actividadId: string;
    archivoNombre: string;
    archivoTipo?: string;
    archivoTamanio?: number;
    archivoContenido?: string | null;
    archivoReferencia?: string | null;
  }) {
    return invocarMutacion<{
      ok: true;
      entrega: import("@/lib/contrato-secundaria").EntregaActividadSecundaria;
    }>("enviar-entrega", entrada);
  },

  async calificarEntrega(
    entregaId: string,
    nota: number,
    retroalimentacion?: string,
  ) {
    return invocarMutacion<{
      ok: true;
      entrega: import("@/lib/contrato-secundaria").EntregaActividadSecundaria;
    }>("calificar-entrega", { entregaId, nota, retroalimentacion });
  },

  async solicitarCorreccionEntrega(
    entregaId: string,
    retroalimentacion: string,
  ) {
    return invocarMutacion<{
      ok: true;
      entrega: import("@/lib/contrato-secundaria").EntregaActividadSecundaria;
    }>("solicitar-correccion-entrega", { entregaId, retroalimentacion });
  },

  async listarModulosCurso(cursoId: string) {
    return invocar<{
      ok: true;
      modulos: import("@/lib/contrato-secundaria").ModuloCursoSecundaria[];
    }>("list-modulos-curso", { cursoId });
  },

  async listarConversaciones() {
    return invocar<{
      ok: true;
      total: number;
      conversaciones: Array<{
        id: string;
        cursoId?: string;
        curso?: string;
        estudianteId?: string;
        nombre: string;
        iniciales: string;
        mensaje: string;
        hora: string;
        noLeidos: number;
      }>;
    }>("list-conversaciones");
  },

  async obtenerMensajes(conversacionId: string) {
    return invocar<{
      ok: true;
      conversacionId: string;
      mensajes: Array<{
        id: string;
        contenido: string;
        hora: string;
        autor: "DOCENTE" | "ESTUDIANTE";
        adjunto?: { nombre: string; tipo: string; tamanio: number } | null;
      }>;
    }>("get-mensajes", { conversacionId });
  },

  async enviarMensaje(
    conversacionId: string,
    contenido: string,
    adjunto?: { nombre: string; tipo: string; tamanio: number },
  ) {
    return invocarMutacion<{
      ok: true;
      mensaje: {
        id: string;
        contenido: string;
        hora: string;
        autor: "DOCENTE" | "ESTUDIANTE";
        adjunto?: { nombre: string; tipo: string; tamanio: number } | null;
      };
    }>("enviar-mensaje", { conversacionId, contenido, adjunto });
  },

  async marcarConversacionLeida(conversacionId: string) {
    return invocarMutacion<{ ok: true; conversacionId: string }>(
      "marcar-conversacion-leida",
      { conversacionId },
    );
  },

  async listarIngresos() {
    return invocar<{
      ok: true;
      total: number;
      movimientos: Array<{
        id: string;
        curso: string;
        fecha: string;
        concepto: string;
        importe: number;
        estado: "DISPONIBLE" | "POR_LIQUIDAR" | "PAGADO";
      }>;
    }>("list-ingresos");
  },

  async obtenerDuracionYoutube(urlOId: string) {
    return invocar<
      | {
          ok: true;
          videoId: string;
          segundos: number;
          minutos: number;
        }
      | {
          ok: false;
          code?: string;
          error?: string;
        }
    >("youtube-duracion", { url: urlOId });
  },

  async abrirChatCursoAlumno(cursoId: string) {
    return invocar<{
      ok: true;
      conversacionId: string;
      cursoId: string;
      cursoTitulo?: string;
      docente: {
        id: string;
        nombre: string;
        cargo: string;
        iniciales: string;
      };
      mensajes: Array<{
        id: string;
        contenido: string;
        hora: string;
        autor: "DOCENTE" | "ESTUDIANTE";
        adjunto?: { nombre: string; tipo: string; tamanio: number } | null;
      }>;
    }>("chat-curso-alumno", { cursoId });
  },
};
