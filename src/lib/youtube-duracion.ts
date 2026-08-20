import { idVideoYoutube } from "@/lib/youtube";

/** Convierte duración ISO 8601 de YouTube (p. ej. PT1H2M30S) a segundos. */
export function segundosDesdeDuracionIso8601(iso: string): number | null {
  const valor = String(iso ?? "").trim();
  if (!valor.startsWith("PT")) return null;

  const horas = valor.match(/(\d+)H/i)?.[1];
  const minutos = valor.match(/(\d+)M/i)?.[1];
  const segundos = valor.match(/(\d+)S/i)?.[1];

  const total =
    (horas ? Number(horas) * 3600 : 0) +
    (minutos ? Number(minutos) * 60 : 0) +
    (segundos ? Number(segundos) : 0);

  return total > 0 ? total : null;
}

/** Formato legible para la UI del alumno: "12 min", "1 h 5 min". */
export function formatearDuracionVideo(segundos: number): string {
  const seguro = Math.max(0, Math.round(segundos));
  if (seguro <= 0) return "";
  const horas = Math.floor(seguro / 3600);
  const minutos = Math.ceil((seguro % 3600) / 60) || (horas > 0 ? 0 : 1);
  if (horas > 0 && minutos > 0) return `${horas} h ${minutos} min`;
  if (horas > 0) return `${horas} h`;
  return `${Math.max(1, minutos)} min`;
}

export function minutosDesdeSegundosVideo(segundos: number): number {
  return Math.max(1, Math.ceil(segundos / 60));
}

/** Extrae el ID y consulta la YouTube Data API v3 (requiere clave en el gateway). */
export async function consultarDuracionYoutube(
  urlOId: string,
  invocar: (videoId: string) => Promise<{ segundos: number } | null>,
): Promise<number | null> {
  const videoId = idVideoYoutube(urlOId);
  if (!videoId) return null;
  const resultado = await invocar(videoId);
  return resultado?.segundos ?? null;
}
