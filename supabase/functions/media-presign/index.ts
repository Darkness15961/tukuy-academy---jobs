import { createClient } from "npm:@supabase/supabase-js@2";
import { S3Client, PutObjectCommand, GetObjectCommand } from "npm:@aws-sdk/client-s3@3.787.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.787.0";

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

type Kind = "portada" | "material" | "entrega";

function s3Client() {
  const region = Deno.env.get("AWS_REGION") ?? "us-east-2";
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") ?? "";
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "";
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Faltan secretos AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY");
  }
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    // Evita x-amz-checksum-* en la URL firmada (el browser PUT no los envía).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function bucketName() {
  const bucket = Deno.env.get("AWS_S3_BUCKET") ?? "";
  if (!bucket) throw new Error("Falta secreto AWS_S3_BUCKET");
  return bucket;
}

function publicBaseUrl() {
  const explicit = Deno.env.get("AWS_S3_PUBLIC_BASE_URL")?.replace(/\/$/, "");
  if (explicit) return explicit;
  const region = Deno.env.get("AWS_REGION") ?? "us-east-2";
  return `https://${bucketName()}.s3.${region}.amazonaws.com`;
}

/** Prefijos alineados a la bucket policy (portadas/*, materiales/*, entregas/*). */
function prefijoKind(kind: Kind) {
  if (kind === "portada") return "portadas";
  if (kind === "material") return "materiales";
  return "entregas";
}

function sanitizarNombre(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "archivo";
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
    const action = typeof entrada.action === "string" ? entrada.action : "";
    const bucket = bucketName();
    const client = s3Client();

    if (action === "presign-upload") {
      const kindRaw = String(entrada.kind ?? "").toLowerCase();
      const kind = (["portada", "material", "entrega"].includes(kindRaw)
        ? kindRaw
        : "") as Kind | "";
      if (!kind) {
        return json(
          { ok: false, error: "kind debe ser portada | material | entrega" },
          400,
          corsHeaders,
        );
      }
      const contentType =
        typeof entrada.contentType === "string" && entrada.contentType.trim()
          ? entrada.contentType.trim()
          : "application/octet-stream";
      const fileName =
        typeof entrada.fileName === "string" && entrada.fileName.trim()
          ? sanitizarNombre(entrada.fileName.trim())
          : "archivo";
      // Namespace por tenant: aísla los objetos de cada organización.
      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const instalacionId =
        typeof entrada.instalacionId === "string" &&
          UUID_RE.test(entrada.instalacionId.trim())
          ? entrada.instalacionId.trim()
          : "";
      const segmentoTenant = instalacionId ? `${instalacionId}/` : "";
      const objectKey =
        `${prefijoKind(kind)}/${segmentoTenant}${usuario.user.id}/${crypto.randomUUID()}-${fileName}`;

      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          ContentType: contentType,
        }),
        { expiresIn: 60 * 5 },
      );

      const publicUrl =
        kind === "entrega" ? null : `${publicBaseUrl()}/${objectKey}`;

      return json(
        {
          ok: true,
          objectKey,
          uploadUrl,
          publicUrl,
          contentType,
          expiresIn: 300,
        },
        200,
        corsHeaders,
      );
    }

    if (action === "presign-download") {
      const objectKey =
        typeof entrada.objectKey === "string" ? entrada.objectKey.trim() : "";
      if (!objectKey || objectKey.includes("..")) {
        return json({ ok: false, error: "objectKey requerido" }, 400, corsHeaders);
      }
      if (
        !objectKey.startsWith("entregas/") &&
        !objectKey.startsWith("entrega/")
      ) {
        return json(
          { ok: false, error: "Solo se firman descargas de entregas/" },
          403,
          corsHeaders,
        );
      }
      const downloadUrl = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
        { expiresIn: 60 * 10 },
      );
      return json(
        { ok: true, objectKey, downloadUrl, expiresIn: 600 },
        200,
        corsHeaders,
      );
    }

    return json({ error: "Accion no soportada" }, 400, corsHeaders);
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error media-presign",
      },
      500,
      corsHeaders,
    );
  }
});
