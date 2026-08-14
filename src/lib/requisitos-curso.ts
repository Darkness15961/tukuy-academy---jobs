/**
 * Requisitos del curso como enlaces verificables (no texto libre).
 * Hoy: curso previo. Extensible a otros tipos enlazables.
 */

export type TipoRequisitoCurso = "CURSO_PREVIO";

/** Criterio que el sistema puede comprobar en matrícula / acceso. */
export type CondicionRequisitoCurso = "COMPLETADO" | "CERTIFICADO";

export interface RequisitoCurso {
  tipo: TipoRequisitoCurso;
  cursoId: string;
  /** Denormalizado para UI sin depender de otra consulta. */
  cursoTitulo: string;
  condicion: CondicionRequisitoCurso;
}

export function etiquetaRequisito(requisito: RequisitoCurso): string {
  if (requisito.condicion === "CERTIFICADO") {
    return `Certificado en: ${requisito.cursoTitulo}`;
  }
  return `Completar: ${requisito.cursoTitulo}`;
}

export function etiquetasRequisitos(requisitos: RequisitoCurso[]): string[] {
  return requisitos.map(etiquetaRequisito);
}

/** Descarta texto libre legacy; solo conserva enlaces con cursoId. */
export function normalizarRequisitos(raw: unknown): RequisitoCurso[] {
  if (!Array.isArray(raw)) return [];

  const vistos = new Set<string>();
  const salida: RequisitoCurso[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const fila = item as Record<string, unknown>;
    const tipo = String(fila.tipo ?? "CURSO_PREVIO");
    if (tipo !== "CURSO_PREVIO") continue;

    const cursoId = String(fila.cursoId ?? "").trim();
    if (!cursoId || vistos.has(cursoId)) continue;
    vistos.add(cursoId);

    salida.push({
      tipo: "CURSO_PREVIO",
      cursoId,
      cursoTitulo: String(fila.cursoTitulo ?? "Curso previo").trim() || "Curso previo",
      condicion:
        fila.condicion === "CERTIFICADO" ? "CERTIFICADO" : "COMPLETADO",
    });
  }

  return salida;
}
