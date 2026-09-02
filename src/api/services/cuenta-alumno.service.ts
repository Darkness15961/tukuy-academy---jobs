import { supabasePrincipal } from "@/lib/supabase";

import {
  leerPerfilLaboralPreferencias,
  type PerfilLaboralPreferencias,
} from "@/lib/datos-certificado-alumno";

export type NotificacionesCuenta = {
  courses: boolean;
  jobs: boolean;
  certificates: boolean;
  marketing: boolean;
};

export type PreferenciasCuenta = {
  notificaciones: NotificacionesCuenta;
  idioma: "es" | "en";
  perfilLaboral?: PerfilLaboralPreferencias;
};

export type CuentaAlumno = {
  correo: string;
  telefono: string;
  fechaNacimiento: string;
  nombre: string;
  proveedor: string;
  preferencias: PreferenciasCuenta;
};

const NOTIFICACIONES_DEFAULT: NotificacionesCuenta = {
  courses: true,
  jobs: true,
  certificates: true,
  marketing: false,
};

export function preferenciasPorDefecto(): PreferenciasCuenta {
  return {
    notificaciones: { ...NOTIFICACIONES_DEFAULT },
    idioma: "es",
  };
}

function mapearPreferencias(raw: unknown): PreferenciasCuenta {
  const base = preferenciasPorDefecto();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  const noti = (obj.notificaciones ?? obj) as Record<string, unknown>;
  const perfilLaboral = leerPerfilLaboralPreferencias(obj);
  return {
    notificaciones: {
      courses: noti.courses !== false,
      jobs: noti.jobs !== false,
      certificates: noti.certificates !== false,
      marketing: noti.marketing === true,
    },
    idioma: obj.idioma === "en" ? "en" : "es",
    ...(Object.keys(perfilLaboral).length ? { perfilLaboral } : {}),
  };
}

function mapearCuenta(raw: Record<string, unknown>): CuentaAlumno {
  const fecha = raw.fechaNacimiento ?? raw.fecha_nacimiento;
  return {
    correo: String(raw.correo ?? "").trim(),
    telefono: String(raw.telefono ?? "").trim(),
    fechaNacimiento:
      typeof fecha === "string" && fecha.trim()
        ? fecha.slice(0, 10)
        : "",
    nombre: String(raw.nombre ?? "").trim(),
    proveedor: String(raw.proveedor ?? "email").trim().toLowerCase() || "email",
    preferencias: mapearPreferencias(raw.preferencias),
  };
}

export function partirNombreCompleto(completo: string): {
  nombreMostrar: string;
  nombres: string;
  apellidos: string;
} {
  const partes = completo.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const nombreMostrar = partes.join(" ");
  return {
    nombreMostrar,
    nombres: partes[0] ?? "",
    apellidos: partes.slice(1).join(" "),
  };
}

async function sincronizarMetadataNombre(nombre: string) {
  const partido = partirNombreCompleto(nombre);
  if (!partido.nombreMostrar) return;
  await supabasePrincipal().auth.updateUser({
    data: {
      full_name: partido.nombreMostrar,
      name: partido.nombreMostrar,
      nombres: partido.nombres,
      apellidos: partido.apellidos,
    },
  });
}

async function rpcJson(nombre: string, args: Record<string, unknown> = {}) {
  const { data, error } = await supabasePrincipal().rpc(
    nombre as never,
    args as never,
  );
  if (error) {
    throw new Error(
      error.message.includes("Could not find the function") ||
        error.message.includes("PGRST202")
        ? "Falta aplicar 20260818140000_identidad_cuenta_nombre.sql en PRINCIPAL."
        : error.message,
    );
  }
  return (data ?? {}) as Record<string, unknown>;
}

export const cuentaAlumnoService = {
  async obtener(): Promise<CuentaAlumno> {
    const data = await rpcJson("identidad_cuenta_mia");
    return mapearCuenta(data);
  },

  async guardar(entrada: {
    telefono?: string;
    fechaNacimiento?: string | null;
    preferencias?: PreferenciasCuenta;
    nombre?: string;
  }): Promise<CuentaAlumno> {
    const args: Record<string, unknown> = {
      p_telefono: entrada.telefono ?? null,
      p_fecha_nacimiento:
        entrada.fechaNacimiento === undefined
          ? null
          : entrada.fechaNacimiento || "",
      p_preferencias: entrada.preferencias ?? null,
    };
    if (entrada.nombre !== undefined) {
      args.p_nombre = entrada.nombre.trim();
    }
    const data = await rpcJson("identidad_cuenta_guardar", args);
    const cuenta = mapearCuenta(data);
    if (entrada.nombre !== undefined && cuenta.nombre) {
      try {
        await sincronizarMetadataNombre(cuenta.nombre);
      } catch {
        /* El nombre ya está en identidad; el metadata de Auth se alinea al reingresar. */
      }
    }
    return cuenta;
  },
};
