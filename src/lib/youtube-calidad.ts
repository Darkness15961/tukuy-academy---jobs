/** Calidades YouTube IFrame API (de menor a mayor resolución). */
export const ORDEN_CALIDAD_YT = [
  "tiny",
  "small",
  "medium",
  "large",
  "hd720",
  "hd1080",
  "highres",
] as const;

export const CALIDAD_INICIAL = "hd720";

export const ETIQUETAS_CALIDAD_YT: Record<string, string> = {
  tiny: "144p",
  small: "240p",
  medium: "360p",
  large: "480p",
  hd720: "720p",
  hd1080: "1080p",
  highres: "1440p+",
};

export type ReproductorYoutubeEmbed = {
  getAvailableQualityLevels?: () => string[];
  getPlaybackQuality?: () => string;
  setPlaybackQuality?: (calidad: string) => void;
};

export type OpcionCalidadYoutube = {
  id: string;
  etiqueta: string;
};

function indiceCalidad(calidad: string | undefined): number {
  if (!calidad) return -1;
  return ORDEN_CALIDAD_YT.indexOf(
    calidad as (typeof ORDEN_CALIDAD_YT)[number],
  );
}

/** 720p si existe; si no, la HD más cercana o la más alta disponible. */
function calidadInicialDisponible(disponibles: string[]): string | null {
  if (disponibles.includes(CALIDAD_INICIAL)) return CALIDAD_INICIAL;
  const hd = ["hd1080", "highres"].find((id) => disponibles.includes(id));
  if (hd) return hd;
  const ordenadas = disponibles
    .slice()
    .sort((a, b) => indiceCalidad(b) - indiceCalidad(a));
  return ordenadas[0] ?? null;
}

export function etiquetaCalidadYoutube(id: string | null | undefined): string {
  if (!id) return "720p";
  return ETIQUETAS_CALIDAD_YT[id] ?? id.toUpperCase();
}

export function listarCalidadesYoutube(
  embed: ReproductorYoutubeEmbed | null | undefined,
): OpcionCalidadYoutube[] {
  if (!embed?.getAvailableQualityLevels) return [];
  return embed
    .getAvailableQualityLevels()
    .slice()
    .sort((a, b) => indiceCalidad(b) - indiceCalidad(a))
    .map((id) => ({
      id,
      etiqueta: etiquetaCalidadYoutube(id),
    }));
}

export function obtenerCalidadActualYoutube(
  embed: ReproductorYoutubeEmbed | null | undefined,
): string {
  return embed?.getPlaybackQuality?.() ?? "";
}

export function establecerCalidadYoutube(
  embed: ReproductorYoutubeEmbed | null | undefined,
  calidad: string,
): boolean {
  if (!embed?.setPlaybackQuality) return false;
  try {
    embed.setPlaybackQuality(calidad);
    return true;
  } catch {
    return false;
  }
}

/**
 * Arranca en 720p. El usuario puede cambiar después.
 * YouTube trata esto como sugerencia, no como garantía.
 */
export function aplicarCalidadInicial720(
  embed: ReproductorYoutubeEmbed | null | undefined,
) {
  if (!embed?.getAvailableQualityLevels || !embed.setPlaybackQuality) {
    return false;
  }

  const disponibles = embed.getAvailableQualityLevels();
  const objetivo = calidadInicialDisponible(disponibles);
  if (!objetivo) return false;

  try {
    embed.setPlaybackQuality(objetivo);
    return true;
  } catch {
    return false;
  }
}

/** Reintenta unas veces: YouTube suele ignorar el primer intento. */
export function programarCalidadInicial720(
  embed: ReproductorYoutubeEmbed | null | undefined,
  delaysMs: number[] = [0, 400, 1200, 2500],
) {
  const timers: ReturnType<typeof setTimeout>[] = [];
  for (const delay of delaysMs) {
    timers.push(
      setTimeout(() => {
        aplicarCalidadInicial720(embed);
      }, delay),
    );
  }
  return () => {
    for (const t of timers) clearTimeout(t);
  };
}
