import { supabasePrincipal } from "@/lib/supabase";

export type KindMediaAcademia =
  | "portada"
  | "material"
  | "entrega"
  | "certificado"
  /** Imagen de fondo del diseño de certificado. */
  | "fondo-certificado"
  /** Carrusel / anuncios del portal alumno → `anuncios-portal/`. */
  | "anuncio-portal";

export type ResultadoSubidaMedia = {
  objectKey: string;
  url: string;
  publicUrl: string | null;
};

const MEDIA_PUBLIC_BASE =
  (import.meta.env.VITE_MEDIA_PUBLIC_BASE_URL as string | undefined)?.trim() ||
  "https://tukuy-academy-media.s3.us-east-2.amazonaws.com";

const MEDIA_BASE_NORM = MEDIA_PUBLIC_BASE.replace(/\/$/, "");

/** Margen antes del expiry de la URL firmada (Edge: 600s). */
const MARGEN_FIRMA_MS = 60_000;
/** Tiempo de vida del blob de imagen en memoria (reutilizable entre pantallas). */
const TTL_BLOB_MS = 45 * 60 * 1000;
/** Límite blando de blobs cacheados (evita crecer sin control). */
const MAX_BLOBS = 40;

type EntradaUrlFirmada = { url: string; expiresAt: number };
type EntradaBlob = { objectUrl: string; expiresAt: number; bytes: number };

const cacheUrlsFirmadas = new Map<string, EntradaUrlFirmada>();
const inflightUrlsFirmadas = new Map<string, Promise<string>>();
const cacheBlobs = new Map<string, EntradaBlob>();
const inflightBlobs = new Map<string, Promise<string>>();
const cacheDataUrls = new Map<string, { dataUrl: string; expiresAt: number }>();
const inflightDataUrls = new Map<string, Promise<string>>();

