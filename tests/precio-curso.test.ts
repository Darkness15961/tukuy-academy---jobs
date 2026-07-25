import { describe, expect, test } from "bun:test";

import { calcularPrecioConReglas } from "../src/lib/precio-curso";
import type { ReglaDescuentoCurso } from "../src/types/comercializacion-curso.types";

function regla(cambios: Partial<ReglaDescuentoCurso>): ReglaDescuentoCurso {
  return {
    id: crypto.randomUUID(),
    nombre: "Descuento",
    modo: "AUTOMATICO",
    aplicaSobre: "CURSO_COMPLETO",
    moduloIds: [],
    beneficiario: "TODOS",
    nodoIds: [],
    usuarioIds: [],
    tipo: "PORCENTAJE",
    valor: 10,
    acumulable: true,
    prioridad: 1,
    activa: true,
    ...cambios,
  };
}

const perfilInterno = { condicion: "INTERNO" as const, nodoIds: ["civil"], usuarioId: "15" };

describe("motor comercial de cursos", () => {
  test("elige el mejor descuento sin acumular", () => {
    const resultado = calcularPrecioConReglas({ precioBase: 100, reglas: [regla({ valor: 10 }), regla({ valor: 25 })], politica: "SOLO_MEJOR", perfil: perfilInterno, aplicaSobre: "CURSO_COMPLETO" });
    expect(resultado.precioFinal).toBe(75);
    expect(resultado.reglasAplicadas).toHaveLength(1);
  });

  test("acumula descuentos secuencialmente sin producir precio negativo", () => {
    const resultado = calcularPrecioConReglas({ precioBase: 100, reglas: [regla({ valor: 20 }), regla({ tipo: "MONTO_FIJO", valor: 10, prioridad: 2 })], politica: "ACUMULABLES", perfil: perfilInterno, aplicaSobre: "CURSO_COMPLETO" });
    expect(resultado.precioFinal).toBe(70);
    expect(resultado.descuentoTotal).toBe(30);
  });

  test("en ACUMULABLES elige el mejor no acumulable si supera la suma acumulable", () => {
    const resultado = calcularPrecioConReglas({
      precioBase: 100,
      reglas: [
        regla({ valor: 10, acumulable: true, prioridad: 1 }),
        regla({ valor: 5, acumulable: true, prioridad: 2 }),
        regla({ valor: 40, acumulable: false, prioridad: 3 }),
      ],
      politica: "ACUMULABLES",
      perfil: perfilInterno,
      aplicaSobre: "CURSO_COMPLETO",
    });
    expect(resultado.precioFinal).toBe(60);
    expect(resultado.reglasAplicadas).toHaveLength(1);
    expect(resultado.reglasAplicadas[0]?.acumulable).toBe(false);
  });

  test("filtra por nodo, persona y componente comercial", () => {
    const resultado = calcularPrecioConReglas({ precioBase: 50, reglas: [regla({ beneficiario: "NODOS", nodoIds: ["industrial"], valor: 50 }), regla({ beneficiario: "PERSONAS", usuarioIds: ["15"], aplicaSobre: "CERTIFICADO", valor: 20 })], politica: "SOLO_MEJOR", perfil: perfilInterno, aplicaSobre: "CERTIFICADO" });
    expect(resultado.precioFinal).toBe(40);
  });

  test("aplica cupón solo cuando el código coincide", () => {
    const cupon = regla({
      modo: "CODIGO",
      codigo: "TUKUY-ABC123",
      valor: 50,
      beneficiario: "TODOS",
    });
    const sinCodigo = calcularPrecioConReglas({
      precioBase: 100,
      reglas: [cupon],
      politica: "SOLO_MEJOR",
      perfil: perfilInterno,
      aplicaSobre: "CURSO_COMPLETO",
    });
    const conCodigo = calcularPrecioConReglas({
      precioBase: 100,
      reglas: [cupon],
      politica: "SOLO_MEJOR",
      perfil: perfilInterno,
      aplicaSobre: "CURSO_COMPLETO",
      codigo: "tukuy-abc123",
    });
    expect(sinCodigo.precioFinal).toBe(100);
    expect(conCodigo.precioFinal).toBe(50);
  });
});
