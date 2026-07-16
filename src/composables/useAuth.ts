import { ref } from "vue";
import { useRouter } from "vue-router";

import { authService } from "@/api/services/auth.service";
import { AUTH_TOKEN_KEY, USUARIO_SESION_KEY } from "@/lib/constants";
import {
  rutaInicioPortal,
  useContextoSesion,
} from "@/composables/useContextoSesion";
import type { UserProfile } from "@/types/academia";

const isAuthenticated = ref(!!localStorage.getItem(AUTH_TOKEN_KEY));
function usuarioGuardado(): UserProfile | null {
  const valor = localStorage.getItem(USUARIO_SESION_KEY);
  if (!valor) return null;
  try {
    const usuario = JSON.parse(valor) as UserProfile;
    if (usuario.name === "Carlos Alberto") {
      const actualizado = {
        ...usuario,
        name: "Carlos Alberto",
        initials: "CA",
      };
      localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(actualizado));
      return actualizado;
    }
    return usuario;
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

  async function login(
    dni: string,
    password: string,
    destinoDespues?: string,
  ) {
    loading.value = true;
    error.value = null;
    try {
      const response = await authService.login({ dni, password });
      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
      localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(response.user));
      currentUser.value = response.user;
      isAuthenticated.value = true;
      configurarMembresias(response.memberships);

      const destinoSeguro =
        destinoDespues?.startsWith("/") && !destinoDespues.startsWith("//")
          ? destinoDespues
          : null;

      if (destinoSeguro) {
        await router.push(destinoSeguro);
        return;
      }

      if (membresiasActivas.value.length === 1) {
        const membresia = membresiasActivas.value[0];
        if (membresia) {
          const contexto = seleccionarContexto(membresia);
          await router.push(rutaInicioPortal(contexto.portal));
          return;
        }
      }

      await router.push("/seleccionar-contexto");
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "No se pudo iniciar sesión";
      throw err;
    } finally {
      loading.value = false;
    }
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
    if (!isAuthenticated.value || currentUser.value) return currentUser.value;
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
    logout,
    restaurarUsuario,
  };
}
