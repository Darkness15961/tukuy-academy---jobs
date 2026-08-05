import { supabasePrincipal } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const clientePrincipal = () => supabasePrincipal() as SupabaseClient<any>;

export type OrganizacionPrincipal = {
  id: string;
  nombre: string;
  ruc: string;
  tipo: string;
  estado: string;
  zonaHoraria: string;
  tenantRef: string;
  empresaSistemaRef: string;
  plan: string;
  estadoSuscripcion: string | null;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  limiteUsuarios: number;
  usuarios: number;
  cursos: number;
  modulos: number;
  clasificacion: "INTERNA" | "CLIENTE" | "DEMOSTRACION";
  facturable: boolean;
  vigenciaIndefinida: boolean;
};

export type ResumenOrganizacionesPrincipal = {
  total: number;
  habilitadas: number;
  pendientes: number;
  suspendidas: number;
  conSuscripcion: number;
};

export type PaginaOrganizacionesPrincipal = {
  datos: OrganizacionPrincipal[];
  pagina: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
  resumen: ResumenOrganizacionesPrincipal;
};

type OrganizacionRpc = {
  id: string;
  nombre: string;
  ruc: string;
  tipo: string;
  estado: string;
  zona_horaria: string;
  tenant_ref: string;
  empresa_sistema_ref: string;
  plan: string;
  estado_suscripcion: string | null;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  limite_usuarios: number;
  usuarios: number;
  cursos: number;
  modulos: number;
  clasificacion: OrganizacionPrincipal["clasificacion"];
  facturable: boolean;
  vigencia_indefinida: boolean;
};

type PaginaRpc = {
  datos?: OrganizacionRpc[];
  pagina?: number;
  porPagina?: number;
  total?: number;
  totalPaginas?: number;
  resumen?: Partial<ResumenOrganizacionesPrincipal>;
};

export const organizacionesPrincipalService = {
  async listar(entrada: {
    pagina: number;
    porPagina: number;
    buscar?: string;
    estado?: string;
    plan?: string;
  }): Promise<PaginaOrganizacionesPrincipal> {
    const { data, error } = await clientePrincipal().rpc(
      "admin_listar_organizaciones_paginado",
      {
        p_pagina: entrada.pagina,
        p_por_pagina: entrada.porPagina,
        p_buscar: entrada.buscar?.trim() || null,
        p_estado: entrada.estado && entrada.estado !== "TODOS" ? entrada.estado : null,
        p_plan: entrada.plan && entrada.plan !== "TODOS" ? entrada.plan : null,
      },
    );
    if (error) throw new Error(error.message);
    const respuesta = (data ?? {}) as PaginaRpc;
    return {
      datos: (respuesta.datos ?? []).map((item) => ({
        id: item.id,
        nombre: item.nombre,
        ruc: item.ruc,
        tipo: item.tipo,
        estado: item.estado,
        zonaHoraria: item.zona_horaria,
        tenantRef: item.tenant_ref,
        empresaSistemaRef: item.empresa_sistema_ref,
        plan: item.plan,
        estadoSuscripcion: item.estado_suscripcion,
        vigenteDesde: item.vigente_desde,
        vigenteHasta: item.vigente_hasta,
        limiteUsuarios: Number(item.limite_usuarios ?? 0),
        usuarios: Number(item.usuarios ?? 0),
        cursos: Number(item.cursos ?? 0),
        modulos: Number(item.modulos ?? 0),
        clasificacion: item.clasificacion,
        facturable: item.facturable,
        vigenciaIndefinida: item.vigencia_indefinida,
      })),
      pagina: respuesta.pagina ?? entrada.pagina,
      porPagina: respuesta.porPagina ?? entrada.porPagina,
      total: respuesta.total ?? 0,
      totalPaginas: respuesta.totalPaginas ?? 0,
      resumen: {
        total: respuesta.resumen?.total ?? 0,
        habilitadas: respuesta.resumen?.habilitadas ?? 0,
        pendientes: respuesta.resumen?.pendientes ?? 0,
        suspendidas: respuesta.resumen?.suspendidas ?? 0,
        conSuscripcion: respuesta.resumen?.conSuscripcion ?? 0,
      },
    };
  },
};
