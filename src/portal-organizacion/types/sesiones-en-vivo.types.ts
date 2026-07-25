/** Dominio de clases sincrónicas (calendario). Separado del curso virtual asíncrono. */

export type EstadoSesionEnVivo =
  | "PROGRAMADA"
  | "HOY"
  | "EN_VIVO"
  | "FINALIZADA"
  | "CANCELADA";

export type EstadoInvitacionMeet = "PENDIENTE" | "ACEPTADA" | "RECHAZADA";

export type PortalCreadorSesion = "organizacion" | "docente";

/**
 * Discriminador de dominio: el calendario solo lista registros de este tipo.
 * Los cursos VIRTUALES no generan eventos aquí.
 */
export type ClasificacionSesion = "CLASE_EN_VIVO";

export interface InvitadoSesionEnVivo {
  email: string;
  nombre?: string;
  estado: EstadoInvitacionMeet;
  /** Si viene de matrícula institucional. */
  alumnoId?: string;
}

export interface SesionEnVivoOrganizacion {
  id: string;
  /** Siempre CLASE_EN_VIVO: no mezclar con contenido asíncrono. */
  clasificacion: ClasificacionSesion;
  /** Clave de sincronización entre admin / docente / alumno. */
  organizacionId: string;
  titulo: string;
  /** Curso EN_VIVO o HIBRIDA al que pertenece la clase. */
  cursoId: string;
  cursoTitulo: string;
  docenteNombre: string;
  docenteEmail: string;
  /** Inicio en ISO (America/Lima conceptual). */
  fechaHoraInicio: string;
  duracionMinutos: number;
  estado: EstadoSesionEnVivo;
  /** Simulación Google Calendar + Meet (no Classroom). */
  proveedor: "GOOGLE_CALENDAR_MEET";
  /** ID ficticio del evento en Google Calendar. */
  calendarEventId: string;
  /** Enlace Meet generado al crear el evento. */
  meetUrl: string;
  invitados: InvitadoSesionEnVivo[];
  inscritos: number;
  grabacionUrl?: string;
  notas?: string;
  creadoPor: {
    portal: PortalCreadorSesion;
    nombre: string;
  };
}

export interface ProgramarSesionEnVivoInput {
  organizacionId: string;
  titulo: string;
  cursoId: string;
  cursoTitulo: string;
  docenteNombre: string;
  docenteEmail: string;
  fechaHoraInicio: string;
  duracionMinutos: number;
  /** Correos extra a invitar (además de matrículas del curso). */
  emailsInvitados: string[];
  /** Si true (default), invita automáticamente a alumnos matriculados. */
  invitarMatriculados?: boolean;
  notas?: string;
  creadoPor: {
    portal: PortalCreadorSesion;
    nombre: string;
  };
}

export function cursoAdmiteSesionesEnVivo(
  modalidad?: "VIRTUAL" | "EN_VIVO" | "HIBRIDA" | null,
) {
  return modalidad === "EN_VIVO" || modalidad === "HIBRIDA";
}
