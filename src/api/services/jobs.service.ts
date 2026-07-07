import { api } from '@/api/client'
import { apiConfig } from '@/api/config'
import { API } from '@/api/endpoints'
import { resolveMock } from '@/api/mock'
import { jobs as jobsMock } from '@/data/academy.mock'
import { mapJobList } from '@/mappers/academy.mapper'
import type { JobDto } from '@/types/api'
import type { Job } from '@/types/academy'

export const jobsService = {
  async getAll(): Promise<Job[]> {
    if (apiConfig.useMock) {
      return resolveMock(mapJobList(jobsMock))
    }

    const { data } = await api.get<JobDto[]>(API.jobs.list)
    return mapJobList(data)
  },
}
