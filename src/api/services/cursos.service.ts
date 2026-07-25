import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { courses as coursesMock } from "@/data/academia.mock";
import { fusionarCatalogoConEntidades } from "@/lib/cursos-catalogo";
import { mapCourseList } from "@/mappers/academia.mapper";
import type { CourseDto } from "@/types/api";
import type { Course } from "@/types/academia";

export const cursosService = {
  async getAll(): Promise<Course[]> {
    if (apiConfig.useMock) {
      const base = mapCourseList(coursesMock);
      return resolveMock(fusionarCatalogoConEntidades(base));
    }

    const { data } = await api.get<CourseDto[]>(API.courses.list);
    return fusionarCatalogoConEntidades(mapCourseList(data));
  },
};
