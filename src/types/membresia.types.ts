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
export type TipoAlcancePermiso =
  | "PROPIO"
  | "CURSOS_PROPIOS"
  | "EQUIPO"
  | "AREA"
  | "UNIDAD"
  | "SEDE"
  | "ENTIDAD"
  | "PLATAFORMA";

export type AlcanceMembresia = {
  tipo: TipoAlcancePermiso;
  areaIds?: string[];
  sedeIds?: string[];
  cursoIds?: string[];
  equipoIds?: string[];
};

export type MembresiaOrganizacion = {
  id: string;
  usuarioId: string;
  /** Identificador de la persona dentro del directorio de la entidad. */
  personaEntidadId?: string;
  organizacion: Organizacion | null;
  rol: Rol;
  permisos: string[];
  alcance?: AlcanceMembresia;
  estado: EstadoMembresia;
  portal: TipoPortal;
  ambitoDocencia?: AmbitoDocencia;
};

export type ContextoSesion = {
  membresiaId: string;
  usuarioId: string;
  personaEntidadId?: string;
  organizacionId: string | null;
  organizacionNombre: string;
  rol: Rol;
  permisos: string[];
  alcance?: AlcanceMembresia;
  portal: TipoPortal;
  ambitoDocencia?: AmbitoDocencia;
};
