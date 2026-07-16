import type { Organizacion } from "./organizacion.types";

export type RolPlataforma =
  "SUPER_ADMIN" | "PLATFORM_ADMIN" | "PLATFORM_SUPPORT" | "COURSE_REVIEWER";

export type RolOrganizacion =
  | "ORGANIZATION_OWNER"
  | "ORGANIZATION_ADMIN"
  | "TRAINING_MANAGER"
  | "INSTRUCTOR"
  | "SUPERVISOR"
  | "STUDENT";

export type Rol = RolPlataforma | RolOrganizacion;
export type EstadoMembresia = "INVITADA" | "ACTIVA" | "SUSPENDIDA" | "INACTIVA";
export type TipoPortal = "estudiante" | "docente" | "organizacion" | "admin";
export type AmbitoDocencia = "INDEPENDIENTE" | "ORGANIZACION";

export type MembresiaOrganizacion = {
  id: string;
  usuarioId: string;
  organizacion: Organizacion | null;
  rol: Rol;
  permisos: string[];
  estado: EstadoMembresia;
  portal: TipoPortal;
  ambitoDocencia?: AmbitoDocencia;
};

export type ContextoSesion = {
  membresiaId: string;
  usuarioId: string;
  organizacionId: string | null;
  organizacionNombre: string;
  rol: Rol;
  permisos: string[];
  portal: TipoPortal;
  ambitoDocencia?: AmbitoDocencia;
};
