import { aprendizajeService } from "@/api/services/aprendizaje.service";
import type { Course } from "@/types/academia";

/** El alumno ya tiene acceso al reproductor (comprado, inscrito o en progreso). */
export function cursoEstaMatriculado(course: Pick<Course, "status" | "progress">) {
  return (
    course.status === "En curso" ||
    course.status === "Completado" ||
    course.progress > 0
  );
}

/** Curso de pago sin matrícula: debe ir al carrito / checkout. */
export function cursoRequiereCompra(course: Course) {
  return course.pricing === "paid" && !cursoEstaMatriculado(course);
}

/** Curso gratuito sin matrícula: puede inscribirse directo. */
export function cursoPuedeInscribirseGratis(course: Course) {
  return course.pricing === "free" && !cursoEstaMatriculado(course);
}

/**
 * Activa acceso tras compra o inscripción gratuita.
 * Persiste progreso y actualiza el curso en memoria si está en la lista.
 */
export async function matricularCurso(
  cursoId: string,
  cursos?: Course[],
): Promise<void> {
  const curso = cursos?.find((item) => item.id === cursoId);
  if (curso) {
    if (!cursoEstaMatriculado(curso)) {
      curso.status = "En curso";
      curso.progress = 0;
    } else if (curso.status === "Disponible") {
      curso.status = "En curso";
    }
  }

  await aprendizajeService.guardarProgreso(cursoId, {
    progreso: curso?.progress ?? 0,
    estado: curso?.status === "Completado" ? "Completado" : "En curso",
  });
}

export async function matricularCursos(
  cursoIds: string[],
  cursos?: Course[],
): Promise<void> {
  for (const id of [...new Set(cursoIds)]) {
    await matricularCurso(id, cursos);
  }
}
