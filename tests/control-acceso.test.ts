import { deepEqual, ok } from "node:assert/strict";
import { describe, test } from "node:test";

import {
  MODULOS_ACCESO,
  PERMISOS_POR_PLANTILLA,
  modulosDePermisos,
} from "../src/lib/control-acceso";

describe("control de acceso por perfiles", () => {
  test("Dirección y Administración reciben módulos institucionales recomendados", () => {
    ok(modulosDePermisos(PERMISOS_POR_PLANTILLA.DIRECCION).length > 0);
    ok(modulosDePermisos(PERMISOS_POR_PLANTILLA.ADMINISTRACION).length > 0);
    ok(PERMISOS_POR_PLANTILLA.DIRECCION.includes("licencias.ver"));
    ok(!PERMISOS_POR_PLANTILLA.DIRECCION.includes("licencias.administrar"));
  });

  test("el perfil firmante no puede emitir ni configurar certificados", () => {
    deepEqual(PERMISOS_POR_PLANTILLA.FIRMAS, [
      "certificados.ver",
      "certificados.firmar",
      "certificados.verificar",
    ]);
    ok(!PERMISOS_POR_PLANTILLA.FIRMAS.includes("certificados.emitir"));
    ok(!PERMISOS_POR_PLANTILLA.FIRMAS.includes("certificados.configurar"));
  });

  test("planes globales permanece separado de la licencia organizacional", () => {
    const global = MODULOS_ACCESO.find((modulo) => modulo.id === "admin-licencias");
    const entidad = MODULOS_ACCESO.find((modulo) => modulo.id === "licencia");
    ok(global?.permisos.includes("licencias.administrar"));
    ok(entidad?.permisos.includes("licencias.ver"));
    ok(!entidad?.permisos.includes("licencias.administrar"));
  });
});
