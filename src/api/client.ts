import axios from "axios";

import { apiConfig } from "@/api/config";
import { env } from "@/lib/env";
import { mensajeUsuarioDeError } from "@/lib/mensaje-error";
import { toast } from "@/lib/toast";
import {
  AUTH_TOKEN_KEY,
  CONTEXTO_SESION_KEY,
  MEMBRESIAS_KEY,
  USUARIO_SESION_KEY,
} from "@/lib/constants";
import type { ContextoSesion } from "@/types/membresia.types";

export const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const contextoGuardado = localStorage.getItem(CONTEXTO_SESION_KEY);
  if (contextoGuardado) {
    try {
      const contexto = JSON.parse(contextoGuardado) as ContextoSesion;
      config.headers["X-Tukuy-Membresia-Id"] = contexto.membresiaId;
      config.headers["X-Tukuy-Rol-Id"] = contexto.rolId;
      if (contexto.organizacionId) {
        config.headers["X-Tukuy-Organizacion-Id"] = contexto.organizacionId;
      }
    } catch {
      localStorage.removeItem(CONTEXTO_SESION_KEY);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Durante la migración, los módulos antiguos aún consultan /api. Un 401
      // de ese backend no invalida una sesión administrada por Supabase Auth.
      // Supabase es la única fuente autorizada para cerrar esa sesión.
      if (env.authProvider === "supabase") {
        return Promise.reject(error);
      }
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USUARIO_SESION_KEY);
      localStorage.removeItem(MEMBRESIAS_KEY);
      localStorage.removeItem(CONTEXTO_SESION_KEY);
      if (!apiConfig.useMock && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    } else if (error.response?.status && error.response.status >= 400) {
      const crudo =
        (typeof error.response.data?.error === "string" &&
          error.response.data.error) ||
        (typeof error.response.data?.message === "string" &&
          error.response.data.message) ||
        error.message;
      const mensaje = mensajeUsuarioDeError(crudo);
      error.message = mensaje;
      const omitirToast = Boolean(
        (error.config as { skipErrorToast?: boolean } | undefined)
          ?.skipErrorToast,
      );
      if (!omitirToast) toast.error(mensaje);
    }
    return Promise.reject(error);
  },
);
