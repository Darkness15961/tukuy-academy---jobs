import { env } from "@/lib/env";
import { supabasePrincipal } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  LicenciaOrganizacion,
  UsuarioOrganizacion,
} from "@/api/services/organizacion.service";

const cliente = () => supabasePrincipal() as SupabaseClient<any>;

export type PerfilOrgPrincipal = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  portal: string;
  nivel: string;
  permisos: string[];
};

export type MiembroOrgPrincipal = {
  identidadId: string;
  membresiaId: string;
  funcionId: string | null;
  nombre: string;
  correo: string;
  avatarUrl: string | null;
  estadoIdentidad: string;
  estadoMembresia: string;
  roles: Array<{
    funcionId: string;
    codigo: string;
    nombre: string;
    portal: string;
    estado: string;
  }>;
};

type MiembroRpc = {
  identidadId: string;
  membresiaId: string;
  funcionId: string | null;
  nombre: string;
  correo: string;
  avatarUrl: string | null;
  estadoIdentidad: string;
  estadoMembresia: string;
  roles: MiembroOrgPrincipal["roles"] | null;
};

function inicialesDe(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const a = partes[0]?.[0] ?? "U";
  const b = partes[1]?.[0] ?? partes[0]?.[1] ?? "T";
  return `${a}${b}`.toUpperCase();
}

function estadoUsuario(
  miembro: MiembroRpc,
): UsuarioOrganizacion["estado"] {
  if (miembro.estadoMembresia === "PENDIENTE") return "INVITADO";
  if (miembro.estadoMembresia === "SUSPENDIDA") return "SUSPENDIDO";
  const roles = miembro.roles ?? [];
  if (roles.some((r) => r.estado === "SUSPENDIDA") && !roles.some((r) => r.estado === "ACTIVA")) {
    return "SUSPENDIDO";
  }
  return "ACTIVO";
}

export function mapMiembroAUsuarioOrganizacion(
  miembro: MiembroRpc,
): UsuarioOrganizacion {
  const roles = miembro.roles ?? [];
  const rolPrincipal =
    roles.find((r) => r.estado === "ACTIVA") ?? roles[0];
  return {
    id: miembro.identidadId,
    nombre: miembro.nombre,
    iniciales: inicialesDe(miembro.nombre),
    correo: miembro.correo,
    area: rolPrincipal?.nombre ?? "Sin perfil",
    sede: "—",
    rol: roles.map((r) => r.nombre).join(", ") || "Sin perfil",
    progreso: 0,
    estado: estadoUsuario(miembro),
    especialidad: rolPrincipal?.codigo,
    origenIngreso: "INVITACION_ADMIN",
  };
}

export const organizacionPrincipalService = {
  activo() {
    return env.authProvider === "supabase";
  },

  async catalogoPerfiles(instalacionId: string): Promise<PerfilOrgPrincipal[]> {
    const { data, error } = await cliente().rpc("org_catalogo_perfiles", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<Record<string, unknown>>).map((item) => ({
      id: String(item.id),
      codigo: String(item.codigo),
      nombre: String(item.nombre),
      descripcion: (item.descripcion as string | null) ?? null,
      portal: String(item.portal),
      nivel: String(item.nivel),
      permisos: Array.isArray(item.permisos)
        ? (item.permisos as string[])
        : [],
    }));
  },

  async listarMiembros(instalacionId: string): Promise<UsuarioOrganizacion[]> {
    const { data, error } = await cliente().rpc("org_listar_miembros", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as MiembroRpc[]).map(mapMiembroAUsuarioOrganizacion);
  },

  async asignarAcceso(
    instalacionId: string,
    correo: string,
    perfilCodigo: string,
  ): Promise<string> {
    const { data, error } = await cliente().rpc("org_asignar_acceso", {
      p_instalacion_id: instalacionId,
      p_correo: correo,
      p_perfil_codigo: perfilCodigo,
    });
    if (error) throw new Error(error.message);
    return String(data);
  },

  async cambiarEstadoAcceso(
    instalacionId: string,
    funcionId: string,
    estado: "ACTIVA" | "SUSPENDIDA" | "REVOCADA",
  ): Promise<void> {
    const { error } = await cliente().rpc("org_cambiar_estado_acceso", {
      p_instalacion_id: instalacionId,
      p_funcion_id: funcionId,
      p_estado: estado,
    });
    if (error) throw new Error(error.message);
  },

  async obtenerLicencia(instalacionId: string): Promise<LicenciaOrganizacion> {
    const { data, error } = await cliente().rpc("org_obtener_licencia", {
      p_instalacion_id: instalacionId,
    });
    if (error) throw new Error(error.message);
    const raw = (data ?? {}) as Record<string, unknown>;
    const consumos = Array.isArray(raw.consumos)
      ? (raw.consumos as Array<Record<string, unknown>>)
      : [];
    const estadoRaw = String(raw.estado ?? "ACTIVA");
    const estado =
      estadoRaw === "POR_VENCER" || estadoRaw === "VENCIDA"
        ? estadoRaw
        : "ACTIVA";

    return {
      plan: String(raw.plan ?? "Sin plan"),
      descripcion: String(raw.descripcion ?? ""),
      inicio: String(raw.inicio ?? ""),
      fin: String(raw.fin ?? ""),
      estado,
      consumos: consumos.map((item) => ({
        id: String(item.id),
        etiqueta: String(item.etiqueta),
        utilizado: Number(item.utilizado ?? 0),
        limite: Number(item.limite ?? 0),
        unidad: String(item.unidad ?? ""),
      })),
    };
  },
};
