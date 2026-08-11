import { useContextoSesion } from "@/composables/useContextoSesion";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import { supabasePrincipal } from "@/lib/supabase";
import type {
  BootstrapAlumnoSecundaria,
  BootstrapDocenteSecundaria,
  CursoSecundaria,
  InventarioSecundaria,
  ListadoCursosSecundaria,
  ResultadoBorradorCursoSecundaria,
  ResultadoCompletarActividadSecundaria,
  ResultadoContenidoAprendizajeSecundaria,
  ResultadoCrearSesionSecundaria,
  ResultadoGuardarCursoSecundaria,
  ResultadoListarEntregasSecundaria,
  ResultadoListarEstudiantesSecundaria,
  ResultadoListarSesionesSecundaria,
  ResultadoMisCursosSecundaria,
  ResultadoPublicarCurso,
  SesionEnVivoSecundaria,
} from "@/lib/contrato-secundaria";
import type { BorradorCursoDocente } from "@/portal-docente/types/docente.types";

const CACHE_TTL_MS = 45_000;

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

export function instalacionSecundariaActiva(): string {
  const { contextoActivo } = useContextoSesion();
  const id = contextoActivo.value?.organizacionId ?? "";
  return UUID_RE.test(id) ? id : INSTALACION_TUKUY_ACADEMY_ID;
}

function cacheVivo(): FragmentosCache | null {
  const clave = instalacionSecundariaActiva();
  const cache = cachePorInstalacion.get(clave) ?? null;
  if (!cache) return null;
  if (Date.now() - cache.at > CACHE_TTL_MS) {
    cachePorInstalacion.delete(clave);
    return null;
  }
  return cache;
}

function fusionarCache(parcial: Omit<FragmentosCache, "at">) {
  cachePorInstalacion.set(instalacionSecundariaActiva(), {
    ...(cacheVivo() ?? { at: 0 }),
    ...parcial,
    at: Date.now(),
  });
}

export function invalidarCacheSecundaria() {
  cachePorInstalacion.clear();
  inflightDocentePorInstalacion.clear();
  inflightAlumnoPorInstalacion.clear();
}

async function invocar<T>(action: string, extra: Record<string, unknown> = {}) {
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
  if (error) throw new Error(error.message);
  if (!data?.ok) {
    throw new Error(
      [data?.error, data?.details].filter(Boolean).join(" — ") ||
        "La secundaria no respondió correctamente.",
    );
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
    invalidarCacheSecundaria();
  }
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
    if (!forzar) {
      const vivo = cacheVivo();
      if (
        vivo?.cursos &&
        vivo.entregas &&
        vivo.sesiones &&
        vivo.estudiantes
      ) {
        return {
          ok: true,
          cursos: vivo.cursos,
          entregas: vivo.entregas,
          sesiones: vivo.sesiones,
          estudiantes: vivo.estudiantes,
        };
      }
      const enCurso = inflightDocentePorInstalacion.get(instalacion);
      if (enCurso) return enCurso;
    }

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
  },

  async bootstrapAlumno(forzar = false): Promise<BootstrapAlumnoSecundaria> {
    const instalacion = instalacionSecundariaActiva();
    if (!forzar) {
      const vivo = cacheVivo();
      if (vivo?.cursos && vivo.misCursos) {
        return {
          ok: true,
          cursos: vivo.cursos,
          misCursos: vivo.misCursos,
        };
      }
      const enCurso = inflightAlumnoPorInstalacion.get(instalacion);
      if (enCurso) return enCurso;
    }

    const promesa = invocar<BootstrapAlumnoSecundaria>("bootstrap-alumno")
      .then((data) => {
        fusionarCache({
          cursos: data.cursos,
          misCursos: data.misCursos,
        });
        return data;
      })
      .finally(() => {
        inflightAlumnoPorInstalacion.delete(instalacion);
      });
    inflightAlumnoPorInstalacion.set(instalacion, promesa);
    return promesa;
  },

  async listarCursos(limite = 100): Promise<ListadoCursosSecundaria> {
    const vivo = cacheVivo();
    if (vivo?.cursos && limite <= 100) return vivo.cursos;

    const data = await invocar<{
      ok: true;
      cursos: ListadoCursosSecundaria;
    }>("list-cursos", { limite });
    fusionarCache({ cursos: data.cursos });
    return data.cursos;
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
    items: Array<{ estudianteId: string; estado: string }>,
  ) {
    return invocarMutacion<{
      ok: true;
      sesionId: string;
      total: number;
      presentes: number;
      marcados?: number;
      asistencias: Array<{
        estudianteId: string;
        nombre: string;
        iniciales?: string;
        estado: string;
      }>;
    }>("marcar-asistencia-sesion", { sesionId, items });
  },

  async listarMisCursos(): Promise<ResultadoMisCursosSecundaria> {
    const vivo = cacheVivo();
    if (vivo?.misCursos) return vivo.misCursos;

    const data = await invocar<ResultadoMisCursosSecundaria>("mis-cursos");
    fusionarCache({ misCursos: data });
    return data;
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
        marcarCompletada: opciones.marcarCompletada !== false,
      },
    );
  },

  async guardarApuntes(cursoId: string, apuntes: string) {
    return invocarMutacion<
      import("@/lib/contrato-secundaria").ResultadoApuntesSecundaria
    >("guardar-apuntes", { cursoId, apuntes });
  },

  async listarSesiones(cursoId?: string): Promise<ResultadoListarSesionesSecundaria> {
    const vivo = cacheVivo();
    if (!cursoId && vivo?.sesiones) return vivo.sesiones;

    const data = await invocar<ResultadoListarSesionesSecundaria>(
      "list-sesiones",
      { cursoId: cursoId ?? null },
    );
    if (!cursoId) fusionarCache({ sesiones: data });
    return data;
  },

  async crearSesion(entrada: {
    cursoId: string;
    titulo: string;
    iniciaEn: string;
    terminaEn: string;
    urlAcceso?: string | null;
  }): Promise<ResultadoCrearSesionSecundaria> {
    return invocarMutacion<ResultadoCrearSesionSecundaria>(
      "crear-sesion",
      entrada,
    );
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
    const vivo = cacheVivo();
    if (!cursoId && vivo?.estudiantes) return vivo.estudiantes;

    const data = await invocar<ResultadoListarEstudiantesSecundaria>(
      "list-estudiantes",
      { cursoId: cursoId ?? null },
    );
    if (!cursoId) fusionarCache({ estudiantes: data });
    return data;
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
    const vivo = cacheVivo();
    if (sinFiltros && vivo?.entregas) return vivo.entregas;

    const data = await invocar<{
      ok: true;
      total: number;
      entregas: import("@/lib/contrato-secundaria").EntregaActividadSecundaria[];
    }>("list-entregas", {
      cursoId: entrada.cursoId ?? null,
      soloPropias: entrada.soloPropias === true,
      incluirArchivo: entrada.incluirArchivo === true,
    });
    if (sinFiltros) {
      fusionarCache({
        entregas: {
          ok: true,
          total: data.total,
          entregas: data.entregas,
        },
      });
    }
    return data;
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
