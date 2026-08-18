import { toRaw } from "vue";

import { apiConfig } from "@/api/config";
import {
  crearPlantillaCertificadoBase,
  normalizarLayoutPlantilla,
  type ConfigCertificadosOrganizacion,
  type FondoCertificadoOrganizacion,
  type PlantillaCertificado,
} from "@/lib/plantilla-certificado";
import { supabasePrincipal } from "@/lib/supabase";

const PREFIJO_LOCAL = "tukuy_plantillas_certificado_v1:";
const PREFIJO_FONDOS = "tukuy_fondos_certificado_v1:";

/** Clona sin Proxy reactivo (structuredClone falla con refs de Vue). */
export function clonarPlantilla<T>(valor: T): T {
  return JSON.parse(JSON.stringify(toRaw(valor as object))) as T;
}

function claveLocal(instalacionId: string) {
  return `${PREFIJO_LOCAL}${instalacionId}`;
}

function claveFondos(instalacionId: string) {
  return `${PREFIJO_FONDOS}${instalacionId}`;
}

function leerLocal(instalacionId: string): ConfigCertificadosOrganizacion | null {
  try {
    const raw = localStorage.getItem(claveLocal(instalacionId));
    if (!raw) return null;
    return JSON.parse(raw) as ConfigCertificadosOrganizacion;
  } catch {
    return null;
  }
}

function guardarLocal(config: ConfigCertificadosOrganizacion) {
  localStorage.setItem(claveLocal(config.instalacionId), JSON.stringify(config));
}

