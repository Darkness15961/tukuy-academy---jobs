import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { organizacionService } from "@/api/services/organizacion.service";
import { USUARIO_SESION_KEY } from "@/lib/constants";
import type { UserProfile } from "@/types/academia";
import {
  categoriasCursosEntidadesMock,
  cursosPerfilesEntidadesMock,
  entidadesPublicasMock,
  publicacionesPorEntidadMock,
} from "../data/entidades-publicas.mock";
import type {
  CategoriaCursoEntidad,
  CursoPerfilEntidad,
  EntidadPublicaComunidad,
  EvaluacionAccesoCursoPerfil,
  EstadoMembresiaEntidad,
  MatriculaCursoEntidadPerfil,
  PublicacionEntidadResumen,
} from "../types/entidad-publica.types";

const CLAVE_ESTADOS = "tukuy_demo_comunidad_entidades_estado";
const CLAVE_MATRICULAS = "tukuy_demo_comunidad_entidades_matriculas";
const CLAVE_CATEGORIAS_ENTIDAD = "tukuy_demo_categorias_cursos_entidad";
const CLAVE_PERFILES_ENTIDAD = "tukuy_demo_comunidad_entidades_perfil";
const CLAVE_CURSOS_VISIBILIDAD = "tukuy_demo_comunidad_cursos_visibilidad";

type MapaEstados = Record<string, EstadoMembresiaEntidad>;
type MapaPerfiles = Record<string, Partial<EntidadPublicaComunidad>>;
type MapaVisibilidadCursos = Record<
  string,
  Record<string, { visibleEnPerfil: boolean }>
>;

function leerPerfiles(): MapaPerfiles {
  try {
    const raw = localStorage.getItem(CLAVE_PERFILES_ENTIDAD);
    return raw ? (JSON.parse(raw) as MapaPerfiles) : {};
  } catch {
    return {};
  }
}

function guardarPerfiles(mapa: MapaPerfiles) {
  localStorage.setItem(CLAVE_PERFILES_ENTIDAD, JSON.stringify(mapa));
}

function leerVisibilidadCursos(): MapaVisibilidadCursos {
  try {
    const raw = localStorage.getItem(CLAVE_CURSOS_VISIBILIDAD);
    return raw ? (JSON.parse(raw) as MapaVisibilidadCursos) : {};
  } catch {
    return {};
  }
}

function guardarVisibilidadCursos(mapa: MapaVisibilidadCursos) {
  localStorage.setItem(CLAVE_CURSOS_VISIBILIDAD, JSON.stringify(mapa));
}

function entidadConPerfilPersonalizado(
  entidad: EntidadPublicaComunidad,
): EntidadPublicaComunidad {
  const overlay = leerPerfiles()[entidad.id];
  if (!overlay) return entidad;
  return {
    ...entidad,
    ...overlay,
    etiquetas: overlay.etiquetas ?? entidad.etiquetas,
  };
}

function leerEstados(): MapaEstados {
  try {
    const raw = localStorage.getItem(CLAVE_ESTADOS);
    return raw ? (JSON.parse(raw) as MapaEstados) : {};
  } catch {
    return {};
  }
}

function guardarEstados(mapa: MapaEstados) {
  localStorage.setItem(CLAVE_ESTADOS, JSON.stringify(mapa));
}

function leerMatriculas(): MatriculaCursoEntidadPerfil[] {
  try {
    const raw = localStorage.getItem(CLAVE_MATRICULAS);
    return raw ? (JSON.parse(raw) as MatriculaCursoEntidadPerfil[]) : [];
  } catch {
    return [];
  }
}

function referenciaUsuario() {
  return perfilSesion()?.name?.trim().toLowerCase() || "usuario-demo";
}

