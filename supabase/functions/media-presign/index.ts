import { createClient } from "npm:@supabase/supabase-js@2";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "npm:@aws-sdk/client-s3@3.787.0";
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

type Kind =
  | "portada"
  | "material"
  | "entrega"
  | "certificado"
  | "fondo-certificado"
  | "anuncio-portal";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/**
 * Prefijos del bucket (por uso):
 * - portadas/                 → portadas de cursos
 * - materiales/               → materiales descargables
 * - anuncios-portal/          → carrusel / anuncios del portal alumno (por org)
 * - entregas/                 → entregas de alumnos (privado)
 * - certificados/documentos/  → PDF emitidos (privado)
 * - certificados/fondos/      → fondos del diseño (público)
 */
function prefijoKind(kind: Kind) {
  if (kind === "portada") return "portadas";
  if (kind === "material") return "materiales";
  if (kind === "anuncio-portal") return "anuncios-portal";
  if (kind === "certificado") return "certificados/documentos";
  if (kind === "fondo-certificado") return "certificados/fondos";
  return "entregas";
}

function esKindPublico(kind: Kind) {
  return (
    kind === "portada" ||
    kind === "material" ||
    kind === "fondo-certificado"
  );
}

function puedeFirmarDescarga(objectKey: string) {
  return (
    objectKey.startsWith("entregas/") ||
    objectKey.startsWith("entrega/") ||
    objectKey.startsWith("certificados/") ||
    objectKey.startsWith("portadas/") ||
    objectKey.startsWith("materiales/") ||
    objectKey.startsWith("anuncios-portal/")
  );
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

function leerInstalacionId(entrada: Record<string, unknown>) {
  const raw =
    typeof entrada.instalacionId === "string" ? entrada.instalacionId.trim() : "";
  return UUID_RE.test(raw) ? raw : "";
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

    const entrada = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = typeof entrada.action === "string" ? entrada.action : "";
    const bucket = bucketName();
    const client = s3Client();

    if (action === "presign-upload") {
      const kindRaw = String(entrada.kind ?? "").toLowerCase();
      const kind = ([
        "portada",
        "material",
        "entrega",
        "certificado",
        "fondo-certificado",
        "anuncio-portal",
      ].includes(kindRaw)
        ? kindRaw
        : "") as Kind | "";
      if (!kind) {
        return json(
          {
            ok: false,
            error:
              "kind debe ser portada | material | entrega | certificado | fondo-certificado | anuncio-portal",
          },
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
      const instalacionId = leerInstalacionId(entrada);
      if (kind === "anuncio-portal" && !instalacionId) {
        return json(
          {
            ok: false,
            error: "anuncio-portal requiere instalacionId (UUID de la organización)",
          },
          400,
          corsHeaders,
        );
      }
      const fileSize = Number(entrada.fileSize ?? 0);
      if (kind === "anuncio-portal" && fileSize > 1024 * 1024) {
        return json(
          {
            ok: false,
            error: "La imagen del anuncio no puede pesar más de 1 MB.",
          },
          400,
          corsHeaders,
        );
      }
      const segmentoTenant = instalacionId ? `${instalacionId}/` : "";
      // anuncios-portal/{instalacionId}/{userId}/{uuid}-nombre.jpg
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

      const publicUrl = esKindPublico(kind)
        ? `${publicBaseUrl()}/${objectKey}`
        : null;

      return json(
        {
          ok: true,
          objectKey,
          uploadUrl,
          publicUrl,
          contentType,
          expiresIn: 300,
          prefix: prefijoKind(kind),
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
      if (!puedeFirmarDescarga(objectKey)) {
        return json(
          {
            ok: false,
            error:
              "Solo se firman descargas de anuncios-portal/, portadas/, materiales/, entregas/ o certificados/",
          },
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

    /** Lista objetos en anuncios-portal/{instalacionId}/ para reutilizar en UI. */
    if (action === "listar-anuncios-portal") {
      const instalacionId = leerInstalacionId(entrada);
      if (!instalacionId) {
        return json(
          { ok: false, error: "instalacionId requerido" },
          400,
          corsHeaders,
        );
      }
      const prefix = `anuncios-portal/${instalacionId}/${usuario.user.id}/`;
      try {
        const listed = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            MaxKeys: 100,
          }),
        );
        const imagenes = (listed.Contents ?? [])
          .filter((obj) => {
            const key = obj.Key ?? "";
            if (!key || key.endsWith("/")) return false;
            return /\.(jpe?g|png|webp|gif)$/i.test(key);
          })
          .map((obj) => {
            const key = String(obj.Key);
            const nombre = key.split("/").pop() || key;
            return {
              objectKey: key,
              nombre,
              bytes: obj.Size ?? 0,
              actualizadoEn: obj.LastModified
                ? obj.LastModified.toISOString()
                : null,
            };
          })
          .sort((a, b) =>
            String(b.actualizadoEn ?? "").localeCompare(
              String(a.actualizadoEn ?? ""),
            ),
          );

        return json(
          {
            ok: true,
            prefix,
            total: imagenes.length,
            imagenes,
          },
          200,
          corsHeaders,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Sin ListBucket la UI usa BD (portal_banner_imagen) + respuesta del seed.
        if (/not authorized|AccessDenied|ListBucket/i.test(msg)) {
          return json(
            {
              ok: true,
              prefix,
              total: 0,
              imagenes: [],
              aviso:
                "IAM sin s3:ListBucket. Usa Cargar pack / subir imagen (se indexan en BD). Agrega ListBucket al usuario AWS para listar S3.",
            },
            200,
            corsHeaders,
          );
        }
        throw err;
      }
    }

    /**
     * Sube el pack base (6 imágenes) a anuncios-portal/{instalacionId}/catalogo/
     * Usa secretos AWS del Edge. Idempotente (omite si ya existe).
     */
    if (action === "seed-anuncios-portal-demo") {
      const instalacionId = leerInstalacionId(entrada);
      if (!instalacionId) {
        return json(
          { ok: false, error: "instalacionId requerido" },
          400,
          corsHeaders,
        );
      }
      const demos = [
        {
          slug: "gestion-obra",
          url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=85",
        },
        {
          slug: "empleabilidad",
          url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=85",
        },
        {
          slug: "operaciones",
          url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1600&q=85",
        },
        {
          slug: "oportunidades",
          url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=85",
        },
        {
          slug: "datos-ia",
          url: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=85",
        },
        {
          slug: "certificacion",
          url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=85",
        },
      ];

      const subidas: Array<{
        objectKey: string;
        slug: string;
        estado: "creado" | "existente";
      }> = [];

      for (const demo of demos) {
        const objectKey =
          `anuncios-portal/${instalacionId}/catalogo/${demo.slug}.jpg`;
        let existe = false;
        try {
          await client.send(
            new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
          );
          existe = true;
        } catch {
          existe = false;
        }
        if (existe) {
          subidas.push({ objectKey, slug: demo.slug, estado: "existente" });
          continue;
        }
        const resp = await fetch(demo.url);
        if (!resp.ok) {
          throw new Error(
            `No se pudo descargar ${demo.slug} (${resp.status})`,
          );
        }
        const bytes = new Uint8Array(await resp.arrayBuffer());
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: bytes,
            ContentType: "image/jpeg",
          }),
        );
        subidas.push({ objectKey, slug: demo.slug, estado: "creado" });
      }

      return json(
        {
          ok: true,
          prefix: `anuncios-portal/${instalacionId}/catalogo/`,
          total: subidas.length,
          imagenes: subidas,
        },
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
