import { supabasePrincipal } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const clientePrincipal = () => supabasePrincipal() as SupabaseClient<any>;

export type PerfilAccesoPrincipal = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  portal: "admin" | "organizacion" | "docente" | "estudiante";
  nivel: "PLATAFORMA" | "ORGANIZACION" | "PERSONAL";
  permisos: string[];
};

export type PermisoPrincipal = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  modulo: string;
};

export type OrganizacionAccesoPrincipal = {
  instalacionId: string;
  empresaPrincipalRef: number;
  empresaSistemaRef: string;
  tenantRef: string;
  nombre: string;
  estado: string;
};

export type CatalogoAccesosPrincipal = {
  perfiles: PerfilAccesoPrincipal[];
  permisos: PermisoPrincipal[];
  organizaciones: OrganizacionAccesoPrincipal[];
};

export type AccesoPrincipal = {
  funcionId: string | null;
  membresiaId: string | null;
  identidadId: string;
  nombre: string;
  correo: string;
  avatarUrl: string | null;
  estadoIdentidad: string;
  perfilCodigo: string | null;
  perfilNombre: string | null;
  portal: string | null;
  nivel: string | null;
  organizacionNombre: string;
  instalacionRef: string | null;
  estadoFuncion: "ACTIVA" | "SUSPENDIDA" | "REVOCADA" | "SIN_ACCESO";
  permisos: string[];
};

/** Identidad con sus perfiles/funciones anidados (listado agrupado). */
export type IdentidadAccesosPrincipal = {
  identidadId: string;
  nombre: string;
  correo: string;
  avatarUrl: string | null;
  estadoIdentidad: string;
  accesos: AccesoPrincipal[];
};

type AccesoRpc = {
  funcion_id: string | null;
  membresia_id: string | null;
  identidad_id: string;
  nombre: string;
  correo: string;
  avatar_url: string | null;
  estado_identidad: string;
  perfil_codigo: string | null;
  perfil_nombre: string | null;
  portal: string | null;
  nivel: string | null;
  organizacion_nombre: string | null;
  instalacion_ref: string | null;
  estado_funcion: AccesoPrincipal["estadoFuncion"] | null;
  permisos: string[] | null;
};

type IdentidadRpc = {
  identidad_id: string;
  nombre: string;
  correo: string;
  avatar_url: string | null;
  estado_identidad: string;
  accesos?: AccesoRpc[] | null;
  // Formato plano legado (una fila = una función).
  funcion_id?: string | null;
  membresia_id?: string | null;
  perfil_codigo?: string | null;
  perfil_nombre?: string | null;
  portal?: string | null;
  nivel?: string | null;
  organizacion_nombre?: string | null;
  instalacion_ref?: string | null;
  estado_funcion?: AccesoPrincipal["estadoFuncion"] | null;
  permisos?: string[] | null;
};

export type ResumenAccesosPrincipal = {
  identidades: number;
  sinAcceso: number;
  accesosActivos: number;
  funcionesPlataforma: number;
  organizacionesDelegadas: number;
};

export type PaginaIdentidadesAccesos = {
  datos: IdentidadAccesosPrincipal[];
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
  resumen: ResumenAccesosPrincipal;
};

type PaginaAccesosRpc = {
  datos?: IdentidadRpc[];
  pagina?: number;
  porPagina?: number;
  total?: number;
  totalPaginas?: number;
  resumen?: Partial<ResumenAccesosPrincipal>;
  agrupadoPorIdentidad?: boolean;
};

function propagarError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

function mapearAcceso(item: AccesoRpc, identidad?: IdentidadRpc): AccesoPrincipal {
  return {
    funcionId: item.funcion_id,
    membresiaId: item.membresia_id,
    identidadId: item.identidad_id || identidad?.identidad_id || "",
    nombre: item.nombre || identidad?.nombre || "",
    correo: item.correo || identidad?.correo || "",
    avatarUrl: item.avatar_url ?? identidad?.avatar_url ?? null,
    estadoIdentidad: item.estado_identidad || identidad?.estado_identidad || "ACTIVO",
    perfilCodigo: item.perfil_codigo,
    perfilNombre: item.perfil_nombre,
    portal: item.portal,
    nivel: item.nivel,
    organizacionNombre: item.organizacion_nombre ?? "Sin entidad asignada",
    instalacionRef: item.instalacion_ref,
    estadoFuncion: item.estado_funcion ?? "SIN_ACCESO",
    permisos: Array.isArray(item.permisos) ? item.permisos : [],
  };
}

