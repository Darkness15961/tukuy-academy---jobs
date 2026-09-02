import { partirNombreCompleto } from "@/api/services/cuenta-alumno.service";

export type DatosCertificadoAlumno = {
  nombreCompleto: string;
  profesion: string;
  especialidad: string;
  telefono: string;
  ubicacion: string;
  fechaNacimiento: string;
  dni: string;
  completadoEn?: string | null;
};

export type PerfilLaboralPreferencias = {
  trade?: string;
  specialty?: string;
  location?: string;
  dni?: string;
  datosCertificadoCompletadoEn?: string | null;
};

export function leerPerfilLaboralPreferencias(
  preferencias: unknown,
): PerfilLaboralPreferencias {
  if (!preferencias || typeof preferencias !== "object") return {};
  const raiz = preferencias as Record<string, unknown>;
  const perfil = raiz.perfilLaboral;
  if (!perfil || typeof perfil !== "object") return {};
  const obj = perfil as Record<string, unknown>;
  return {
    trade: String(obj.trade ?? "").trim() || undefined,
    specialty: String(obj.specialty ?? "").trim() || undefined,
    location: String(obj.location ?? "").trim() || undefined,
    dni: String(obj.dni ?? "").trim() || undefined,
    datosCertificadoCompletadoEn: obj.datosCertificadoCompletadoEn
      ? String(obj.datosCertificadoCompletadoEn)
      : null,
  };
}

export function nombreCompletoValidoParaCertificado(nombre: string): boolean {
  const partido = partirNombreCompleto(nombre);
  return (
    partido.nombreMostrar.length >= 3 &&
    partido.nombres.length >= 2 &&
    partido.apellidos.length >= 2
  );
}

export function profesionValidaParaCertificado(profesion: string): boolean {
  return profesion.trim().length >= 2;
}

export function dniValidoParaCertificado(dni: string): boolean {
  return /^\d{8}$/.test(dni.trim());
}

export function fechaNacimientoValidaParaCertificado(fecha: string): boolean {
  const valor = fecha.trim();
  if (!valor) return false;
  const nacimiento = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return false;
  const hoy = new Date();
  if (nacimiento > hoy) return false;
  const minEdad = new Date();
  minEdad.setFullYear(minEdad.getFullYear() - 14);
  if (nacimiento > minEdad) return false;
  const maxEdad = new Date();
  maxEdad.setFullYear(maxEdad.getFullYear() - 120);
  return nacimiento >= maxEdad;
}

export function datosCertificadoEstanCompletos(
  datos: Pick<
    DatosCertificadoAlumno,
    "nombreCompleto" | "profesion" | "fechaNacimiento" | "dni"
  >,
): boolean {
  return (
    nombreCompletoValidoParaCertificado(datos.nombreCompleto) &&
    profesionValidaParaCertificado(datos.profesion) &&
    fechaNacimientoValidaParaCertificado(datos.fechaNacimiento) &&
    dniValidoParaCertificado(datos.dni)
  );
}
