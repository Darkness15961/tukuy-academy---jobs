import type { Course } from "@/types/academia";

type FuenteCertificado = { certificado?: boolean | null };

/**
 * Resuelve si el curso emite certificado desde catálogo y/o matrícula secundaria.
 * Por defecto sí, salvo `certificado: false` explícito en borrador.
 */
export function resolverCertificadoCursoPortal(
  curso?: FuenteCertificado | null,
  matricula?: FuenteCertificado | null,
): boolean {
  if (typeof matricula?.certificado === "boolean") return matricula.certificado;
  if (typeof curso?.certificado === "boolean") return curso.certificado;
  return true;
}

/** El curso emite certificado (por defecto sí, salvo que el docente lo desactive). */
export function cursoOfreceCertificado(
  course: Pick<Course, "certificado"> | null | undefined,
): boolean {
  return resolverCertificadoCursoPortal(course);
}

export function cursoEstaCompletado(
  course: Pick<Course, "status" | "progress">,
): boolean {
  return course.status === "Completado" || (course.progress ?? 0) >= 100;
}
