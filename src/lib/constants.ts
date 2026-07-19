export const AUTH_TOKEN_KEY = "auth_token";
export const USUARIO_SESION_KEY = "tukuy_usuario_sesion";
export const MEMBRESIAS_KEY = "tukuy_membresias";
export const CONTEXTO_SESION_KEY = "tukuy_contexto_sesion";
export const ULTIMAS_FUNCIONES_ENTIDAD_KEY = "tukuy_ultimas_funciones_entidad";
export const CARRITO_KEY = "tukuy_academy_carrito";
export const TEMA_KEY = "tukuy_tema";
/** Contenidos de aprendizaje (módulos / lecciones / quizzes) en demo. */
export const APRENDIZAJE_CONTENIDOS_KEY = "tukuy_aprendizaje_contenidos";
/** Progreso por curso (items completados, notas, %). */
export const APRENDIZAJE_PROGRESOS_KEY = "tukuy_aprendizaje_progresos";
/** Claves legacy del simulador (se migran una vez). */
export const APRENDIZAJE_PROGRESO_LEGACY_KEY = "tukuy_academy_progress";
export const APRENDIZAJE_NOTAS_LEGACY_KEY = "tukuy_academy_grades";

/** Rutas donde el modo oscuro está permitido (no incluye landing/login). */
export const PREFIJOS_RUTA_CON_TEMA = [
  "/tukuy-academy",
  "/docente",
  "/organizacion",
  "/admin",
  "/bolsa-tukuy",
  "/comunidad",
  "/perfil-profesional",
  "/pago",
] as const;

export type PreferenciaTema = "light" | "dark" | "system";

export const MOCK_CREDENTIALS = {
  username: "admin",
  password: "123456",
} as const;

export const FOR_YOU_JOB_MATCH = 80;
