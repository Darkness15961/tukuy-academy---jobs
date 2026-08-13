/**
 * Proxy seguro para @dankira/izipay (Lyra / micuentaweb).
 * El navegador NO debe conocer el password del comercio.
 *
 * Secrets (proyecto PRINCIPAL):
 *   IZIPAY_LYRA_MERCHANT_CODE   (shopId / merchant_code)
 *   IZIPAY_LYRA_PASSWORD        (test o prod según IZIPAY_LYRA_ENV)
 *   IZIPAY_LYRA_ENV=sandbox|production
 *   IZIPAY_LYRA_ENDPOINT=https://api.micuentaweb.pe  (opcional)
 *
 * Body (compatible con @dankira/izipay setup):
 *   { amount: centavos, currency, orderId?, customer?: { email } }
 * Respuesta: { answer: { formToken } }
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

Deno.serve(async (req) => {
  const corsHeaders = cors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Metodo no permitido" }, 405, corsHeaders);
  }

  try {
    const merchantCode = (
      Deno.env.get("IZIPAY_LYRA_MERCHANT_CODE") ??
      Deno.env.get("IZIPAY_MERCHANT_CODE") ??
      ""
    ).trim();
    const password = (
      Deno.env.get("IZIPAY_LYRA_PASSWORD") ??
      Deno.env.get("IZIPAY_PASSWORD") ??
      ""
    ).trim();
    const envName = (
      Deno.env.get("IZIPAY_LYRA_ENV") ??
      Deno.env.get("IZIPAY_ENV") ??
      "sandbox"
    )
      .trim()
      .toLowerCase();
    const endpoint = (
      Deno.env.get("IZIPAY_LYRA_ENDPOINT") ??
      "https://api.micuentaweb.pe"
    ).replace(/\/$/, "");

    if (!merchantCode || !password) {
      return json(
        {
          ok: false,
          error:
            "Faltan IZIPAY_LYRA_MERCHANT_CODE / IZIPAY_LYRA_PASSWORD en secrets del proyecto principal.",
          code: "IZIPAY_LYRA_NO_CONFIGURADO",
        },
        503,
        corsHeaders,
      );
    }

    const principalUrl = Deno.env.get("SUPABASE_URL")!;
    const principalAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authorization = req.headers.get("authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();
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
    // @dankira/izipay envía amount en centavos. Ignorar authBasic del cliente.
    const amount = Number(entrada.amount ?? 0);
    const currency = String(entrada.currency ?? "PEN").toUpperCase();
    const orderId =
      typeof entrada.orderId === "string" && entrada.orderId.trim()
        ? entrada.orderId.trim().slice(0, 64)
        : `TUKUY-${Date.now()}`;
    const email =
      typeof entrada.customer?.email === "string" && entrada.customer.email.trim()
        ? entrada.customer.email.trim()
        : usuario.user.email ?? "alumno@tukuy.academy";

    if (!(amount > 0) || !Number.isFinite(amount)) {
      return json({ error: "amount (centavos) requerido" }, 400, corsHeaders);
    }

    // Siempre secrets del servidor — nunca confiar en entrada.authBasic
    const authBasic = btoa(`${merchantCode}:${password}`);
    const lyraRes = await fetch(
      `${endpoint}/api-payment/V4/Charge/CreatePayment`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Basic ${authBasic}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount),
          currency,
          orderId,
          customer: { email },
        }),
      },
    );

    const lyraJson = await lyraRes.json().catch(() => ({}));
    const formToken =
      lyraJson?.answer?.formToken ??
      lyraJson?.formToken ??
      null;

    if (!lyraRes.ok || !formToken) {
      return json(
        {
          ok: false,
          error:
            lyraJson?.answer?.errorMessage ||
            lyraJson?.error ||
            `Lyra CreatePayment falló (${lyraRes.status})`,
          details: lyraJson,
          env: envName,
        },
        502,
        corsHeaders,
      );
    }

    // Shape esperado por @dankira/izipay setup()
    return json(
      {
        ok: true,
        status: "SUCCESS",
        answer: { formToken: String(formToken) },
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error izipay-lyra-proxy",
      },
      500,
      corsHeaders,
    );
  }
});
