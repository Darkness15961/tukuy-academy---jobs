import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { organizacionPrincipalService } from "@/api/services/organizacion-principal.service";
import { CONTEXTO_SESION_KEY } from "@/lib/constants";
import {
  categoriasCursosEntidadesMock,
  cursosPerfilesEntidadesMock,
} from "@/modulos/comunidad/data/entidades-publicas.mock";
import type { CategoriaCursoEntidad } from "@/modulos/comunidad/types/entidad-publica.types";
import { catalogoCursosOrganizacion } from "@/portal-organizacion/data/organizacion.mock";
import type { ContextoSesion } from "@/types/membresia.types";

const CLAVE = "tukuy_demo_categorias_cursos_entidad_v5";
const ORGANIZACION_DEMO = "org-empresa-abc";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CursoClasificadoEntidad = {
  id: string;
  cursoDocenteId: string;
  titulo: string;
  imagen: string;
  docente: string;
  estado: string;
  duracion: string;
  categoriaNombres: string[];
  categoriaIds: string[];
  alcance?: "PUBLICO" | "INTERNO";
  precio?: number;
  gratuito?: boolean;
};

export type CrearCategoriaInput = {
  nombre: string;
  descripcion: string;
  color: string;
  visibleEnCatalogo: boolean;
  seleccionableComoInteres: boolean;
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function aliasCategoria(nombre: string): string {
  const clave = normalizar(nombre);
  const mapa: Record<string, string> = {
    operaciones: "operaciones internas",
    planificacion: "gestion de obra",
    "gestion de obras": "gestion de obra",
    seguridad: "seguridad en obra",
    "tukuy obra": "tecnologia / digital",
    "documentacion digital": "tecnologia / digital",
    "especializacion tecnica": "certificacion profesional",
    "expedientes tecnicos": "construccion civil",
  };
  return mapa[clave] ?? clave;
}

function usaBd() {
  return organizacionPrincipalService.activo();
}

function instalacionActiva(): string | null {
  try {
    const bruto = localStorage.getItem(CONTEXTO_SESION_KEY);
    if (!bruto) return null;
    const contexto = JSON.parse(bruto) as ContextoSesion;
    return contexto.organizacionId ?? null;
  } catch {
    return null;
  }
}

function esRpcCategoriasAusente(error: unknown) {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /org_(listar|guardar|eliminar)_categoria|Could not find the function|PGRST202/i.test(
    mensaje,
  );
}

function semillas(): CategoriaCursoEntidad[] {
  if (apiConfig.sinDatosDemo) return [];
  return categoriasCursosEntidadesMock
    .filter((item) => item.organizacionId === ORGANIZACION_DEMO)
    .map((item) => {
      const copia = structuredClone(item);
      delete copia.categoriaPadreId;
      return copia;
    });
}

function leer(): CategoriaCursoEntidad[] {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) {
      const datos = JSON.parse(raw) as CategoriaCursoEntidad[];
      if (Array.isArray(datos) && (datos.length || apiConfig.sinDatosDemo)) {
        return datos
          .filter((item) => !item.categoriaPadreId)
          .map((item) => {
            const copia = { ...item };
            delete copia.categoriaPadreId;
            return copia;
          });
      }
    }
  } catch {
    localStorage.removeItem(CLAVE);
  }
  const datos = semillas();
  localStorage.setItem(CLAVE, JSON.stringify(datos));
  return datos;
}

function guardar(categorias: CategoriaCursoEntidad[]) {
  localStorage.setItem(CLAVE, JSON.stringify(categorias));
}

function idsPorNombre(categorias: CategoriaCursoEntidad[], nombre: string) {
  const objetivo = aliasCategoria(nombre);
  return categorias
    .filter((item) => normalizar(item.nombre) === objetivo)
    .map((item) => item.id);
}

