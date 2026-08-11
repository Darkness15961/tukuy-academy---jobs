/**
 * Contrato de lectura de la secundaria durante la migración.
 *
 * El browser nunca habla con el proyecto secundario. Toda lectura pasa por
 * la Edge Function `secondary-gateway` (service_role) después de validar el
 * JWT de la principal y, cuando aplique, el acceso sincronizado.
 *
 * Mapa de responsabilidad:
 * - Principal: auth, tenants, membresías, admin SaaS, bolsa, comunidad.
 * - Secundaria: academia, personas de la org, certificados, sesiones, progreso.
 *
 * Fase 1: `sync-access` también upserta `membresia_organizacion` y
 * `asignacion_perfil_membresia` vía `servicio_sincronizar_membresia_organizacion`.
 *
 * Fase 2: `list-cursos` / `get-curso` leen `curso` + `version_curso` tipados.
 *
 * Fase 3: `guardar-curso` / `get-borrador` persisten borrador + módulos.
 *
 * Fase 4: `publicar-curso` marca secundaria y upserta `curso_catalogo` principal.
 *
 * Fase 5: `matricular-curso` / `mis-cursos` / `contenido-curso` / `completar-actividad`.
 *
 * Fase 6: `list-sesiones` / `crear-sesion` (sesiones en vivo).
 *
 * Fase 7: `list-certificados` / `list-certificados-pendientes` / `emitir-certificado`.
 *
 * Fase 8: al emitir, upsert `indice_certificado_publico` en principal;
 * verificación pública vía `verificar_certificado_publico`.
 *
 * Academia sin mock: estudiantes por matrícula, estado de sesión/curso.
 *
 * Entregas: list-entregas / get-entrega / enviar-entrega /
 * calificar-entrega / solicitar-correccion-entrega / list-modulos-curso.
 *
 * Bootstrap: bootstrap-docente / bootstrap-alumno (carga inicial en 1 viaje).
 *
 * Sesiones: actualizar-sesion / eliminar-sesion.
 *
 * Aprendizaje: completar-actividad (nota opcional) / guardar-apuntes.
 */
export const ACCIONES_GATEWAY_SECUNDARIA = [
  "health",
  "sync-access",
  "inventory",
  "bootstrap-docente",
  "bootstrap-alumno",
  "list-cursos",
  "get-curso",
  "get-borrador",
  "guardar-curso",
  "publicar-curso",
  "actualizar-estado-curso",
  "matricular-curso",
  "mis-cursos",
  "contenido-curso",
  "completar-actividad",
  "guardar-apuntes",
  "list-sesiones",
  "crear-sesion",
  "actualizar-sesion",
  "eliminar-sesion",
  "actualizar-estado-sesion",
  "list-estudiantes",
  "list-entregas",
  "get-entrega",
  "enviar-entrega",
  "calificar-entrega",
  "solicitar-correccion-entrega",
  "list-modulos-curso",
  "list-certificados",
  "list-certificados-pendientes",
  "list-mis-certificados",
  "emitir-certificado",
] as const;

export type AccionGatewaySecundaria =
  (typeof ACCIONES_GATEWAY_SECUNDARIA)[number];

export type GrupoTablaSecundaria =
  | "ACADEMICO"
  | "PERSONAS"
  | "COMERCIAL"
  | "SEGURIDAD"
  | "OTRO";

export type ColumnaSecundaria = {
  nombre: string;
  tipo: string;
};

export type TablaSecundaria = {
  tabla: string;
  filas: number;
  grupo: GrupoTablaSecundaria;
  columnas: ColumnaSecundaria[];
};

export type InventarioSecundaria = {
  ok: boolean;
  totalTablas: number;
  tablas: TablaSecundaria[];
  generadoEn: string;
};

/** @deprecated Preferir ListadoCursosSecundaria (Fase 2 tipada). */
export type ExploracionCursosSecundaria = {
  ok: boolean;
  tabla: string | null;
  columnas?: string[];
  totalDevueltos?: number;
  datos: Record<string, unknown>[];
  mensaje?: string;
};

