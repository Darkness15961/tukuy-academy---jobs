import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { mapearCursoSecundariaAPortal } from "@/api/services/mapper-curso-secundaria";
import {
  instructorDesdePerfil,
  perfilDocenteService,
} from "@/api/services/perfil-docente.service";
import { resolveMock } from "@/api/mock";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import type {
  CursoSecundaria,
  SesionEnVivoSecundaria,
} from "@/lib/contrato-secundaria";
import { env } from "@/lib/env";
import { formatearFechaSesion } from "@/lib/compartir-sesion-en-vivo";
import { obtenerDetalleCursoPublico } from "@/portal-publico/data/detalles-cursos.mock";
import type { Course, DetalleCursoPublico, InstructorCursoPublico } from "@/types/academia";

type ModuloPublicoGateway = {
  id: string;
  titulo: string;
  actividades?: Array<{ titulo: string }>;
};

type DetalleCursoPublicoGateway = {
  ok: boolean;
  error?: string;
  curso?: CursoSecundaria;
  modulos?: ModuloPublicoGateway[];
  sesiones?: SesionEnVivoSecundaria[];
  autorIdentidadRef?: string | null;
};

function instructorVacio(nombre = "Docente del curso"): InstructorCursoPublico {
  return {
    nombre,
    cargo: "",
    foto: undefined,
    biografia: "",
    experiencia: [],
  };
}

function etiquetaTemaSesion(sesion: SesionEnVivoSecundaria): string {
  const titulo = String(sesion.titulo ?? "").trim() || "Clase en vivo";
  const inicio = String(sesion.iniciaEn ?? "").trim();
  const fin = String(sesion.terminaEn ?? "").trim();
  let duracion = "";
  if (inicio && fin) {
    const mins = Math.round(
      (new Date(fin).getTime() - new Date(inicio).getTime()) / 60000,
    );
    if (Number.isFinite(mins) && mins > 0) duracion = ` · ${mins} min`;
  }
  const cuando = inicio ? formatearFechaSesion(inicio) : "";
  return cuando ? `${titulo} · ${cuando}${duracion}` : `${titulo}${duracion}`;
}

function esModuloSesionEnVivo(titulo: string) {
  const t = titulo.trim().toLowerCase();
  return (
    t.includes("sesión en vivo") ||
    t.includes("sesion en vivo") ||
    t === "clase en vivo" ||
    t.includes("clases en vivo")
  );
}

function esTemaGenericoEnVivo(titulo: string) {
  const t = titulo.trim().toLowerCase();
  return (
    !t ||
    t === "clase en vivo" ||
    t === "sesión en vivo" ||
    t === "sesion en vivo"
  );
}

async function invocarDetalleCursoPublicoGateway(
  cursoId: string,
): Promise<DetalleCursoPublicoGateway> {
  const url = `${env.supabasePrimaryUrl.replace(/\/$/, "")}/functions/v1/secondary-gateway`;
  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.supabasePrimaryAnonKey,
    },
    body: JSON.stringify({
      action: "get-detalle-curso-publico",
      instalacionId: INSTALACION_TUKUY_ACADEMY_ID,
      cursoId,
    }),
  });
  const data = (await respuesta.json().catch(() => null)) as
    | DetalleCursoPublicoGateway
    | null;
  if (!data?.ok || !data.curso) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "No se pudo cargar el detalle del curso.",
    );
  }
  return data;
}

function armarDetalleDesdeGateway(
  cursoId: string,
  data: DetalleCursoPublicoGateway,
  instructor: InstructorCursoPublico,
): DetalleCursoPublico {
  const sesiones = [...(data.sesiones ?? [])].sort(
    (a, b) =>
      new Date(a.iniciaEn).getTime() - new Date(b.iniciaEn).getTime(),
  );
  const temasSesiones = sesiones.map(etiquetaTemaSesion);

  let modulos = (data.modulos ?? []).map((modulo) => {
    const temasBase = (modulo.actividades ?? []).map(
      (actividad) => actividad.titulo,
    );
    if (temasSesiones.length && esModuloSesionEnVivo(modulo.titulo)) {
      return {
        id: modulo.id,
        titulo: modulo.titulo || "Sesiones en vivo",
        temas: temasSesiones,
      };
    }
    if (
      temasSesiones.length &&
      temasBase.length > 0 &&
      temasBase.every(esTemaGenericoEnVivo)
    ) {
      return {
        id: modulo.id,
        titulo: modulo.titulo,
        temas: temasSesiones,
      };
    }
    return {
      id: modulo.id,
      titulo: modulo.titulo,
      temas: temasBase,
    };
  });

  if (temasSesiones.length) {
    const yaCubierto = modulos.some(
      (m) =>
        esModuloSesionEnVivo(m.titulo) ||
        (m.temas.length > 0 && m.temas[0] === temasSesiones[0]),
    );
    if (!yaCubierto) {
      modulos = [
        {
          id: `sesiones-${cursoId}`,
          titulo: "Sesiones en vivo",
          temas: temasSesiones,
        },
        ...modulos,
      ];
    }
  }

  if (!modulos.length && temasSesiones.length) {
    modulos = [
      {
        id: `sesiones-${cursoId}`,
        titulo: "Sesiones en vivo",
        temas: temasSesiones,
      },
    ];
  }

  return {
    cursoId,
    videoPresentacion: "",
    instructor,
    modulos,
  };
}

export const cursoPublicoService = {
  /** Ficha de curso en landing (sin sesión de usuario). */
  async obtenerCursoPublico(cursoId: string): Promise<Course | null> {
    const id = cursoId.trim();
    if (!id || !apiConfig.secundariaCursos) return null;
    try {
      const data = await invocarDetalleCursoPublicoGateway(id);
      return mapearCursoSecundariaAPortal(data.curso as CursoSecundaria);
    } catch {
      return null;
    }
  },

  async obtenerDetalle(curso: Course): Promise<DetalleCursoPublico> {
    if (apiConfig.secundariaCursos) {
      try {
        const data = await invocarDetalleCursoPublicoGateway(curso.id);
        let instructor = instructorVacio(
          curso.instructor?.trim() || "Docente del curso",
        );
        const autorRef = String(
          data.autorIdentidadRef ?? data.curso?.autorIdentidadRef ?? "",
        ).trim();
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
        return armarDetalleDesdeGateway(curso.id, data, instructor);
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
