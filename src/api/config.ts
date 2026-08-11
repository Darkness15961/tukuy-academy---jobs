import { env } from "@/lib/env";

export const apiConfig = {
  baseURL: env.apiUrl,
  useMock: env.useMock,
  secundariaCursos: env.secundariaCursos,
  pagoModo: env.pagoModo,
  /**
   * Auth Supabase = entorno real: no inyectar semillas CIP/Andina/demos.
   * Los módulos sin BD aún pueden persistir vacío en localStorage (useMock).
   */
  sinDatosDemo: env.authProvider === "supabase",
  // Con Supabase el delay artificial solo suma latencia a catálogos locales
  // (Personas/Alumnos ya esperan RPCs/gateway reales).
  mockDelayMs: env.useMock && env.authProvider !== "supabase" ? 600 : 0,
};
