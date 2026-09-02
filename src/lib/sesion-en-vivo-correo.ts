import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";

export type DatosSesionEnVivoCorreo = {
  tituloClase?: string;
  fechaHora?: string;
  urlMeet?: string;
};

/**
 * Próxima sesión vigente del curso para enriquecer el correo de matrícula.
 * Prefiere la más cercana en el tiempo (no cancelada / no terminada).
 */
export async function datosSesionEnVivoParaCorreo(
  cursoId: string,
): Promise<DatosSesionEnVivoCorreo> {
  const id = cursoId.trim();
  if (!id) return {};

  try {
    const listado = await secundariaGatewayService.listarSesiones(id);
    const ahora = Date.now() - 30 * 60 * 1000;
    const candidatas = (listado.sesiones ?? [])
      .filter((s) => {
        const estado = String(s.estado ?? "").toUpperCase();
        if (estado === "CANCELADA" || estado === "CANCELADO") return false;
        const fin = new Date(s.terminaEn || s.iniciaEn).getTime();
        return Number.isFinite(fin) && fin >= ahora;
      })
      .sort(
        (a, b) =>
          new Date(a.iniciaEn).getTime() - new Date(b.iniciaEn).getTime(),
      );

    const elegida = candidatas[0];
    if (!elegida) return {};

    const meet = String(elegida.urlAcceso ?? "").trim();
    return {
      tituloClase: elegida.titulo?.trim() || undefined,
      fechaHora: elegida.iniciaEn,
      urlMeet: meet || undefined,
    };
  } catch {
    return {};
  }
}
