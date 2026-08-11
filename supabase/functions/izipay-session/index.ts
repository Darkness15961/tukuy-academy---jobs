/**
 * Genera token de sesión Izipay (Token/Generate) para el checkout web.
 * Las claves NUNCA van al navegador vía VITE_*.
 *
 * Secrets:
 *   IZIPAY_MERCHANT_CODE
 *   IZIPAY_PUBLIC_KEY          — publicKey del Token/Generate
 *   IZIPAY_RSA_PUBLIC_KEY      — keyRSA del SDK (si falta, usa PUBLIC_KEY)
 *   IZIPAY_ENV=sandbox|production
 *
 * Docs: POST /security/v1/Token/Generate
 * Header: transactionId
 * Body: requestSource, merchantCode, orderNumber, publicKey, amount
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
  const requestedHeaders = req.headers.get("access-control-request-headers");
  return {
    ...(originPermitido
      ? { "access-control-allow-origin": originPermitido }
      : {}),
    "access-control-allow-headers":
      requestedHeaders ||
      "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function apiBase(env: string) {
  return env === "production"
    ? "https://api-pw.izipay.pe"
    : "https://sandbox-api-pw.izipay.pe";
}

/** orderNumber Izipay: 5–15 chars. */
function orderNumberDesdeOrden(ordenId: string) {
  const compact = ordenId.replace(/-/g, "").slice(0, 10).toUpperCase();
  return `TK${compact}`.slice(0, 15);
}

/** transactionId: 5–40 chars, único por intento. */
function transactionIdNuevo(ordenId: string) {
  const base = ordenId.replace(/-/g, "").slice(0, 12);
  return `${base}${Date.now()}`.slice(0, 40);
}

function montoIzipay(centavos: number) {
  return (Math.max(0, centavos) / 100).toFixed(2);
}

Deno.serve(async (req) => {
  const corsHeaders = cors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Metodo no permitido" }, 405, corsHeaders);
  }

  try {
    const merchantCode = (Deno.env.get("IZIPAY_MERCHANT_CODE") ?? "").trim();
    const publicKey = (Deno.env.get("IZIPAY_PUBLIC_KEY") ?? "").trim();
    const rsaKey =
      (Deno.env.get("IZIPAY_RSA_PUBLIC_KEY") ?? "").trim() || publicKey;
    const izipayEnv = (
      Deno.env.get("IZIPAY_ENV") ??
      Deno.env.get("PAYMENT_MODE") ??
      "sandbox"
    )
      .trim()
      .toLowerCase();
    const entorno =
      izipayEnv === "production" || izipayEnv === "live" || izipayEnv === "prod"
        ? "production"
        : "sandbox";

    if (!merchantCode || !publicKey) {
      return json(
        {
          ok: false,
          error:
            "Faltan secretos IZIPAY_MERCHANT_CODE / IZIPAY_PUBLIC_KEY. Mientras tanto usa VITE_PAGO_MODO=simulacion.",
          code: "IZIPAY_NO_CONFIGURADO",
        },
        503,
        corsHeaders,
      );
    }

    const principalUrl = Deno.env.get("SUPABASE_URL")!;
    const principalAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authorization = req.headers.get("authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sesion requerida" }, 401, corsHeaders);

    const principal = createClient(principalUrl, principalAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: usuario, error: errorUsuario } = await principal.auth.getUser(
      token,
    );
    if (errorUsuario || !usuario.user) {
      return json({ error: "Sesion invalida" }, 401, corsHeaders);
    }

    const entrada = await req.json().catch(() => ({}));
    const ordenId =
      typeof entrada.ordenId === "string" ? entrada.ordenId.trim() : "";
    if (!ordenId || !UUID_RE.test(ordenId)) {
      return json({ error: "ordenId (uuid) requerido" }, 400, corsHeaders);
    }

    // Monto autorizado desde secundaria (no confiar en el cliente).
    const secondaryUrl = Deno.env.get("SECONDARY_TUKUY_URL") ?? "";
    const secondaryKey =
      Deno.env.get("SECONDARY_TUKUY_SERVICE_ROLE_KEY") ?? "";
    if (!secondaryUrl || !secondaryKey) {
      return json(
        { error: "Faltan SECONDARY_TUKUY_URL / SECONDARY_TUKUY_SERVICE_ROLE_KEY" },
        500,
        corsHeaders,
      );
    }
    const secundaria = createClient(secondaryUrl, secondaryKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const orden = await secundaria.rpc("servicio_obtener_orden_compra", {
      p_orden_id: ordenId,
      p_comprador_identidad_ref: usuario.user.id,
    });
    if (orden.error || !orden.data?.ok) {
      // Fallback lectura directa si el RPC exige otro shape.
      const { data: fila } = await secundaria
        .from("orden_compra")
        .select("id, comprador_identidad_ref, estado, moneda, total_centavos")
        .eq("id", ordenId)
        .maybeSingle();
      if (
        !fila ||
        String(fila.comprador_identidad_ref) !== usuario.user.id
      ) {
        return json(
          {
            ok: false,
            error: orden.data?.error ?? orden.error?.message ?? "Orden no encontrada",
          },
          404,
          corsHeaders,
        );
      }
      const totalCentavos = Number(fila.total_centavos ?? 0);
      if (!(totalCentavos > 0)) {
        return json(
          { ok: false, error: "La orden no tiene monto de pago" },
          400,
          corsHeaders,
        );
      }
      return await emitirToken({
        ordenId,
        totalCentavos,
        moneda: String(fila.moneda ?? "PEN"),
        merchantCode,
        publicKey,
        rsaKey,
        entorno,
        compradorId: usuario.user.id,
        corsHeaders,
      });
    }

    const totalCentavos = Number(
      orden.data.totalCentavos ??
        Math.round(Number(orden.data.importe ?? 0) * 100),
    );
    if (!(totalCentavos > 0)) {
      return json(
        { ok: false, error: "La orden no tiene monto de pago" },
        400,
        corsHeaders,
      );
    }

    return await emitirToken({
      ordenId,
      totalCentavos,
      moneda: String(orden.data.moneda ?? "PEN"),
      merchantCode,
      publicKey,
      rsaKey,
      entorno,
      compradorId: usuario.user.id,
      corsHeaders,
      cursoIds: Array.isArray(orden.data.cursoIds) ? orden.data.cursoIds : [],
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error izipay-session",
      },
      500,
      corsHeaders,
    );
  }
});

