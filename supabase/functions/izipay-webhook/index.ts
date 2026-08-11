/**
 * Stub IPN/webhook Izipay → confirma orden en secundaria vía secondary-gateway.
 *
 * Secrets (supabase secrets set):
 *   IZIPAY_WEBHOOK_SECRET  — compartido con el header x-tukuy-webhook-secret
 *   PAYMENT_MODE=live|sandbox  — cuando no es simulacion, el gateway exige fromWebhook
 *   SECONDARY_TUKUY_URL / SECONDARY_TUKUY_SERVICE_ROLE_KEY — ya usados por el gateway
 *
 * Payload esperado (mínimo):
 *   { "ordenId": "uuid", "code": "00", "transactionId": "..." }
 * También acepta orderNumber estilo TUKUY-<8 chars del uuid> si se pasa ordenId completo.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

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
  return {
    ...(originPermitido
      ? { "access-control-allow-origin": originPermitido }
      : {}),
    "access-control-allow-headers":
      "authorization, apikey, content-type, x-client-info, x-tukuy-webhook-secret, x-izipay-webhook-secret",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const corsHeaders = cors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Metodo no permitido" }, 405, corsHeaders);
  }

  try {
    const webhookSecret = Deno.env.get("IZIPAY_WEBHOOK_SECRET") ?? "";
    const headerSecret =
      req.headers.get("x-tukuy-webhook-secret") ??
      req.headers.get("x-izipay-webhook-secret") ??
      "";

    if (!webhookSecret) {
      return json(
        {
          ok: false,
          error:
            "Configura IZIPAY_WEBHOOK_SECRET (supabase secrets set). Stub listo, sin clave aún.",
        },
        503,
        corsHeaders,
      );
    }
    if (headerSecret !== webhookSecret) {
      return json({ ok: false, error: "Webhook no autorizado" }, 401, corsHeaders);
    }

    const entrada = await req.json().catch(() => ({}));
    const ordenId =
      typeof entrada.ordenId === "string" ? entrada.ordenId.trim() : "";
    if (!ordenId || !UUID_RE.test(ordenId)) {
      return json(
        { ok: false, error: "ordenId (uuid) requerido en el payload" },
        400,
        corsHeaders,
      );
    }

    const code =
      typeof entrada.code === "string" && entrada.code.trim()
        ? entrada.code.trim()
        : "00";
    const transactionId =
      typeof entrada.transactionId === "string"
        ? entrada.transactionId
        : typeof entrada.referencia === "string"
          ? entrada.referencia
          : null;

    // Confirma usando service role contra la secundaria (no confía en el browser).
    const secondaryUrl = Deno.env.get("SECONDARY_TUKUY_URL") ?? "";
    const secondaryKey =
      Deno.env.get("SECONDARY_TUKUY_SERVICE_ROLE_KEY") ?? "";
    if (!secondaryUrl || !secondaryKey) {
      return json(
        {
          ok: false,
          error: "Faltan SECONDARY_TUKUY_URL / SECONDARY_TUKUY_SERVICE_ROLE_KEY",
        },
        500,
        corsHeaders,
      );
    }

    const secundaria = createClient(secondaryUrl, secondaryKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Resolver comprador desde la orden (el IPN no trae JWT del alumno).
    const { data: ordenData, error: ordenError } = await secundaria.rpc(
      "servicio_obtener_orden_compra",
      {
        p_orden_id: ordenId,
        p_comprador_identidad_ref: null,
      },
    );

    // Si el RPC exige comprador, leemos la fila directo.
    let compradorId: string | null = null;
    if (!ordenError && ordenData?.compradorIdentidadRef) {
      compradorId = String(ordenData.compradorIdentidadRef);
    } else {
      const { data: fila } = await secundaria
        .from("orden_compra")
        .select("comprador_identidad_ref")
        .eq("id", ordenId)
        .maybeSingle();
      compradorId = fila?.comprador_identidad_ref
        ? String(fila.comprador_identidad_ref)
        : null;
    }

    if (!compradorId || !UUID_RE.test(compradorId)) {
      return json(
        {
          ok: false,
          error: "No se pudo resolver el comprador de la orden",
          details: ordenError?.message,
        },
        404,
        corsHeaders,
      );
    }

    const confirmada = await secundaria.rpc("servicio_confirmar_pago_orden", {
      p_orden_id: ordenId,
      p_comprador_identidad_ref: compradorId,
      p_codigo_respuesta: code,
      p_referencia_externa: transactionId,
      p_proveedor: "izipay",
    });

    if (confirmada.error) {
      return json(
        {
          ok: false,
          error: confirmada.error.message,
        },
        502,
        corsHeaders,
      );
    }

    return json(
      {
        ok: true,
        stub: true,
        ...confirmada.data,
        aviso:
          "Stub Izipay: cuando tengas el SDK real, valida firma HMAC aquí antes de confirmar.",
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error izipay-webhook",
      },
      500,
      corsHeaders,
    );
  }
});
