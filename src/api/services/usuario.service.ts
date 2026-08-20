import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { crearAlmacenDocumento } from "@/api/repositorio-local";
import { authService } from "@/api/services/auth.service";
import { cuentaAlumnoService } from "@/api/services/cuenta-alumno.service";
import {
  user as userMock,
  workExperiences as workExperiencesMock,
} from "@/data/academia.mock";
import { USUARIO_SESION_KEY } from "@/lib/constants";
import { env } from "@/lib/env";
import { urlFotoPerfilReal } from "@/lib/foto-perfil";
import { actualizarPerfilSesion } from "@/composables/useAuth";
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

function completarProgresoPerfil(perfil: UserProfile): number {
  const campos = [
    perfil.name,
    perfil.email,
    perfil.phone,
    perfil.birthDate,
    perfil.trade,
    perfil.specialty,
    perfil.location,
    perfil.avatarUrl,
  ];
  const llenos = campos.filter((valor) => String(valor ?? "").trim()).length;
  return Math.round((llenos / campos.length) * 100);
}

function perfilRealDesdeAuth(auth: UserProfile): UserProfile {
  return {
    ...auth,
    avatarUrl: urlFotoPerfilReal(auth.avatarUrl),
    trade: auth.trade?.trim() || "",
    specialty: auth.specialty?.trim() || "",
    location: auth.location?.trim() || "",
    profileProgress: completarProgresoPerfil(auth),
    employabilityScore: 0,
    certificates: auth.certificates ?? 0,
    applications: 0,
  };
}

export const usuarioService = {
  async getProfile(): Promise<UserProfile> {
    if (env.authProvider === "supabase") {
      let authPerfil = perfilSesionAuth();
      try {
        authPerfil = mapUserProfileDto(await authService.me());
      } catch {
        // Conserva la sesión local si /me falla temporalmente.
      }
      if (authPerfil) {
        try {
          const cuenta = await cuentaAlumnoService.obtener();
          authPerfil = {
            ...authPerfil,
            email: cuenta.correo || authPerfil.email,
            phone: cuenta.telefono || authPerfil.phone,
            birthDate: cuenta.fechaNacimiento || authPerfil.birthDate,
            name: cuenta.nombre || authPerfil.name,
            authProvider: cuenta.proveedor || authPerfil.authProvider,
          };
        } catch {
          /* RPC aún no aplicada: usa auth */
        }
        const real = perfilRealDesdeAuth(authPerfil);
        localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(real));
        return real;
      }
    }

    if (apiConfig.useMock) {
      return resolveMock(perfilLocal.leer());
    }

    const { data } = await api.get<UserProfileDto>(API.user.profile);
    return mapUserProfileDto(data);
  },

  async getExperiences(): Promise<WorkExperience[]> {
    if (apiConfig.sinDatosDemo) {
      return [];
    }
    if (apiConfig.useMock || env.authProvider === "supabase") {
      return resolveMock(experienciasLocales.leer());
    }

    const { data } = await api.get<WorkExperienceDto[]>(API.user.experiences);
    return mapWorkExperienceList(data);
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (env.authProvider === "supabase") {
      if (
        updates.phone !== undefined ||
        updates.birthDate !== undefined ||
        updates.name !== undefined
      ) {
        await cuentaAlumnoService.guardar({
          ...(updates.phone !== undefined
            ? { telefono: updates.phone }
            : {}),
          ...(updates.birthDate !== undefined
            ? { fechaNacimiento: updates.birthDate }
            : {}),
          ...(updates.name !== undefined ? { nombre: updates.name } : {}),
        });
      }
      const actual = await this.getProfile();
      const siguiente = perfilRealDesdeAuth({ ...actual, ...updates });
      localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(siguiente));
      actualizarPerfilSesion(siguiente);
      return siguiente;
    }
    if (apiConfig.useMock) {
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
