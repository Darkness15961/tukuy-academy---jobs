/**
 * OAuth Google Calendar por usuario (permiso para guardar clases en su agenda).
 *
 * POST { action: "estado" | "iniciar" | "desconectar", continuar?: string }
 * GET  ?code=...&state=...  (callback de Google)
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { scopeGoogleCalendarUsuario } from "../_shared/google-calendar-usuario.ts";
import { backfillCalendarioAlumnoMatriculado } from "../_shared/sincronizar-calendario-usuario.ts";

const INSTALACION_TUKUY = "30000000-0000-4000-8000-000000000001";

async function resolverSecundariaTukuy(
  principalUrl: string,
  serviceRole: string,
): Promise<{ url: string; key: string } | null> {
  const fijaUrl = Deno.env.get("SECONDARY_TUKUY_URL");
  const fijaKey = Deno.env.get("SECONDARY_TUKUY_SERVICE_ROLE_KEY");
  if (fijaUrl && fijaKey) return { url: fijaUrl, key: fijaKey };

  const admin = createClient(principalUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: conexion } = await admin
    .from("conexion_organizacion")
    .select("servidor_ref, secreto_ref")
    .eq("instalacion_organizacion_id", INSTALACION_TUKUY)
    .maybeSingle();
  if (!conexion) return null;

  const ref = String(conexion.secreto_ref ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const url = (ref ? Deno.env.get(`${ref}_URL`) : null) ??
    (conexion.servidor_ref
      ? `https://${conexion.servidor_ref}.supabase.co`
      : null);
  const key = ref
    ? Deno.env.get(`${ref}_SERVICE_ROLE_KEY`) ?? Deno.env.get(ref) ?? null
    : null;
  if (!url || !key) return null;
  return { url, key };
}

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const desdeSecret = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const locales = [
    "http://localhost:5178",
    "http://127.0.0.1:5178",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  const permitidos = new Set([...desdeSecret, ...locales]);
  const originPermitido = permitidos.has(origin) ? origin : "";
  const requestedHeaders = req.headers.get("access-control-request-headers");
  return {
    ...(originPermitido
      ? { "access-control-allow-origin": originPermitido }
      : {}),
    "access-control-allow-headers":
      requestedHeaders ||
      "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function urlPublicaApp() {
  return (
    Deno.env.get("APP_PUBLIC_URL")?.trim() || "https://tukuyacademy.edu.pe"
  ).replace(/\/$/, "");
}

function redirectUri() {
  const override = Deno.env.get("GOOGLE_CALENDAR_OAUTH_REDIRECT_URI")?.trim();
  if (override) return override;
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  return `${supabaseUrl}/functions/v1/google-calendar-oauth`;
}

function secretEstado() {
  return (
    Deno.env.get("GOOGLE_CALENDAR_OAUTH_STATE_SECRET")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ||
    ""
  );
}

async function firmarEstado(payload: Record<string, unknown>) {
  const secret = secretEstado();
  if (!secret) throw new Error("Falta GOOGLE_CALENDAR_OAUTH_STATE_SECRET");
  const body = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(firma)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const data = btoa(body).replace(/\+/g, "-").replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${data}.${sig}`;
}

async function verificarEstado(state: string) {
  const secret = secretEstado();
  if (!secret) throw new Error("Falta GOOGLE_CALENDAR_OAUTH_STATE_SECRET");
  const [data, sig] = state.split(".");
  if (!data || !sig) throw new Error("State inválido");

  const body = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const firmaBytes = Uint8Array.from(
    atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
  const valido = await crypto.subtle.verify(
    "HMAC",
    key,
    firmaBytes,
    new TextEncoder().encode(body),
  );
  if (!valido) throw new Error("State no verificado");

  const payload = JSON.parse(body) as {
    uid?: string;
    exp?: number;
    continuar?: string;
  };
  if (!payload.uid || !payload.exp || Date.now() > payload.exp) {
    throw new Error("State expirado");
  }
  return payload;
}

function redirigirApp(params: Record<string, string>) {
  const base = urlPublicaApp();
  const continuar = params.continuar?.startsWith("/")
    ? params.continuar
    : "/tukuy-academy/configuracion";
  const url = new URL(continuar, base);
  url.searchParams.set("googleCalendar", params.resultado ?? "ok");
  if (params.mensaje) url.searchParams.set("googleCalendarMsg", params.mensaje);
  return Response.redirect(url.toString(), 302);
}

Deno.serve(async (req) => {
  const corsHeaders = cors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorGoogle = url.searchParams.get("error");

    if (req.method === "GET" && (code || errorGoogle)) {
      if (errorGoogle) {
        return redirigirApp({
          resultado: "error",
          mensaje: errorGoogle,
          continuar: "/tukuy-academy/configuracion",
        });
      }
      if (!code || !state) {
        return redirigirApp({
          resultado: "error",
          mensaje: "callback_incompleto",
          continuar: "/tukuy-academy/configuracion",
        });
      }

      const payload = await verificarEstado(state);
      const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")?.trim() ?? "";
      const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")
        ?.trim() ?? "";
      if (!clientId || !clientSecret) {
        return redirigirApp({
          resultado: "error",
          mensaje: "oauth_no_configurado",
          continuar: payload.continuar ?? "/tukuy-academy/configuracion",
        });
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri(),
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.refresh_token) {
        return redirigirApp({
          resultado: "error",
          mensaje: "sin_refresh_token",
          continuar: payload.continuar ?? "/tukuy-academy/configuracion",
        });
      }

      const admin = createClient(supabaseUrl, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      let googleEmail = "";
      if (tokenData.access_token) {
        const perfil = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          { headers: { authorization: `Bearer ${tokenData.access_token}` } },
        );
        const perfilData = await perfil.json();
        googleEmail = String(perfilData.email ?? "").trim().toLowerCase();
      }

      const guardado = await admin.rpc("google_calendar_guardar_token", {
        p_auth_usuario_ref: payload.uid,
        p_google_email: googleEmail,
        p_refresh_token: String(tokenData.refresh_token),
      });
      if (guardado.error) {
        return redirigirApp({
          resultado: "error",
          mensaje: guardado.error.message,
          continuar: payload.continuar ?? "/tukuy-academy/configuracion",
        });
      }

      const conexionSec = await resolverSecundariaTukuy(supabaseUrl, serviceRole);
      if (conexionSec) {
        const secundaria = createClient(conexionSec.url, conexionSec.key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: authUser } = await admin.auth.admin.getUserById(
          payload.uid,
        );
        try {
          await backfillCalendarioAlumnoMatriculado(
            admin,
            secundaria,
            payload.uid,
            [
              authUser?.user?.email ?? "",
              googleEmail,
            ],
          );
        } catch (err) {
          console.warn(
            "backfillCalendarioAlumnoMatriculado:",
            err instanceof Error ? err.message : err,
          );
        }
      }

      return redirigirApp({
        resultado: "ok",
        continuar: payload.continuar ?? "/tukuy-academy/configuracion",
      });
    }

    if (req.method !== "POST") {
      return json({ ok: false, error: "Método no permitido" }, 405, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!supabaseUrl || !anonKey || !authHeader) {
      return json({ ok: false, error: "No autorizado" }, 401, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return json({ ok: false, error: "Sesión inválida" }, 401, corsHeaders);
    }

    const body = (await req.json()) as {
      action?: string;
      continuar?: string;
    };
    const action = String(body.action ?? "").trim();

    if (action === "estado") {
      const estado = await supabase.rpc("google_calendar_estado_mio");
      if (estado.error) {
        return json({ ok: false, error: estado.error.message }, 400, corsHeaders);
      }
      return json({ ok: true, ...(estado.data ?? {}) }, 200, corsHeaders);
    }

    if (action === "desconectar") {
      const resultado = await supabase.rpc("google_calendar_desconectar_mio");
      if (resultado.error) {
        return json(
          { ok: false, error: resultado.error.message },
          400,
          corsHeaders,
        );
      }
      return json({ ok: true, ...(resultado.data ?? {}) }, 200, corsHeaders);
    }

    if (action === "iniciar") {
      const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")?.trim() ?? "";
      if (!clientId) {
        return json(
          { ok: false, error: "Google Calendar OAuth no configurado" },
          503,
          corsHeaders,
        );
      }

      const continuar =
        typeof body.continuar === "string" &&
          body.continuar.startsWith("/") &&
          !body.continuar.startsWith("//")
          ? body.continuar
          : "/tukuy-academy/configuracion";

      const state = await firmarEstado({
        uid: userData.user.id,
        exp: Date.now() + 15 * 60_000,
        continuar,
      });

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri(),
        response_type: "code",
        scope: scopeGoogleCalendarUsuario(),
        access_type: "offline",
        prompt: "consent",
        state,
        include_granted_scopes: "true",
      });

      return json(
        {
          ok: true,
          url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        },
        200,
        corsHeaders,
      );
    }

    return json({ ok: false, error: "Acción inválida" }, 400, corsHeaders);
  } catch (causa) {
    const mensaje = causa instanceof Error ? causa.message : String(causa);
    return json({ ok: false, error: mensaje }, 500, corsHeaders);
  }
});
