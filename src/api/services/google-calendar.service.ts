import { supabasePrincipal } from "@/lib/supabase";

export type EstadoGoogleCalendar = {
  conectado: boolean;
  googleEmail?: string;
  conectadoEn?: string;
};

export const googleCalendarService = {
  async estado(): Promise<EstadoGoogleCalendar> {
    const { data, error } = await supabasePrincipal().functions.invoke(
      "google-calendar-oauth",
      { body: { action: "estado" } },
    );
    if (error) {
      throw new Error(error.message);
    }
    const raw = (data ?? {}) as Record<string, unknown>;
    if (raw.ok === false) {
      throw new Error(String(raw.error ?? "No se pudo consultar Google Calendar"));
    }
    return {
      conectado: raw.conectado === true,
      googleEmail:
        typeof raw.googleEmail === "string" ? raw.googleEmail : undefined,
      conectadoEn:
        typeof raw.conectadoEn === "string" ? raw.conectadoEn : undefined,
    };
  },

  async iniciarConexion(continuar?: string): Promise<void> {
    const { data, error } = await supabasePrincipal().functions.invoke(
      "google-calendar-oauth",
      {
        body: {
          action: "iniciar",
          continuar: continuar ?? "/tukuy-academy/configuracion",
        },
      },
    );
    if (error) {
      throw new Error(error.message);
    }
    const raw = (data ?? {}) as { ok?: boolean; url?: string; error?: string };
    if (raw.ok === false || !raw.url) {
      throw new Error(raw.error ?? "No se pudo iniciar la conexión con Google");
    }
    window.location.assign(raw.url);
  },

  async desconectar(): Promise<void> {
    const { data, error } = await supabasePrincipal().functions.invoke(
      "google-calendar-oauth",
      { body: { action: "desconectar" } },
    );
    if (error) {
      throw new Error(error.message);
    }
    const raw = (data ?? {}) as { ok?: boolean; error?: string };
    if (raw.ok === false) {
      throw new Error(raw.error ?? "No se pudo desconectar Google Calendar");
    }
  },
};
