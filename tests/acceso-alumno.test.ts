import { describe, expect, test } from "bun:test";

import {
  cursoEstadoVisibleEnCatalogoAlumno,
  cursoVisibleEnCatalogoAlumno,
} from "../src/lib/catalogo-alumno";
import { meetUrlEsSimulado } from "../src/lib/meet-sesion";

describe("catálogo alumno", () => {
  test("solo estados publicados entran al catálogo", () => {
    expect(cursoEstadoVisibleEnCatalogoAlumno("PUBLICADO")).toBe(true);
    expect(cursoEstadoVisibleEnCatalogoAlumno("activo")).toBe(true);
    expect(cursoEstadoVisibleEnCatalogoAlumno("APROBADO")).toBe(true);
    expect(cursoEstadoVisibleEnCatalogoAlumno("BORRADOR")).toBe(false);
    expect(cursoEstadoVisibleEnCatalogoAlumno("EN_REVISION")).toBe(false);
    expect(cursoEstadoVisibleEnCatalogoAlumno("OBSERVADO")).toBe(false);
    expect(cursoEstadoVisibleEnCatalogoAlumno("")).toBe(false);
  });

  test("matrícula sin publicar no aparece en catálogo", () => {
    expect(cursoVisibleEnCatalogoAlumno({ visibleEnCatalogo: false })).toBe(
      false,
    );
    expect(
      cursoVisibleEnCatalogoAlumno({ estadoPublicacion: "BORRADOR" }),
    ).toBe(false);
    expect(
      cursoVisibleEnCatalogoAlumno({ estadoPublicacion: "PUBLICADO" }),
    ).toBe(true);
    expect(cursoVisibleEnCatalogoAlumno({})).toBe(true);
  });
});

describe("Meet alumno", () => {
  test("sin URL o id local cuenta como simulado", () => {
    expect(meetUrlEsSimulado(null, null)).toBe(true);
    expect(meetUrlEsSimulado("", "gcal_abc")).toBe(true);
    expect(
      meetUrlEsSimulado("https://meet.google.com/sesion-demo-ab12", "sec-1"),
    ).toBe(true);
  });

  test("código Meet xxx-xxxx-xxx es real", () => {
    expect(
      meetUrlEsSimulado(
        "https://meet.google.com/abc-defg-hij",
        "evt_google_1",
      ),
    ).toBe(false);
  });
});
