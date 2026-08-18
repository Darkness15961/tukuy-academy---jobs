import { idVideoYoutube, urlEmbedYoutube } from "@/lib/youtube";

export type FuenteVideoCurso = "youtube" | "tiktok" | "drive";

export const OPCIONES_FUENTE_VIDEO: Array<{
  value: FuenteVideoCurso;
  label: string;
}> = [
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "drive", label: "Google Drive" },
];

export function normalizarFuenteVideo(
  entrada: string | null | undefined,
): FuenteVideoCurso | null {
  const valor = String(entrada ?? "")
    .trim()
    .toLowerCase();
  if (valor === "youtube" || valor === "tiktok" || valor === "drive") {
    return valor;
  }
  return null;
}

export function idVideoTiktok(entrada: string | null | undefined): string | null {
  const raw = String(entrada ?? "").trim();
  if (!raw) return null;
  if (/^\d{8,}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "tiktok.com" && host !== "m.tiktok.com") return null;
    const partes = url.pathname.split("/").filter(Boolean);
    const indice = partes.findIndex((parte) => parte === "video");
    const id = indice >= 0 ? partes[indice + 1] ?? "" : "";
    return /^\d{8,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function idArchivoDrive(entrada: string | null | undefined): string | null {
  const raw = String(entrada ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const esDrive =
      host === "drive.google.com" ||
      host === "docs.google.com" ||
      host === "drive.google.com.pe";
    if (!esDrive) return null;
    const porQuery = url.searchParams.get("id");
    if (porQuery && /^[\w-]{10,}$/.test(porQuery)) return porQuery;
    const partes = url.pathname.split("/").filter(Boolean);
    const indice = partes.findIndex((parte) => parte === "d");
    const id = indice >= 0 ? partes[indice + 1] ?? "" : "";
    return id && /^[\w-]{10,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function detectarFuenteVideo(
  entrada: string | null | undefined,
): FuenteVideoCurso | null {
  if (idVideoYoutube(entrada)) return "youtube";
  if (idVideoTiktok(entrada)) return "tiktok";
  if (idArchivoDrive(entrada)) return "drive";
  const raw = String(entrada ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("tiktok.com")) return "tiktok";
  if (raw.includes("drive.google.com") || raw.includes("docs.google.com")) {
    return "drive";
  }
  if (raw.includes("youtu")) return "youtube";
  return null;
}

export function etiquetaFuenteVideo(fuente: FuenteVideoCurso | null | undefined) {
  if (fuente === "tiktok") return "TikTok";
  if (fuente === "drive") return "Google Drive";
  return "YouTube";
}

export function placeholderUrlVideo(fuente: FuenteVideoCurso) {
  if (fuente === "tiktok") {
    return "https://www.tiktok.com/@usuario/video/…";
  }
  if (fuente === "drive") {
    return "https://drive.google.com/file/d/…/view";
  }
  return "https://www.youtube.com/watch?v=…";
}

export function ayudaUrlVideo(fuente: FuenteVideoCurso) {
  if (fuente === "tiktok") {
    return "Pega el enlace completo del video (no uses vm.tiktok.com).";
  }
  if (fuente === "drive") {
    return "Comparte el archivo como “Cualquiera con el enlace” y pega esa URL.";
  }
  return "Acepta watch, youtu.be, Shorts o live.";
}

export function urlEmbedVideo(
  entrada: string | null | undefined,
  fuente?: FuenteVideoCurso | null,
  opciones: { startSeconds?: number } = {},
): { fuente: FuenteVideoCurso; embed: string } | null {
  const resuelta = fuente ?? detectarFuenteVideo(entrada);
  if (!resuelta) return null;

  if (resuelta === "youtube") {
    const embed = urlEmbedYoutube(entrada, {
      startSeconds: opciones.startSeconds,
      enableJsApi: true,
    });
    return embed ? { fuente: "youtube", embed } : null;
  }

  if (resuelta === "tiktok") {
    const id = idVideoTiktok(entrada);
    if (!id) return null;
    return {
      fuente: "tiktok",
      embed: `https://www.tiktok.com/embed/v2/${id}`,
    };
  }

  const id = idArchivoDrive(entrada);
  if (!id) return null;
  return {
    fuente: "drive",
    embed: `https://drive.google.com/file/d/${id}/preview`,
  };
}

/** No mostrar al alumno el enlace crudo que el constructor guardaba como “Video: https://…”. */
export function descripcionVisibleAlumno(
  descripcion?: string | null,
  opciones: { titulo?: string | null; videoUrl?: string | null } = {},
): string {
  const texto = String(descripcion ?? "").trim();
  if (!texto) return "";
  const titulo = String(opciones.titulo ?? "").trim();
  if (titulo && texto === titulo) return "";
  if (/^video:\s*https?:\/\//i.test(texto)) return "";
  const urlVideo = String(opciones.videoUrl ?? "").trim();
  if (urlVideo && texto === urlVideo) return "";
  if (
    /^https?:\/\//i.test(texto) &&
    /youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com|docs\.google\.com/i.test(
      texto,
    )
  ) {
    return "";
  }
  return texto;
}

/** Enlace para abrir el video fuera del reproductor (Drive a veces no deja embeber). */
export function urlAperturaVideo(
  entrada: string | null | undefined,
  fuente?: FuenteVideoCurso | null,
): string | null {
  const raw = String(entrada ?? "").trim();
  const resuelta = fuente ?? detectarFuenteVideo(raw);
  if (resuelta === "drive") {
    const id = idArchivoDrive(raw);
    return id ? `https://drive.google.com/file/d/${id}/view` : raw || null;
  }
  return raw || null;
}
