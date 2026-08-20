/** Proporción estándar de portadas de curso en tarjetas y catálogo. */
export const PORTADA_CURSO_RELACION = "16:9" as const;

/** Resolución recomendada (HD): encaje exacto sin bandas en la mayoría de vistas. */
export const PORTADA_CURSO_ANCHO_PX = 1280;
export const PORTADA_CURSO_ALTO_PX = 720;

export const PORTADA_CURSO_RESOLUCION = `${PORTADA_CURSO_ANCHO_PX} × ${PORTADA_CURSO_ALTO_PX} px`;

/** Texto breve para ayuda en formularios de subida. */
export const PORTADA_CURSO_AYUDA_BREVE = `${PORTADA_CURSO_RESOLUCION} (${PORTADA_CURSO_RELACION}) · encaje exacto en catálogo y tarjetas`;
