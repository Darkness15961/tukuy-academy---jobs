import { apiConfig } from "@/api/config";

const FLAG = "tukuy_sin_datos_demo_v1";

/**
 * Con Auth Supabase no queremos restos de CIP/Andina/demos en localStorage.
 * Conserva sesión, membresías, contexto e identidad institucional.
 */
export function limpiarPersistenciaDemoSiCorresponde() {
  if (!apiConfig.sinDatosDemo) return;
  if (localStorage.getItem(FLAG) === "1") return;

  const conservar = (clave: string) =>
    clave === FLAG ||
    clave.startsWith("sb-") ||
    clave.includes("auth-token") ||
    clave.startsWith("tukuy_contexto") ||
    clave.startsWith("tukuy_membresias") ||
    clave.startsWith("tukuy_ultimas_funciones") ||
    clave.startsWith("tukuy_identidad_entidad_") ||
    clave.startsWith("tukuy_tema") ||
    clave === "parsed_cv_ia";

  const aBorrar: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const clave = localStorage.key(i);
    if (!clave) continue;
    if (conservar(clave)) continue;
    if (
      clave.startsWith("tukuy_demo_") ||
      clave.startsWith("tukuy_org_") ||
      clave.includes("comunidad_entidades") ||
      clave.includes("categorias_cursos_entidad")
    ) {
      aBorrar.push(clave);
    }
  }
  aBorrar.forEach((clave) => localStorage.removeItem(clave));
  localStorage.setItem(FLAG, "1");
  if (import.meta.env.DEV && aBorrar.length) {
    console.info(
      `[Tukuy Academy] Persistencia demo limpiada (${aBorrar.length} claves).`,
    );
  }
}
