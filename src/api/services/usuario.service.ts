import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { crearAlmacenDocumento } from "@/api/repositorio-local";
import {
  user as userMock,
  workExperiences as workExperiencesMock,
} from "@/data/academia.mock";
import {
  mapUserProfileDto,
  mapWorkExperienceList,
} from "@/mappers/academia.mapper";
import type { UserProfileDto, WorkExperienceDto } from "@/types/api";
import type { UserProfile, WorkExperience } from "@/types/academia";

const perfilLocal = crearAlmacenDocumento(
  "tukuy_demo_perfil_laboral",
  mapUserProfileDto(userMock),
);
const experienciasLocales = crearAlmacenDocumento(
  "tukuy_demo_experiencias_laborales",
  mapWorkExperienceList(workExperiencesMock),
);

export const usuarioService = {
  async getProfile(): Promise<UserProfile> {
    if (apiConfig.useMock) {
      return resolveMock(perfilLocal.leer());
    }

    const { data } = await api.get<UserProfileDto>(API.user.profile);
    return mapUserProfileDto(data);
  },

  async getExperiences(): Promise<WorkExperience[]> {
    if (apiConfig.useMock) {
      return resolveMock(experienciasLocales.leer());
    }

    const { data } = await api.get<WorkExperienceDto[]>(API.user.experiences);
    return mapWorkExperienceList(data);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (apiConfig.useMock) {
      return resolveMock(perfilLocal.guardar({ ...perfilLocal.leer(), ...updates }));
    }
    const { data } = await api.patch<UserProfileDto>(API.user.profile, updates);
    return mapUserProfileDto(data);
  },

  async updateExperiences(
    experiences: WorkExperience[],
  ): Promise<WorkExperience[]> {
    if (apiConfig.useMock) {
      return resolveMock(experienciasLocales.guardar(experiences));
    }
    const { data } = await api.put<WorkExperienceDto[]>(
      API.user.experiences,
      experiences,
    );
    return mapWorkExperienceList(data);
  },
};
