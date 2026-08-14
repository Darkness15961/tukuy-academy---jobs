export interface RecursoRevisionCurso {
  id: string;
  nombre: string;
  tipo: "PDF" | "VIDEO" | "ENLACE" | "PLANTILLA";
  tamanio?: string;
  /** URL real del material (S3/http) para apertura del revisor. */
  urlDemo: string;
}

export type TipoActividadRevision =
  | "lectura"
  | "video"
  | "quiz"
  | "assignment";

export interface ActividadRevisionCurso {
  id: string;
  titulo: string;
  tipo: TipoActividadRevision;
  tipoEtiqueta: string;
  /** Enlace YouTube cuando es video. */
  urlYoutube?: string;
  totalPreguntas?: number;
}

export interface ModuloRevisionCurso {
  id: string;
  titulo: string;
  descripcion: string;
  /** Compat: títulos planos. */
  clases: string[];
  recursos: RecursoRevisionCurso[];
  /** Compat: títulos de actividades. */
  actividades: string[];
  /** Inventario tipado para el revisor admin. */
  actividadesDetalle?: ActividadRevisionCurso[];
}

export interface RevisionAcademicaCurso {
  cursoId: string;
  version: number;
  descripcion: string;
  objetivos: string[];
  requisitos: string[];
  modulos: ModuloRevisionCurso[];
  horasCertificables: number;
  notaMinimaPropuesta: number;
  certificadoPropuesto: boolean;
  enviadaEn: string;
}
