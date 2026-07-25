import type { AprobacionCursoOrganizacion } from "@/api/services/organizacion.service";
import type { ConfiguracionPublicacionCurso } from "@/types/comercializacion-curso.types";

/** Adapta la configuración del wizard al payload legacy del catálogo. */
export function mapearPublicacionAAprobacion(
  config: ConfiguracionPublicacionCurso,
  opciones?: { publicar?: boolean },
): AprobacionCursoOrganizacion {
  const precio =
    config.precio.modalidad === "GRATUITO" ? 0 : config.precio.precioCompleto;

  let alcance: AprobacionCursoOrganizacion["alcance"] = "TODOS";
  let destinoArea: string | null = null;
  if (config.alcance === "INTERNO") {
    if (config.nodoIds.length === 1) {
      alcance = "AREA";
      destinoArea = config.nodoIds[0] ?? null;
    } else {
      alcance = "ORGANIZACION";
    }
  }

  const descuentoInternos = config.descuentos.find(
    (regla) =>
      regla.activa &&
      (regla.modo ?? "AUTOMATICO") === "AUTOMATICO" &&
      regla.aplicaSobre === "CURSO_COMPLETO" &&
      regla.beneficiario === "INTERNOS" &&
      regla.tipo === "PORCENTAJE",
  );
  const descuentoNodo = config.descuentos.find(
    (regla) =>
      regla.activa &&
      (regla.modo ?? "AUTOMATICO") === "AUTOMATICO" &&
      regla.aplicaSobre === "CURSO_COMPLETO" &&
      regla.beneficiario === "NODOS" &&
      regla.tipo === "PORCENTAJE" &&
      regla.nodoIds[0],
  );

  let descuentoAplicaA: AprobacionCursoOrganizacion["descuentoAplicaA"] =
    "NINGUNO";
  let descuentoInterno = 0;
  let descuentoArea: string | null = null;

  if (descuentoNodo) {
    descuentoAplicaA = "AREA";
    descuentoInterno = descuentoNodo.valor;
    descuentoArea = descuentoNodo.nodoIds[0] ?? null;
  } else if (descuentoInternos) {
    descuentoAplicaA = "ORGANIZACION";
    descuentoInterno = descuentoInternos.valor;
  }

  return {
    precio,
    moneda: config.precio.moneda,
    alcance,
    destinoArea,
    descuentoInterno,
    descuentoAplicaA,
    descuentoArea,
    obligatorio: config.obligatorio,
    vence: config.fechaLimite || undefined,
    publicar: opciones?.publicar ?? true,
    configuracionPublicacion: structuredClone(config),
  };
}
