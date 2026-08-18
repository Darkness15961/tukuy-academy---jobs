import { env } from "@/lib/env";
import type { Course } from "@/types/academia";

/** false = inscripción directa gratis; sin carrito ni checkout Izipay. */
export const pasarelaCursosHabilitada = env.pasarelaCursos;

/** Curso con precio en catálogo y pasarela activa. */
export function cursoEsDePago(course: Pick<Course, "pricing">) {
  return pasarelaCursosHabilitada && course.pricing === "paid";
}