function mapearIdentidad(item: IdentidadRpc): IdentidadAccesosPrincipal {
  if (Array.isArray(item.accesos)) {
    return {
      identidadId: item.identidad_id,
      nombre: item.nombre,
      correo: item.correo,
      avatarUrl: item.avatar_url,
      estadoIdentidad: item.estado_identidad,
      accesos: item.accesos.map((acceso) => mapearAcceso(acceso, item)),
    };
  }

  // Compatibilidad con RPC plano anterior.
  const accesoPlano =
    item.funcion_id || item.estado_funcion === "SIN_ACCESO"
      ? mapearAcceso(
          {
            funcion_id: item.funcion_id ?? null,
            membresia_id: item.membresia_id ?? null,
            identidad_id: item.identidad_id,
            nombre: item.nombre,
            correo: item.correo,
            avatar_url: item.avatar_url,
            estado_identidad: item.estado_identidad,
            perfil_codigo: item.perfil_codigo ?? null,
            perfil_nombre: item.perfil_nombre ?? null,
            portal: item.portal ?? null,
            nivel: item.nivel ?? null,
            organizacion_nombre: item.organizacion_nombre ?? null,
            instalacion_ref: item.instalacion_ref ?? null,
            estado_funcion: item.estado_funcion ?? "SIN_ACCESO",
            permisos: item.permisos ?? [],
          },
          item,
        )
      : null;

  return {
    identidadId: item.identidad_id,
    nombre: item.nombre,
    correo: item.correo,
    avatarUrl: item.avatar_url,
    estadoIdentidad: item.estado_identidad,
    accesos:
      accesoPlano && accesoPlano.estadoFuncion !== "SIN_ACCESO"
        ? [accesoPlano]
        : [],
  };
}

/** Agrupa filas planas por identidad (fallback si el SQL aún no está desplegado). */
function agruparIdentidadesPlanas(
  filas: IdentidadAccesosPrincipal[],
): IdentidadAccesosPrincipal[] {
  const mapa = new Map<string, IdentidadAccesosPrincipal>();
  for (const fila of filas) {
    const existente = mapa.get(fila.identidadId);
    if (!existente) {
      mapa.set(fila.identidadId, {
        ...fila,
        accesos: [...fila.accesos],
      });
      continue;
    }
    for (const acceso of fila.accesos) {
      if (
        !existente.accesos.some(
          (item) => item.funcionId && item.funcionId === acceso.funcionId,
        )
      ) {
        existente.accesos.push(acceso);
      }
    }
  }
  return [...mapa.values()];
}

export const accesosPrincipalService = {
  async obtenerCatalogo() {
    const { data, error } = await clientePrincipal().rpc("admin_catalogo_accesos");
    propagarError(error);
    return data as unknown as CatalogoAccesosPrincipal;
  },

  async listar(entrada: {
    pagina: number;
    porPagina: number;
    buscar?: string;
    nivel?: string | null;
  }): Promise<PaginaIdentidadesAccesos> {
    const { data, error } = await clientePrincipal().rpc(
      "admin_listar_accesos_paginado",
      {
        p_pagina: entrada.pagina,
        p_por_pagina: entrada.porPagina,
        p_buscar: entrada.buscar?.trim() || null,
        p_nivel: entrada.nivel && entrada.nivel !== "TODOS" ? entrada.nivel : null,
      },
    );
    propagarError(error);
    const pagina = (data ?? {}) as PaginaAccesosRpc;
    const mapeadas = (pagina.datos ?? []).map(mapearIdentidad);
    const datos = pagina.agrupadoPorIdentidad
      ? mapeadas
      : agruparIdentidadesPlanas(mapeadas);

    return {
      datos,
      pagina: pagina.pagina ?? entrada.pagina,
      porPagina: pagina.porPagina ?? entrada.porPagina,
      total: pagina.agrupadoPorIdentidad
        ? (pagina.total ?? 0)
        : datos.length > 0
          ? Math.max(pagina.total ?? 0, datos.length)
          : (pagina.total ?? 0),
      totalPaginas: pagina.totalPaginas ?? 0,
      resumen: {
        identidades: pagina.resumen?.identidades ?? 0,
        sinAcceso: pagina.resumen?.sinAcceso ?? 0,
        accesosActivos: pagina.resumen?.accesosActivos ?? 0,
        funcionesPlataforma: pagina.resumen?.funcionesPlataforma ?? 0,
        organizacionesDelegadas: pagina.resumen?.organizacionesDelegadas ?? 0,
      },
    };
  },

  async asignar(entrada: {
    correo: string;
    perfilCodigo: string;
    instalacionRef?: string | null;
    permisosConceder?: string[];
    permisosDenegar?: string[];
  }) {
    const { data, error } = await clientePrincipal().rpc("admin_asignar_acceso", {
      p_correo: entrada.correo.trim().toLowerCase(),
      p_perfil_codigo: entrada.perfilCodigo,
      p_instalacion_ref: entrada.instalacionRef ?? null,
      p_permisos_conceder: entrada.permisosConceder ?? [],
      p_permisos_denegar: entrada.permisosDenegar ?? [],
    });
    propagarError(error);
    return data as unknown as string;
  },

  async actualizar(entrada: {
    funcionId: string;
    perfilCodigo: string;
    instalacionRef?: string | null;
    permisosConceder?: string[];
    permisosDenegar?: string[];
  }) {
    const { data, error } = await clientePrincipal().rpc(
      "admin_actualizar_acceso",
      {
        p_funcion_id: entrada.funcionId,
        p_perfil_codigo: entrada.perfilCodigo,
        p_instalacion_ref: entrada.instalacionRef ?? null,
        p_permisos_conceder: entrada.permisosConceder ?? [],
        p_permisos_denegar: entrada.permisosDenegar ?? [],
      },
    );
    propagarError(error);
    return data as unknown as string;
  },

  async cambiarEstado(
    funcionId: string,
    estado: Exclude<AccesoPrincipal["estadoFuncion"], "SIN_ACCESO">,
  ) {
    const { error } = await clientePrincipal().rpc("admin_cambiar_estado_acceso", {
      p_funcion_id: funcionId,
      p_estado: estado,
    });
    propagarError(error);
  },
};
