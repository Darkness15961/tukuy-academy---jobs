import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import { resolveMock } from "@/api/mock";
import { obtenerDetalleCursoPublico } from "@/portal-publico/data/detalles-cursos.mock";
import type { Course, DetalleCursoPublico } from "@/types/academia";

export const cursoPublicoService = {
  async obtenerDetalle(curso: Course): Promise<DetalleCursoPublico> {
    if (apiConfig.secundariaCursos) {
      try {
        const [detalle, listadoModulos] = await Promise.all([
          secundariaGatewayService.obtenerCurso(curso.id),
          secundariaGatewayService.listarModulosCurso(curso.id).catch(() => ({
            ok: true as const,
            modulos: [],
          })),
        ]);
        const instructorNombre = curso.instructor?.trim() || "Docente del curso";
        return {
          cursoId: curso.id,
          videoPresentacion: "",
          instructor: {
            nombre: instructorNombre,
            cargo: "Instructor",
            foto:
              "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
            biografia:
              detalle.resumen ||
              curso.title ||
              "Curso publicado en Tukuy Academy.",
            experiencia: [],
          },
          modulos: (listadoModulos.modulos ?? []).map((modulo) => ({
            id: modulo.id,
            titulo: modulo.titulo,
            temas: (modulo.actividades ?? []).map((actividad) => actividad.titulo),
          })),
        };
      } catch {
        // Si el id no es de secundaria, conserva el detalle mock de marketing.
        if (apiConfig.useMock) {
          return resolveMock(obtenerDetalleCursoPublico(curso));
        }
        throw new Error("No se pudo cargar el detalle del curso.");
      }
    }

    if (apiConfig.useMock) {
      return resolveMock(obtenerDetalleCursoPublico(curso));
    }
    const { data } = await api.get<DetalleCursoPublico>(
      API.courses.publicDetail(curso.id),
    );
    return data;
  },
};