async function emitirToken(entrada: {
  ordenId: string;
  totalCentavos: number;
  moneda: string;
  merchantCode: string;
  publicKey: string;
  rsaKey: string;
  entorno: "sandbox" | "production";
  compradorId: string;
  corsHeaders: HeadersInit;
  cursoIds?: unknown[];
}) {
  const amount = montoIzipay(entrada.totalCentavos);
  const orderNumber = orderNumberDesdeOrden(entrada.ordenId);
  const transactionId = transactionIdNuevo(entrada.ordenId);
  const url = `${apiBase(entrada.entorno)}/security/v1/Token/Generate`;

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      transactionId,
    },
    body: JSON.stringify({
      requestSource: "ECOMMERCE",
      merchantCode: entrada.merchantCode,
      orderNumber,
      publicKey: entrada.publicKey,
      amount,
    }),
  });

  const cuerpo = await respuesta.json().catch(() => ({}));
  const code = String(cuerpo?.code ?? "");
  const token =
    typeof cuerpo?.response?.token === "string"
      ? cuerpo.response.token
      : "";

  if (!respuesta.ok || code !== "00" || !token) {
    return json(
      {
        ok: false,
        error:
          cuerpo?.message ||
          "Izipay no generó el token de sesión (Token/Generate).",
        code: code || "TOKEN_GENERATE_FAIL",
        details: cuerpo,
      },
      502,
      entrada.corsHeaders,
    );
  }

  return json(
    {
      ok: true,
      ordenId: entrada.ordenId,
      entorno: entrada.entorno === "production" ? "produccion" : "pruebas",
      moneda: "PEN",
      importe: entrada.totalCentavos / 100,
      totalCentavos: entrada.totalCentavos,
      cursoIds: entrada.cursoIds ?? [],
      autorizacionSesion: token,
      llaveRsaPublica: entrada.rsaKey,
      merchantCode: entrada.merchantCode,
      configuracion: {
        transactionId,
        action: "pay",
        merchantCode: entrada.merchantCode,
        order: {
          orderNumber,
          currency: "PEN",
          amount,
          processType: "AT",
          merchantBuyerId: entrada.compradorId.replace(/-/g, "").slice(0, 20),
          dateTimeTransaction: String(Date.now()),
        },
        render: { typeForm: "pop-up" },
      },
      tokenExpiraEnSegundos: 15 * 60,
    },
    200,
    entrada.corsHeaders,
  );
}
