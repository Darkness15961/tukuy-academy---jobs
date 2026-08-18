import { supabasePrincipal } from "@/lib/supabase";
import { urlFotoPerfilReal } from "@/lib/foto-perfil";
import type { InstructorCursoPublico } from "@/types/academia";

export type PerfilPublicoDocente = {
  nombre: string;
  cargo: string;
  especialidad: string;
  biografia: string;
  experiencia: string[];
  fotoUrl?: string;
};

function mapearPerfil(raw: Record<string, unknown> | null): PerfilPublicoDocente {
  const experiencia = Array.isArray(raw?.experiencia)
    ? raw.experiencia.map(String).map((item) => item.trim()).filter(Boolean)
    : [];
  return {
    nombre: String(raw?.nombre ?? "").trim() || "Docente",
    cargo: String(raw?.cargo ?? "").trim(),
    especialidad: String(raw?.especialidad ?? "").trim(),
    biografia: String(raw?.biografia ?? "").trim(),
    experiencia,
    fotoUrl: urlFotoPerfilReal(String(raw?.fotoUrl ?? "")),
  };
}

export function instructorDesdePerfil(
  perfil: PerfilPublicoDocente,
): InstructorCursoPublico {
  return {
    nombre: perfil.nombre,
    cargo: perfil.cargo || perfil.especialidad,
    foto: perfil.fotoUrl,
    biografia: perfil.biografia,
    experiencia: perfil.experiencia,
  };
}

async function rpcJson(
  nombre: string,
  args: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const { data, error } = await supabasePrincipal().rpc(
    nombre as never,
    args as never,
  );
  if (error) {
    throw new Error(
      error.message.includes("Could not find the function") ||
        error.message.includes("PGRST202")
        ? "Falta aplicar 20260817230000_perfil_publico_docente.sql en PRINCIPAL."
        : error.message,
    );
  }
  return (data ?? {}) as Record<string, unknown>;
}

export const perfilDocenteService = {
  async obtenerPublico(authUsuarioRef: string): Promise<PerfilPublicoDocente> {
    if (!authUsuarioRef.trim()) {
      return mapearPerfil({ nombre: "Docente" });
    }
    const data = await rpcJson("perfil_docente_publico", {
      p_auth_usuario_ref: authUsuarioRef,
    });
    return mapearPerfil(data);
  },

  async obtenerMio(): Promise<PerfilPublicoDocente> {
    const data = await rpcJson("perfil_docente_mio");
    return mapearPerfil(data);
  },

  async guardar(entrada: {
    nombre?: string;
    cargo?: string;
    especialidad?: string;
    biografia?: string;
    experiencia?: string[];
    fotoUrl?: string | null;
  }): Promise<PerfilPublicoDocente> {
    const data = await rpcJson("perfil_docente_guardar", {
      p_nombre: entrada.nombre ?? null,
      p_cargo: entrada.cargo ?? null,
      p_especialidad: entrada.especialidad ?? null,
      p_biografia: entrada.biografia ?? null,
      p_experiencia: entrada.experiencia ?? [],
      p_foto_url: entrada.fotoUrl ?? null,
    });
    return mapearPerfil(data);
  },
};
