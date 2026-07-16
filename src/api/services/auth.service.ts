import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { user as userMock } from "@/data/academia.mock";
import { membresiasMock } from "@/data/contextos-sesion.mock";
import { MOCK_CREDENTIALS } from "@/lib/constants";
import type {
  LoginRequestDto,
  LoginResponseDto,
  UserProfileDto,
} from "@/types/api";

export const authService = {
  async login(credentials: LoginRequestDto): Promise<LoginResponseDto> {
    if (apiConfig.useMock) {
      const username = credentials.dni.trim();
      const password = credentials.password.trim();

      if (!username || !password) {
        throw new Error("Ingresa tu usuario y clave");
      }

      if (
        username !== MOCK_CREDENTIALS.username ||
        password !== MOCK_CREDENTIALS.password
      ) {
        throw new Error("Usuario o clave incorrectos");
      }

      return resolveMock({
        token: "mock-token",
        user: userMock,
        memberships: membresiasMock,
      });
    }

    const { data } = await api.post<LoginResponseDto>(
      API.auth.login,
      credentials,
    );
    return data;
  },

  async logout(): Promise<void> {
    if (apiConfig.useMock) return;
    await api.post(API.auth.logout);
  },

  async me(): Promise<UserProfileDto> {
    if (apiConfig.useMock) return resolveMock(userMock);
    const { data } = await api.get<UserProfileDto>(API.auth.me);
    return data;
  },
};
