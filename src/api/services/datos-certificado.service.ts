import {
  cuentaAlumnoService,
  type PreferenciasCuenta,
} from "@/api/services/cuenta-alumno.service";
import { usuarioService } from "@/api/services/usuario.service";
import {
  datosCertificadoEstanCompletos,
  leerPerfilLaboralPreferencias,
  type DatosCertificadoAlumno,
  type PerfilLaboralPreferencias,
} from "@/lib/datos-certificado-alumno";
import { env } from "@/lib/env";

const CLAVE_LOCAL = "tukuy_datos_certificado_v1";

function leerLocal(): DatosCertificadoAlumno | null {
  try {
    const raw = localStorage.getItem(CLAVE_LOCAL);
    if (!raw) return null;
    return JSON.parse(raw) as DatosCertificadoAlumno;
  } catch {
    localStorage.removeItem(CLAVE_LOCAL);
    return null;
  }
}

function guardarLocal(datos: DatosCertificadoAlumno) {
  localStorage.setItem(CLAVE_LOCAL, JSON.stringify(datos));
}

function fusionarPreferenciasPerfilLaboral(
  preferencias: PreferenciasCuenta,
  perfil: PerfilLaboralPreferencias,
): PreferenciasCuenta {
  return {
    ...preferencias,
    perfilLaboral: {
      ...preferencias.perfilLaboral,
      ...perfil,
    },
  };
}

export const datosCertificadoService = {
  async obtener(): Promise<DatosCertificadoAlumno> {
    if (env.authProvider !== "supabase") {
      const local = leerLocal();
      const perfil = await usuarioService.getProfile();
      return {
        nombreCompleto: local?.nombreCompleto || perfil.name || "",
        profesion: local?.profesion || perfil.trade || "",
        especialidad: local?.especialidad || perfil.specialty || "",
        telefono: local?.telefono || perfil.phone || "",
        ubicacion: local?.ubicacion || perfil.location || "",
        fechaNacimiento: local?.fechaNacimiento || perfil.birthDate || "",
        dni: local?.dni || "",
        completadoEn: local?.completadoEn ?? null,
      };
    }

    const [cuenta, perfil] = await Promise.all([
      cuentaAlumnoService.obtener(),
      usuarioService.getProfile(),
    ]);
    const laboral = leerPerfilLaboralPreferencias(cuenta.preferencias);

    return {
      nombreCompleto: cuenta.nombre || perfil.name || "",
      profesion: laboral.trade || perfil.trade || "",
      especialidad: laboral.specialty || perfil.specialty || "",
      telefono: cuenta.telefono || perfil.phone || "",
      ubicacion: laboral.location || perfil.location || "",
      fechaNacimiento: cuenta.fechaNacimiento || perfil.birthDate || "",
      dni: laboral.dni || "",
      completadoEn: laboral.datosCertificadoCompletadoEn ?? null,
    };
  },

  async requiereCompletar(): Promise<boolean> {
    const datos = await this.obtener();
    if (datos.completadoEn && datosCertificadoEstanCompletos(datos)) {
      return false;
    }
    return !datosCertificadoEstanCompletos(datos);
  },

  async guardar(entrada: {
    nombreCompleto: string;
    profesion: string;
    especialidad?: string;
    telefono?: string;
    ubicacion?: string;
    fechaNacimiento: string;
    dni: string;
  }): Promise<DatosCertificadoAlumno> {
    const nombreCompleto = entrada.nombreCompleto.trim().replace(/\s+/g, " ");
    const profesion = entrada.profesion.trim();
    const especialidad = entrada.especialidad?.trim() ?? "";
    const telefono = entrada.telefono?.trim() ?? "";
    const ubicacion = entrada.ubicacion?.trim() ?? "";
    const fechaNacimiento = entrada.fechaNacimiento.trim();
    const dni = entrada.dni.replace(/\D/g, "").trim();

    if (
      !datosCertificadoEstanCompletos({
        nombreCompleto,
        profesion,
        fechaNacimiento,
        dni,
      })
    ) {
      throw new Error(
        "Completa nombre completo, profesión, fecha de nacimiento y DNI (8 dígitos).",
      );
    }

    const completadoEn = new Date().toISOString();
    const resultado: DatosCertificadoAlumno = {
      nombreCompleto,
      profesion,
      especialidad,
      telefono,
      ubicacion,
      fechaNacimiento,
      dni,
      completadoEn,
    };

    if (env.authProvider !== "supabase") {
      guardarLocal(resultado);
      await usuarioService.updateProfile({
        name: nombreCompleto,
        trade: profesion,
        specialty: especialidad,
        phone: telefono,
        location: ubicacion,
        birthDate: fechaNacimiento,
      });
      return resultado;
    }

    const cuenta = await cuentaAlumnoService.obtener();
    const preferencias = fusionarPreferenciasPerfilLaboral(cuenta.preferencias, {
      trade: profesion,
      specialty: especialidad || undefined,
      location: ubicacion || undefined,
      dni,
      datosCertificadoCompletadoEn: completadoEn,
    });

    await cuentaAlumnoService.guardar({
      nombre: nombreCompleto,
      telefono: telefono || undefined,
      fechaNacimiento,
      preferencias,
    });

    await usuarioService.updateProfile({
      name: nombreCompleto,
      trade: profesion,
      specialty: especialidad,
      phone: telefono,
      location: ubicacion,
      birthDate: fechaNacimiento,
    });

    return resultado;
  },
};
