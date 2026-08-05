import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const permitidos = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "http://localhost:5178")
    .split(",").map((item) => item.trim());
  return {
    "access-control-allow-origin": permitidos.includes(origin) ? origin : permitidos[0]!,
    "access-control-allow-headers": "authorization, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    vary: "origin",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo no permitido" }, 405, corsHeaders);

  try {
    const principalUrl = Deno.env.get("SUPABASE_URL")!;
    const principalAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const secundariaUrl = Deno.env.get("SECONDARY_TUKUY_URL");
    const secundariaServiceRole = Deno.env.get("SECONDARY_TUKUY_SERVICE_ROLE_KEY");
    if (!secundariaUrl || !secundariaServiceRole) {
      return json({ error: "La conexion secundaria no tiene secretos configurados" }, 503, corsHeaders);
    }

    const authorization = req.headers.get("authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sesion requerida" }, 401, corsHeaders);

    const principal = createClient(principalUrl, principalAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: usuario, error: errorUsuario } = await principal.auth.getUser(token);
    if (errorUsuario || !usuario.user) return json({ error: "Sesion invalida" }, 401, corsHeaders);

    const entrada = await req.json().catch(() => ({}));
    const secundaria = createClient(secundariaUrl, secundariaServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (entrada.action === "health") {
      const { data: esAdmin, error: errorAdmin } = await principal.rpc("es_super_admin_actual");
      if (errorAdmin || esAdmin !== true) return json({ error: "No autorizado" }, 403, corsHeaders);
      const { data, error } = await secundaria.rpc("servicio_salud_secundaria");
      if (error) return json({ error: "No se pudo verificar la secundaria", details: error.message }, 502, corsHeaders);
      return json({ ok: true, secundaria: data, verificadaPor: usuario.user.id }, 200, corsHeaders);
    }

    if (entrada.action === "sync-access") {
      const instalacionTukuy = "30000000-0000-4000-8000-000000000001";
      const { data: contextos, error: errorContextos } = await principal.rpc("obtener_mis_contextos");
      if (errorContextos) return json({ error: "No se pudieron resolver los contextos", details: errorContextos.message }, 502, corsHeaders);
      const propios = (contextos ?? []).filter((contexto: Record<string, unknown>) =>
        contexto.instalacion_organizacion_ref === instalacionTukuy,
      );
      if (!propios.length) return json({ error: "El usuario no pertenece a Tukuy Academy" }, 403, corsHeaders);

      const porMembresia = new Map<string, typeof propios>();
      for (const contexto of propios) {
        const clave = String(contexto.membresia_id);
        porMembresia.set(clave, [...(porMembresia.get(clave) ?? []), contexto]);
      }
      for (const [membresiaId, funciones] of porMembresia) {
        const perfiles = [...new Set(funciones.map((item) => String(item.rol_codigo)))];
        const permisos = [...new Set(funciones.flatMap((item) => Array.isArray(item.permisos) ? item.permisos.map(String) : []))];
        const version = Math.max(...funciones.map((item) => Number(item.version_autorizacion ?? 1)));
        const identidadId = String(funciones[0]!.usuario_id);
        const { error } = await secundaria.rpc("servicio_sincronizar_acceso", {
          p_identidad_principal_ref: identidadId,
          p_membresia_principal_ref: membresiaId,
          p_correo: usuario.user.email ?? null,
          p_nombre_mostrar: usuario.user.user_metadata?.full_name ?? usuario.user.user_metadata?.name ?? usuario.user.email ?? null,
          p_perfiles: perfiles,
          p_permisos: permisos,
          p_version_autorizacion: version,
          p_estado: "ACTIVO",
        });
        if (error) return json({ error: "No se pudo sincronizar el acceso", details: error.message }, 502, corsHeaders);
      }
      return json({ ok: true, membresiasSincronizadas: porMembresia.size }, 200, corsHeaders);
    }

    return json({ error: "Accion no soportada" }, 400, corsHeaders);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500, corsHeaders);
  }
});
