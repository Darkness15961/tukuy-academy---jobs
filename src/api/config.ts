import { env } from "@/lib/env";

export const apiConfig = {
  baseURL: env.apiUrl,
  useMock: env.useMock,
  secundariaCursos: env.secundariaCursos,
  // Con Supabase el delay artificial solo suma latencia a catálogos locales
  // (Personas/Alumnos ya esperan RPCs/gateway reales).
  mockDelayMs: env.useMock && env.authProvider !== "supabase" ? 600 : 0,
};
