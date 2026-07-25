import type { ViewId } from "@/types/academia";

export const portalPathByView: Record<ViewId, string> = {
  courses: "/tukuy-academy/cursos",
  learning: "/tukuy-academy/mi-aprendizaje",
  calendar: "/tukuy-academy/calendario",
  favorites: "/tukuy-academy/favoritos",
  jobs: "/bolsa-tukuy",
  cv: "/perfil-profesional",
  certificates: "/tukuy-academy/certificados",
  profile: "/tukuy-academy/perfil",
  settings: "/tukuy-academy/configuracion",
};

export const portalCartPath = "/tukuy-academy/carrito";

export function resolvePortalView(value: unknown): ViewId {
  if (
    value === "courses" ||
    value === "learning" ||
    value === "calendar" ||
    value === "favorites" ||
    value === "jobs" ||
    value === "cv" ||
    value === "certificates" ||
    value === "profile" ||
    value === "settings"
  ) {
    return value;
  }

  return "courses";
}
