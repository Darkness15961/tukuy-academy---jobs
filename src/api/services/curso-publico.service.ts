import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { obtenerDetalleCursoPublico } from "@/portal-publico/data/detalles-cursos.mock";
import type { Course, DetalleCursoPublico } from "@/types/academia";

export const cursoPublicoService = {
  async obtenerDetalle(curso: Course): Promise<DetalleCursoPublico> {
    if (apiConfig.useMock) {
      return resolveMock(obtenerDetalleCursoPublico(curso));
    }
    const { data } = await api.get<DetalleCursoPublico>(
      API.courses.publicDetail(curso.id),
    );
    return data;
  },
};