function normalizarObjectKey(objectKey: string): string {
  return objectKey.replace(/^s3:\/\//i, "").replace(/^\//, "").trim();
}

function claveCacheDesdeMedia(claveOUrl: string): string | null {
  return objectKeyDesdeMedia(claveOUrl);
}

/** Resuelve clave S3 o URL ya pública a una URL usable en <img>. */
export function urlPublicaMedia(
  claveOUrl: string | null | undefined,
  fallback = "",
): string {
  const valor = String(claveOUrl ?? "").trim();
  if (!valor) return fallback;
  if (
    /^https?:\/\//i.test(valor) ||
    valor.startsWith("data:") ||
    valor.startsWith("blob:")
  ) {
    return valor;
  }
  const clave = valor.replace(/^s3:\/\//i, "").replace(/^\//, "");
  return `${MEDIA_BASE_NORM}/${clave}`;
}

/** Extrae object key S3 desde clave, s3:// o URL del bucket de media. */
export function objectKeyDesdeMedia(
  claveOUrl: string | null | undefined,
): string | null {
  const valor = String(claveOUrl ?? "").trim();
  if (!valor || valor.startsWith("data:") || valor.startsWith("blob:")) {
    return null;
  }
  if (valor.startsWith("s3://")) {
    return valor.slice(5).replace(/^\//, "") || null;
  }
  if (!/^https?:\/\//i.test(valor)) {
    return valor.replace(/^\//, "") || null;
  }
  try {
    const u = new URL(valor);
    const path = decodeURIComponent(u.pathname.replace(/^\//, ""));
    if (!path) return null;
    if (MEDIA_BASE_NORM && valor.startsWith(MEDIA_BASE_NORM)) {
      return path;
    }
    if (/\.amazonaws\.com$/i.test(u.hostname) || /s3[.-]/i.test(u.hostname)) {
      return path;
    }
  } catch {
    return null;
  }
  return null;
}

function requiereUrlFirmada(objectKey: string): boolean {
  return (
    objectKey.startsWith("certificados/") ||
    objectKey.startsWith("entregas/") ||
    objectKey.startsWith("entrega/") ||
    objectKey.startsWith("portadas/") ||
    objectKey.startsWith("materiales/") ||
    objectKey.startsWith("anuncios-portal/")
  );
}

async function invocarPresignDownload(objectKey: string): Promise<{
  downloadUrl: string;
  expiresIn: number;
}> {
  const key = normalizarObjectKey(objectKey);
  const { data, error } = await supabasePrincipal().functions.invoke(
    "media-presign",
    { body: { action: "presign-download", objectKey: key } },
  );
  if (error) throw new Error(error.message);
  if (!data?.ok || !data.downloadUrl) {
    throw new Error(data?.error || "No se pudo firmar la descarga.");
  }
  return {
    downloadUrl: String(data.downloadUrl),
    expiresIn: Number(data.expiresIn) || 600,
  };
}

/**
 * URL firmada con caché en memoria + dedupe de peticiones en vuelo.
 * Reutilizable en toda la app (fondos, PDFs, entregas).
 */
export async function urlFirmadaDescargaMedia(
  objectKey: string,
): Promise<string> {
  const key = normalizarObjectKey(objectKey);
  if (!key) throw new Error("objectKey requerido");

  const hit = cacheUrlsFirmadas.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const pending = inflightUrlsFirmadas.get(key);
  if (pending) return pending;

  const promesa = (async () => {
    const { downloadUrl, expiresIn } = await invocarPresignDownload(key);
    cacheUrlsFirmadas.set(key, {
      url: downloadUrl,
      expiresAt: Date.now() + expiresIn * 1000 - MARGEN_FIRMA_MS,
    });
    return downloadUrl;
  })().finally(() => {
    inflightUrlsFirmadas.delete(key);
  });

  inflightUrlsFirmadas.set(key, promesa);
  return promesa;
}

function expulsarBlobSiHaceFalta() {
  if (cacheBlobs.size < MAX_BLOBS) return;
  let masAntigua: string | null = null;
  let minExp = Infinity;
  for (const [k, v] of cacheBlobs) {
    if (v.expiresAt < minExp) {
      minExp = v.expiresAt;
      masAntigua = k;
    }
  }
  if (masAntigua) {
    const vieja = cacheBlobs.get(masAntigua);
    if (vieja) URL.revokeObjectURL(vieja.objectUrl);
    cacheBlobs.delete(masAntigua);
  }
}

/**
 * Descarga la imagen una vez y guarda un blob: URL reutilizable.
 * Así el mismo fondo no se vuelve a bajar al cambiar de paso o de pantalla.
 */
export async function urlMediaConCacheBlob(
  claveOUrl: string | null | undefined,
  fallback = "",
): Promise<string> {
  const valor = String(claveOUrl ?? "").trim();
  if (!valor) return fallback;
  if (valor.startsWith("data:") || valor.startsWith("blob:")) return valor;

  const key = claveCacheDesdeMedia(valor);
  if (!key || !requiereUrlFirmada(key)) {
    return urlPublicaMedia(valor, fallback);
  }

  const hit = cacheBlobs.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.objectUrl;

  const pending = inflightBlobs.get(key);
  if (pending) return pending;

  const promesa = (async () => {
    const firmada = await urlFirmadaDescargaMedia(key);
    const resp = await fetch(firmada);
    if (!resp.ok) {
      throw new Error(`No se pudo descargar media (${resp.status}).`);
    }
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const previa = cacheBlobs.get(key);
    if (previa) URL.revokeObjectURL(previa.objectUrl);
    expulsarBlobSiHaceFalta();
    cacheBlobs.set(key, {
      objectUrl,
      expiresAt: Date.now() + TTL_BLOB_MS,
      bytes: blob.size,
    });
    return objectUrl;
  })()
    .catch(async () => {
      // Si falla el blob, al menos devolver URL firmada (sin cachear blob).
      try {
        return await urlFirmadaDescargaMedia(key);
      } catch {
        return urlPublicaMedia(valor, fallback);
      }
    })
    .finally(() => {
      inflightBlobs.delete(key);
    });

  inflightBlobs.set(key, promesa);
  return promesa;
}

/**
 * Data URL cacheada (útil para jsPDF). Reusa blob en memoria si existe.
 */
export async function dataUrlMediaCacheada(
  claveOUrl: string | null | undefined,
  fallback = "",
): Promise<string> {
  const valor = String(claveOUrl ?? "").trim();
  if (!valor) return fallback;
  if (valor.startsWith("data:")) return valor;

  const key = claveCacheDesdeMedia(valor) || valor;
  const hit = cacheDataUrls.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.dataUrl;

  const pending = inflightDataUrls.get(key);
  if (pending) return pending;

  const promesa = (async () => {
    let fuente = valor;
    if (valor.startsWith("blob:")) {
      fuente = valor;
    } else if (claveCacheDesdeMedia(valor) && requiereUrlFirmada(claveCacheDesdeMedia(valor)!)) {
      fuente = await urlMediaConCacheBlob(valor, "");
    } else if (!/^https?:\/\//i.test(valor) && !valor.startsWith("blob:")) {
      fuente = urlPublicaMedia(valor, "");
    }

    const resp = await fetch(fuente);
    if (!resp.ok) throw new Error(`No se pudo leer media (${resp.status}).`);
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo convertir a data URL."));
      reader.readAsDataURL(blob);
    });
    cacheDataUrls.set(key, {
      dataUrl,
      expiresAt: Date.now() + TTL_BLOB_MS,
    });
    return dataUrl;
  })().finally(() => {
    inflightDataUrls.delete(key);
  });

  inflightDataUrls.set(key, promesa);
  return promesa;
}

/**
 * URL usable en <img> / PDF preview.
 * Prioriza blob cacheado → URL firmada cacheada → pública.
 */
export async function urlVisualizableMedia(
  claveOUrl: string | null | undefined,
  fallback = "",
): Promise<string> {
  const valor = String(claveOUrl ?? "").trim();
  if (!valor) return fallback;
  if (valor.startsWith("data:") || valor.startsWith("blob:")) return valor;

  const key = objectKeyDesdeMedia(valor);
  if (key && requiereUrlFirmada(key)) {
    try {
      return await urlMediaConCacheBlob(valor, fallback);
    } catch {
      try {
        return await urlFirmadaDescargaMedia(key);
      } catch {
        return urlPublicaMedia(valor, fallback);
      }
    }
  }
  return urlPublicaMedia(valor, fallback);
}

/** Limpia cachés de media (logout / cambio de instalación). */
export function invalidarCacheMedia() {
  for (const entrada of cacheBlobs.values()) {
    URL.revokeObjectURL(entrada.objectUrl);
  }
  cacheBlobs.clear();
  cacheUrlsFirmadas.clear();
  cacheDataUrls.clear();
  inflightUrlsFirmadas.clear();
  inflightBlobs.clear();
  inflightDataUrls.clear();
}

/** Peek síncrono: si ya hay blob o URL firmada viva, la devuelve sin red. */
export function peekUrlMediaCacheada(
  claveOUrl: string | null | undefined,
): string | null {
  const valor = String(claveOUrl ?? "").trim();
  if (!valor) return null;
  if (valor.startsWith("data:") || valor.startsWith("blob:")) return valor;
  const key = objectKeyDesdeMedia(valor);
  if (!key) {
    if (/^https?:\/\//i.test(valor)) return valor;
    return null;
  }
  const blob = cacheBlobs.get(key);
  if (blob && blob.expiresAt > Date.now()) return blob.objectUrl;
  if (!requiereUrlFirmada(key)) return urlPublicaMedia(valor, "");
  const firmada = cacheUrlsFirmadas.get(key);
  if (firmada && firmada.expiresAt > Date.now()) return firmada.url;
  return null;
}

/** Normaliza object-position CSS (`50% 50%`). */
export function normalizarPosicionPortada(
  valor: string | null | undefined,
): string {
  const raw = String(valor ?? "").trim();
  const match = raw.match(/^([\d.]+)%\s+([\d.]+)%$/);
  if (!match) return "50% 50%";
  const x = Math.min(100, Math.max(0, Number(match[1])));
  const y = Math.min(100, Math.max(0, Number(match[2])));
  if (Number.isNaN(x) || Number.isNaN(y)) return "50% 50%";
  return `${x}% ${y}%`;
}

async function pedirPresignUpload(entrada: {
  kind: KindMediaAcademia;
  fileName: string;
  contentType: string;
  instalacionId?: string | null;
  fileSize?: number;
}) {
  const { instalacionSecundariaActiva } = await import(
    "@/api/services/secundaria-gateway.service"
  );
  const instalacionId =
    entrada.instalacionId?.trim() || instalacionSecundariaActiva();
  const { data, error } = await supabasePrincipal().functions.invoke(
    "media-presign",
    {
      body: {
        action: "presign-upload",
        kind: entrada.kind,
        fileName: entrada.fileName,
        contentType: entrada.contentType,
        instalacionId,
        fileSize: entrada.fileSize,
      },
    },
  );
  if (error) throw new Error(error.message);
  if (!data?.ok || !data.uploadUrl || !data.objectKey) {
    throw new Error(
      [data?.error, data?.details].filter(Boolean).join(" — ") ||
        "No se pudo firmar la subida a S3.",
    );
  }
  return data as {
    ok: true;
    objectKey: string;
    uploadUrl: string;
    publicUrl: string | null;
    contentType: string;
  };
}

async function subirConPresign(
  kind: KindMediaAcademia,
  archivo: File,
  instalacionId?: string | null,
): Promise<ResultadoSubidaMedia> {
  if (kind === "anuncio-portal" && archivo.size > 1024 * 1024) {
    throw new Error("La imagen del anuncio no puede pesar más de 1 MB.");
  }
  const firmado = await pedirPresignUpload({
    kind,
    fileName: archivo.name,
    contentType: archivo.type || "application/octet-stream",
    instalacionId,
    fileSize: archivo.size,
  });

  const respuesta = await fetch(firmado.uploadUrl, {
    method: "PUT",
    body: archivo,
    headers: {
      "Content-Type": archivo.type || "application/octet-stream",
    },
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(
      `No se pudo subir el archivo a S3 (${respuesta.status}). ${detalle.slice(0, 180) || "Revisa CORS y bucket policy."}`,
    );
  }

  const url =
    firmado.publicUrl ??
    // Privados / anuncios: guardar la key; la vista usa presign-download.
    `s3://${firmado.objectKey}`;

  if (kind === "anuncio-portal" || kind === "fondo-certificado") {
    calentarCacheMediaDesdeArchivo(firmado.objectKey, archivo);
  }

  return {
    objectKey: firmado.objectKey,
    url,
    publicUrl: firmado.publicUrl,
  };
}

/**
 * Tras subir un fondo, calienta el caché con el File local (sin re-descargar).
 */
export function calentarCacheMediaDesdeArchivo(
  objectKeyOrUrl: string,
  archivo: Blob,
) {
  const key = objectKeyDesdeMedia(objectKeyOrUrl) || normalizarObjectKey(objectKeyOrUrl);
  if (!key) return;
  const objectUrl = URL.createObjectURL(archivo);
  const previa = cacheBlobs.get(key);
  if (previa) URL.revokeObjectURL(previa.objectUrl);
  expulsarBlobSiHaceFalta();
  cacheBlobs.set(key, {
    objectUrl,
    expiresAt: Date.now() + TTL_BLOB_MS,
    bytes: archivo.size,
  });
}

function esErrorListBucketIam(mensaje: string) {
  return /not authorized|AccessDenied|ListBucket|s3:ListBucket/i.test(
    mensaje,
  );
}

async function invocarMediaPresign(
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabasePrincipal().functions.invoke(
    "media-presign",
    { body },
  );
  if (!error) {
    return (data ?? {}) as Record<string, unknown>;
  }
  let detalle = error.message || "Error media-presign";
  let payload: Record<string, unknown> | null = null;
  try {
    const ctx = error as { context?: Response };
    if (ctx.context && typeof ctx.context.json === "function") {
      payload = (await ctx.context.json()) as Record<string, unknown>;
      const msg = String(payload.error || payload.message || "").trim();
      if (msg) detalle = msg;
      if (msg.includes("Accion no soportada") || msg.includes("no soportada")) {
        detalle =
          "media-presign desactualizado: redeploy la Edge Function (falta listar/seed anuncios-portal).";
      }
    }
  } catch {
    /* ignore */
  }
  // ListBucket denegado: no es fallo de la app; la biblioteca usa BD / seed.
  if (
    body.action === "listar-anuncios-portal" &&
    (esErrorListBucketIam(detalle) ||
      (payload && payload.ok === true && Array.isArray(payload.imagenes)))
  ) {
    if (payload && payload.ok === true) return payload;
    return {
      ok: true,
      imagenes: [],
      aviso:
        "IAM sin s3:ListBucket. Usa «Cargar pack base a S3» o sube imágenes (se indexan en BD).",
    };
  }
  if (/non-2xx|Edge Function returned/i.test(detalle)) {
    detalle =
      "No se pudo hablar con media-presign (¿redeploy?). La biblioteca usará solo BD mientras tanto.";
  }
  throw new Error(detalle);
}

const UUID_INSTALACION_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function esUuidInstalacion(valor: string) {
  return UUID_INSTALACION_RE.test(valor.trim());
}

export const storageAcademia = {
  /** Portadas de cursos / branding org → `portadas/`. */
  subirPortada(archivo: File, instalacionId?: string | null) {
    return subirConPresign("portada", archivo, instalacionId);
  },
  /** Materiales de aprendizaje → `materiales/`. */
  subirMaterial(archivo: File) {
    return subirConPresign("material", archivo);
  },
  /**
   * Anuncios del portal alumno → `anuncios-portal/{instalacionId}/…`
   * Carpeta dedicada por organización; listable vía `listarAnunciosPortal`.
   */
  subirAnuncioPortal(archivo: File, instalacionId: string) {
    return subirConPresign("anuncio-portal", archivo, instalacionId);
  },
  async listarAnunciosPortal(instalacionId: string): Promise<{
    aviso: string;
    imagenes: Array<{
      objectKey: string;
      nombre: string;
      bytes: number;
      actualizadoEn: string | null;
    }>;
  }> {
    const id = instalacionId.trim();
    if (!id) return { aviso: "", imagenes: [] };
    if (!esUuidInstalacion(id)) {
      throw new Error(
        "instalacionId inválido (se espera UUID de la organización).",
      );
    }
    try {
      const data = await invocarMediaPresign({
        action: "listar-anuncios-portal",
        instalacionId: id,
      });
      if (!data.ok) {
        const err = String(data.error || "No se pudo listar anuncios-portal/");
        if (esErrorListBucketIam(err)) {
          return {
            aviso: "",
            imagenes: [],
          };
        }
        throw new Error(err);
      }
      const raw = Array.isArray(data.imagenes) ? data.imagenes : [];
      return {
        // No molestar en UI por falta de ListBucket: es esperado hasta IAM.
        aviso: "",
        imagenes: raw
          .map((item) => {
            const row = item as Record<string, unknown>;
            return {
              objectKey: String(row.objectKey ?? ""),
              nombre: String(row.nombre ?? "imagen"),
              bytes: Number(row.bytes ?? 0),
              actualizadoEn: (row.actualizadoEn as string | null) ?? null,
            };
          })
          .filter((i) => i.objectKey),
      };
    } catch (causa) {
      const msg = causa instanceof Error ? causa.message : String(causa);
      if (esErrorListBucketIam(msg)) {
        return { aviso: "", imagenes: [] };
      }
      throw causa;
    }
  },

  /**
   * Sube el pack base (6 JPG) a `anuncios-portal/{instalacionId}/catalogo/`
   * vía Edge (secretos AWS del proyecto).
   */
  async seedAnunciosPortal(instalacionId: string): Promise<{
    prefix: string;
    imagenes: Array<{ objectKey: string; slug: string; estado: string }>;
  }> {
    const id = instalacionId.trim();
    if (!esUuidInstalacion(id)) {
      throw new Error(
        "instalacionId inválido (se espera UUID de la organización).",
      );
    }
    const data = await invocarMediaPresign({
      action: "seed-anuncios-portal-demo",
      instalacionId: id,
    });
    if (!data.ok) {
      throw new Error(String(data.error || "No se pudo sembrar anuncios-portal/"));
    }
    return {
      prefix: String(data.prefix ?? `anuncios-portal/${id}/catalogo/`),
      imagenes: Array.isArray(data.imagenes)
        ? (data.imagenes as Array<{
            objectKey: string;
            slug: string;
            estado: string;
          }>)
        : [],
    };
  },
  /** Entregas de alumnos → `entregas/` (privado). */
  subirEntrega(archivo: File) {
    return subirConPresign("entrega", archivo);
  },
  /** PDF de certificado emitido → `certificados/documentos/` (privado). */
  subirCertificado(archivo: File) {
    return subirConPresign("certificado", archivo);
  },
  /**
   * Fondo del diseño → `certificados/fondos/`.
   * Guarda referencia `s3://…`; la UI usa caché + URL firmada.
   */
  async subirFondoCertificado(archivo: File) {
    const subida = await subirConPresign("fondo-certificado", archivo);
    const url = `s3://${subida.objectKey}`;
    calentarCacheMediaDesdeArchivo(url, archivo);
    return {
      ...subida,
      url,
    };
  },

  async urlDescargaEntrega(objectKey: string) {
    return urlFirmadaDescargaMedia(objectKey);
  },

  async urlDescargaCertificado(objectKey: string) {
    return urlFirmadaDescargaMedia(objectKey);
  },

  urlVisualizable: urlVisualizableMedia,
  invalidarCache: invalidarCacheMedia,
};
