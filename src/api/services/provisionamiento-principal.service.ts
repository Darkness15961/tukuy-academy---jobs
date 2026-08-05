import { supabasePrincipal } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
const cliente=()=>supabasePrincipal() as SupabaseClient<any>;
export type ConexionOrganizacion={configurada:boolean;id?:string;proveedor?:string;servidorRef?:string;puerto?:number;nombreBaseLogico?:string;secretoRef?:string;region?:string|null;versionEsquema?:number;estado?:string;verificadaEn?:string|null;ultimaMigracionEn?:string|null;ultimoError?:string|null};
export const provisionamientoPrincipalService={
 async obtener(instalacionId:string){const{data,error}=await cliente().rpc("admin_obtener_conexion_organizacion",{p_instalacion_id:instalacionId});if(error)throw new Error(error.message);return data as ConexionOrganizacion;},
 async configurar(datos:{instalacionId:string;servidorRef:string;nombreBaseLogico:string;secretoRef:string;region:string;versionEsquema:number}){const{data,error}=await cliente().rpc("admin_configurar_conexion_supabase",{p_datos:datos});if(error)throw new Error(error.message);return data as string;},
 async verificar(){const{data,error}=await cliente().functions.invoke("secondary-gateway",{body:{action:"health"}});if(error)throw new Error(error.message);if(!data?.ok)throw new Error(data?.error??"La secundaria no respondió correctamente.");return data.secundaria as {ok:boolean;instalacionId:string;tenantId:string;organizacion:string;versionEsquema:number;estado:string;tablasPublicas:number;accesosSincronizados:number;generadoEn:string};}
};
