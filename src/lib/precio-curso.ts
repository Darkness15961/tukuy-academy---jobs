import type {
  PerfilPrecioCurso,
  PoliticaCombinacionDescuentos,
  ReglaDescuentoCurso,
  ResultadoPrecioCurso,
} from "@/types/comercializacion-curso.types";

function modoRegla(regla: ReglaDescuentoCurso) {
  return regla.modo ?? "AUTOMATICO";
}

function aplicaAlPerfil(regla: ReglaDescuentoCurso, perfil: PerfilPrecioCurso) {
  if (regla.activa === false) return false;
  if (regla.beneficiario === "TODOS") return true;
  if (regla.beneficiario === "INTERNOS") return perfil.condicion === "INTERNO";
  if (regla.beneficiario === "EXTERNOS") return perfil.condicion === "EXTERNO";
  if (regla.beneficiario === "NODOS") {
    return regla.nodoIds.some((id) => perfil.nodoIds.includes(id));
  }
  return Boolean(perfil.usuarioId && regla.usuarioIds.includes(perfil.usuarioId));
}

function importeDescuento(precio: number, regla: ReglaDescuentoCurso) {
  if (regla.tipo === "MONTO_FIJO") return Math.min(precio, Math.max(0, regla.valor));
  return Math.min(precio, precio * (Math.min(100, Math.max(0, regla.valor)) / 100));
}

export function generarCodigoDescuento(prefijo = "TUKUY") {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let sufijo = "";
  for (let i = 0; i < 6; i += 1) {
    sufijo += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return `${prefijo}-${sufijo}`;
}

export function calcularPrecioConReglas(datos: {
  precioBase: number;
  reglas: ReglaDescuentoCurso[];
  politica: PoliticaCombinacionDescuentos;
  perfil: PerfilPrecioCurso;
  aplicaSobre: ReglaDescuentoCurso["aplicaSobre"];
  moduloId?: string;
  /** Si se informa, también evalúa cupones cuyo código coincida. */
  codigo?: string;
}): ResultadoPrecioCurso {
  const precioBase = Math.max(0, datos.precioBase);
  const codigo = datos.codigo?.trim().toUpperCase();
  const candidatas = datos.reglas
    .filter((regla) => {
      if (regla.activa === false) return false;
      if (regla.aplicaSobre !== datos.aplicaSobre) return false;
      if (
        regla.aplicaSobre === "MODULO" &&
        !(datos.moduloId && regla.moduloIds.includes(datos.moduloId))
      ) {
        return false;
      }
      if (modoRegla(regla) === "CODIGO") {
        return Boolean(
          codigo && regla.codigo && regla.codigo.trim().toUpperCase() === codigo,
        );
      }
      return aplicaAlPerfil(regla, datos.perfil);
    })
    .sort((a, b) => a.prioridad - b.prioridad);

  let aplicadas: ReglaDescuentoCurso[] = [];
  if (datos.politica === "POR_PRIORIDAD") aplicadas = candidatas.slice(0, 1);
  if (datos.politica === "SOLO_MEJOR") {
    aplicadas = [...candidatas]
      .sort(
        (a, b) =>
          importeDescuento(precioBase, b) - importeDescuento(precioBase, a),
      )
      .slice(0, 1);
  }
  if (datos.politica === "ACUMULABLES") {
    const acumulables = candidatas.filter((regla) => regla.acumulable);
    const noAcumulables = candidatas.filter((regla) => !regla.acumulable);

    let precioAcumulado = precioBase;
    for (const regla of acumulables) {
      precioAcumulado -= importeDescuento(precioAcumulado, regla);
    }
    precioAcumulado = Math.max(0, precioAcumulado);

    const mejorNoAcumulable = [...noAcumulables].sort(
      (a, b) =>
        importeDescuento(precioBase, b) - importeDescuento(precioBase, a),
    )[0];
    const precioNoAcumulable = mejorNoAcumulable
      ? Math.max(0, precioBase - importeDescuento(precioBase, mejorNoAcumulable))
      : precioBase;

    if (
      mejorNoAcumulable &&
      precioNoAcumulable <= precioAcumulado &&
      (!acumulables.length || precioNoAcumulable < precioAcumulado)
    ) {
      aplicadas = [mejorNoAcumulable];
    } else if (acumulables.length) {
      aplicadas = acumulables;
    } else if (mejorNoAcumulable) {
      aplicadas = [mejorNoAcumulable];
    } else {
      aplicadas = [];
    }
  }

  let precioFinal = precioBase;
  for (const regla of aplicadas) {
    precioFinal -= importeDescuento(precioFinal, regla);
  }
  precioFinal = Math.max(0, Math.round(precioFinal * 100) / 100);
  return {
    precioBase,
    descuentoTotal: Math.round((precioBase - precioFinal) * 100) / 100,
    precioFinal,
    reglasAplicadas: aplicadas,
  };
}
