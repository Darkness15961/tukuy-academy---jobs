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
  /** true si el enlace no es de Google real (fallback local). */
  meetSimulado?: boolean;
  /** Motivo del fallback / error de Google Calendar. */
  meetAviso?: string;
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

/** Alta corta: curso mínimo EN_VIVO + sesión + Meet. */
export interface CrearSesionEnVivoRapidaInput {
  organizacionId: string;
  /** Nombre del curso (obligatorio). */
  tituloCurso: string;
  descripcion?: string;
  /** Título de la clase en Calendar; default = tituloCurso. */
  tituloSesion?: string;
  fechaHoraInicio: string;
  duracionMinutos: number;
  alcance?: "PUBLICO" | "INTERNO";
  /** URL/key de portada (Open Graph / catálogo). */
  portadaUrl?: string | null;
  emailsInvitados?: string[];
  /** Default true: al matricularse también se agendan. */
  invitarMatriculados?: boolean;
  /** Emite certificado al cumplir criterios (default false). */
  certificado?: boolean;
  /** Si certificado: exigir % de pases de asistencia (default true). */
  exigirAsistencia?: boolean;
  /** Default 50. */
  porcentajeMinimoAsistencia?: number;
  /** Si certificado: exigir nota mínima. */
  exigirNota?: boolean;
  /** Default 14 (escala 0–20). */
  notaMinima?: number;
  docenteNombre: string;
  docenteEmail: string;
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
