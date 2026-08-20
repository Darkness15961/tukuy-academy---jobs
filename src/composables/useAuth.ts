import { ref } from "vue";
import { useRouter } from "vue-router";

import { authService } from "@/api/services/auth.service";
import {
  consumirDestinoTrasOnboarding,
  guardarDestinoTrasOnboarding,
  limpiarCacheOnboardingSesion,
  onboardingAprendizajeService,
} from "@/api/services/onboarding-aprendizaje.service";
import { invalidarCacheSecundaria } from "@/api/services/secundaria-gateway.service";
import { AUTH_TOKEN_KEY, USUARIO_SESION_KEY } from "@/lib/constants";
import { env } from "@/lib/env";
import {
  hayRecuperacionClave,
  limpiarRecuperacionClave,
} from "@/lib/recuperacion-clave";
import { invalidarCacheCursos } from "@/composables/useCursos";
import { inicialesNombre, urlFotoPerfilReal } from "@/lib/foto-perfil";
import {
  rutaInicioPortal,
  useContextoSesion,
} from "@/composables/useContextoSesion";
import type { RegistroRequestDto } from "@/types/api";
import type { UserProfile } from "@/types/academia";
import type { LoginResponseDto } from "@/types/api";

const isAuthenticated = ref(!!localStorage.getItem(AUTH_TOKEN_KEY));

function sanitizarPerfil(perfil: UserProfile): UserProfile {
  return {
    ...perfil,
    avatarUrl: urlFotoPerfilReal(perfil.avatarUrl),
    initials: perfil.initials || inicialesNombre(perfil.name),
  };
}

function usuarioGuardado(): UserProfile | null {
  const valor = localStorage.getItem(USUARIO_SESION_KEY);
  if (!valor) return null;
  try {
    return sanitizarPerfil(JSON.parse(valor) as UserProfile);
  } catch {
    localStorage.removeItem(USUARIO_SESION_KEY);
    return null;
  }
}

const currentUser = ref<UserProfile | null>(usuarioGuardado());

export function actualizarPerfilSesion(
  updates: Partial<UserProfile>,
): UserProfile | null {
  const base = currentUser.value ?? usuarioGuardado();
  if (!base) return null;
  const name = (updates.name ?? base.name).trim() || base.name;
  const siguiente = sanitizarPerfil({
    ...base,
    ...updates,
    name,
    initials: inicialesNombre(name, base.initials),
  });
  currentUser.value = siguiente;
  localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(siguiente));
  return siguiente;
}

export function useAuth() {
  const router = useRouter();
  const {
    membresiasActivas,
    contextoActivo,
    configurarMembresias,
    seleccionarContexto,
    limpiarSesionMultiempresa,
  } = useContextoSesion();
  const loading = ref(false);
  const error = ref<string | null>(null);

  function prepararCatalogoTrasLogin() {
    invalidarCacheCursos();
    invalidarCacheSecundaria();
  }

  async function redirigirTrasAuth(destinoDespues?: string | null) {
    const destinoSeguro =
      destinoDespues?.startsWith("/") &&
      !destinoDespues.startsWith("//") &&
      destinoDespues !== "/onboarding-aprendizaje"
        ? destinoDespues
        : null;

    if (destinoSeguro) {
      // Tras login/onboarding, asegurar contexto si hay un solo espacio.
      if (membresiasActivas.value.length === 1) {
        const membresia = membresiasActivas.value[0];
        if (membresia) seleccionarContexto(membresia);
      }
      prepararCatalogoTrasLogin();
      await router.push(destinoSeguro);
      return;
    }

    if (membresiasActivas.value.length === 1) {
      const membresia = membresiasActivas.value[0];
      if (membresia) {
        const contexto = seleccionarContexto(membresia);
        prepararCatalogoTrasLogin();
        await router.push(rutaInicioPortal(contexto.portal));
        return;
      }
    }

    prepararCatalogoTrasLogin();
    await router.push("/seleccionar-contexto");
  }

  /**
   * Tras el cuestionario: mismo aterrizaje que un login normal (catálogo),
   * no restaurar rutas previas vacías (p. ej. Mi aprendizaje sin matrículas).
   */
  async function continuarTrasOnboarding() {
    consumirDestinoTrasOnboarding();
    await redirigirTrasAuth(null);
  }

  async function completarSesion(
    response: LoginResponseDto,
    destinoDespues?: string,
    redirigirAutomaticamente = true,
  ) {
    if (hayRecuperacionClave()) {
      const usuario = sanitizarPerfil(response.user);
      localStorage.setItem(AUTH_TOKEN_KEY, response.token);
      localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(usuario));
      currentUser.value = usuario;
      isAuthenticated.value = true;
      if (router.currentRoute.value.name !== "restablecer-clave") {
        await router.replace({ name: "restablecer-clave" });
      }
      return;
    }

    const usuario = sanitizarPerfil(response.user);
    localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    localStorage.setItem(USUARIO_SESION_KEY, JSON.stringify(usuario));
    currentUser.value = usuario;
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

    // Al abrir manualmente "Cambiar perfil" solo actualizamos los contextos;
    // la selección automática de un único perfil pertenece al flujo de login.
    if (!redirigirAutomaticamente) return;

    try {
      const requiere = await onboardingAprendizajeService.requiereOnboarding();
      if (requiere) {
        guardarDestinoTrasOnboarding(destinoSeguro);
        if (router.currentRoute.value.name !== "onboarding-aprendizaje") {
          await router.push({ name: "onboarding-aprendizaje" });
        }
        return;
      }
    } catch (err) {
      console.warn("[auth] No se pudo verificar onboarding:", err);
    }

    await redirigirTrasAuth(destinoSeguro);
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

  async function solicitarRecuperacionClave(correo: string) {
    loading.value = true;
    error.value = null;
    try {
      await authService.solicitarRecuperacionClave(correo);
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "No se pudo enviar el enlace";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function completarOAuth(destinoDespues?: string) {
    loading.value = true;
    error.value = null;
    try {
      if (hayRecuperacionClave()) {
        await router.replace({ name: "restablecer-clave" });
        return;
      }
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

  async function restablecerClave(passwordNuevo: string) {
    loading.value = true;
    error.value = null;
    try {
      await authService.restablecerClaveConSesion(passwordNuevo);
      limpiarRecuperacionClave();
      const response = await authService.sesionActual();
      await completarSesion(response);
    } catch (err) {
      error.value =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la clave";
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
    if (hayRecuperacionClave()) return;
    const response = await authService.sesionActual();
    await completarSesion(
      response,
      destinoDespues,
      redirigirAutomaticamente,
    );
  }

  /** Tras cambiar perfiles/asignaciones en Equipos: refresca permisos del contexto. */
  async function refrescarMembresias() {
    if (env.authProvider !== "supabase") return;
    try {
      const memberships = await authService.refrescarMembresias();
      configurarMembresias(memberships);
    } catch (err) {
      console.warn("[auth] No se pudieron refrescar membresías:", err);
    }
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USUARIO_SESION_KEY);
      limpiarCacheOnboardingSesion();
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
      const usuario = sanitizarPerfil(await authService.me());
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
    solicitarRecuperacionClave,
    completarOAuth,
    restablecerClave,
    sincronizarSesion,
    refrescarMembresias,
    continuarTrasOnboarding,
    logout,
    restaurarUsuario,
    actualizarPerfilSesion,
  };
}
