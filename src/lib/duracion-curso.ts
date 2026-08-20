import { formatearDuracionVideo } from "@/lib/youtube-duracion";
import type { BorradorCursoDocente } from "@/portal-docente/types/docente.types";

const MINUTOS_POR_TIPO: Record<string, number> = {
  quiz: 15,
  assignment: 30,
  video: 10,
  lectura: 10,
};

export function minutosEstimadosActividad(
  tipo: string,
  duracionMinutos?: number | null,
): number {
  const explicito = Number(duracionMinutos ?? 0);
  if (explicito > 0) return explicito;
  return MINUTOS_POR_TIPO[String(tipo).toLowerCase()] ?? 10;
}

export function sumarMinutosPrograma(
  secciones: BorradorCursoDocente["secciones"] | undefined,
): number {
  if (!secciones?.length) return 0;

  let total = 0;
  for (const seccion of secciones) {
    const items =
      seccion.items?.length && seccion.items.length > 0
        ? seccion.items
        : seccion.clases.map((titulo, indice) => ({
            titulo,
            tipo: (indice === 0 ? "video" : "lectura") as
              | "video"
              | "lectura",
          }));

    for (const item of items) {
      const titulo = String(item.titulo ?? "").trim();
      const url = String(
        (item as { urlYoutube?: string }).urlYoutube ?? "",
      ).trim();
      if (!titulo && !url && item.tipo !== "video") continue;
      total += minutosEstimadosActividad(
        item.tipo,
        (item as { duracionMinutos?: number }).duracionMinutos,
      );
    }
  }

  return total;
}

export function formatearDuracionCurso(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return "—";
  return formatearDuracionVideo(minutos * 60);
}

export function resolverDuracionCursoTexto(opciones: {
  duracionMinutosTotal?: number | null;
  horasVersion?: number | null;
}): string {
  const minutos = Number(opciones.duracionMinutosTotal ?? 0);
  if (minutos > 0) return formatearDuracionCurso(minutos);

  const horas = Number(opciones.horasVersion ?? 0);
  if (horas > 0) return formatearDuracionVideo(horas * 3600);

  return "—";
}
