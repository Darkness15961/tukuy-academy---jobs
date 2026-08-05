import { supabasePrincipal } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const cliente = () => supabasePrincipal() as SupabaseClient<any>;

export type PlanPrincipal = {
  id: string; codigo: string; nombre: string; descripcion: string | null;
  moneda: string; precio: number; periodicidad: string; estado: string;
  organizaciones: number; limites: Record<string, { limite: number; unidad: string }>;
};

export type LicenciaPrincipal = {
  id: string; nombre: string; clasificacion: string; facturable: boolean;
  vigenciaIndefinida: boolean; estadoInstalacion: string; suscripcionId: string | null;
  plan: string; estado: string | null; vigenteDesde: string | null;
  vigenteHasta: string | null; renovacionAutomatica: boolean | null;
  limiteUsuarios: number; usuarios: number;
};

export const planesLicenciasPrincipalService = {
  async listar(entrada: { pagina: number; porPagina: number; buscar?: string; estado?: string }) {
    const { data, error } = await cliente().rpc("admin_listar_planes_licencias", {
      p_pagina: entrada.pagina, p_por_pagina: entrada.porPagina,
      p_buscar: entrada.buscar?.trim() || null,
      p_estado: entrada.estado && entrada.estado !== "TODOS" ? entrada.estado : null,
    });
    if (error) throw new Error(error.message);
    const respuesta = (data ?? {}) as any;
    return {
      planes: (respuesta.planes ?? []).map((p: any): PlanPrincipal => ({
        id: p.id, codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion,
        moneda: p.moneda, precio: Number(p.precio_centavos ?? 0) / 100,
        periodicidad: p.periodicidad, estado: p.estado,
        organizaciones: Number(p.organizaciones ?? 0), limites: p.limites ?? {},
      })),
      licencias: (respuesta.licencias ?? []).map((l: any): LicenciaPrincipal => ({
        id: l.id, nombre: l.nombre, clasificacion: l.clasificacion,
        facturable: l.facturable, vigenciaIndefinida: l.vigencia_indefinida,
        estadoInstalacion: l.estado_instalacion, suscripcionId: l.suscripcion_id,
        plan: l.plan, estado: l.estado, vigenteDesde: l.vigente_desde,
        vigenteHasta: l.vigente_hasta, renovacionAutomatica: l.renovacion_automatica,
        limiteUsuarios: Number(l.limite_usuarios ?? 0), usuarios: Number(l.usuarios ?? 0),
      })),
      pagina: Number(respuesta.pagina ?? entrada.pagina), total: Number(respuesta.total ?? 0),
    };
  },
  async guardarPlan(entrada: {
    id?: string; codigo: string; nombre: string; descripcion: string;
    moneda: string; precio: number; periodicidad: string; estado: string;
    limites: Array<{ codigo: string; limite: number; unidad: string }>;
  }) {
    const { data, error } = await cliente().rpc("admin_guardar_plan", {
      p_datos: {
        ...entrada,
        precioCentavos: Math.round(entrada.precio * 100),
      },
    });
    if (error) throw new Error(error.message);
    return data as string;
  },
  async guardarSuscripcion(entrada: { instalacionId: string; suscripcionId?: string; planId: string; estado: string; vigenteDesde: string; vigenteHasta: string; renovacionAutomatica: boolean }) {
    const { data, error } = await cliente().rpc("admin_guardar_suscripcion", { p_datos: entrada });
    if (error) throw new Error(error.message);
    return data as string;
  },
};
