import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import {
  AUTH_TOKEN_KEY,
  CONTEXTO_SESION_KEY,
  MEMBRESIAS_KEY,
  USUARIO_SESION_KEY,
} from "@/lib/constants";

let clientePrincipal: ReturnType<typeof createClient> | null = null;

/** Cliente público del proyecto principal. No contiene service_role. */
export function supabasePrincipal() {
  if (!env.supabasePrimaryUrl || !env.supabasePrimaryAnonKey) {
    throw new Error(
      "Supabase principal no está configurado. Revisa VITE_SUPABASE_PRIMARY_URL y VITE_SUPABASE_PRIMARY_ANON_KEY.",
    );
  }

  clientePrincipal ??= createClient(
    env.supabasePrimaryUrl,
    env.supabasePrimaryAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );

  return clientePrincipal;
}

/**
 * Mantiene compatible el token usado por el cliente HTTP durante la migración.
 * Supabase sigue siendo la fuente de verdad y administra renovación/expiración.
 */
export async function inicializarSesionSupabase() {
  if (env.authProvider !== "supabase") return;

  const cliente = supabasePrincipal();
  const { data } = await cliente.auth.getSession();
  if (data.session) {
    localStorage.setItem(AUTH_TOKEN_KEY, data.session.access_token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  cliente.auth.onAuthStateChange((_evento, sesion) => {
    if (sesion) {
      localStorage.setItem(AUTH_TOKEN_KEY, sesion.access_token);
      return;
    }

    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USUARIO_SESION_KEY);
    localStorage.removeItem(MEMBRESIAS_KEY);
    localStorage.removeItem(CONTEXTO_SESION_KEY);
  });
}
