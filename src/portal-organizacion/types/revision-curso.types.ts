export interface RecursoRevisionCurso {
  id: string;
  nombre: string;
  tipo: "PDF" | "VIDEO" | "ENLACE" | "PLANTILLA";
  tamanio?: string;
  urlDemo: string;
}

export interface ModuloRevisionCurso {
  id: string;
  titulo: string;
  descripcion: string;
  clases: string[];
  recursos: RecursoRevisionCurso[];
  actividades: string[];
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
