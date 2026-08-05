import { api } from "@/api/client";
import { API } from "@/api/endpoints";

export type FiltrosListado = {
  page?: number;
  per_page?: number;
  q?: string;
  sort?: string;
  filter?: Record<string, string | number | boolean>;
};

export type PaginaApi<T> = {
  data: T[];
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
  links?: unknown;
  meta?: unknown;
};

export type RecursoCatalogo = {
  nombre: string;
  campos_editables?: string[];
  campos_requeridos?: string[];
  solo_lectura?: boolean;
};

function rutaRecurso(nombre: string, id?: string | number): string {
  if (!/^[a-z0-9-]+$/.test(nombre)) {
    throw new Error("Nombre de recurso inválido");
  }
  return id === undefined ? `/${nombre}` : `/${nombre}/${encodeURIComponent(id)}`;
}

function parametrosListado(filtros: FiltrosListado) {
  const params: Record<string, string | number | boolean> = {};
  if (filtros.page !== undefined) params.page = filtros.page;
  if (filtros.per_page !== undefined) {
    params.per_page = Math.min(100, Math.max(1, filtros.per_page));
  }
  if (filtros.q) params.q = filtros.q;
  if (filtros.sort) params.sort = filtros.sort;
  for (const [campo, valor] of Object.entries(filtros.filter ?? {})) {
    params[`filter[${campo}]`] = valor;
  }
  return params;
}

export const recursosService = {
  async catalogo(): Promise<RecursoCatalogo[]> {
    const { data } = await api.get<RecursoCatalogo[] | { data: RecursoCatalogo[] }>(
      API.recursos,
    );
    return Array.isArray(data) ? data : data.data;
  },

  async listar<T>(nombre: string, filtros: FiltrosListado = {}): Promise<PaginaApi<T>> {
    const { data } = await api.get<PaginaApi<T> | T[]>(rutaRecurso(nombre), {
      params: parametrosListado(filtros),
    });
    return Array.isArray(data) ? { data } : data;
  },

  async obtener<T>(nombre: string, id: string | number): Promise<T> {
    const { data } = await api.get<T>(rutaRecurso(nombre, id));
    return data;
  },

  async crear<T, TEntrada extends object = Partial<T>>(
    nombre: string,
    entrada: TEntrada,
  ): Promise<T> {
    const { data } = await api.post<T>(rutaRecurso(nombre), entrada);
    return data;
  },

  async actualizar<T, TEntrada extends object = Partial<T>>(
    nombre: string,
    id: string | number,
    cambios: TEntrada,
  ): Promise<T> {
    const { data } = await api.patch<T>(rutaRecurso(nombre, id), cambios);
    return data;
  },

  async eliminar(nombre: string, id: string | number): Promise<void> {
    await api.delete(rutaRecurso(nombre, id));
  },

  async rolesMembresia<T = unknown>(id: string): Promise<T> {
    const { data } = await api.get<T>(API.membresias.roles(id));
    return data;
  },

  async asignarRolesMembresia<T = unknown>(id: string, rolRefs: string[]): Promise<T> {
    const { data } = await api.put<T>(API.membresias.roles(id), {
      rol_refs: rolRefs,
    });
    return data;
  },

  async unidadesMembresia<T = unknown>(id: string): Promise<T> {
    const { data } = await api.get<T>(API.membresias.unidades(id));
    return data;
  },

  async asignarUnidadesMembresia<T = unknown>(
    id: string,
    unidadRefs: string[],
  ): Promise<T> {
    const { data } = await api.put<T>(API.membresias.unidades(id), {
      unidad_refs: unidadRefs,
    });
    return data;
  },
};
