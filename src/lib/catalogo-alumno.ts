const ESTADOS_PUBLICADOS_ALUMNO = new Set([
  "PUBLICADO",
  "PUBLICADA",
  "ACTIVO",
  "ACTIVA",
  "APROBADO",
  "APROBADA",
]);

/** Borradores / en revisión no salen en el catálogo del alumno (sí si ya está matriculado). */
export function cursoEstadoVisibleEnCatalogoAlumno(
  estado: string | null | undefined,
) {
  return ESTADOS_PUBLICADOS_ALUMNO.has((estado ?? "").trim().toUpperCase());
}

type CursoCatalogoAlumno = {
  visibleEnCatalogo?: boolean;
  estadoPublicacion?: string | null;
};

/**
 * Catálogo del alumno: publicados. Mock (sin estado) sigue visible.
 * Cursos solo-matrícula marcan visibleEnCatalogo=false.
 */
export function cursoVisibleEnCatalogoAlumno(curso: CursoCatalogoAlumno) {
  if (curso.visibleEnCatalogo === false) return false;
  if (curso.visibleEnCatalogo === true) return true;
  if (curso.estadoPublicacion) {
    return cursoEstadoVisibleEnCatalogoAlumno(curso.estadoPublicacion);
  }
  return true;
}
