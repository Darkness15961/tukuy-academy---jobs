import { supabasePrincipal } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
const cliente = () => supabasePrincipal() as SupabaseClient<any>;

export type ConfiguracionPrincipal = { nombre: string; correoSoporte: string; moneda: string; zonaHoraria: string; revisionObligatoria: boolean; suspenderAlVencer: boolean; avisosVencimiento: boolean; avisosCursos: boolean; dobleFactor: boolean };
export type AuditoriaPrincipal = { id: number; fecha: string; usuario: string; accion: string; modulo: string; origen: string; nivel: string };

export const configuracionAuditoriaPrincipalService = {
  async obtenerConfiguracion(): Promise<ConfiguracionPrincipal> {
    const { data, error } = await cliente().rpc("admin_obtener_configuracion");
    if (error) throw new Error(error.message);
    return data as ConfiguracionPrincipal;
  },
  async guardarConfiguracion(datos: ConfiguracionPrincipal): Promise<ConfiguracionPrincipal> {
    const { data, error } = await cliente().rpc("admin_guardar_configuracion", { p_datos: datos });
    if (error) throw new Error(error.message);
    return data as ConfiguracionPrincipal;
  },
  async listarAuditoria(entrada: { pagina: number; porPagina: number; buscar?: string; nivel?: string }) {
    const { data, error } = await cliente().rpc("admin_listar_auditoria", { p_pagina: entrada.pagina, p_por_pagina: entrada.porPagina, p_buscar: entrada.buscar?.trim() || null, p_nivel: entrada.nivel && entrada.nivel !== "TODOS" ? entrada.nivel : null });
    if (error) throw new Error(error.message);
    const r = (data ?? {}) as any;
    return { datos: (r.datos ?? []).map((x: any): AuditoriaPrincipal => ({ id: x.id, fecha: x.creada_en, usuario: x.usuario, accion: x.accion, modulo: x.modulo, origen: x.origen, nivel: x.nivel })), total: Number(r.total ?? 0) };
  },
};