async function evaluarAccesoMock(
  curso: CursoPerfilEntidad,
): Promise<EvaluacionAccesoCursoPerfil> {
  if (curso.alcance === "PUBLICO") {
    return {
      disponible: curso.modalidadAcceso !== "SOLO_ASIGNACION",
      condicion: "EXTERNO",
      origenAcceso:
        curso.modalidadAcceso === "CON_APROBACION" ? "APROBACION" : "CURSO_PUBLICO",
      motivo: curso.gratuito
        ? "Curso libre para todo público."
        : "Curso disponible para todo público mediante inscripción.",
    };
  }

  if (curso.organizacionId !== "org-empresa-abc") {
    return {
      disponible: false,
      condicion: "EXTERNO",
      origenAcceso: "NODO_INTERNO",
      motivo: "Debes pertenecer a un nodo interno habilitado por esta entidad.",
    };
  }

  const perfil = perfilSesion();
  const [personas, vinculaciones, unidades] = await Promise.all([
    organizacionService.usuarios.listar(),
    organizacionService.estructura.vinculaciones.listar(),
    organizacionService.estructura.unidades.listar(),
  ]);
  const persona = personas.find(
    (item) => item.nombre.trim().toLowerCase() === perfil?.name?.trim().toLowerCase(),
  );
  const activas = vinculaciones.filter(
    (item) => item.usuarioId === String(persona?.id) && item.estado === "ACTIVA",
  );
  const permitidos = new Set<string>();
  for (const nodoId of curso.nodoIdsPermitidos) {
    permitidos.add(nodoId);
    if (curso.incluirDescendientes) {
      (await organizacionService.estructura.idsDescendientes(nodoId)).forEach((id) =>
        permitidos.add(id),
      );
    }
  }
  const vinculacion = activas.find((item) => permitidos.has(item.unidadId));
  const nodo = unidades.find((item) => item.id === vinculacion?.unidadId);
  if (!vinculacion) {
    return {
      disponible: false,
      condicion: "EXTERNO",
      origenAcceso: "NODO_INTERNO",
      motivo: "Requisito: pertenecer a uno de los nodos internos habilitados.",
    };
  }
  return {
    disponible: curso.modalidadAcceso !== "SOLO_ASIGNACION",
    condicion: "INTERNO",
    origenAcceso:
      curso.modalidadAcceso === "CON_APROBACION" ? "APROBACION" : "NODO_INTERNO",
    nodoOrigenId: vinculacion.unidadId,
    nodoOrigenNombre: nodo?.nombre,
    motivo:
      curso.modalidadAcceso === "CON_APROBACION"
        ? `Cumples el requisito por ${nodo?.nombre ?? "tu nodo"}; la matrícula requiere aprobación.`
        : `Disponible por tu pertenencia a ${nodo?.nombre ?? "un nodo habilitado"}.`,
  };
}

