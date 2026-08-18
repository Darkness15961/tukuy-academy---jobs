import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import {
  instructorDesdePerfil,
  perfilDocenteService,
} from "@/api/services/perfil-docente.service";
import { resolveMock } from "@/api/mock";
import { obtenerDetalleCursoPublico } from "@/portal-publico/data/detalles-cursos.mock";
import type { Course, DetalleCursoPublico, InstructorCursoPublico } from "@/types/academia";

function instructorVacio(nombre = "Docente del curso"): InstructorCursoPublico {
  return {
    nombre,
    cargo: "",
    foto: undefined,
    biografia: "",
    experiencia: [],
  };
}

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
        let instructor = instructorVacio(
          curso.instructor?.trim() || "Docente del curso",
        );
        const autorRef = String(detalle.autorIdentidadRef ?? "").trim();
        if (autorRef) {
          try {
            instructor = instructorDesdePerfil(
              await perfilDocenteService.obtenerPublico(autorRef),
            );
          } catch {
            instructor = instructorVacio(
              curso.instructor?.trim() || instructor.nombre,
            );
          }
        }
        return {
          cursoId: curso.id,
          videoPresentacion: "",
          instructor,
          modulos: (listadoModulos.modulos ?? []).map((modulo) => ({
            id: modulo.id,
            titulo: modulo.titulo,
            temas: (modulo.actividades ?? []).map((actividad) => actividad.titulo),
          })),
        };
      } catch {
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
