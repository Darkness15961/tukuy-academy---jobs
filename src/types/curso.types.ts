export type CoursePricing = "free" | "paid";

export type Course = {
  id: string;
  title: string;
  category: string;
  duration: string;
  level: "Basico" | "Intermedio" | "Avanzado";
  mode: "Virtual" | "Presencial" | "Mixto";
  progress: number;
  status: "Disponible" | "En curso" | "Completado";
  pricing: CoursePricing;
  price?: number;
  imageTone: string;
  image: string;
  instructor?: string;
  rating?: number;
  reviewCount?: number;
  bestseller?: boolean;
};

export type CourseLesson = {
  id: string;
  title: string;
  duration: string;
  type: "video" | "lectura" | "quiz";
};

export type CourseSection = {
  id: string;
  title: string;
  lessons: CourseLesson[];
};

export type InstructorCursoPublico = {
  nombre: string;
  cargo: string;
  foto: string;
  biografia: string;
  experiencia: string[];
};

export type ModuloCursoPublico = {
  id: string;
  titulo: string;
  temas: string[];
};

export type DetalleCursoPublico = {
  cursoId: string;
  videoPresentacion: string;
  precioAnterior?: number;
  descuento?: number;
  instructor: InstructorCursoPublico;
  modulos: ModuloCursoPublico[];
};

export type SystemCourse = {
  title: string;
  description: string;
  icon: import("vue").Component;
  badge: string;
};