export type VersionCursoSecundaria = {
  id: string;
  numero: number;
  tituloHistorico: string;
  horas: number;
  notaMinima?: number | null;
  notaMaxima?: number | null;
  estado: string;
  totalModulos?: number;
  totalEdiciones?: number;
};

export type CursoSecundaria = {
  id: string;
  codigo: string;
  titulo: string;
  resumen?: string | null;
  categoria?: string | null;
  modalidad: string;
  estado: string;
  autorIdentidadRef: string;
  portadaClave?: string | null;
  /** CSS object-position, p.ej. `30% 20%`. */
  imagenPosicion?: string | null;
  creadoEn: string;
  actualizadoEn: string;
  versionRegistro?: number;
  versionActual?: VersionCursoSecundaria | null;
  totalVersiones?: number;
  totalModulos?: number;
  totalEdiciones?: number;
  versiones?: VersionCursoSecundaria[];
};

export type ListadoCursosSecundaria = {
  ok: boolean;
  total: number;
  cursos: CursoSecundaria[];
  generadoEn: string;
};

export type DetalleCursoSecundaria = {
  ok: boolean;
  curso?: CursoSecundaria;
  error?: string;
};

export type BorradorCursoSecundaria = Record<string, unknown> & {
  titulo?: string;
  descripcion?: string;
  secciones?: Array<{
    titulo: string;
    clases: string[];
    recursos?: Array<Record<string, unknown>>;
  }>;
};

export type ResultadoGuardarCursoSecundaria = {
  ok: boolean;
  curso: CursoSecundaria;
  borrador: BorradorCursoSecundaria;
  versionId?: string;
};

export type ResultadoBorradorCursoSecundaria = {
  ok: boolean;
  curso: CursoSecundaria;
  borrador: BorradorCursoSecundaria;
};

export type CursoCatalogoPrincipal = {
  id: string;
  cursoSecundarioRef: string;
  instalacionId: string;
  codigo: string;
  titulo: string;
  resumen?: string | null;
  modalidad: string;
  duracionMinutos?: number | null;
  imagenPublicaRef?: string | null;
  estadoPublicacion: string;
  versionPublicada: number;
  datosHistoricos?: Record<string, unknown>;
  publicadoEn?: string | null;
  creadoEn?: string;
  actualizadoEn?: string | null;
};

export type ResultadoPublicarCurso = {
  ok: boolean;
  catalogo: {
    id: string;
    instalacionId: string;
    cursoSecundarioRef: string;
    estadoPublicacion: string;
  };
  curso: CursoSecundaria;
};

export type MatriculaCursoSecundaria = {
  matriculaId: string;
  cursoId: string;
  edicionId: string;
  codigo: string;
  titulo: string;
  resumen?: string | null;
  categoria?: string | null;
  modalidad: string;
  estadoCurso: string;
  estadoMatricula: string;
  progresoPorcentaje: number;
  matriculadoEn: string;
  totalActividades?: number;
  actividadesCompletadas?: number;
};

export type ResultadoMisCursosSecundaria = {
  ok: boolean;
  total: number;
  cursos: MatriculaCursoSecundaria[];
};

export type ResultadoContenidoAprendizajeSecundaria = {
  ok: boolean;
  curso: CursoSecundaria;
  matriculaId?: string | null;
  progresoPorcentaje: number;
  itemsCompletados: string[];
  notas?: Record<string, number>;
  apuntes?: string;
  contenido: {
    id: string;
    modulos: Array<{
      id: string;
      title: string;
      orden?: number;
      items: Array<{
        id: string;
        title: string;
        type: string;
        duration?: string | null;
        description: string;
        questions?: number | null;
        videoUrl?: string | null;
      }>;
    }>;
    quizzes: Record<
      string,
      Array<{
        question: string;
        options: string[];
        correctIndex: number;
      }>
    >;
  };
};

export type ResultadoCompletarActividadSecundaria = {
  ok: boolean;
  matriculaId: string;
  actividadId: string;
  itemsCompletados: string[];
  progresoPorcentaje: number;
  estado: string;
  nota?: number | null;
  notas?: Record<string, number>;
};

