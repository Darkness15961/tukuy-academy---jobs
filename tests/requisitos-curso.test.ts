import { describe, expect, test } from "bun:test";

import {
  etiquetaRequisito,
  normalizarRequisitos,
} from "../src/lib/requisitos-curso";

describe("requisitos-curso", () => {
  test("descarta texto libre legacy", () => {
    expect(normalizarRequisitos(["Conocimientos básicos", 12, null])).toEqual(
      [],
    );
  });

  test("conserva enlaces a curso previo", () => {
    const requisitos = normalizarRequisitos([
      {
        tipo: "CURSO_PREVIO",
        cursoId: "c-1",
        cursoTitulo: "Seguridad básica",
        condicion: "CERTIFICADO",
      },
      { cursoId: "c-1", cursoTitulo: "duplicado" },
      { cursoId: "c-2", cursoTitulo: "Logística", condicion: "COMPLETADO" },
    ]);
    expect(requisitos).toEqual([
      {
        tipo: "CURSO_PREVIO",
        cursoId: "c-1",
        cursoTitulo: "Seguridad básica",
        condicion: "CERTIFICADO",
      },
      {
        tipo: "CURSO_PREVIO",
        cursoId: "c-2",
        cursoTitulo: "Logística",
        condicion: "COMPLETADO",
      },
    ]);
  });

  test("etiqueta legible", () => {
    expect(
      etiquetaRequisito({
        tipo: "CURSO_PREVIO",
        cursoId: "c-1",
        cursoTitulo: "Seguridad básica",
        condicion: "COMPLETADO",
      }),
    ).toBe("Completar: Seguridad básica");
  });
});
