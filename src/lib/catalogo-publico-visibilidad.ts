/** Alcance comercial en datos_historicos.configuracionPublicacion. */
const ALCANCES_LANDING = new Set(["PUBLICO", "TODOS"]);

const VISIBILIDADES_EXCLUIDAS = new Set(["PRIVADO", "ORGANIZACION"]);

type DatosHistoricosCatalogo = Record<string, unknown> | null | undefined;

function leerConfiguracionPublicacion(
  datos: DatosHistoricosCatalogo,
): Record<string, unknown> | null {
  const config = datos?.configuracionPublicacion;
  return config && typeof config === "object"
    ? (config as Record<string, unknown>)
    : null;
}

/**
 * Aprobación guarda un wrapper { alcance, precio, configuracionPublicacion: { … } }.
 * Usamos la config interna cuando existe.
 */
export function resolverConfiguracionPublicacionEfectiva(
  datos: DatosHistoricosCatalogo,
): Record<string, unknown> | null {
  const outer = leerConfiguracionPublicacion(datos);
  if (!outer) return null;

  const inner = outer.configuracionPublicacion;
  if (inner && typeof inner === "object") {
    const nested = inner as Record<string, unknown>;
    return {
      ...outer,
      ...nested,
      alcance: nested.alcance ?? outer.alcance,
      visibleParaExternos:
        nested.visibleParaExternos ?? outer.visibleParaExternos,
    };
  }

  return outer;
}

/**
 * Landing / detalle público: solo cursos «Catálogo público» / visibles para todos.
 * Respeta alcance INTERNO, visibilidad PRIVADO/ORGANIZACION y flag visibleParaExternos.
 */
export function cursoVisibleEnLandingPublica(
  datosHistoricos?: DatosHistoricosCatalogo,
  visibilidad?: string | null,
  alcanceDirigido?: string | null,
): boolean {
  const datos = datosHistoricos ?? {};
  const config = resolverConfiguracionPublicacionEfectiva(datos);

  const visibilidadDoc = String(
    visibilidad ?? datos.visibilidad ?? "",
  )
    .trim()
    .toUpperCase();
  if (visibilidadDoc === "PRIVADO") {
    return false;
  }

  if (config) {
    const alcance = String(config.alcance ?? "").trim().toUpperCase();
    if (alcance === "INTERNO") return false;
    if (alcance && !ALCANCES_LANDING.has(alcance)) return false;
    if (config.visibleParaExternos === false) return false;
    // Alcance comercial TODOS/PUBLICO prevalece sobre visibilidad ORGANIZACION del borrador.
    return true;
  }

  const alcanceDoc = String(
    alcanceDirigido ?? datos.alcanceDirigido ?? "",
  )
    .trim()
    .toUpperCase();
  if (alcanceDoc === "TODOS") {
    return true;
  }

  if (VISIBILIDADES_EXCLUIDAS.has(visibilidadDoc)) {
    return false;
  }

  // Legacy: publicados sin configuración comercial explícita (p. ej. semillas antiguas).
  return visibilidadDoc === "" || visibilidadDoc === "PUBLICO";
}
