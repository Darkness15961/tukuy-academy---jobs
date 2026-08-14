import { describe, expect, test } from "bun:test";

import {
  mapearDocumentoABorrador,
  tipoItemConstructor,
} from "../src/api/services/mapper-curso-secundaria";
import type { BorradorCursoDocente } from "../src/portal-docente/types/docente.types";

const semilla: BorradorCursoDocente = {
  titulo: "Semilla",
  subtitulo: "",
  descripcion: "",
  publico: "",
  objetivos: [],
  requisitos: [],
  categoria: "",
  nivel: "Intermedio",
  imagen: "",
  ambito: "INDEPENDIENTE",
  organizacionId: null,
  acceso: "GRATUITO",
  precio: 0,
  visibilidad: "PUBLICO",
  permiteEmpresas: false,
  certificado: true,
  nombreCertificado: "",
  notaMinima: 14,
  vigenciaMeses: 12,
  secciones: [],
};

describe("tipoItemConstructor", () => {
  test("alias de secundaria no se degradan a lectura", () => {
    expect(tipoItemConstructor("cuestionario")).toBe("quiz");
    expect(tipoItemConstructor("QUIZ")).toBe("quiz");
    expect(tipoItemConstructor("entrega_pdf")).toBe("assignment");
    expect(tipoItemConstructor("assignment")).toBe("assignment");
    expect(tipoItemConstructor("video")).toBe("video");
    expect(tipoItemConstructor("lectura")).toBe("lectura");
  });

  test("preguntas recuperan un ítem sin tipo quiz", () => {
    expect(tipoItemConstructor("lectura", true)).toBe("quiz");
    expect(tipoItemConstructor("", true)).toBe("quiz");
    expect(tipoItemConstructor("video", true)).toBe("video");
  });
});

describe("mapearDocumentoABorrador", () => {
  test("rehidrata cuestionario con preguntas y no lo convierte en lectura", () => {
    const borrador = mapearDocumentoABorrador(
      {
        titulo: "Curso demo",
        secciones: [
          {
            id: "mod-1",
            titulo: "Módulo introductorio",
            items: [
              { id: "a1", titulo: "Bienvenida", tipo: "video" },
              {
                id: "a2",
                titulo: "Cuestionario práctico",
                tipo: "cuestionario",
                preguntas: [
                  {
                    question: "¿Qué es Tukuy?",
                    options: ["A", "B", "C", "D"],
                    correctIndex: 1,
                    imagenReferencia: "s3://media/q1.png",
                  },
                ],
              },
              { id: "a3", titulo: "Entrega PDF", tipo: "entrega_pdf" },
            ],
          },
        ],
      },
      semilla,
    );

    const items = borrador.secciones[0]?.items ?? [];
    expect(items.map((item) => item.tipo)).toEqual([
      "video",
      "quiz",
      "assignment",
    ]);
    expect(items[1]?.preguntas?.[0]?.question).toBe("¿Qué es Tukuy?");
    expect(items[1]?.preguntas?.[0]?.imagenReferencia).toBe("s3://media/q1.png");
  });
});
