import { ref } from "vue";
import { useRouter } from "vue-router";

import { authService } from "@/api/services/auth.service";
import { AUTH_TOKEN_KEY, USUARIO_SESION_KEY } from "@/lib/constants";
import { env } from "@/lib/env";
import {
  rutaInicioPortal,
  useContextoSesion,
} from "@/composables/useContextoSesion";
import type { RegistroRequestDto } from "@/types/api";
import type { UserProfile } from "@/types/academia";
import type { LoginResponseDto } from "@/types/api";

const isAuthenticated = ref(!!localStorage.getItem(AUTH_TOKEN_KEY));
function usuarioGuardado(): UserProfile | null {
  const valor = localStorage.getItem(USUARIO_SESION_KEY);
  if (!valor) return null;
  try {
    return JSON.parse(valor) as UserProfile;
  } catch {
    localStorage.removeItem(USUARIO_SESION_KEY);
    return null;
  }
}

const currentUser = ref<UserProfile | null>(usuarioGuardado());

export function useAuth() {
  const router = useRouter();
  const {
    membresiasActivas,
    configurarMembresias,
    seleccionarContexto,
    limpiarSesionMultiempresa,
  } = useContextoSesion();
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function completarSesion(
    response: LoginResponseDto,
    destinoDespues?: string,
    redirigirAutomaticamente = true,
  ) {
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(response.user));
    currentUser.value = response.user;
    isAuthenticated.value = true;
    if (env.authProvider === "supabase" && !response.memberships?.length) {
      limpiarSesionMultiempresa();
    } else {
      configurarMembresias(response.memberships);
    }

    const destinoSeguro =
      destinoDespues?.startsWith("/") && !destinoDespues.startsWith("//")
        ? destinoDespues
        : null;

    if (destinoSeguro) {
      await router.push(destinoSeguro);
      return;
    }

    // Al abrir manualmente "Cambiar perfil" solo actualizamos los contextos;
    // la selección automática de un único perfil pertenece al flujo de login.
    if (!redirigirAutomaticamente) return;

    if (membresiasActivas.value.length === 1) {
      const membresia = membresiasActivas.value[0];
      if (membresia) {
        const contexto = seleccionarContexto(membresia);
        await router.push(rutaInicioPortal(contexto.portal));
        return;
      }
    }

    await router.push("/seleccionar-contexto");
  }

  async function login(
    dni: string,
    password: string,
    destinoDespues?: string,
  ) {
    loading.value = true;
    error.value = null;
    try {
      const response = await authService.login({ dni, password });
      await completarSesion(response, destinoDespues);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "No se pudo iniciar sesión";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function registrar(
    datos: RegistroRequestDto,
    destinoDespues?: string,
  ) {
    loading.value = true;
    error.value = null;
    try {
      const response = await authService.registrar(datos);
      await completarSesion(response, destinoDespues);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "No se pudo crear la cuenta";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loginConGoogle(destinoDespues?: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await authService.loginConGoogle(destinoDespues);
      // Supabase redirige a Google; la sesión se completa en /auth/callback.
      if (response) await completarSesion(response, destinoDespues);
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "No se pudo continuar con Google";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function completarOAuth(destinoDespues?: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await authService.sesionActual();
      await completarSesion(response, destinoDespues);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "No se pudo completar el acceso";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function sincronizarSesion(
    destinoDespues?: string,
    redirigirAutomaticamente = true,
  ) {
    if (env.authProvider !== "supabase") return;
    const response = await authService.sesionActual();
    await completarSesion(
      response,
      destinoDespues,
      redirigirAutomaticamente,
    );
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USUARIO_SESION_KEY);
      limpiarSesionMultiempresa();
      currentUser.value = null;
      isAuthenticated.value = false;
      await router.push("/");
    }
  }

  async function restaurarUsuario() {
    if (!isAuthenticated.value || currentUser.value?.avatarUrl) {
      return currentUser.value;
    }
    try {
      const usuario = await authService.me();
      currentUser.value = usuario;
      localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(usuario));
      return usuario;
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USUARIO_SESION_KEY);
      currentUser.value = null;
      isAuthenticated.value = false;
      return null;
    }
  }

  return {
    isAuthenticated,
    currentUser,
    loading,
    error,
    login,
    registrar,
    loginConGoogle,
    completarOAuth,
    sincronizarSesion,
    logout,
    restaurarUsuario,
  };
}
