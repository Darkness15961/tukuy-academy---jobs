import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import {
  categoriasCursosEntidadesMock,
  cursosPerfilesEntidadesMock,
} from "@/modulos/comunidad/data/entidades-publicas.mock";
import type { CategoriaCursoEntidad } from "@/modulos/comunidad/types/entidad-publica.types";
import { catalogoCursosOrganizacion } from "@/portal-organizacion/data/organizacion.mock";

const CLAVE = "tukuy_demo_categorias_cursos_entidad_v4";
const ORGANIZACION_DEMO = "org-empresa-abc";

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
    "tukuy obra": "tecnologia",
    "documentacion digital": "tecnologia",
    "expedientes tecnicos": "construccion civil",
  };
  return mapa[clave] ?? clave;
}

function semillas(): CategoriaCursoEntidad[] {
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
      if (Array.isArray(datos) && datos.length) {
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

function construirCursosClasificados(
  categorias: CategoriaCursoEntidad[],
): CursoClasificadoEntidad[] {
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

export const categoriasCursosService = {
  async listar(): Promise<CategoriaCursoEntidad[]> {
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
    return resolveMock(construirCursosClasificados(categorias));
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
    const categorias = leer();
    if (!categorias.some((item) => item.id === id)) {
      throw new Error("No se encontró la categoría.");
    }
    const cursos = construirCursosClasificados(categorias);
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
