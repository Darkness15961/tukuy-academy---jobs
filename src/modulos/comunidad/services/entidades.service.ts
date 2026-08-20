import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { organizacionService } from "@/api/services/organizacion.service";
import {
  esErrorRpcPresenciaAusente,
  organizacionPrincipalService,
  presenciaBdDisponible,
} from "@/api/services/organizacion-principal.service";
import { CONTEXTO_SESION_KEY, USUARIO_SESION_KEY } from "@/lib/constants";
import type { UserProfile } from "@/types/academia";
import type { ContextoSesion } from "@/types/membresia.types";
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

/** Overlay de presencia: no pisa con cadenas vacías lo que ya venía de base/identidad. */
function fusionarOverlayPerfil(
  base: EntidadPublicaComunidad,
  overlay?: Partial<EntidadPublicaComunidad> | null,
): EntidadPublicaComunidad {
  if (!overlay) return base;
  const fusionado: EntidadPublicaComunidad = { ...base };
  (Object.keys(overlay) as Array<keyof EntidadPublicaComunidad>).forEach(
    (clave) => {
      const valor = overlay[clave];
      if (valor === undefined || valor === null) return;
      if (typeof valor === "string" && !valor.trim()) return;
      if (Array.isArray(valor) && valor.length === 0) return;
      (fusionado as Record<string, unknown>)[clave as string] = valor;
    },
  );
  return fusionado;
}

function contextoSesionLocal(): ContextoSesion | null {
  try {
    const raw = localStorage.getItem(CONTEXTO_SESION_KEY);
    return raw ? (JSON.parse(raw) as ContextoSesion) : null;
  } catch {
    return null;
  }
}

/** Ficha mínima cuando la org real aún no está en el directorio mock de Comunidad. */
function entidadBaseDesdeOrganizacion(
  id: string,
): EntidadPublicaComunidad {
  const contexto = contextoSesionLocal();
  const nombreContexto =
    contexto?.organizacionId === id
      ? contexto.organizacionNombre?.trim()
      : "";
  let logoGuardado = "";
  try {
    const raw = localStorage.getItem(`tukuy_identidad_entidad_${id}`);
    const identidad = raw
      ? (JSON.parse(raw) as { nombre?: string; logo?: string })
      : null;
    logoGuardado = identidad?.logo?.trim() ?? "";
  } catch {
    logoGuardado = "";
  }
  return {
    id,
    nombre: nombreContexto || "Organización",
    slug: id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48) || "entidad",
    tipo: "EMPRESA",
    sector: "",
    ciudad: "",
    region: "",
    descripcionCorta: "",
    descripcion: "",
    logo: logoGuardado,
    portada: "",
    verificada: false,
    miembros: 0,
    publicaciones: 0,
    cursosActivos: 0,
    vacantesAbiertas: 0,
    correoContacto: "",
    etiquetas: [],
    requiereDniEnrolamiento: true,
  };
}

function entidadConPerfilPersonalizado(
  entidad: EntidadPublicaComunidad,
): EntidadPublicaComunidad {
  return fusionarOverlayPerfil(entidad, leerPerfiles()[entidad.id]);
}

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

function esInstalacionUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id,
  );
}

function mapearCursoPerfilPublico(
  item: Record<string, unknown>,
  entidadId: string,
): CursoPerfilEntidad {
  const historicos =
    item.datosHistoricos && typeof item.datosHistoricos === "object"
      ? (item.datosHistoricos as Record<string, unknown>)
      : {};
  const borrador =
    historicos.borradorResumen && typeof historicos.borradorResumen === "object"
      ? (historicos.borradorResumen as Record<string, unknown>)
      : {};
  const config =
    historicos.configuracionPublicacion &&
    typeof historicos.configuracionPublicacion === "object"
      ? (historicos.configuracionPublicacion as Record<string, unknown>)
      : {};
  const precioCfg =
    config.precio && typeof config.precio === "object"
      ? (config.precio as Record<string, unknown>)
      : {};
  const duracionMin = Number(item.duracionMinutos ?? 0);
  const modalidadRaw = String(config.modalidadAcceso ?? "LIBRE");
  return {
    id: String(item.cursoSecundarioRef ?? item.id ?? ""),
    organizacionId: entidadId,
    titulo: String(item.titulo ?? "Curso"),
    resumen: String(item.resumen ?? ""),
    imagen: String(item.imagenPublicaRef ?? ""),
    docente: String(
      borrador.docenteResponsableNombre ??
        historicos.docenteNombre ??
        "Docente",
    ),
    duracion:
      duracionMin > 0
        ? `${Math.max(1, Math.round(duracionMin / 60))} h`
        : "—",
    categoriaIds: Array.isArray(config.categoriaIds)
      ? config.categoriaIds.map(String)
      : [],
    alcance: config.alcance === "INTERNO" ? "INTERNO" : "PUBLICO",
    nodoIdsPermitidos: Array.isArray(config.nodoIds)
      ? config.nodoIds.map(String)
      : [],
    incluirDescendientes: config.incluirDescendientes !== false,
    modalidadAcceso:
      modalidadRaw === "CON_APROBACION" || modalidadRaw === "SOLO_ASIGNACION"
        ? modalidadRaw
        : "LIBRE",
    gratuito:
      precioCfg.modalidad === "GRATUITO" ||
      Number(precioCfg.precioCompleto ?? 0) === 0,
    precio: Number(precioCfg.precioCompleto ?? 0),
    moneda: precioCfg.moneda === "USD" ? "USD" : "PEN",
    estado: "PUBLICADO",
  };
}

