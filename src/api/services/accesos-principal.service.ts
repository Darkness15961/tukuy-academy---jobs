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
  organizacion_nombre: string;
  instalacion_ref: string | null;
  estado_funcion: AccesoPrincipal["estadoFuncion"];
  permisos: string[] | null;
};

export type ResumenAccesosPrincipal = {
  identidades: number;
  sinAcceso: number;
  accesosActivos: number;
  funcionesPlataforma: number;
  organizacionesDelegadas: number;
};

export type PaginaAccesosPrincipal = {
  datos: AccesoPrincipal[];
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
  resumen: ResumenAccesosPrincipal;
};

type PaginaAccesosRpc = {
  datos?: AccesoRpc[];
  pagina?: number;
  porPagina?: number;
  total?: number;
  totalPaginas?: number;
  resumen?: Partial<ResumenAccesosPrincipal>;
};

function propagarError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
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
  }): Promise<PaginaAccesosPrincipal> {
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
    const datos = (pagina.datos ?? []).map((item) => ({
      funcionId: item.funcion_id,
      membresiaId: item.membresia_id,
      identidadId: item.identidad_id,
      nombre: item.nombre,
      correo: item.correo,
      avatarUrl: item.avatar_url,
      estadoIdentidad: item.estado_identidad,
      perfilCodigo: item.perfil_codigo,
      perfilNombre: item.perfil_nombre,
      portal: item.portal,
      nivel: item.nivel,
      organizacionNombre: item.organizacion_nombre,
      instalacionRef: item.instalacion_ref,
      estadoFuncion: item.estado_funcion,
      permisos: item.permisos ?? [],
    })) satisfies AccesoPrincipal[];
    return {
      datos,
      pagina: pagina.pagina ?? entrada.pagina,
      porPagina: pagina.porPagina ?? entrada.porPagina,
      total: pagina.total ?? 0,
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