export type ResultadoApuntesSecundaria = {
  ok: boolean;
  matriculaId: string;
  apuntes: string;
  actualizadoEn?: string;
};

export type SesionEnVivoSecundaria = {
  id: string;
  edicionId: string;
  cursoId: string;
  cursoTitulo: string;
  titulo: string;
  urlAcceso?: string | null;
  iniciaEn: string;
  terminaEn: string;
  estado?: string | null;
  inscritos?: number;
};

export type EstudianteMatriculaSecundaria = {
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
  estado: string;
};

export type ResultadoListarEstudiantesSecundaria = {
  ok: boolean;
  total: number;
  estudiantes: EstudianteMatriculaSecundaria[];
};

export type ResultadoListarSesionesSecundaria = {
  ok: boolean;
  total: number;
  sesiones: SesionEnVivoSecundaria[];
};

export type ResultadoCrearSesionSecundaria = {
  ok: boolean;
  sesion: SesionEnVivoSecundaria;
};

export type CertificadoEmitidoSecundaria = {
  id: string;
  codigoVerificacion?: string;
  matriculaId: string;
  estudianteId: string;
  nombre: string;
  cursoId: string;
  curso: string;
  estado: string;
  fecha: string;
  emitidoEn?: string | null;
  notaFinal?: number | null;
  horasCertificadas?: number;
  modulosCompletados?: number;
  organizacionEmisora?: string;
  versionPrograma?: string;
};

export type CertificadoPendienteSecundaria = {
  id: string;
  matriculaId: string;
  estudianteId: string;
  nombre: string;
  cursoId: string;
  curso: string;
  nota: number;
  horasCumplidas?: number;
  horasRequeridas?: number;
  modulosCompletados?: number;
  modulosTotales?: number;
  progreso?: number;
};

export type ResultadoCertificadosEmitidos = {
  ok: boolean;
  total: number;
  emitidos: CertificadoEmitidoSecundaria[];
};

export type ResultadoCertificadosPendientes = {
  ok: boolean;
  total: number;
  pendientes: CertificadoPendienteSecundaria[];
};

export type EntregaActividadSecundaria = {
  id: string;
  organizacionId?: string | null;
  organizacionNombre?: string | null;
  cursoId: string;
  cursoTitulo: string;
  moduloId: string;
  moduloTitulo: string;
  actividadId: string;
  actividadTitulo: string;
  estudianteId: string;
  estudianteNombre: string;
  estudianteIniciales: string;
  intento: number;
  entregadaEn: string | null;
  estado: string;
  archivo?: {
    id: string;
    nombre: string;
    tipo: string;
    tamanio: number;
    referencia: string;
    contenidoBase64?: string | null;
  } | null;
  nota?: number | null;
  retroalimentacion?: string | null;
  calificadaEn?: string | null;
  horasReconocidas: number;
};

export type ModuloCursoSecundaria = {
  id: string;
  cursoId: string;
  titulo: string;
  orden: number;
  ponderacion: number;
  horasRequeridas: number;
  actividades: Array<{
    id: string;
    cursoId: string;
    moduloId: string;
    titulo: string;
    tipo: string;
    orden: number;
    ponderacion: number;
    notaMaxima: number;
    horasReconocidas: number;
    obligatoria: boolean;
    intentosPermitidos: number;
  }>;
};

export type ResultadoListarEntregasSecundaria = {
  ok: boolean;
  total: number;
  entregas: EntregaActividadSecundaria[];
};

/** Carga inicial docente: un viaje gateway → varios RPC en paralelo. */
export type BootstrapDocenteSecundaria = {
  ok: true;
  cursos: ListadoCursosSecundaria;
  entregas: ResultadoListarEntregasSecundaria;
  sesiones: ResultadoListarSesionesSecundaria;
  estudiantes: ResultadoListarEstudiantesSecundaria;
  advertencias?: string[];
};

/** Carga inicial alumno: catálogo + matrículas en un viaje. */
export type BootstrapAlumnoSecundaria = {
  ok: true;
  cursos: ListadoCursosSecundaria;
  misCursos: ResultadoMisCursosSecundaria;
  advertencias?: string[];
};