function perfilSesion(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USUARIO_SESION_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function correoSolicitante(perfil: UserProfile | null) {
  const base = perfil?.name
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${base || "solicitante"}@comunidad.tukuy`;
}

export const entidadesComunidadService = {
  async listar(): Promise<EntidadPublicaComunidad[]> {
    if (apiConfig.useMock) {
      return resolveMock(
        structuredClone(
          entidadesPublicasMock.map(entidadConPerfilPersonalizado),
        ),
      );
    }
    const { data } = await api.get<EntidadPublicaComunidad[]>(
      API.comunidad.entidades,
    );
    return data;
  },

  async obtenerPorId(id: string): Promise<EntidadPublicaComunidad | null> {
    if (apiConfig.useMock) {
      const entidad =
        entidadesPublicasMock.find(
          (item) => item.id === id || item.slug === id,
        ) ?? null;
      return resolveMock(
        entidad
          ? structuredClone(entidadConPerfilPersonalizado(entidad))
          : null,
      );
    }
    const { data } = await api.get<EntidadPublicaComunidad>(
      API.comunidad.entidadPorId(id),
    );
    return data;
  },

  async actualizarPerfilPublico(
    entidadId: string,
    cambios: Partial<
      Pick<
        EntidadPublicaComunidad,
        | "nombre"
        | "descripcionCorta"
        | "descripcion"
        | "logo"
        | "portada"
        | "sitioWeb"
        | "correoContacto"
        | "ciudad"
        | "region"
        | "sector"
        | "etiquetas"
        | "requiereDniEnrolamiento"
      >
    >,
  ): Promise<EntidadPublicaComunidad> {
    if (apiConfig.useMock) {
      const base = entidadesPublicasMock.find((item) => item.id === entidadId);
      if (!base) throw new Error("No se encontró la entidad.");
      const mapa = leerPerfiles();
      mapa[entidadId] = {
        ...(mapa[entidadId] ?? {}),
        ...cambios,
      };
      guardarPerfiles(mapa);
      return resolveMock(
        structuredClone(entidadConPerfilPersonalizado(base)),
      );
    }
    const { data } = await api.put<EntidadPublicaComunidad>(
      API.comunidad.entidadPorId(entidadId),
      cambios,
    );
    return data;
  },

  async actualizarVisibilidadCurso(
    entidadId: string,
    cursoId: string,
    visibleEnPerfil: boolean,
  ): Promise<void> {
    if (apiConfig.useMock) {
      const mapa = leerVisibilidadCursos();
      mapa[entidadId] = {
        ...(mapa[entidadId] ?? {}),
        [cursoId]: { visibleEnPerfil },
      };
      guardarVisibilidadCursos(mapa);
      return resolveMock(undefined);
    }
    await api.put(
      `${API.comunidad.entidadPorId(entidadId)}/cursos/${cursoId}/visibilidad`,
      { visibleEnPerfil },
    );
  },

  async obtenerPublicaciones(
    entidadId: string,
  ): Promise<PublicacionEntidadResumen[]> {
    if (apiConfig.useMock) {
      return resolveMock(
        structuredClone(publicacionesPorEntidadMock[entidadId] ?? []),
      );
    }
    const { data } = await api.get<PublicacionEntidadResumen[]>(
      API.comunidad.publicacionesEntidad(entidadId),
    );
    return data;
  },

  async obtenerCategorias(entidadId: string): Promise<CategoriaCursoEntidad[]> {
    if (apiConfig.useMock) {
      let configuradas: CategoriaCursoEntidad[] = [];
      if (entidadId === "org-empresa-abc") {
        try {
          const raw = localStorage.getItem(CLAVE_CATEGORIAS_ENTIDAD);
          configuradas = raw ? (JSON.parse(raw) as CategoriaCursoEntidad[]) : [];
        } catch {
          configuradas = [];
        }
      }
      return resolveMock(
        structuredClone(
          (configuradas.length ? configuradas : categoriasCursosEntidadesMock)
            .filter((item) => item.organizacionId === entidadId && item.estado === "ACTIVA")
            .sort((a, b) => a.orden - b.orden),
        ),
      );
    }
    const { data } = await api.get<CategoriaCursoEntidad[]>(
      `${API.comunidad.entidadPorId(entidadId)}/categorias-cursos`,
    );
    return data;
  },

  async obtenerCursos(entidadId: string): Promise<CursoPerfilEntidad[]> {
    if (apiConfig.useMock) {
      const visibilidad = leerVisibilidadCursos()[entidadId] ?? {};
      return resolveMock(
        structuredClone(
          cursosPerfilesEntidadesMock
            .filter(
              (item) =>
                item.organizacionId === entidadId && item.estado === "PUBLICADO",
            )
            .filter((item) => visibilidad[item.id]?.visibleEnPerfil !== false)
            .map((item) => ({
              ...item,
              // Metadato local para el editor de presencia (no afecta consumidores tipados).
            })),
        ),
      );
    }
    const { data } = await api.get<CursoPerfilEntidad[]>(
      `${API.comunidad.entidadPorId(entidadId)}/cursos`,
    );
    return data;
  },

  /** Todos los cursos del perfil (incluye ocultos) para el editor de presencia. */
  async obtenerCursosEditor(
    entidadId: string,
  ): Promise<Array<CursoPerfilEntidad & { visibleEnPerfil: boolean }>> {
    if (apiConfig.useMock) {
      const visibilidad = leerVisibilidadCursos()[entidadId] ?? {};
      return resolveMock(
        structuredClone(
          cursosPerfilesEntidadesMock
            .filter(
              (item) =>
                item.organizacionId === entidadId && item.estado === "PUBLICADO",
            )
            .map((item) => ({
              ...item,
              visibleEnPerfil: visibilidad[item.id]?.visibleEnPerfil !== false,
            })),
        ),
      );
    }
    const { data } = await api.get<
      Array<CursoPerfilEntidad & { visibleEnPerfil: boolean }>
    >(`${API.comunidad.entidadPorId(entidadId)}/cursos/editor`);
    return data;
  },

  async evaluarAccesoCurso(
    curso: CursoPerfilEntidad,
  ): Promise<EvaluacionAccesoCursoPerfil> {
    if (apiConfig.useMock) return resolveMock(await evaluarAccesoMock(curso));
    const { data } = await api.get<EvaluacionAccesoCursoPerfil>(
      `${API.comunidad.entidadPorId(curso.organizacionId)}/cursos/${curso.id}/acceso`,
    );
    return data;
  },

  async matricularEnCurso(
    curso: CursoPerfilEntidad,
  ): Promise<MatriculaCursoEntidadPerfil> {
    if (apiConfig.useMock) {
      const acceso = await evaluarAccesoMock(curso);
      if (!acceso.disponible) throw new Error(acceso.motivo);
      const existentes = leerMatriculas();
      const referencia = referenciaUsuario();
      const existente = existentes.find(
        (item) => item.usuarioReferencia === referencia && item.cursoId === curso.id,
      );
      if (existente) return resolveMock(existente);
      const matricula: MatriculaCursoEntidadPerfil = {
        id: `mat-perfil-${Date.now()}`,
        usuarioReferencia: referencia,
        cursoId: curso.id,
        organizacionId: curso.organizacionId,
        condicionAlInscribirse: acceso.condicion,
        origenAcceso: acceso.origenAcceso,
        nodoOrigenId: acceso.nodoOrigenId,
        estado: acceso.origenAcceso === "APROBACION" ? "PENDIENTE" : "ACTIVA",
        fechaInscripcion: new Date().toISOString().slice(0, 10),
      };
      localStorage.setItem(CLAVE_MATRICULAS, JSON.stringify([...existentes, matricula]));
      return resolveMock(matricula);
    }
    const { data } = await api.post<MatriculaCursoEntidadPerfil>(
      `${API.comunidad.entidadPorId(curso.organizacionId)}/cursos/${curso.id}/matriculas`,
    );
    return data;
  },

  /**
   * Tras un pago del catálogo, marca también la matrícula en el perfil de entidad
   * si el curso pertenece a una organización de comunidad.
   */
  async sincronizarMatriculaTrasPago(cursoIds: string[]): Promise<void> {
    if (!apiConfig.useMock) return;
    for (const cursoId of cursoIds) {
      const curso = cursosPerfilesEntidadesMock.find((item) => item.id === cursoId);
      if (!curso) continue;
      try {
        await this.matricularEnCurso(curso);
      } catch {
        // Sin acceso estructural (p. ej. interno): el pago del catálogo igual habilita el player.
      }
    }
  },

  estaMatriculado(cursoId: string) {
    const referencia = referenciaUsuario();
    return leerMatriculas().some(
      (item) => item.usuarioReferencia === referencia && item.cursoId === cursoId,
    );
  },

  obtenerEstado(entidadId: string): EstadoMembresiaEntidad {
    return leerEstados()[entidadId] ?? "NINGUNA";
  },

  async solicitarUnirse(
    entidadId: string,
    datos?: { nombre?: string; correo?: string; dni?: string },
  ): Promise<{
    estado: EstadoMembresiaEntidad;
    mensaje: string;
  }> {
    if (apiConfig.useMock) {
      const mapa = leerEstados();
      if (mapa[entidadId] === "MIEMBRO") {
        return resolveMock({
          estado: "MIEMBRO" as const,
          mensaje: "Ya formas parte de esta entidad.",
        });
      }

      const perfil = perfilSesion();
      const nombre = datos?.nombre?.trim() || perfil?.name || "Solicitante Comunidad";
      const correo =
        datos?.correo?.trim().toLowerCase() || correoSolicitante(perfil);
      const dni = datos?.dni?.trim();

      const entidad = entidadesPublicasMock.find((item) => item.id === entidadId);
      if (entidad?.requiereDniEnrolamiento && !dni) {
        throw new Error("Esta entidad exige DNI para solicitar el ingreso.");
      }

      const resultado = await organizacionService.registrarSolicitudDesdeComunidad({
        organizacionId: entidadId,
        nombre,
        correo,
        dni,
        iniciales: perfil?.initials,
      });

      const siguiente: EstadoMembresiaEntidad =
        resultado.estado === "MIEMBRO" ? "MIEMBRO" : "SOLICITADA";
      mapa[entidadId] = siguiente;
      guardarEstados(mapa);

      if (siguiente === "MIEMBRO") {
        return resolveMock({
          estado: siguiente,
          mensaje:
            "Ya eres miembro de esta entidad. En el portal Organización verás tu usuario como activo.",
        });
      }

      return resolveMock({
        estado: siguiente,
        mensaje:
          "Solicitud enviada. La entidad la verá en Organización → Usuarios → Pendientes de admisión (filtro Invitado / Comunidad).",
      });
    }
    const { data } = await api.post<{
      estado: EstadoMembresiaEntidad;
      mensaje: string;
    }>(API.comunidad.unirseEntidad(entidadId), datos ?? {});
    return data;
  },

  async contactar(entidadId: string): Promise<EstadoMembresiaEntidad> {
    if (apiConfig.useMock) {
      const mapa = leerEstados();
      if (mapa[entidadId] !== "MIEMBRO" && mapa[entidadId] !== "SOLICITADA") {
        mapa[entidadId] = "CONTACTADO";
        guardarEstados(mapa);
      }
      return resolveMock(mapa[entidadId] ?? "CONTACTADO");
    }
    const { data } = await api.post<{ estado: EstadoMembresiaEntidad }>(
      API.comunidad.contactarEntidad(entidadId),
    );
    return data.estado;
  },
};
