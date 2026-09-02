import { pasarelaCursosHabilitada } from "@/lib/pasarela-cursos";
import type { Course } from "@/types/academia";

const INSTRUCTORS = [
  "Ing. Marco Ruiz",
  "Lic. Ana Torres",
  "Arq. Luis Quispe",
  "Mg. Carla Mendoza",
  "Ing. Jorge Vargas",
  "Lic. Patricia Soto",
];

function esCursoMockLocal(cursoId: string) {
  return /^c-\d+/i.test(cursoId);
}

export type SenalesModalidadCurso = {
  mode?: Course["mode"] | null;
  modalidad?: string | null;
  categoria?: string | null;
  tieneSesionesEnVivo?: boolean;
};

export function categoriaEsClaseEnVivo(categoria?: string | null) {
  return /clase(s)?\s+en\s+vivo/i.test(String(categoria ?? ""));
}

function modeDesdeModalidadCruda(
  modalidad: string | null | undefined,
): Course["mode"] {
  const valor = String(modalidad ?? "").toUpperCase();
  if (valor === "EN_VIVO" || valor === "PRESENCIAL") return "Presencial";
  if (valor === "HIBRIDA" || valor === "HIBRIDO" || valor === "MIXTO") {
    return "Mixto";
  }
  return "Virtual";
}

/** ¿Es curso 100 % sincrónico (badge + ruta clase-en-vivo)? */
export function esCursoSoloClasesEnVivo(
  senales: SenalesModalidadCurso,
): boolean {
  if (senales.mode === "Presencial") return true;
  if (senales.mode === "Mixto") return false;

  const modalidad = String(senales.modalidad ?? "").trim().toUpperCase();
  if (modalidad === "EN_VIVO" || modalidad === "PRESENCIAL") return true;
  if (
    modalidad === "HIBRIDA" ||
    modalidad === "HIBRIDO" ||
    modalidad === "MIXTO"
  ) {
    return false;
  }

  if (categoriaEsClaseEnVivo(senales.categoria)) return true;
  if (senales.tieneSesionesEnVivo && senales.mode !== "Virtual") return true;
  if (senales.tieneSesionesEnVivo && !modalidad) return true;
  if (senales.tieneSesionesEnVivo) return true;

  return false;
}

/** Mode efectivo para badge, catálogo y enrutado. */
export function modeConsumoCursoAlumno(
  senales: SenalesModalidadCurso,
): Course["mode"] {
  if (esCursoSoloClasesEnVivo(senales)) return "Presencial";
  if (senales.mode === "Mixto" || senales.mode === "Virtual") {
    return senales.mode;
  }
  return modeDesdeModalidadCruda(senales.modalidad);
}

/** Corrige mode cuando BD dejó VIRTUAL en cursos de clase en vivo. */
export function normalizarModeCurso(course: Course): Course["mode"] {
  return modeConsumoCursoAlumno({
    mode: course.mode,
    categoria: course.category,
  });
}

export function enrichCourse(course: Course): Course {
  const mode = normalizarModeCurso(course);
  const base = mode === course.mode ? course : { ...course, mode };

  if (!esCursoMockLocal(course.id)) return base;

  const seed = Number.parseInt(course.id.replace("c-", ""), 10) || 0;

  return {
    ...base,
    instructor: base.instructor ?? INSTRUCTORS[seed % INSTRUCTORS.length],
    rating: base.rating ?? Number((4.4 + (seed % 6) * 0.1).toFixed(1)),
    reviewCount: base.reviewCount ?? 180 + seed * 137,
    bestseller:
      base.bestseller ??
      (seed % 3 === 0 || course.id === "c-002" || course.id === "c-007"),
  };
}

export function enrichCourses(courses: Course[]) {
  return courses.map(enrichCourse);
}

export function formatCourseRating(rating: number | null | undefined) {
  const valor = Number(rating);
  if (!Number.isFinite(valor)) return "—";
  return valor.toFixed(1).replace(".", ",");
}

export function formatCoursePrice(course: Course) {
  if (!pasarelaCursosHabilitada || course.pricing === "free") return "Gratis";
  return `S/ ${(course.price ?? 0).toFixed(2).replace(".", ",")}`;
}

export function formatReviewCount(count: number | null | undefined) {
  const valor = Number(count);
  if (!Number.isFinite(valor) || valor < 0) return "0";
  return valor.toLocaleString("es-PE");
}

/** Etiqueta visible de modalidad en catálogo y tarjetas. */
export function etiquetaModalidadCurso(mode: Course["mode"]): string {
  if (mode === "Presencial") return "Clases en vivo";
  if (mode === "Mixto") return "Híbrido";
  return "Virtual";
}

export function modalidadSecundariaAMode(
  modalidad: string | null | undefined,
  categoria?: string | null,
): Course["mode"] {
  return modeConsumoCursoAlumno({
    mode: modeDesdeModalidadCruda(modalidad),
    modalidad,
    categoria,
  });
}

/** Cursos con sesiones sincrónicas (Meet) y calendario alumno. */
export function cursoAdmiteClasesEnVivo(mode: Course["mode"]) {
  return mode === "Presencial" || mode === "Mixto";
}

export function claseModalidadCurso(mode: Course["mode"]) {
  if (mode === "Presencial") {
    return "border-rose-500/50 bg-rose-600 text-[10px] font-black uppercase tracking-wide text-white shadow-sm dark:bg-rose-500 dark:text-white";
  }
  if (mode === "Mixto") {
    return "border-violet-500/35 bg-violet-500/15 text-violet-800 dark:text-violet-200";
  }
  return "border-border bg-muted/90 text-muted-foreground";
}

export function claseModalidadImparticion(
  modalidad: "VIRTUAL" | "EN_VIVO" | "HIBRIDA",
) {
  if (modalidad === "EN_VIVO") return claseModalidadCurso("Presencial");
  if (modalidad === "HIBRIDA") return claseModalidadCurso("Mixto");
  return claseModalidadCurso("Virtual");
}

export function etiquetaModalidadImparticion(
  modalidad: "VIRTUAL" | "EN_VIVO" | "HIBRIDA",
) {
  if (modalidad === "EN_VIVO") return "Clases en vivo";
  if (modalidad === "HIBRIDA") return "Híbrido";
  return "Virtual";
}
