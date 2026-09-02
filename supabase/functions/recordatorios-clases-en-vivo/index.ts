/**
 * Cron: recordatorios automáticos de sesiones en vivo (24h y 1h antes).
 * Invocar cada 15 min vía pg_cron + pg_net o scheduler externo.
 *
 * Secrets (proyecto PRINCIPAL):
 *   SECONDARY_TUKUY_URL, SECONDARY_TUKUY_SERVICE_ROLE_KEY
 *   RECORDATORIOS_CRON_SECRET (header x-recordatorios-cron-secret)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (llamar enviar-correo)
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type TipoRecordatorio = "24h" | "1h";

type Destinatario = { correo?: string; nombre?: string };
type SesionPendiente = {
  id?: string;
  cursoId?: string;
  cursoTitulo?: string;
  titulo?: string;
  urlAcceso?: string | null;
  iniciaEn?: string;
  destinatarios?: Destinatario[];
};

function urlPortalPublica() {
  return (
    Deno.env.get("APP_PUBLIC_URL")?.trim() || "https://tukuyacademy.edu.pe"
  ).replace(/\/$/, "");
}

function autorizadoCron(req: Request): boolean {
  const secreto = Deno.env.get("RECORDATORIOS_CRON_SECRET")?.trim() ?? "";
  if (!secreto) return false;
  const header = req.headers.get("x-recordatorios-cron-secret")?.trim() ?? "";
  return header === secreto;
}

async function enviarRecordatorioCorreo(entrada: {
  para: string;
  anticipacion: string;
  tituloClase: string;
  nombreCurso?: string;
  fechaHora: string;
  urlMeet?: string;
  urlCurso?: string;
  nombrePersona?: string;
}) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }

  const respuesta = await fetch(`${supabaseUrl}/functions/v1/enviar-correo`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plantilla: "recordatorio_clase",
      para: entrada.para,
      datos: {
        nombrePersona: entrada.nombrePersona ?? "Hola",
        tituloClase: entrada.tituloClase,
        nombreCurso: entrada.nombreCurso,
        fechaHora: entrada.fechaHora,
        urlMeet: entrada.urlMeet,
        urlPortal: urlPortalPublica(),
        urlCurso: entrada.urlCurso,
        anticipacion: entrada.anticipacion,
      },
    }),
  });

  const cuerpo = (await respuesta.json()) as { ok?: boolean; error?: string };
  if (!respuesta.ok || cuerpo.ok === false) {
    throw new Error(cuerpo.error ?? `HTTP ${respuesta.status}`);
  }
}

async function procesarTipo(
  secundaria: ReturnType<typeof createClient>,
  tipo: TipoRecordatorio,
) {
  const { data, error } = await secundaria.rpc(
    "servicio_listar_sesiones_pendientes_recordatorio",
    { p_tipo: tipo },
  );
  if (error) {
    throw new Error(`listar ${tipo}: ${error.message}`);
  }

  const payload = (data ?? {}) as {
    sesiones?: SesionPendiente[];
  };
  const sesiones = Array.isArray(payload.sesiones) ? payload.sesiones : [];
  const base = urlPortalPublica();
  const anticipacion = tipo === "24h" ? "24 horas" : "1 hora";

  let enviados = 0;
  const errores: string[] = [];

  for (const sesion of sesiones) {
    const sesionId = typeof sesion.id === "string" ? sesion.id : "";
    if (!sesionId) continue;

    const destinatarios = Array.isArray(sesion.destinatarios)
      ? sesion.destinatarios
      : [];
    const correosValidos = destinatarios.filter((item) =>
      String(item.correo ?? "").includes("@")
    );

    if (!correosValidos.length) {
      const marca = await secundaria.rpc(
        "servicio_marcar_recordatorio_sesion_enviado",
        { p_sesion_id: sesionId, p_tipo: tipo },
      );
      if (marca.error) {
        errores.push(`${sesionId}: ${marca.error.message}`);
      }
      continue;
    }

    const cursoId =
      typeof sesion.cursoId === "string" ? sesion.cursoId.trim() : "";
    const urlCurso = cursoId
      ? `${base}/login?continuar=/tukuy-academy/clase-en-vivo/${encodeURIComponent(cursoId)}`
      : `${base}/login?continuar=/tukuy-academy/calendario`;

    let sesionOk = true;
    for (const dest of correosValidos) {
      const para = String(dest.correo).trim().toLowerCase();
      try {
        await enviarRecordatorioCorreo({
          para,
          anticipacion,
          tituloClase: String(sesion.titulo ?? "Clase en vivo"),
          nombreCurso:
            typeof sesion.cursoTitulo === "string"
              ? sesion.cursoTitulo
              : undefined,
          fechaHora: String(sesion.iniciaEn ?? ""),
          urlMeet:
            typeof sesion.urlAcceso === "string" && sesion.urlAcceso.trim()
              ? sesion.urlAcceso.trim()
              : undefined,
          urlCurso,
          nombrePersona:
            typeof dest.nombre === "string" ? dest.nombre : undefined,
        });
        enviados += 1;
      } catch (causa) {
        sesionOk = false;
        const mensaje =
          causa instanceof Error ? causa.message : "Error al enviar correo";
        errores.push(`${sesionId} → ${para}: ${mensaje}`);
      }
    }

    if (sesionOk) {
      const marca = await secundaria.rpc(
        "servicio_marcar_recordatorio_sesion_enviado",
        { p_sesion_id: sesionId, p_tipo: tipo },
      );
      if (marca.error) {
        errores.push(`${sesionId} marca: ${marca.error.message}`);
      }
    }
  }

  return { tipo, sesiones: sesiones.length, enviados, errores };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Método no permitido" }, 405);
  }
  if (!autorizadoCron(req)) {
    return json({ ok: false, error: "No autorizado" }, 401);
  }

  const urlSec = Deno.env.get("SECONDARY_TUKUY_URL")?.trim() ?? "";
  const keySec =
    Deno.env.get("SECONDARY_TUKUY_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!urlSec || !keySec) {
    return json(
      {
        ok: false,
        error:
          "Faltan SECONDARY_TUKUY_URL o SECONDARY_TUKUY_SERVICE_ROLE_KEY",
      },
      500,
    );
  }

  try {
    const secundaria = createClient(urlSec, keySec, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const resultado24 = await procesarTipo(secundaria, "24h");
    const resultado1 = await procesarTipo(secundaria, "1h");

    return json({
      ok: true,
      recordatorios: [resultado24, resultado1],
    });
  } catch (causa) {
    const mensaje =
      causa instanceof Error ? causa.message : "Error al procesar recordatorios";
    return json({ ok: false, error: mensaje }, 500);
  }
});
