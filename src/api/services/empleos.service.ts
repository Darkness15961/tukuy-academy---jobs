import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { jobs as jobsMock } from "@/data/academia.mock";
import { mapJobList } from "@/mappers/academia.mapper";
import type { JobDto } from "@/types/api";
import type { Job } from "@/types/academia";

export const empleosService = {
  async getAll(): Promise<Job[]> {
    if (apiConfig.useMock) {
      return resolveMock(mapJobList(jobsMock));
    }

    const { data } = await api.get<JobDto[]>(API.jobs.list);
    return mapJobList(data);
  },
};
