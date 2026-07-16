import axios from "axios";

import { apiConfig } from "@/api/config";
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
  headers: { "Content-Type": "application/json" },
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
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USUARIO_SESION_KEY);
      localStorage.removeItem(MEMBRESIAS_KEY);
      localStorage.removeItem(CONTEXTO_SESION_KEY);
      if (!apiConfig.useMock && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);
