import type { Course } from "@/types/academia";

export type TipoItemAprendizaje =
  | "video"
  | "quiz"
  | "reading"
  | "assignment";

export type ItemAprendizaje = {
  id: string;
  title: string;
  type: TipoItemAprendizaje;
  duration?: string;
  questions?: number;
  grade?: number;
  description: string;
  /** URL o ID de YouTube para ítems tipo video. */
  videoUrl?: string;
};

export type RecursoAprendizaje = {
  id: string;
  nombre: string;
  tipo: string;
  tamanio?: number;
  /** URL http(s)/s3 o data URL corta. */
  contenido?: string;
};

export type ModuloAprendizaje = {
  id: string;
  title: string;
  items: ItemAprendizaje[];
  recursos?: RecursoAprendizaje[];
};

export type PreguntaQuiz = {
  question: string;
  options: string[];
  /** Solo en mock/constructor; el alumno califica en servidor. */
  correctIndex?: number;
};

/** Contenido didáctico de un curso (temario + quizzes). `id` = cursoId. */
export type ContenidoCursoAprendizaje = {
  id: string;
  modulos: ModuloAprendizaje[];
  quizzes: Record<string, PreguntaQuiz[]>;
  /** Nota mínima de la versión (escala 0–20). */
  notaMinima?: number;
};

/** Avance del estudiante en un curso. `id` = cursoId. */
export type ProgresoCursoAprendizaje = {
  id: string;
  itemsCompletados: string[];
  notas: Record<string, number>;
  itemActivoId: string;
  progreso: number;
  estado: Course["status"];
  actualizadoEn: string;
};

export type ActualizarProgresoCurso = Partial<
  Pick<
    ProgresoCursoAprendizaje,
    "itemsCompletados" | "notas" | "itemActivoId" | "progreso" | "estado"
  >
>;
