/** Porcentaje mínimo del video que debe verse para marcarlo como completado. */
export const UMBRAL_VISIONADO_VIDEO = 0.8;

export function porcentajeVisionado(
  posicionMaximaSegundos: number,
  duracionTotalSegundos: number,
): number {
  if (
    !Number.isFinite(duracionTotalSegundos) ||
    duracionTotalSegundos <= 0 ||
    !Number.isFinite(posicionMaximaSegundos) ||
    posicionMaximaSegundos <= 0
  ) {
    return 0;
  }
  return Math.min(1, posicionMaximaSegundos / duracionTotalSegundos);
}

export function visionadoVideoCompleto(
  posicionMaximaSegundos: number,
  duracionTotalSegundos: number,
  umbral: number = UMBRAL_VISIONADO_VIDEO,
): boolean {
  return porcentajeVisionado(posicionMaximaSegundos, duracionTotalSegundos) >= umbral;
}

export function porcentajeVisionadoEntero(
  posicionMaximaSegundos: number,
  duracionTotalSegundos: number,
): number {
  return Math.round(porcentajeVisionado(posicionMaximaSegundos, duracionTotalSegundos) * 100);
}
