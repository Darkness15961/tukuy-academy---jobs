import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { crearAlmacenDocumento } from "@/api/repositorio-local";
import { authService } from "@/api/services/auth.service";
import {
  user as userMock,
  workExperiences as workExperiencesMock,
} from "@/data/academia.mock";
import { USUARIO_SESION_KEY } from "@/lib/constants";
import { env } from "@/lib/env";
import { urlFotoPerfilReal } from "@/lib/foto-perfil";
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

function perfilSesionAuth(): UserProfile | null {
  const guardado = localStorage.getItem(USUARIO_SESION_KEY);
  if (!guardado) return null;
  try {
    return JSON.parse(guardado) as UserProfile;
  } catch {
    return null;
  }
}

function fusionarPerfilAuth(auth: UserProfile, local: UserProfile): UserProfile {
  const localEsDemo =
    local.name === userMock.name && local.trade === userMock.trade;
  return {
    ...local,
    name: auth.name || local.name,
    initials: auth.initials || local.initials,
    avatarUrl:
      urlFotoPerfilReal(auth.avatarUrl) || urlFotoPerfilReal(local.avatarUrl),
    trade: localEsDemo ? auth.trade || local.trade : local.trade,
    specialty: localEsDemo
      ? auth.specialty || local.specialty
      : local.specialty,
    location: localEsDemo ? auth.location || local.location : local.location,
  };
}

export const usuarioService = {
  async getProfile(): Promise<UserProfile> {
    if (env.authProvider === "supabase") {
      let authPerfil = perfilSesionAuth();
      try {
        authPerfil = mapUserProfileDto(await authService.me());
        localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(authPerfil));
      } catch {
        // Conserva la sesión local si /me falla temporalmente.
      }
      if (authPerfil) {
        const local = perfilLocal.leer();
        const fusionado = fusionarPerfilAuth(authPerfil, local);
        // Evita que el mock "Carlos Alberto" se quede pegado tras login Google.
        if (local.name === userMock.name) {
          perfilLocal.guardar({
            ...local,
            name: fusionado.name,
            initials: fusionado.initials,
            avatarUrl: fusionado.avatarUrl,
            trade: fusionado.trade,
            specialty: fusionado.specialty,
            location: fusionado.location,
          });
        }
        return resolveMock(fusionado);
      }
    }

    if (apiConfig.useMock) {
      return resolveMock(perfilLocal.leer());
    }

    const { data } = await api.get<UserProfileDto>(API.user.profile);
    return mapUserProfileDto(data);
  },

  async getExperiences(): Promise<WorkExperience[]> {
    if (apiConfig.useMock || env.authProvider === "supabase") {
      return resolveMock(experienciasLocales.leer());
    }

    const { data } = await api.get<WorkExperienceDto[]>(API.user.experiences);
    return mapWorkExperienceList(data);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (apiConfig.useMock || env.authProvider === "supabase") {
      const actual = await this.getProfile();
      const siguiente = { ...actual, ...updates };
      perfilLocal.guardar(siguiente);
      const sesion = perfilSesionAuth();
      if (sesion) {
        localStorage.setItem(
          USUARIO_SESION_KEY,
          JSON.stringify({
            ...sesion,
            name: siguiente.name,
            initials: siguiente.initials,
            avatarUrl: siguiente.avatarUrl,
          }),
        );
      }
      return resolveMock(siguiente);
    }
    const { data } = await api.patch<UserProfileDto>(API.user.profile, updates);
    return mapUserProfileDto(data);
  },

  async updateExperiences(
    experiences: WorkExperience[],
  ): Promise<WorkExperience[]> {
    if (apiConfig.useMock || env.authProvider === "supabase") {
      return resolveMock(experienciasLocales.guardar(experiences));
    }
    const { data } = await api.put<WorkExperienceDto[]>(
      API.user.experiences,
      experiences,
    );
    return mapWorkExperienceList(data);
  },
};
