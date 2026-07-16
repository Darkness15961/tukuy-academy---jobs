export type TipoActividadAcademica =
  | "ENTREGA_PDF"
  | "CUESTIONARIO"
  | "PROYECTO"
  | "ASISTENCIA";

export type EstadoEntregaAcademica =
  | "SIN_ENTREGAR"
  | "ENTREGADA"
  | "EN_REVISION"
  | "CALIFICADA"
  | "OBSERVADA"
  | "ATRASADA";

export interface ArchivoEntregaAcademica {
  id: string;
  nombre: string;
  tipo: string;
  tamanio: number;
  referencia: string;
  contenidoBase64?: string;
}

export interface ActividadCursoAcademico {
  id: string;
  cursoId: string;
  moduloId: string;
  titulo: string;
  tipo: TipoActividadAcademica;
  orden: number;
  ponderacion: number;
  notaMaxima: number;
  horasReconocidas: number;
  obligatoria: boolean;
  intentosPermitidos: number;
  fechaLimite?: string;
}

export interface ModuloCursoAcademico {
  id: string;
  cursoId: string;
  titulo: string;
  orden: number;
  ponderacion: number;
  horasRequeridas: number;
  actividades: ActividadCursoAcademico[];
}

export interface EntregaActividadAcademica {
  id: string;
  organizacionId: string | null;
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
  estado: EstadoEntregaAcademica;
  archivo?: ArchivoEntregaAcademica;
  nota?: number;
  retroalimentacion?: string;
  calificadaEn?: string;
  horasReconocidas: number;
}

export interface ResumenCursoCalificaciones {
  cursoId: string;
  titulo: string;
  imagen: string;
  estadoCurso: string;
  modulos: number;
  actividades: number;
  estudiantes: number;
  entregasPendientes: number;
  entregasCalificadas: number;
  promedio: number;
  aprobados: number;
  contexto: string;
}

export interface ResumenEstudianteCurso {
  estudianteId: string;
  estudianteNombre: string;
  iniciales: string;
  actividadesRequeridas: number;
  actividadesCalificadas: number;
  notaFinal: number;
  horasCumplidas: number;
  horasRequeridas: number;
  estado: "PENDIENTE" | "EN_RIESGO" | "APROBADO";
}

export interface ElegibilidadCertificadoAcademico {
  cursoId: string;
  cursoTitulo: string;
  estudianteId: string;
  estudianteNombre: string;
  notaFinal: number;
  horasCumplidas: number;
  horasRequeridas: number;
  modulosCompletados: number;
  modulosTotales: number;
  actividadesCalificadas: number;
  actividadesRequeridas: number;
  elegible: boolean;
  motivos: string[];
}

export interface VerificacionCertificadoAcademico {
  codigo: string;
  estado: "VIGENTE" | "VENCIDO" | "REVOCADO";
  estudiante: string;
  curso: string;
  horasCertificadas: number;
  notaFinal: number;
  emitidoEn: string;
  organizacion: string;
  modulosCompletados: number;
  versionPrograma: string;
}
