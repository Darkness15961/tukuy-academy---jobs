import { supabasePrincipal } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
const cliente = () => supabasePrincipal() as SupabaseClient<any>;
export type ModuloPrincipal = { id: string; codigo: string; nombre: string; descripcion: string | null; portal: string; habilitado: boolean; configuracion: Record<string, unknown> };
export const modulosPrincipalService = {
  async listar(instalacionId: string): Promise<ModuloPrincipal[]> {
    const { data, error } = await cliente().rpc("admin_listar_modulos_organizacion", { p_instalacion_id: instalacionId });
    if (error) throw new Error(error.message);
    return (data ?? []) as ModuloPrincipal[];
  },
  async guardar(instalacionId: string, modulo: ModuloPrincipal) {
    const { error } = await cliente().rpc("admin_guardar_modulo_organizacion", { p_instalacion_id: instalacionId, p_modulo_id: modulo.id, p_habilitado: modulo.habilitado, p_configuracion: modulo.configuracion });
    if (error) throw new Error(error.message);
  },
};
