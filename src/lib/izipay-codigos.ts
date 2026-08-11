/**
 * Mensajes amigables Izipay (códigos de respuesta del checkout / APIs).
 * Fuente: developers.izipay.pe — Códigos y mensajes de respuesta.
 */
const MENSAJES: Record<string, string> = {
  "00": "Operación exitosa",
  P66: "Operación exitosa",
  "002": "Los datos del cliente son incorrectos. Verifica la información.",
  "003": "Activa las notificaciones en tu Interbank App para pagar con Plin.",
  "004": "Excediste el número de intentos. Inténtalo más tarde.",
  "006": "El monto supera el límite de Plin (S/5,000 o US$1,500).",
  "007": "Se agotó el tiempo de espera. Vuelve a iniciar el pago.",
  Y06: "Encontramos restricciones para completar el yapeo.",
  Y07: "Esta operación excede tu límite diario de compras por internet (Yape).",
  Y08: "Tu cuenta Yape está bloqueada temporalmente.",
  Y09: "Opción válida solo para Yape con BCP.",
  Y12: "El código Yape está vencido o es incorrecto.",
  Y13: "El código Yape es incorrecto.",
  A02: "Rechazado por autenticación.",
  P01: "El token de sesión no es válido. Vuelve a iniciar el pago.",
  P53: "El monto no coincide con el del token. Vuelve a iniciar el pago.",
  P54: "Validación de token incorrecta. Vuelve a iniciar el pago.",
  P65: "Verifica tu tarjeta.",
  P68: "El código de comercio no coincide con el del token.",
  P69: "Número de orden duplicado. Genera una nueva orden.",
  TA1: "El monto no coincide con el del token.",
  TR1: "El transactionId no coincide con el del token.",
  EC: "Error de comunicación con Izipay. Inténtalo de nuevo.",
  RS: "Pago rechazado por evaluación de riesgo.",
  NF: "Mensaje no configurado por Izipay.",
};

const EXITOSOS = new Set(["00", "P66"]);

export function esCodigoIzipayExitoso(code: string | null | undefined) {
  if (!code) return false;
  return EXITOSOS.has(String(code).trim().toUpperCase());
}

export function mensajeAmigableIzipay(
  code: string | null | undefined,
  fallback?: string | null,
) {
  const clave = String(code ?? "").trim().toUpperCase();
  if (!clave) {
    return fallback?.trim() || "No se pudo completar el pago.";
  }
  return (
    MENSAJES[clave] ||
    fallback?.trim() ||
    `Pago no completado (código ${clave}).`
  );
}
