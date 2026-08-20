import { CONTEXTO_SESION_KEY } from "@/lib/constants";

const RECUPERACION_CLAVE_KEY = "tukuy_recuperando_clave";

function rutaRestablecerClave(pathname: string) {
  return (
    pathname === "/restablecer-clave" ||
    pathname.endsWith("/restablecer-clave")
  );
}

export function urlEsRecuperacionClave(): boolean {
  if (typeof window === "undefined") return false;
  const { pathname, search, hash } = window.location;
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const query = new URLSearchParams(search);

  const esRecuperacionExplicita =
    hashParams.get("type") === "recovery" ||
    query.get("type") === "recovery" ||
    query.get("motivo") === "recuperacion";

  const enRutaRestablecer = rutaRestablecerClave(pathname);
  const tieneCanjePendiente =
    query.has("code") || hashParams.has("access_token");

  // Solo la primera llegada con enlace (code/token). No re-marcar por pathname solo.
  return esRecuperacionExplicita || (enRutaRestablecer && tieneCanjePendiente);
}

export function marcarRecuperacionClave() {
  sessionStorage.setItem(RECUPERACION_CLAVE_KEY, "1");
  // Evita reutilizar un portal guardado y saltar directo al alumno.
  localStorage.removeItem(CONTEXTO_SESION_KEY);
}

export function hayRecuperacionClave() {
  return sessionStorage.getItem(RECUPERACION_CLAVE_KEY) === "1";
}

export function limpiarRecuperacionClave() {
  sessionStorage.removeItem(RECUPERACION_CLAVE_KEY);
}

export function detectarYMarcarRecuperacionClave() {
  if (urlEsRecuperacionClave()) marcarRecuperacionClave();
}