function leerFondosLocal(instalacionId: string): FondoCertificadoOrganizacion[] {
  try {
    const raw = localStorage.getItem(claveFondos(instalacionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FondoCertificadoOrganizacion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function guardarFondosLocal(
  instalacionId: string,
  fondos: FondoCertificadoOrganizacion[],
) {
  localStorage.setItem(claveFondos(instalacionId), JSON.stringify(fondos));
}

function mapearPlantilla(raw: Record<string, unknown>): PlantillaCertificado {
  return {
    id: String(raw.id ?? ""),
    instalacionId: String(raw.instalacionId ?? ""),
    nombre: String(raw.nombre ?? "Plantilla"),
    esDefault: raw.esDefault === true,
    alcance:
      String(raw.alcance ?? "ORGANIZACION").toUpperCase() === "DOCENTE"
        ? "DOCENTE"
        : "ORGANIZACION",
    autorIdentidadRef: (raw.autorIdentidadRef as string | null) ?? null,
    fondoUrl: String(raw.fondoUrl ?? ""),
    fondoEspecificacion: String(raw.fondoEspecificacion ?? ""),
    usarLogoEntidad: raw.usarLogoEntidad !== false,
    logoOverrideUrl: (raw.logoOverrideUrl as string | null) ?? null,
    layout: normalizarLayoutPlantilla(
      raw.layout as PlantillaCertificado["layout"],
    ),
    creadoEn: String(raw.creadoEn ?? new Date().toISOString()),
    actualizadoEn: String(raw.actualizadoEn ?? new Date().toISOString()),
  };
}

function mapearFondo(raw: Record<string, unknown>): FondoCertificadoOrganizacion {
  return {
    id: String(raw.id ?? crypto.randomUUID()),
    instalacionId: String(raw.instalacionId ?? ""),
    nombre: String(raw.nombre ?? "Fondo"),
    fondoUrl: String(raw.fondoUrl ?? ""),
    creadoEn: String(raw.creadoEn ?? new Date().toISOString()),
    creadoPor: raw.creadoPor ? String(raw.creadoPor) : null,
  };
}

function mapearConfig(data: Record<string, unknown>): ConfigCertificadosOrganizacion {
  const plantillas = Array.isArray(data.plantillas)
    ? (data.plantillas as Record<string, unknown>[]).map(mapearPlantilla)
    : [];
  return {
    instalacionId: String(data.instalacionId ?? ""),
    docentesPuedenConfigurar: data.docentesPuedenConfigurar === true,
    plantillas,
    actualizadoEn: String(data.actualizadoEn ?? new Date().toISOString()),
  };
}

function asegurarDefaultLocal(
  config: ConfigCertificadosOrganizacion,
): ConfigCertificadosOrganizacion {
  if (!config.plantillas.length) {
    const base = crearPlantillaCertificadoBase({
      instalacionId: config.instalacionId,
      nombre: "Plantilla institucional",
      alcance: "ORGANIZACION",
      esDefault: true,
    });
    return {
      ...config,
      plantillas: [base],
      actualizadoEn: new Date().toISOString(),
    };
  }
  if (!config.plantillas.some((p) => p.esDefault)) {
    return {
      ...config,
      plantillas: config.plantillas.map((p, i) => ({
        ...p,
        esDefault: i === 0,
      })),
    };
  }
  return config;
}

function usarBackendPrincipal(): boolean {
  return apiConfig.sinDatosDemo || !apiConfig.useMock;
}

async function rpcJson(
  nombre: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabasePrincipal().rpc(
    nombre as never,
    args as never,
  );
  if (error) {
    throw new Error(
      error.message.includes("Could not find the function") ||
        error.message.includes("PGRST202")
        ? `Falta aplicar la migración en PRINCIPAL (${nombre}). Revisa supabase/migrations/20260814100000_org_plantillas_certificado.sql y 20260814110000_org_fondos_certificado.sql`
        : error.message,
    );
  }
  return (data ?? {}) as Record<string, unknown>;
}

export const plantillasCertificadoService = {
  async obtenerConfig(
    instalacionId: string,
  ): Promise<ConfigCertificadosOrganizacion> {
    if (!instalacionId) throw new Error("instalacionId requerido");

    if (usarBackendPrincipal()) {
      try {
        const data = await rpcJson("org_obtener_config_certificados", {
          p_instalacion_id: instalacionId,
        });
        const config = mapearConfig(data);
        guardarLocal(config);
        return config;
      } catch (err) {
        console.warn("[plantillas-certificado] RPC lectura falló:", err);
        const local = leerLocal(instalacionId);
        if (local) return asegurarDefaultLocal(local);
        throw err;
      }
    }

    const local = leerLocal(instalacionId);
    if (local) return asegurarDefaultLocal(local);
    const inicial = asegurarDefaultLocal({
      instalacionId,
      docentesPuedenConfigurar: false,
      plantillas: [],
      actualizadoEn: new Date().toISOString(),
    });
    guardarLocal(inicial);
    return inicial;
  },

  async listarFondos(
    instalacionId: string,
  ): Promise<FondoCertificadoOrganizacion[]> {
    if (!instalacionId) return [];
    if (usarBackendPrincipal()) {
      try {
        const data = await rpcJson("org_listar_fondos_certificado", {
          p_instalacion_id: instalacionId,
        });
        const fondos = Array.isArray(data.fondos)
          ? (data.fondos as Record<string, unknown>[]).map(mapearFondo)
          : [];
        guardarFondosLocal(instalacionId, fondos);
        return fondos;
      } catch (err) {
        console.warn("[fondos-certificado] listar falló:", err);
        return leerFondosLocal(instalacionId);
      }
    }
    return leerFondosLocal(instalacionId);
  },

  async registrarFondo(
    instalacionId: string,
    fondoUrl: string,
    nombre?: string,
  ): Promise<FondoCertificadoOrganizacion[]> {
    const url = fondoUrl.trim();
    if (!instalacionId || !url) return this.listarFondos(instalacionId);

    if (usarBackendPrincipal() && !url.startsWith("data:")) {
      try {
        const data = await rpcJson("org_registrar_fondo_certificado", {
          p_instalacion_id: instalacionId,
          p_fondo_url: url,
          p_nombre: nombre ?? null,
        });
        const fondos = Array.isArray(data.fondos)
          ? (data.fondos as Record<string, unknown>[]).map(mapearFondo)
          : [];
        guardarFondosLocal(instalacionId, fondos);
        return fondos;
      } catch (err) {
        console.warn("[fondos-certificado] registrar → local", err);
      }
    }

    const actual = leerFondosLocal(instalacionId);
    const existente = actual.find((f) => f.fondoUrl === url);
    if (existente) {
      existente.nombre = nombre?.trim() || existente.nombre;
      guardarFondosLocal(instalacionId, actual);
      return actual;
    }
    const nuevo: FondoCertificadoOrganizacion = {
      id: crypto.randomUUID(),
      instalacionId,
      nombre: nombre?.trim() || `Fondo ${new Date().toLocaleString("es-PE")}`,
      fondoUrl: url,
      creadoEn: new Date().toISOString(),
      creadoPor: null,
    };
    const next = [nuevo, ...actual];
    guardarFondosLocal(instalacionId, next);
    return next;
  },

  async eliminarFondo(
    instalacionId: string,
    fondoId: string,
  ): Promise<FondoCertificadoOrganizacion[]> {
    if (!instalacionId || !fondoId) return this.listarFondos(instalacionId);

    if (usarBackendPrincipal()) {
      try {
        const data = await rpcJson("org_eliminar_fondo_certificado", {
          p_instalacion_id: instalacionId,
          p_fondo_id: fondoId,
        });
        const fondos = Array.isArray(data.fondos)
          ? (data.fondos as Record<string, unknown>[]).map(mapearFondo)
          : [];
        guardarFondosLocal(instalacionId, fondos);
        return fondos;
      } catch (err) {
        console.warn("[fondos-certificado] eliminar → local", err);
      }
    }

    const next = leerFondosLocal(instalacionId).filter((f) => f.id !== fondoId);
    guardarFondosLocal(instalacionId, next);
    return next;
  },

  async guardarConfig(
    config: ConfigCertificadosOrganizacion,
  ): Promise<ConfigCertificadosOrganizacion> {
    return this.setDocentesPuedenConfigurar(
      config.instalacionId,
      config.docentesPuedenConfigurar,
    );
  },

  async setDocentesPuedenConfigurar(
    instalacionId: string,
    permitir: boolean,
  ): Promise<ConfigCertificadosOrganizacion> {
    if (!usarBackendPrincipal()) {
      const actual = await this.obtenerConfig(instalacionId);
      const next = {
        ...actual,
        docentesPuedenConfigurar: permitir,
        actualizadoEn: new Date().toISOString(),
      };
      guardarLocal(next);
      return next;
    }
    const data = await rpcJson("org_set_docentes_config_certificados", {
      p_instalacion_id: instalacionId,
      p_permitir: permitir,
    });
    const config = mapearConfig(data);
    guardarLocal(config);
    return config;
  },

  async obtenerDefault(
    instalacionId: string,
  ): Promise<PlantillaCertificado | null> {
    if (!instalacionId) return null;
    if (usarBackendPrincipal()) {
      try {
        const data = await rpcJson("org_obtener_plantilla_certificado_default", {
          p_instalacion_id: instalacionId,
        });
        const raw = data.plantilla as Record<string, unknown> | null;
        return raw ? mapearPlantilla(raw) : null;
      } catch (err) {
        console.warn("[plantillas-certificado] default no disponible:", err);
        const local = leerLocal(instalacionId);
        return (
          local?.plantillas.find((p) => p.esDefault) ??
          local?.plantillas[0] ??
          null
        );
      }
    }
    const config = await this.obtenerConfig(instalacionId);
    return (
      config.plantillas.find((p) => p.esDefault) ??
      config.plantillas[0] ??
      null
    );
  },

  async marcarDefault(
    instalacionId: string,
    plantillaId: string,
  ): Promise<ConfigCertificadosOrganizacion> {
    if (!usarBackendPrincipal()) {
      const config = await this.obtenerConfig(instalacionId);
      config.plantillas = config.plantillas.map((p) => ({
        ...p,
        esDefault: p.id === plantillaId,
      }));
      guardarLocal(config);
      return config;
    }
    const data = await rpcJson("org_marcar_plantilla_certificado_default", {
      p_instalacion_id: instalacionId,
      p_plantilla_id: plantillaId,
    });
    const config = mapearConfig(data);
    guardarLocal(config);
    return config;
  },

  async upsertPlantilla(
    instalacionId: string,
    plantilla: PlantillaCertificado,
  ): Promise<ConfigCertificadosOrganizacion> {
    const payload = clonarPlantilla(plantilla);
    // Siempre normaliza layout (modelosFirmantes 1/2/3) antes de persistir.
    payload.layout = normalizarLayoutPlantilla(payload.layout);
    payload.actualizadoEn = new Date().toISOString();

    if (!usarBackendPrincipal()) {
      const config = await this.obtenerConfig(instalacionId);
      const idx = config.plantillas.findIndex((p) => p.id === payload.id);
      if (idx >= 0) config.plantillas[idx] = payload;
      else config.plantillas.push(payload);
      if (payload.esDefault) {
        config.plantillas = config.plantillas.map((p) => ({
          ...p,
          esDefault: p.id === payload.id,
        }));
      }
      config.actualizadoEn = new Date().toISOString();
      guardarLocal(config);
      return config;
    }

    // PRINCIPAL: RPC guarda el JSONB layout completo (sin filtrar campos).
    const data = await rpcJson("org_upsert_plantilla_certificado", {
      p_instalacion_id: instalacionId,
      p_plantilla: {
        id: payload.id,
        nombre: payload.nombre,
        esDefault: payload.esDefault,
        alcance: payload.alcance,
        autorIdentidadRef: payload.autorIdentidadRef ?? null,
        fondoUrl: payload.fondoUrl,
        fondoEspecificacion: payload.fondoEspecificacion,
        usarLogoEntidad: payload.usarLogoEntidad,
        logoOverrideUrl: payload.logoOverrideUrl ?? null,
        layout: payload.layout,
      },
    });
    const config = mapearConfig(
      (data.config as Record<string, unknown>) ?? data,
    );
    guardarLocal(config);
    return config;
  },

  async eliminarPlantilla(
    instalacionId: string,
    plantillaId: string,
  ): Promise<ConfigCertificadosOrganizacion> {
    if (!usarBackendPrincipal()) {
      const config = await this.obtenerConfig(instalacionId);
      config.plantillas = config.plantillas.filter((p) => p.id !== plantillaId);
      const next = asegurarDefaultLocal(config);
      guardarLocal(next);
      return next;
    }
    const data = await rpcJson("org_eliminar_plantilla_certificado", {
      p_instalacion_id: instalacionId,
      p_plantilla_id: plantillaId,
    });
    const config = mapearConfig(data);
    guardarLocal(config);
    return config;
  },
};
