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
};

export type ModuloAprendizaje = {
  id: string;
  title: string;
  items: ItemAprendizaje[];
};

export type PreguntaQuiz = {
  question: string;
  options: string[];
  correctIndex: number;
};

/** Contenido didáctico de un curso (temario + quizzes). `id` = cursoId. */
export type ContenidoCursoAprendizaje = {
  id: string;
  modulos: ModuloAprendizaje[];
  quizzes: Record<string, PreguntaQuiz[]>;
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
