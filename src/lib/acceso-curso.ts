import { apiConfig } from "@/api/config";
import { aprendizajeService } from "@/api/services/aprendizaje.service";
import {
  ErrorGatewaySecundaria,
  secundariaGatewayService,
} from "@/api/services/secundaria-gateway.service";
import { pasarelaCursosHabilitada } from "@/lib/pasarela-cursos";
import { mensajeUsuarioDeError } from "@/lib/mensaje-error";
import type { Course } from "@/types/academia";

export { cursoEstadoVisibleEnCatalogoAlumno } from "@/lib/catalogo-alumno";
export { cursoEsDePago, pasarelaCursosHabilitada } from "@/lib/pasarela-cursos";
export { ErrorGatewaySecundaria };

export function mensajeErrorMatricula(causa: unknown) {
  if (causa instanceof ErrorGatewaySecundaria && causa.code === "NO_PUBLICADO") {
    return causa.message;
  }
  return mensajeUsuarioDeError(
    causa,
    "No se pudo completar la inscripción. Inténtalo de nuevo.",
  );
}

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
  if (!pasarelaCursosHabilitada) return false;
  return course.pricing === "paid" && !cursoEstaMatriculado(course);
}

/** Curso que puede inscribirse sin pasar por checkout. */
export function cursoPuedeInscribirseGratis(course: Course) {
  if (!pasarelaCursosHabilitada) return !cursoEstaMatriculado(course);
  return course.pricing === "free" && !cursoEstaMatriculado(course);
}

/**
 * Activa acceso tras compra o inscripción gratuita.
 * Persiste progreso y actualiza el curso en memoria si está en la lista.
 */
type OpcionesMatriculaCurso = {
  /** Evita cambiar la tarjeta del catálogo antes de entrar al reproductor. */
  actualizarLista?: boolean;
};

function aplicarMatriculaEnLista(curso: Course) {
  if (!cursoEstaMatriculado(curso)) {
    curso.status = "En curso";
    curso.progress = Math.max(curso.progress, 0);
  } else if (curso.status === "Disponible") {
    curso.status = "En curso";
  }
}

export async function matricularCurso(
  cursoId: string,
  cursos?: Course[],
  opciones: OpcionesMatriculaCurso = {},
): Promise<void> {
  const actualizarLista = opciones.actualizarLista !== false;
  const curso = cursos?.find((item) => item.id === cursoId);

  if (apiConfig.secundariaCursos) {
    await secundariaGatewayService.matricularCurso(cursoId);
    if (actualizarLista && curso) aplicarMatriculaEnLista(curso);
    return;
  }

  if (actualizarLista && curso) {
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
