const FALLBACK =
  "No se pudo completar la acción. Inténtalo de nuevo.";

function extraerTexto(entrada: unknown): string {
  if (typeof entrada === "string") return entrada.trim();
  if (entrada instanceof Error) return entrada.message.trim();
  if (!entrada || typeof entrada !== "object") return "";
  const cuerpo = entrada as {
    message?: unknown;
    error?: unknown;
    details?: unknown;
    msg?: unknown;
  };
  const partes = [cuerpo.error, cuerpo.message, cuerpo.msg]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return partes[0] ?? "";
}

function esTecnico(texto: string) {
  return /null value in column|violates not-null|duplicate key|unique constraint|foreign key|read-only transaction|plpgsql|relation "|column "|operator does not exist|invalid input value for enum|permission denied for|jwt expired|PGRST|postgrest|rpc |sqlstate|ejecuta en la secundaria|falta ejecutar|2026\d{8}_/i.test(
    texto,
  );
}

/** Texto corto para toast / UI. Nunca SQL, migraciones ni detalles de Postgres. */
export function mensajeUsuarioDeError(
  entrada: unknown,
  fallback = FALLBACK,
): string {
  const crudo = extraerTexto(entrada);
  if (!crudo) return fallback;

  const limpio = (crudo.split(/ — Si el error menciona/)[0] ?? crudo).trim();
  const t = limpio.toLowerCase();

  if (t.includes("edicion_curso") && (t.includes("estado") || t.includes("null"))) {
    return "No se pudo completar la inscripción. Inténtalo de nuevo en unos segundos.";
  }
  if (t.includes("requiere pago") || t.includes("requiere_pago")) {
    return "Este curso requiere compra. Agrégalo al carrito para continuar.";
  }
  if (t.includes("accion no soportada") || t.includes("acción no soportada")) {
    return "Esta acción aún no está disponible. Si continúa, avisa a soporte.";
  }
  if (t.includes("read-only transaction")) {
    return "No se pudo cargar el contenido. Vuelve a intentarlo.";
  }
  if (t.includes("duplicate key") || t.includes("unique constraint") || t.includes("ya existe")) {
    return "Ese registro ya existe.";
  }
  if (t.includes("no autorizado") || t.includes("not authorized") || t.includes("jwt")) {
    return "Tu sesión no tiene permiso para esta acción. Vuelve a iniciar sesión.";
  }
  if (t.includes("no encontrado") || t.includes("not found")) {
    return limpio.length <= 140 && !esTecnico(limpio) ? limpio : "No encontramos ese recurso.";
  }
  if (
    t.includes("violates not-null") ||
    t.includes("null value in column") ||
    t.includes("check constraint")
  ) {
    return "No se pudieron guardar los datos. Falta información obligatoria.";
  }
  if (
    t.includes("falta ejecutar") ||
    t.includes("ejecuta en la secundaria") ||
    /2026\d{8}_/.test(limpio)
  ) {
    return "El servicio académico no está actualizado. Inténtalo más tarde o avisa a soporte.";
  }
  if (esTecnico(limpio)) return fallback;
  if (limpio.length > 180) return fallback;
  return limpio;
}
