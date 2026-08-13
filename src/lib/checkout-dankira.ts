import { setInitialConfig, setPaymentConfig, setup } from "@dankira/izipay";

import { supabasePrincipal } from "@/lib/supabase";
import { env } from "@/lib/env";
import type { RespuestaClienteIzipay } from "@/types/pago.types";

export type ConfigPublicaDankira = {
  merchantCode: string;
  production: boolean;
  publicKey: string;
  sha256: string;
  endpoint?: string;
  language?: string;
};

/**
 * Abre el formulario embebido de @dankira/izipay en `#izipay-form`.
 * El password NUNCA viaja al navegador: proxy_url = Edge `izipay-lyra-proxy`
 * (secrets IZIPAY_LYRA_*). Se inyecta Authorization en el fetch del SDK.
 */
export async function abrirCheckoutDankira(opciones: {
  amountSoles: number;
  currency?: "PEN";
  orderId: string;
  email: string;
  config: ConfigPublicaDankira;
  onResult: (respuesta: RespuestaClienteIzipay) => void;
}) {
  const { data: sesion } = await supabasePrincipal().auth.getSession();
  const accessToken = sesion?.session?.access_token;
  if (!accessToken) {
    throw new Error("Debes iniciar sesión para pagar con Izipay.");
  }

  const host = document.getElementById("izipay-form");
  if (!host) {
    throw new Error(
      'Falta <div id="izipay-form"></div> en la vista antes de iniciar el pago.',
    );
  }
  host.innerHTML = "";

  const base = env.supabasePrimaryUrl.replace(/\/$/, "");
  const proxyUrl = `${base}/functions/v1/izipay-lyra-proxy`;
  const anonKey = env.supabasePrimaryAnonKey;

  setInitialConfig({
    merchant_code: opciones.config.merchantCode,
    production: opciones.config.production,
    // Placeholders: la Edge ignora authBasic del body y usa secrets.
    test_password: "server-side",
    prod_password: "server-side",
    test_public_key: opciones.config.publicKey,
    prod_public_key: opciones.config.publicKey,
    test_sha256: opciones.config.sha256,
    prod_sha256: opciones.config.sha256,
    proxy_url: proxyUrl,
    endpoint: opciones.config.endpoint ?? "https://api.micuentaweb.pe",
    language: opciones.config.language ?? "es-PE",
  });

  setPaymentConfig({
    amount: Number(opciones.amountSoles.toFixed(2)),
    currency: opciones.currency ?? "PEN",
    orderId: opciones.orderId.slice(0, 64),
    customer: { email: opciones.email },
    authBasic: "",
  } as Parameters<typeof setPaymentConfig>[0]);

  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.includes("/functions/v1/izipay-lyra-proxy")) {
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      headers.set("apikey", anonKey);
      headers.set("Content-Type", "application/json");
      return fetchOriginal(input, { ...init, headers });
    }
    return fetchOriginal(input, init);
  };

  try {
    await setup((evento: { res?: unknown }) => {
      opciones.onResult(mapearRespuestaDankira(evento?.res ?? evento));
    });
  } finally {
    window.fetch = fetchOriginal;
  }
}

export function mapearRespuestaDankira(raw: unknown): RespuestaClienteIzipay {
  const root = (raw ?? {}) as Record<string, unknown>;
  const clientAnswer =
    (root.clientAnswer as Record<string, unknown> | undefined) ??
    ((root.res as Record<string, unknown> | undefined)?.clientAnswer as
      | Record<string, unknown>
      | undefined) ??
    {};
  const orderStatus = String(clientAnswer.orderStatus ?? "").toUpperCase();
  const tx = Array.isArray(clientAnswer.transactions)
    ? (clientAnswer.transactions[0] as Record<string, unknown> | undefined)
    : undefined;
  const paid =
    orderStatus === "PAID" ||
    orderStatus === "AUTHORISED" ||
    String(tx?.status ?? "").toUpperCase() === "PAID";

  return {
    code: paid ? "00" : "99",
    message: orderStatus || "RESPUESTA_IZIPAY",
    messageUser: paid ? "Pago aprobado" : "Pago no confirmado",
    transactionId: String(
      tx?.uuid ??
        (clientAnswer.orderDetails as Record<string, unknown> | undefined)
          ?.orderId ??
        "",
    ),
    payloadHttp: JSON.stringify(raw ?? {}),
    signature: String(root.hash ?? ""),
  };
}

export function leerConfigDankiraDesdeEnv(): ConfigPublicaDankira | null {
  const merchantCode = String(
    import.meta.env.VITE_IZIPAY_MERCHANT_CODE ?? "",
  ).trim();
  const publicKey = String(import.meta.env.VITE_IZIPAY_PUBLIC_KEY ?? "").trim();
  const sha256 = String(import.meta.env.VITE_IZIPAY_SHA256 ?? "").trim();
  if (!merchantCode || !publicKey || !sha256) return null;
  const production =
    String(import.meta.env.VITE_IZIPAY_PRODUCTION ?? "false").toLowerCase() ===
    "true";
  return {
    merchantCode,
    production,
    publicKey,
    sha256,
    endpoint: String(
      import.meta.env.VITE_IZIPAY_ENDPOINT ?? "https://api.micuentaweb.pe",
    ).trim(),
  };
}
