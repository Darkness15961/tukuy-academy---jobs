import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { courses as coursesMock } from "@/data/academia.mock";
import { mapCourseList } from "@/mappers/academia.mapper";
import type { CourseDto } from "@/types/api";
import type { Course } from "@/types/academia";

export const cursosService = {
  async getAll(): Promise<Course[]> {
    if (apiConfig.useMock) {
      return resolveMock(mapCourseList(coursesMock));
    }

    const { data } = await api.get<CourseDto[]>(API.courses.list);
    return mapCourseList(data);
  },
};
