import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { courses as coursesMock } from "@/data/academia.mock";
import { fusionarCatalogoConEntidades } from "@/lib/cursos-catalogo";
import { cursoEstadoVisibleEnCatalogoAlumno } from "@/lib/catalogo-alumno";
import { mapCourseList } from "@/mappers/academia.mapper";
import {
  mapearCursoSecundariaAPortal,
  mapearMatriculaAPortal,
} from "@/api/services/mapper-curso-secundaria";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import { useContextoSesion } from "@/composables/useContextoSesion";
import type { CourseDto } from "@/types/api";
import type { Course } from "@/types/academia";

/** Último listado secundaria: cuántos cursos había vs cuántos salen al alumno. */
export type MetaCatalogoAlumno = {
  totalSecundaria: number;
  visibles: number;
  ocultosPorEstado: number;
};

let metaCatalogoAlumno: MetaCatalogoAlumno | null = null;

export function obtenerMetaCatalogoAlumno() {
  return metaCatalogoAlumno;
}

function catalogoLocal(): Course[] {
  return fusionarCatalogoConEntidades(mapCourseList(coursesMock));
}

export const cursosService = {
  async getAll(): Promise<Course[]> {
    const portal = useContextoSesion().contextoActivo.value?.portal;
    // Solo el portal estudiante consulta secundaria (bootstrap / mis-cursos).
    // Landing pública, org, docente y admin no deben disparar 401 sin sesión.
    if (portal !== "estudiante") {
      metaCatalogoAlumno = null;
      if (apiConfig.useMock || !portal) {
        return resolveMock(catalogoLocal());
      }
      return [];
    }

    if (apiConfig.secundariaCursos) {
      let listado;
      let mis;
      try {
        const boot = await secundariaGatewayService.bootstrapAlumno();
        listado = boot.cursos;
        mis = boot.misCursos;
      } catch {
        [listado, mis] = await Promise.all([
          secundariaGatewayService.listarCursos(),
          secundariaGatewayService.listarMisCursos().catch(() => ({
            ok: true as const,
            total: 0,
            cursos: [],
          })),
        ]);
      }
      const porMatricula = new Map(
        mis.cursos.map((item) => [item.cursoId, item]),
      );
      const brutos = Array.isArray(listado?.cursos) ? listado.cursos : [];
      const desdeCatalogo = brutos
        .filter(
          (curso) =>
            porMatricula.has(curso.id) ||
            cursoEstadoVisibleEnCatalogoAlumno(curso.estado),
        )
        .map((curso) =>
          mapearCursoSecundariaAPortal(curso, porMatricula.get(curso.id)),
        );
      const soloMatricula = mis.cursos
        .filter((item) => !brutos.some((curso) => curso.id === item.cursoId))
        .map(mapearMatriculaAPortal);

      metaCatalogoAlumno = {
        totalSecundaria: brutos.length,
        visibles: brutos.filter((c) =>
          cursoEstadoVisibleEnCatalogoAlumno(c.estado),
        ).length,
        ocultosPorEstado: brutos.filter(
          (c) =>
            !cursoEstadoVisibleEnCatalogoAlumno(c.estado) &&
            !porMatricula.has(c.id),
        ).length,
      };

      return [...desdeCatalogo, ...soloMatricula];
    }

    metaCatalogoAlumno = null;
    if (apiConfig.useMock) {
      return resolveMock(catalogoLocal());
    }

    const { data } = await api.get<CourseDto[]>(API.courses.list);
    return fusionarCatalogoConEntidades(mapCourseList(data));
  },
};
