import { api } from '@/api/client'
import { apiConfig } from '@/api/config'
import { API } from '@/api/endpoints'
import { resolveMock } from '@/api/mock'
import { courses as coursesMock } from '@/data/academy.mock'
import { mapCourseList } from '@/mappers/academy.mapper'
import type { CourseDto } from '@/types/api'
import type { Course } from '@/types/academy'

export const coursesService = {
  async getAll(): Promise<Course[]> {
    if (apiConfig.useMock) {
      return resolveMock(mapCourseList(coursesMock))
    }

    const { data } = await api.get<CourseDto[]>(API.courses.list)
    return mapCourseList(data)
  },
}
