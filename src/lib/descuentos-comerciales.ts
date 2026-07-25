import type {
  DestinatarioDescuento,
} from "@/api/services/organizacion.service";
import type {
  PoliticaCombinacionDescuentos,
  ReglaDescuentoCurso,
} from "@/types/comercializacion-curso.types";

/** Convierte el descuento legacy de rutas/cursos a reglas editables. */
export function legacyAReglasDescuento(datos: {
  descuentoInterno?: number;
  descuentoAplicaA?: DestinatarioDescuento;
  descuentoArea?: string | null;
  descuentos?: ReglaDescuentoCurso[];
}): ReglaDescuentoCurso[] {
  if (datos.descuentos?.length) {
    return datos.descuentos.map((regla) => ({ ...regla }));
  }
  const aplicaA = datos.descuentoAplicaA ?? "NINGUNO";
  const valor = Math.min(Math.max(datos.descuentoInterno ?? 0, 0), 100);
  if (aplicaA === "NINGUNO" || valor <= 0) return [];

  if (aplicaA === "AREA" && datos.descuentoArea) {
    return [
      {
        id: `legado-nodo-${datos.descuentoArea}`,
        nombre: "Descuento por nodo",
        modo: "AUTOMATICO",
        aplicaSobre: "CURSO_COMPLETO",
        moduloIds: [],
        beneficiario: "NODOS",
        nodoIds: [datos.descuentoArea],
        usuarioIds: [],
        tipo: "PORCENTAJE",
        valor,
        acumulable: false,
        prioridad: 1,
        activa: true,
      },
    ];
  }

  const beneficiario =
    aplicaA === "EXTERNO"
      ? "EXTERNOS"
      : aplicaA === "ORGANIZACION"
        ? "INTERNOS"
        : "TODOS";

  return [
    {
      id: `legado-${aplicaA.toLowerCase()}`,
      nombre:
        beneficiario === "INTERNOS"
          ? "Descuento colaboradores"
          : beneficiario === "EXTERNOS"
            ? "Descuento externos"
            : "Descuento general",
      modo: "AUTOMATICO",
      aplicaSobre: "CURSO_COMPLETO",
      moduloIds: [],
      beneficiario,
      nodoIds: [],
      usuarioIds: [],
      tipo: "PORCENTAJE",
      valor,
      acumulable: false,
      prioridad: 1,
      activa: true,
    },
  ];
}

/** Resume reglas modernas a campos legacy (reportes / compatibilidad). */
export function reglasALegacyDescuento(reglas: ReglaDescuentoCurso[]): {
  descuentoInterno: number;
  descuentoAplicaA: DestinatarioDescuento;
  descuentoArea: string | null;
} {
  const activas = reglas.filter((regla) => regla.activa !== false);
  const porNodo = activas.find(
    (regla) =>
      (regla.modo ?? "AUTOMATICO") === "AUTOMATICO" &&
      regla.beneficiario === "NODOS" &&
      regla.tipo === "PORCENTAJE" &&
      regla.nodoIds[0],
  );
  if (porNodo) {
    return {
      descuentoInterno: porNodo.valor,
      descuentoAplicaA: "AREA",
      descuentoArea: porNodo.nodoIds[0] ?? null,
    };
  }
  const internos = activas.find(
    (regla) =>
      (regla.modo ?? "AUTOMATICO") === "AUTOMATICO" &&
      regla.beneficiario === "INTERNOS" &&
      regla.tipo === "PORCENTAJE",
  );
  if (internos) {
    return {
      descuentoInterno: internos.valor,
      descuentoAplicaA: "ORGANIZACION",
      descuentoArea: null,
    };
  }
  const externos = activas.find(
    (regla) =>
      (regla.modo ?? "AUTOMATICO") === "AUTOMATICO" &&
      regla.beneficiario === "EXTERNOS" &&
      regla.tipo === "PORCENTAJE",
  );
  if (externos) {
    return {
      descuentoInterno: externos.valor,
      descuentoAplicaA: "EXTERNO",
      descuentoArea: null,
    };
  }
  const todos = activas.find(
    (regla) =>
      (regla.modo ?? "AUTOMATICO") === "AUTOMATICO" &&
      regla.beneficiario === "TODOS" &&
      regla.tipo === "PORCENTAJE",
  );
  if (todos) {
    return {
      descuentoInterno: todos.valor,
      descuentoAplicaA: "ORGANIZACION",
      descuentoArea: null,
    };
  }
  return {
    descuentoInterno: 0,
    descuentoAplicaA: "NINGUNO",
    descuentoArea: null,
  };
}

export function politicaPorDefecto(): PoliticaCombinacionDescuentos {
  return "SOLO_MEJOR";
}
