import { supabasePrincipal } from "@/lib/supabase";

export type KindMediaAcademia = "portada" | "material" | "entrega";

export type ResultadoSubidaMedia = {
  objectKey: string;
  url: string;
  publicUrl: string | null;
};

const MEDIA_PUBLIC_BASE =
  (import.meta.env.VITE_MEDIA_PUBLIC_BASE_URL as string | undefined)?.trim() ||
  "https://tukuy-academy-media.s3.us-east-2.amazonaws.com";

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
  return `${MEDIA_PUBLIC_BASE.replace(/\/$/, "")}/${clave}`;
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
}) {
  const { data, error } = await supabasePrincipal().functions.invoke(
    "media-presign",
    {
      body: {
        action: "presign-upload",
        kind: entrada.kind,
        fileName: entrada.fileName,
        contentType: entrada.contentType,
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
): Promise<ResultadoSubidaMedia> {
  const firmado = await pedirPresignUpload({
    kind,
    fileName: archivo.name,
    contentType: archivo.type || "application/octet-stream",
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
    // Entregas: guardar la key; la descarga usa presign-download.
    `s3://${firmado.objectKey}`;

  return {
    objectKey: firmado.objectKey,
    url,
    publicUrl: firmado.publicUrl,
  };
}

export const storageAcademia = {
  subirPortada(archivo: File) {
    return subirConPresign("portada", archivo);
  },
  subirMaterial(archivo: File) {
    return subirConPresign("material", archivo);
  },
  subirEntrega(archivo: File) {
    return subirConPresign("entrega", archivo);
  },

  async urlDescargaEntrega(objectKey: string) {
    const key = objectKey.replace(/^s3:\/\//, "");
    const { data, error } = await supabasePrincipal().functions.invoke(
      "media-presign",
      { body: { action: "presign-download", objectKey: key } },
    );
    if (error) throw new Error(error.message);
    if (!data?.ok || !data.downloadUrl) {
      throw new Error(data?.error || "No se pudo firmar la descarga.");
    }
    return String(data.downloadUrl);
  },
};
