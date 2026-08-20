/** Reglas de certificado por curso (docente vs institución). */

export const CANTIDAD_FIRMAS_CERTIFICADO_MAX = 5;
export const CANTIDAD_FIRMAS_CERTIFICADO_MIN = 1;

export type OrigenCargaCursoCertificado = "DOCENTE" | "ADMINISTRACION";

export type FirmaCertificadoNormalizada = {
  id: string;
  personaId?: string;
  nombre: string;
  cargo: string;
  tipo?: "DIGITAL" | "ELECTRONICA";
  imagen?: string;
  origen?: "PROPIA" | "INSTITUCIONAL";
};

export function esOrigenCargaAdministracion(
  origen: string | null | undefined,
): boolean {
  return String(origen ?? "").trim().toUpperCase() === "ADMINISTRACION";
}

export function clampCantidadFirmasCertificado(
  valor: unknown,
  opciones: { forzarUna?: boolean } = {},
): number {
  if (opciones.forzarUna) return 1;
  const n = Number(valor);
  if (!Number.isFinite(n)) return 1;
  return Math.min(
    CANTIDAD_FIRMAS_CERTIFICADO_MAX,
    Math.max(CANTIDAD_FIRMAS_CERTIFICADO_MIN, Math.round(n)),
  );
}

/**
 * Normaliza plantilla + cantidad de firmas + lista de firmas.
 * - Docente: siempre 1 firma (PROPIA).
 * - Administración: 1–5 firmas enlazables a docentes/contratados.
 */
export function normalizarCertificadoCursoDocumento<T extends Record<string, unknown>>(
  documento: T,
): T & {
  plantillaCertificadoId: string;
  cantidadFirmas: number;
  firmasCertificado: FirmaCertificadoNormalizada[];
} {
  const origen = String(documento.origenCarga ?? "DOCENTE");
  const esAdmin = esOrigenCargaAdministracion(origen);
  const certificadoActivo = documento.certificado !== false;

  const plantillaCertificadoId = String(
    documento.plantillaCertificadoId ?? "",
  ).trim();

  let firmasRaw = Array.isArray(documento.firmasCertificado)
    ? (documento.firmasCertificado as Record<string, unknown>[])
    : [];

  const firmas: FirmaCertificadoNormalizada[] = firmasRaw
    .map((f) => ({
      id: String(f.id ?? "").trim() || `firma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      personaId: f.personaId ? String(f.personaId) : undefined,
      nombre: String(f.nombre ?? "").trim(),
      cargo: String(f.cargo ?? "").trim(),
      tipo:
        String(f.tipo ?? "DIGITAL").toUpperCase() === "ELECTRONICA"
          ? ("ELECTRONICA" as const)
          : ("DIGITAL" as const),
      imagen: f.imagen ? String(f.imagen) : undefined,
      origen:
        String(f.origen ?? "").toUpperCase() === "PROPIA"
          ? ("PROPIA" as const)
          : ("INSTITUCIONAL" as const),
    }))
    .filter((f) => f.nombre);

  let cantidadFirmas = clampCantidadFirmasCertificado(
    documento.cantidadFirmas,
    { forzarUna: !esAdmin },
  );

  let firmasFinal = firmas;
  if (!certificadoActivo) {
    cantidadFirmas = 1;
    firmasFinal = [];
  } else if (!esAdmin) {
    cantidadFirmas = 1;
    const propia = firmas.find((f) => f.origen === "PROPIA");
    firmasFinal = propia ? [propia] : firmas.slice(0, 1).map((f) => ({
      ...f,
      origen: "PROPIA" as const,
    }));
  } else {
    firmasFinal = firmas.slice(0, cantidadFirmas);
    // Si eligieron N firmas pero hay menos, se mantiene N (slots a completar).
  }

  return {
    ...documento,
    plantillaCertificadoId,
    cantidadFirmas,
    firmasCertificado: firmasFinal,
  };
}

export const OPCIONES_CANTIDAD_FIRMAS_CERTIFICADO = Array.from(
  { length: CANTIDAD_FIRMAS_CERTIFICADO_MAX },
  (_, i) => {
    const value = i + 1;
    return {
      value,
      label: value === 1 ? "1 firma" : `${value} firmas`,
    };
  },
);