function construirCursosClasificadosDesdeMock(
  categorias: CategoriaCursoEntidad[],
): CursoClasificadoEntidad[] {
  if (apiConfig.sinDatosDemo) return [];
  const porId = new Map(categorias.map((item) => [item.id, item]));
  const filas = new Map<string, CursoClasificadoEntidad>();

  for (const curso of cursosPerfilesEntidadesMock.filter(
    (item) => item.organizacionId === ORGANIZACION_DEMO,
  )) {
    const cats = curso.categoriaIds
      .map((id) => porId.get(id))
      .filter(Boolean) as CategoriaCursoEntidad[];
    filas.set(curso.id, {
      id: `perfil-${curso.id}`,
      cursoDocenteId: curso.id,
      titulo: curso.titulo,
      imagen: curso.imagen,
      docente: curso.docente,
      estado: curso.estado,
      duracion: curso.duracion,
      categoriaIds: cats.map((item) => item.id),
      categoriaNombres: cats.map((item) => item.nombre),
      alcance: curso.alcance,
      precio: curso.precio,
      gratuito: curso.gratuito,
    });
  }

  for (const propuesta of catalogoCursosOrganizacion) {
    const clave = propuesta.cursoDocenteId;
    const ids = idsPorNombre(categorias, propuesta.categoria);
    const nombres = ids
      .map((id) => porId.get(id)?.nombre)
      .filter(Boolean) as string[];
    const existente = filas.get(clave);
    if (existente) {
      existente.estado = propuesta.estado;
      if (!existente.categoriaIds.length && ids.length) {
        existente.categoriaIds = ids;
        existente.categoriaNombres = nombres.length
          ? nombres
          : [propuesta.categoria];
      }
      continue;
    }
    filas.set(clave, {
      id: propuesta.id,
      cursoDocenteId: propuesta.cursoDocenteId,
      titulo: propuesta.titulo,
      imagen: propuesta.imagen,
      docente: propuesta.docente,
      estado: propuesta.estado,
      duracion: propuesta.duracion,
      categoriaIds: ids,
      categoriaNombres: nombres.length ? nombres : [propuesta.categoria],
      precio: propuesta.precio,
      gratuito: propuesta.gratuito,
    });
  }

  return [...filas.values()].sort((a, b) =>
    a.titulo.localeCompare(b.titulo, "es"),
  );
}

async function construirCursosClasificadosDesdeCatalogo(
  categorias: CategoriaCursoEntidad[],
): Promise<CursoClasificadoEntidad[]> {
  const { organizacionService } = await import(
    "@/api/services/organizacion.service"
  );
  const catalogo = await organizacionService.catalogoCursos.listar();
  const porId = new Map(categorias.map((item) => [item.id, item]));

  return catalogo
    .map((propuesta) => {
      const ids = idsPorNombre(categorias, propuesta.categoria || "");
      const nombres = ids
        .map((id) => porId.get(id)?.nombre)
        .filter(Boolean) as string[];
      return {
        id: propuesta.id,
        cursoDocenteId: propuesta.cursoDocenteId || propuesta.id,
        titulo: propuesta.titulo,
        imagen: propuesta.imagen,
        docente: propuesta.docente,
        estado: propuesta.estado,
        duracion: propuesta.duracion,
        categoriaIds: ids,
        categoriaNombres: nombres.length
          ? nombres
          : propuesta.categoria
            ? [propuesta.categoria]
            : [],
        precio: propuesta.precio,
        gratuito: propuesta.gratuito,
      } satisfies CursoClasificadoEntidad;
    })
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
}

