/** Extrae el ID de un enlace o ID crudo de YouTube. */
export function idVideoYoutube(entrada: string | null | undefined): string | null {
  const raw = String(entrada ?? "").trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;

      const partes = url.pathname.split("/").filter(Boolean);
      if (
        (partes[0] === "embed" ||
          partes[0] === "shorts" ||
          partes[0] === "live" ||
          partes[0] === "v") &&
        partes[1] &&
        /^[\w-]{11}$/.test(partes[1])
      ) {
        return partes[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function urlEmbedYoutube(
  entrada: string | null | undefined,
  opciones: { startSeconds?: number; enableJsApi?: boolean } = {},
): string | null {
  const id = idVideoYoutube(entrada);
  if (!id) return null;
  const params = new URLSearchParams();
  if (opciones.enableJsApi !== false) params.set("enablejsapi", "1");
  params.set("rel", "0");
  const start = Math.max(0, Math.floor(opciones.startSeconds ?? 0));
  if (start > 0) params.set("start", String(start));
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

const CLAVE_PROGRESO_VIDEO = "tukuy:video-progreso";

type MapaProgresoVideo = Record<string, number>;

function leerMapaProgresoVideo(): MapaProgresoVideo {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(CLAVE_PROGRESO_VIDEO);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MapaProgresoVideo;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function claveProgresoVideo(cursoId: string, actividadId: string): string {
  return `${cursoId}:${actividadId}`;
}

export function leerProgresoVideoSegundos(
  cursoId: string,
  actividadId: string,
): number {
  const valor = leerMapaProgresoVideo()[claveProgresoVideo(cursoId, actividadId)];
  return typeof valor === "number" && Number.isFinite(valor) && valor > 0
    ? Math.floor(valor)
    : 0;
}

export function guardarProgresoVideoSegundos(
  cursoId: string,
  actividadId: string,
  segundos: number,
): void {
  if (typeof localStorage === "undefined") return;
  const seguro = Math.max(0, Math.floor(segundos));
  if (seguro < 3) return;
  const mapa = leerMapaProgresoVideo();
  mapa[claveProgresoVideo(cursoId, actividadId)] = seguro;
  localStorage.setItem(CLAVE_PROGRESO_VIDEO, JSON.stringify(mapa));
}

export function limpiarProgresoVideo(
  cursoId: string,
  actividadId: string,
): void {
  if (typeof localStorage === "undefined") return;
  const mapa = leerMapaProgresoVideo();
  delete mapa[claveProgresoVideo(cursoId, actividadId)];
  localStorage.setItem(CLAVE_PROGRESO_VIDEO, JSON.stringify(mapa));
}
