export type AmbitoDocente = "INDEPENDIENTE" | "ORGANIZACION";

export type EstadoCursoDocente =
  | "BORRADOR"
  | "EN_REVISION"
  | "APROBADO"
  | "PUBLICADO"
  | "ARCHIVADO";

export interface CursoDocente {
  id: string;
  ambito: AmbitoDocente;
  organizacionId: string | null;
  organizacionNombre: string;
  modeloAcceso: string;
  titulo: string;
  imagen: string;
  estado: EstadoCursoDocente;
  estudiantes: number;
  progreso: number;
  valoracion: number;
  actualizado: string;
  docenteResponsableId?: string;
  docenteResponsableNombre?: string;
  cargadoPorNombre?: string;
  origenCarga?: "DOCENTE" | "ADMINISTRACION";
}

export interface EstudianteDocente {
  id: string;
  alumnoId?: string;
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
}

export interface EvaluacionDocente {
  id: string;
  estudiante: string;
  actividad: string;
  curso: string;
  entrega: string;
  tipo: string;
  prioridad: string;
  estado?: "PENDIENTE" | "REVISADA";
  nota?: number;
  retroalimentacion?: string;
  revisadaEn?: string;
}

export interface SesionDocente {
  id: string;
  titulo: string;
  curso: string;
  fecha: string;
  hora: string;
  duracion: string;
  inscritos: number;
  estado: "PROGRAMADA" | "HOY" | "EN_VIVO" | "FINALIZADA" | "CANCELADA";
  fechaHoraIso?: string;
  enlace?: string;
  grabacion?: string;
  asistentes?: number;
}

export interface MensajeDocente {
  id: string;
  contenido: string;
  hora: string;
  autor: "DOCENTE" | "ESTUDIANTE";
  adjunto?: { nombre: string; tipo: string; tamanio: number };
}

export interface ConversacionDocente {
  id: string;
  nombre: string;
  iniciales: string;
  mensaje: string;
  hora: string;
  noLeidos: number;
  mensajes?: MensajeDocente[];
}

export interface CalificacionDocente {
  id: number;
  nombre: string;
  iniciales: string;
  curso: string;
  tareas: number;
  examen: number;
  final: number;
  estado: string;
}

export interface CertificadoEmitidoDocente {
  id: string;
  nombre: string;
  curso: string;
  fecha: string;
  estado: string;
  cursoId?: string;
  estudianteId?: string;
  notaFinal?: number;
  horasCertificadas?: number;
  modulosCompletados?: number;
  versionPrograma?: string;
  organizacionEmisora?: string;
}

export interface CertificadoPendienteDocente {
  id: string;
  nombre: string;
  curso: string;
  nota: number;
  cursoId?: string;
  estudianteId?: string;
  horasCumplidas?: number;
  horasRequeridas?: number;
  modulosCompletados?: number;
  modulosTotales?: number;
  actividadesCalificadas?: number;
  actividadesRequeridas?: number;
}

export interface MovimientoIngresoDocente {
  id: string;
  curso: string;
  fecha: string;
  concepto: string;
  importe: number;
  estado: "DISPONIBLE" | "POR_LIQUIDAR" | "PAGADO";
}

export interface NotificacionDocente {
  id: string;
  titulo: string;
  detalle: string;
  fecha: string;
  leida: boolean;
  ruta?: string;
  tipo: "CURSO" | "EVALUACION" | "SESION" | "MENSAJE" | "CERTIFICADO";
}

export interface ActividadDocente {
  id: string;
  titulo: string;
  detalle: string;
  fecha: string;
}

export interface KpiAnaliticaDocente {
  id: string;
  etiqueta: string;
  valor: string;
  variacion: string;
  tendencia: "sube" | "baja";
  detalle: string;
}

export interface AnaliticaDocente {
  periodo: string;
  kpis: KpiAnaliticaDocente[];
  actividadSemanal: Array<{ dia: string; activos: number; sesiones: number }>;
  tendenciaMensual: Array<{
    mes: string;
    inscripciones: number;
    finalizaciones: number;
  }>;
  embudoAprendizaje: Array<{
    etapa: string;
    valor: number;
    porcentaje: number;
  }>;
  rendimientoCursos: Array<{
    id: string;
    nombre: string;
    estudiantes: number;
    finalizacion: number;
    progresoMedio: number;
    valoracion: number;
    horas: number;
    certificados: number;
  }>;
  distribucionEstados: Array<{
    estado: string;
    cantidad: number;
    color: string;
  }>;
  organizaciones: Array<{
    nombre: string;
    estudiantes: number;
    finalizacion: number;
  }>;
  estudiantesEnRiesgo: Array<{
    nombre: string;
    iniciales: string;
    curso: string;
    progreso: number;
    ultimoAcceso: string;
    motivo: string;
  }>;
  modulosDestacados: Array<{
    modulo: string;
    completado: number;
    tiempoMedio: string;
  }>;
  horasPico: Array<{ franja: string; porcentaje: number }>;
}

export interface BorradorCursoDocente {
  titulo: string;
  subtitulo: string;
  descripcion: string;
  publico: string;
  alcanceDirigido?: "TODOS" | "ORGANIZACION" | "UNIDADES";
  unidadesDestinoIds?: string[];
  unidadesDestinoNombres?: string[];
  objetivos: string[];
  requisitos: string[];
  categoria: string;
  nivel: string;
  imagen: string;
  ambito: string;
  organizacionId: string | null;
  acceso: string;
  precio: number;
  visibilidad: string;
  permiteEmpresas: boolean;
  certificado: boolean;
  nombreCertificado: string;
  notaMinima: number;
  vigenciaMeses: number;
  firmasCertificado?: FirmaCertificadoCurso[];
  docenteResponsableId?: string;
  docenteResponsableNombre?: string;
  docenteResponsablePerfil?: DocenteResponsableCurso;
  cargadoPorNombre?: string;
  origenCarga?: "DOCENTE" | "ADMINISTRACION";
  secciones: Array<{
    titulo: string;
    clases: string[];
    recursos?: Array<{
      id: string;
      nombre: string;
      tipo: string;
      tamanio: number;
      contenido: string;
    }>;
  }>;
}

export interface DocenteResponsableCurso {
  id: string;
  nombre: string;
  correo: string;
  cargo: string;
  especialidad: string;
  foto: string;
  biografia: string;
  experiencia: string[];
  origen: "ENTIDAD" | "MANUAL";
}

export interface FirmaCertificadoCurso {
  id: string;
  personaId: string;
  nombre: string;
  cargo: string;
  tipo: "DIGITAL" | "ELECTRONICA";
}