export const categoriasCursosService = {
  async listar(): Promise<CategoriaCursoEntidad[]> {
    if (usaBd()) {
      const instalacionId = instalacionActiva();
      if (instalacionId && UUID_RE.test(instalacionId)) {
        try {
          const datos =
            await organizacionPrincipalService.listarCategoriasCursos(
              instalacionId,
            );
          return datos.sort((a, b) => a.orden - b.orden);
        } catch (error) {
          if (!esRpcCategoriasAusente(error)) throw error;
        }
      }
    }

    const datos = leer().sort((a, b) => a.orden - b.orden);
    if (apiConfig.useMock) return resolveMock(datos);
    try {
      const { data } = await api.get<CategoriaCursoEntidad[]>(
        API.organizacion.categoriasCursos,
      );
      return data.filter((item) => !item.categoriaPadreId);
    } catch {
      return resolveMock(datos);
    }
  },

  async listarCursosClasificados(): Promise<CursoClasificadoEntidad[]> {
    const categorias = await this.listar();
    if (usaBd() || apiConfig.secundariaCursos) {
      return construirCursosClasificadosDesdeCatalogo(categorias);
    }
    return resolveMock(construirCursosClasificadosDesdeMock(categorias));
  },

  async contarCursosPorCategoria(): Promise<Record<string, number>> {
    const cursos = await this.listarCursosClasificados();
    const conteo: Record<string, number> = {};
    for (const curso of cursos) {
      for (const id of curso.categoriaIds) {
        conteo[id] = (conteo[id] ?? 0) + 1;
      }
    }
    return resolveMock(conteo);
  },

  async crear(datos: CrearCategoriaInput) {
    const nombre = datos.nombre.trim();
    if (!nombre) throw new Error("El nombre es obligatorio.");

    if (usaBd()) {
      const instalacionId = instalacionActiva();
      if (!instalacionId || !UUID_RE.test(instalacionId)) {
        throw new Error("No hay organización activa en el contexto de sesión");
      }
      try {
        return await organizacionPrincipalService.guardarCategoriaCurso(
          instalacionId,
          {
            id: `cat-${Date.now()}`,
            organizacionId: instalacionId,
            nombre,
            descripcion: datos.descripcion.trim(),
            color: datos.color || "#0B3A78",
            visibleEnCatalogo: datos.visibleEnCatalogo,
            seleccionableComoInteres: datos.seleccionableComoInteres,
            orden: 0,
            estado: "ACTIVA",
          },
        );
      } catch (error) {
        if (!esRpcCategoriasAusente(error)) throw error;
      }
    }

    if (!apiConfig.useMock) {
      try {
        const { data } = await api.post<CategoriaCursoEntidad>(
          API.organizacion.categoriasCursos,
          datos,
        );
        return data;
      } catch {
        // Demo local.
      }
    }

    const categorias = leer();
    if (
      categorias.some(
        (item) => normalizar(item.nombre) === normalizar(nombre),
      )
    ) {
      throw new Error("Ya existe una categoría con ese nombre.");
    }

    const categoria: CategoriaCursoEntidad = {
      id: `cat-entidad-${Date.now()}`,
      organizacionId: ORGANIZACION_DEMO,
      nombre,
      descripcion: datos.descripcion.trim(),
      color: datos.color || "#0B3A78",
      visibleEnCatalogo: datos.visibleEnCatalogo,
      seleccionableComoInteres: datos.seleccionableComoInteres,
      orden: categorias.length + 1,
      estado: "ACTIVA",
    };
    guardar([...categorias, categoria]);
    return resolveMock(categoria);
  },

  async actualizar(id: string, cambios: Partial<CategoriaCursoEntidad>) {
    if (usaBd()) {
      const instalacionId = instalacionActiva();
      if (!instalacionId || !UUID_RE.test(instalacionId)) {
        throw new Error("No hay organización activa en el contexto de sesión");
      }
      try {
        const actuales =
          await organizacionPrincipalService.listarCategoriasCursos(
            instalacionId,
          );
        const actual = actuales.find((item) => item.id === id);
        if (!actual) throw new Error("No se encontró la categoría.");
        const fusionada = { ...actual, ...cambios, id };
        delete fusionada.categoriaPadreId;
        return await organizacionPrincipalService.guardarCategoriaCurso(
          instalacionId,
          fusionada,
        );
      } catch (error) {
        if (!esRpcCategoriasAusente(error)) throw error;
      }
    }

    if (!apiConfig.useMock) {
      try {
        const { data } = await api.patch<CategoriaCursoEntidad>(
          `${API.organizacion.categoriasCursos}/${id}`,
          cambios,
        );
        return data;
      } catch {
        // Demo local.
      }
    }
    const categorias = leer();
    const indice = categorias.findIndex((item) => item.id === id);
    if (indice < 0) throw new Error("No se encontró la categoría.");
    const actualizada = { ...categorias[indice]!, ...cambios, id };
    delete actualizada.categoriaPadreId;
    categorias[indice] = actualizada;
    guardar(categorias);
    return resolveMock(actualizada);
  },

  async eliminar(id: string) {
    if (usaBd()) {
      const instalacionId = instalacionActiva();
      if (!instalacionId || !UUID_RE.test(instalacionId)) {
        throw new Error("No hay organización activa en el contexto de sesión");
      }
      try {
        await organizacionPrincipalService.eliminarCategoriaCurso(
          instalacionId,
          id,
        );
        return true;
      } catch (error) {
        if (!esRpcCategoriasAusente(error)) throw error;
      }
    }

    const categorias = leer();
    if (!categorias.some((item) => item.id === id)) {
      throw new Error("No se encontró la categoría.");
    }
    const cursos = construirCursosClasificadosDesdeMock(categorias);
    if (cursos.some((curso) => curso.categoriaIds.includes(id))) {
      throw new Error(
        "No se puede eliminar: hay cursos con esta categoría. Desactívala o reasigna los cursos.",
      );
    }
    if (!apiConfig.useMock) {
      try {
        await api.delete(`${API.organizacion.categoriasCursos}/${id}`);
      } catch {
        // Demo local.
      }
    }
    guardar(categorias.filter((item) => item.id !== id));
    return resolveMock(true);
  },
};
