import type { Course } from "@/types/academia";

import { env } from "@/lib/env";
import {
  esCursoSoloClasesEnVivo,
  modalidadSecundariaAMode,
  modeConsumoCursoAlumno,
  type SenalesModalidadCurso,
} from "@/lib/presentacion-curso";

export type SenalesCursoEnVivo = SenalesModalidadCurso;

/** Curso 100 % sincrónico (EN_VIVO): vista propia, sin reproductor virtual. */
export function cursoEsSoloClasesEnVivo(
  modeOrSenales?: Course["mode"] | SenalesCursoEnVivo | null,
  senalesExtra?: Omit<SenalesCursoEnVivo, "mode">,
): boolean {
  const senales: SenalesCursoEnVivo =
    modeOrSenales && typeof modeOrSenales === "object"
      ? { ...modeOrSenales, ...senalesExtra }
      : { mode: modeOrSenales, ...senalesExtra };
  return esCursoSoloClasesEnVivo(senales);
}

export function cursoEsSoloClasesEnVivoDesdeModalidad(
  modalidad?: string | null,
  categoria?: string | null,
) {
  return cursoEsSoloClasesEnVivo({
    mode: modalidadSecundariaAMode(modalidad, categoria),
    modalidad,
    categoria,
  });
}

export { modeConsumoCursoAlumno };

export function rutaConsumoCursoAlumno(
  courseId: string,
  modeOrSenales?: Course["mode"] | SenalesCursoEnVivo | null,
  senalesExtra?: Omit<SenalesCursoEnVivo, "mode">,
): string {
  const id = courseId.trim();
  const mode = modeConsumoCursoAlumno(
    modeOrSenales && typeof modeOrSenales === "object"
      ? { ...modeOrSenales, ...senalesExtra }
      : { mode: modeOrSenales, ...senalesExtra },
  );
  if (mode === "Presencial") {
    return `/tukuy-academy/clase-en-vivo/${id}`;
  }
  return `/tukuy-academy/aprendizaje/${id}`;
}

export function rutaConsumoCursoAlumnoDesdeModalidad(
  courseId: string,
  modalidad?: string | null,
  categoria?: string | null,
): string {
  return rutaConsumoCursoAlumno(courseId, {
    mode: modalidadSecundariaAMode(modalidad, categoria),
    modalidad,
    categoria,
  });
}

/** URL absoluta con login según modalidad del curso (correos de matrícula). */
export function urlPortalLoginConsumoCurso(
  cursoId: string,
  mode?: Course["mode"] | null,
  modalidad?: string | null,
  categoria?: string | null,
) {
  const id = cursoId.trim();
  if (!id) return undefined;
  const base = env.appUrl.replace(/\/$/, "");
  const ruta = rutaConsumoCursoAlumno(id, { mode, modalidad, categoria });
  return `${base}/login?continuar=${encodeURIComponent(ruta)}`;
}

/** Alias para correos de sesiones EN_VIVO. */
export function urlPortalLoginClaseEnVivo(cursoId: string) {
  return urlPortalLoginConsumoCurso(cursoId, "Presencial");
}
