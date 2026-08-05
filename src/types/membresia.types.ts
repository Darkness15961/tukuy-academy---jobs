import type { Organizacion } from "./organizacion.types";

export type RolPlataforma =
  "SUPER_ADMIN" | "PLATFORM_ADMIN" | "PLATFORM_SUPPORT" | "COURSE_REVIEWER";

export type RolOrganizacion =
  | "OWNER"
  | "ADMIN"
  | "ORGANIZATION_OWNER"
  | "ORGANIZATION_ADMIN"
  | "TRAINING_MANAGER"
  | "INSTRUCTOR"
  | "SUPERVISOR"
  | "LEARNER"
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

/** Función concreta que una membresía puede activar dentro de un espacio. */
export type FuncionMembresia = {
  id: string;
  codigo: Rol;
  portal: TipoPortal;
  permisos: string[];
  alcance?: AlcanceMembresia;
  ambitoDocencia?: AmbitoDocencia;
};

/** Nuevo contrato del backend: una membresía estable con varias funciones. */
export type MembresiaMultiRol = {
  id: string;
  usuarioId: string;
  personaEntidadId?: string;
  organizacion: Organizacion | null;
  estado: EstadoMembresia;
  roles: FuncionMembresia[];
};

export type MembresiaOrganizacion = {
  /** ID de la función para selección/UI; coincide con id en contratos antiguos. */
  id: string;
  /** ID canónico de la membresía enviado al backend. */
  membresiaOrigenId?: string;
  rolId?: string;
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
  /** Presente si la respuesta original ya usa el contrato multirol. */
  roles?: FuncionMembresia[];
};

export type MembresiaEntrada = MembresiaOrganizacion | MembresiaMultiRol;

export type ContextoSesion = {
  membresiaId: string;
  funcionId: string;
  rolId: string;
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