async function listarCursosPerfilReales(
  entidadId: string,
  incluirOcultos = false,
): Promise<Array<CursoPerfilEntidad & { visibleEnPerfil: boolean }>> {
  const items =
    await organizacionPrincipalService.listarCursosPerfilPublico(entidadId);
  return items
    .map((item) => {
      const curso = mapearCursoPerfilPublico(item, entidadId);
      const historicos =
        item.datosHistoricos && typeof item.datosHistoricos === "object"
          ? (item.datosHistoricos as Record<string, unknown>)
          : {};
      const visibleEnPerfil = historicos.visibleEnPerfil !== false;
      return { ...curso, visibleEnPerfil };
    })
    .filter((item) => incluirOcultos || item.visibleEnPerfil);
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

  const contexto = contextoSesionLocal();
  const usuarioId = contexto?.usuarioId;
  if (!usuarioId) {
    return {
      disponible: false,
      condicion: "EXTERNO",
      origenAcceso: "NODO_INTERNO",
      motivo: "Inicia sesión para acceder a cursos internos de la entidad.",
    };
  }

  const [personas, vinculaciones, unidades] = await Promise.all([
    organizacionService.usuarios.listar(),
    organizacionService.estructura.vinculaciones.listar(),
    organizacionService.estructura.unidades.listar(),
  ]);
  const persona = personas.find((item) => String(item.id) === usuarioId);
  if (!persona || persona.estado !== "ACTIVO") {
    return {
      disponible: false,
      condicion: "EXTERNO",
      origenAcceso: "NODO_INTERNO",
      motivo: "Debes ser miembro activo de la entidad para acceder a este curso.",
    };
  }

  const activas = vinculaciones.filter(
    (item) => item.usuarioId === String(persona.id) && item.estado === "ACTIVA",
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

function referenciaUsuario() {
  const contexto = contextoSesionLocal();
  return contexto?.usuarioId?.trim() || perfilSesion()?.name?.trim().toLowerCase() || "";
}

function usaPresenciaBd() {
  return organizacionPrincipalService.activo() && presenciaBdDisponible();
}

export const entidadesComunidadService = {
  async listar(): Promise<EntidadPublicaComunidad[]> {
    if (usaPresenciaBd()) {
      try {
        return await organizacionPrincipalService.listarPresenciasPublicas();
      } catch (error) {
        if (!esErrorRpcPresenciaAusente(error)) throw error;
      }
    }
    if (apiConfig.sinDatosDemo) {
      const contexto = contextoSesionLocal();
      const id = contexto?.organizacionId;
      if (!id) return resolveMock([]);
      const propia = entidadConPerfilPersonalizado(
        entidadBaseDesdeOrganizacion(id),
      );
      return resolveMock([propia]);
    }
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
    if (usaPresenciaBd()) {
      try {
        return await organizacionPrincipalService.obtenerPresencia(id);
      } catch (error) {
        if (!esErrorRpcPresenciaAusente(error)) throw error;
      }
    }
    if (apiConfig.useMock || apiConfig.sinDatosDemo) {
      const entidad =
        apiConfig.sinDatosDemo
          ? entidadBaseDesdeOrganizacion(id)
          : entidadesPublicasMock.find(
              (item) => item.id === id || item.slug === id,
            ) ?? entidadBaseDesdeOrganizacion(id);
      return resolveMock(
        structuredClone(entidadConPerfilPersonalizado(entidad)),
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
    if (usaPresenciaBd()) {
      try {
        return await organizacionPrincipalService.guardarPresencia(
          entidadId,
          cambios,
        );
      } catch (error) {
        if (!esErrorRpcPresenciaAusente(error)) throw error;
      }
    }
    if (apiConfig.useMock || apiConfig.sinDatosDemo) {
      const base =
        apiConfig.sinDatosDemo
          ? entidadBaseDesdeOrganizacion(entidadId)
          : entidadesPublicasMock.find((item) => item.id === entidadId) ??
            entidadBaseDesdeOrganizacion(entidadId);
      const mapa = leerPerfiles();
      const previos = mapa[entidadId] ?? {};
      const limpios: Partial<EntidadPublicaComunidad> = { ...previos };
      (Object.keys(cambios) as Array<keyof typeof cambios>).forEach((clave) => {
        const valor = cambios[clave];
        if (valor === undefined) return;
        if (typeof valor === "string" && !valor.trim()) {
          delete limpios[clave];
          return;
        }
        if (Array.isArray(valor) && valor.length === 0) {
          delete limpios[clave];
          return;
        }
        (limpios as Record<string, unknown>)[clave] = valor;
      });
      mapa[entidadId] = limpios;
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
    if (apiConfig.sinDatosDemo || !apiConfig.useMock) {
      return resolveMock([]);
    }
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
    if (
      organizacionPrincipalService.activo() &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        entidadId,
      )
    ) {
      try {
        const categorias =
          await organizacionPrincipalService.listarCategoriasCatalogo(
            entidadId,
          );
        return categorias
          .filter((item) => item.estado === "ACTIVA")
          .sort((a, b) => a.orden - b.orden);
      } catch (error) {
        const mensaje =
          error instanceof Error ? error.message : String(error);
        if (
          !/org_listar_categorias_catalogo|Could not find the function|PGRST202/i.test(
            mensaje,
          )
        ) {
          throw error;
        }
      }
    }

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
    if (
      organizacionPrincipalService.activo() &&
      esInstalacionUuid(entidadId)
    ) {
      try {
        const lista = await listarCursosPerfilReales(entidadId);
        return lista.map(({ visibleEnPerfil: _v, ...curso }) => curso);
      } catch (error) {
        if (!apiConfig.useMock) throw error;
      }
    }
    if (apiConfig.sinDatosDemo) return resolveMock([]);
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
    if (
      organizacionPrincipalService.activo() &&
      esInstalacionUuid(entidadId)
    ) {
      return listarCursosPerfilReales(entidadId, true);
    }
    if (apiConfig.sinDatosDemo) return resolveMock([]);
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
    if (organizacionPrincipalService.activo() && apiConfig.secundariaCursos) {
      const usuarioId = contextoSesionLocal()?.usuarioId;
      if (!usuarioId) {
        return {
          disponible: curso.alcance === "PUBLICO",
          condicion: "EXTERNO",
          origenAcceso: "CURSO_PUBLICO",
          motivo: "Inicia sesión para matricularte.",
        };
      }
      const evaluacion = await organizacionService.estructura.evaluarAccesoCurso(
        usuarioId,
        curso.id,
      );
      return {
        disponible: evaluacion.disponible,
        condicion: evaluacion.unidadOrigenId ? "INTERNO" : "EXTERNO",
        origenAcceso: evaluacion.requiereAprobacion
          ? "APROBACION"
          : evaluacion.unidadOrigenId
            ? "NODO_INTERNO"
            : "CURSO_PUBLICO",
        nodoOrigenId: evaluacion.unidadOrigenId,
        motivo: evaluacion.motivo,
      };
    }
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
    if (
      organizacionPrincipalService.activo() &&
      esInstalacionUuid(entidadId)
    ) {
      const entidad = await this.obtenerPorId(entidadId);
      if (entidad?.requiereDniEnrolamiento && !datos?.dni?.trim()) {
        throw new Error("Esta entidad exige DNI para solicitar el ingreso.");
      }
      const resultado =
        await organizacionPrincipalService.solicitarIngresoComunidad(
          entidadId,
          datos?.dni,
        );
      const estado: EstadoMembresiaEntidad =
        resultado.estado === "MIEMBRO" ? "MIEMBRO" : "SOLICITADA";
      return {
        estado,
        mensaje:
          estado === "MIEMBRO"
            ? "Ya eres miembro de esta entidad."
            : "Solicitud enviada. La entidad la revisará en Organización → Usuarios.",
      };
    }
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
