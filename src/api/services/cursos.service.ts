import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { courses as coursesMock } from "@/data/academia.mock";
import { fusionarCatalogoConEntidades } from "@/lib/cursos-catalogo";
import { mapCourseList } from "@/mappers/academia.mapper";
import {
  mapearCursoSecundariaAPortal,
  mapearMatriculaAPortal,
} from "@/api/services/mapper-curso-secundaria";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import type { CourseDto } from "@/types/api";
import type { Course } from "@/types/academia";

export const cursosService = {
  async getAll(): Promise<Course[]> {
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
      const desdeCatalogo = listado.cursos.map((curso) =>
        mapearCursoSecundariaAPortal(curso, porMatricula.get(curso.id)),
      );
      const soloMatricula = mis.cursos
        .filter((item) => !listado.cursos.some((curso) => curso.id === item.cursoId))
        .map(mapearMatriculaAPortal);
      return [...desdeCatalogo, ...soloMatricula];
    }

    if (apiConfig.useMock) {
      const base = mapCourseList(coursesMock);
      return resolveMock(fusionarCatalogoConEntidades(base));
    }

    const { data } = await api.get<CourseDto[]>(API.courses.list);
    return fusionarCatalogoConEntidades(mapCourseList(data));
  },
};
