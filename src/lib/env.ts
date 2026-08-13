type EnvConfig = {
  apiUrl: string;
  appUrl: string;
  authProvider: "api" | "supabase";
  supabasePrimaryUrl: string;
  supabasePrimaryAnonKey: string;
  useMock: boolean;
  /** Lee cursos del portal docente desde la secundaria vía gateway. */
  secundariaCursos: boolean;
  /**
   * simulacion = pasarela demo (confirmar code 00 desde el browser).
   * dankira = formulario embebido @dankira/izipay + Edge izipay-lyra-proxy.
   * sdk = checkout pop-up Token/Generate (izipay-session) legado.
   */
  pagoModo: "simulacion" | "dankira" | "sdk";
  isProduction: boolean;
};

function readEnv(): EnvConfig {
  const isProduction = import.meta.env.PROD;
  const apiUrl = import.meta.env.VITE_API_URL?.trim() || "/api";
  const appUrl = import.meta.env.VITE_APP_URL?.trim() || window.location.origin;
  const authProvider =
    import.meta.env.VITE_AUTH_PROVIDER === "supabase" ? "supabase" : "api";
  const supabasePrimaryUrl =
    import.meta.env.VITE_SUPABASE_PRIMARY_URL?.trim() || "";
  const supabasePrimaryAnonKey =
    import.meta.env.VITE_SUPABASE_PRIMARY_ANON_KEY?.trim() || "";
  const useMock = import.meta.env.VITE_USE_MOCK !== "false";
  const secundariaCursos =
    import.meta.env.VITE_SECUNDARIA_CURSOS === "true";
  const pagoModoRaw = (import.meta.env.VITE_PAGO_MODO ?? "simulacion")
    .trim()
    .toLowerCase();
  const pagoModo: EnvConfig["pagoModo"] =
    pagoModoRaw === "dankira" || pagoModoRaw === "izipay"
      ? "dankira"
      : pagoModoRaw === "sdk"
        ? "sdk"
        : "simulacion";

  if (authProvider === "supabase") {
    if (!supabasePrimaryUrl || !supabasePrimaryAnonKey) {
      throw new Error(
        "[Tukuy Academy] Supabase Auth requiere VITE_SUPABASE_PRIMARY_URL y VITE_SUPABASE_PRIMARY_ANON_KEY.",
      );
    }
  }

  if (isProduction) {
    if (useMock) {
      throw new Error(
        '[Tukuy Academy] VITE_USE_MOCK debe ser "false" en producción. Configura las variables en tu plataforma de deploy.',
      );
    }

    if (!import.meta.env.VITE_API_URL?.trim()) {
      throw new Error(
        "[Tukuy Academy] VITE_API_URL es obligatorio en producción. Ejemplo: https://api.tudominio.com",
      );
    }

    if (apiUrl.startsWith("/")) {
      console.warn(
        "[Tukuy Academy] VITE_API_URL usa una ruta relativa. En producción conviene una URL absoluta del backend.",
      );
    }
  }

  return {
    apiUrl,
    appUrl,
    authProvider,
    supabasePrimaryUrl,
    supabasePrimaryAnonKey,
    useMock,
    secundariaCursos,
    pagoModo,
    isProduction,
  };
}

export const env = readEnv();
