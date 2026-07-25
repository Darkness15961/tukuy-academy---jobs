import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";

const ORG = "org-empresa-abc";

function isoLocal(diasDesdeHoy: number, hora: number, minuto = 0) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + diasDesdeHoy);
  base.setHours(hora, minuto, 0, 0);
  return base.toISOString();
}

/**
 * Semilla compartida: la misma clase aparece en admin, docente y alumno
 * (filtrada por curso / matrícula / alcance).
 */
export const sesionesEnVivoOrganizacion: SesionEnVivoOrganizacion[] = [
  {
    id: "sev-1",
    clasificacion: "CLASE_EN_VIVO",
    organizacionId: ORG,
    titulo: "Control de avance diario",
    cursoId: "doc-1",
    cursoTitulo: "Gestión digital de obras con Tukuy",
    docenteNombre: "Ing. Diana Chávez",
    docenteEmail: "diana.chavez@cipcusco.org.pe",
    fechaHoraInicio: isoLocal(0, 16, 0),
    duracionMinutos: 60,
    estado: "HOY",
    proveedor: "GOOGLE_CALENDAR_MEET",
    calendarEventId: "gcal_sev_1_demo",
    meetUrl: "https://meet.google.com/tuk-obras-demo",
    invitados: [
      {
        email: "maria.soto@cipcusco.org.pe",
        nombre: "María Fernanda Soto",
        estado: "ACEPTADA",
        alumnoId: "alu-001",
      },
      {
        email: "carlos.alberto@demo.tukuy.pe",
        nombre: "Carlos Alberto",
        estado: "ACEPTADA",
        alumnoId: "alu-demo",
      },
      {
        email: "luis.rojas@cipcusco.org.pe",
        nombre: "Luis Alberto Rojas",
        estado: "ACEPTADA",
        alumnoId: "alu-002",
      },
      {
        email: "jose.vera@cipcusco.org.pe",
        nombre: "José Manuel Vera",
        estado: "PENDIENTE",
        alumnoId: "alu-004",
      },
    ],
    inscritos: 42,
    creadoPor: { portal: "organizacion", nombre: "Admin Colegio" },
  },
  {
    id: "sev-2",
    clasificacion: "CLASE_EN_VIVO",
    organizacionId: ORG,
    titulo: "Resolución de caso de valorización",
    cursoId: "doc-3",
    cursoTitulo: "Valorizaciones y avance de obra",
    docenteNombre: "Ing. Diana Chávez",
    docenteEmail: "diana.chavez@cipcusco.org.pe",
    fechaHoraInicio: isoLocal(3, 17, 0),
    duracionMinutos: 60,
    estado: "PROGRAMADA",
    proveedor: "GOOGLE_CALENDAR_MEET",
    calendarEventId: "gcal_sev_2_demo",
    meetUrl: "https://meet.google.com/tuk-valoriz-demo",
    invitados: [
      {
        email: "andrea.huaman@cipcusco.org.pe",
        nombre: "Andrea Huamán Díaz",
        estado: "ACEPTADA",
        alumnoId: "alu-005",
      },
      {
        email: "carlos.alberto@demo.tukuy.pe",
        nombre: "Carlos Alberto",
        estado: "PENDIENTE",
        alumnoId: "alu-demo",
      },
    ],
    inscritos: 24,
    creadoPor: { portal: "docente", nombre: "Ing. Diana Chávez" },
  },
  {
    id: "sev-3",
    clasificacion: "CLASE_EN_VIVO",
    organizacionId: ORG,
    titulo: "Taller de calidad en obra",
    cursoId: "doc-11",
    cursoTitulo: "Control de calidad en obras civiles",
    docenteNombre: "Ing. Marco Ruiz",
    docenteEmail: "marco.ruiz@cipcusco.org.pe",
    fechaHoraInicio: isoLocal(7, 18, 30),
    duracionMinutos: 90,
    estado: "PROGRAMADA",
    proveedor: "GOOGLE_CALENDAR_MEET",
    calendarEventId: "gcal_sev_3_demo",
    meetUrl: "https://meet.google.com/tuk-calidad-demo",
    invitados: [
      {
        email: "elena.salazar@cipcusco.org.pe",
        nombre: "Elena Salazar Medina",
        estado: "ACEPTADA",
        alumnoId: "alu-007",
      },
      {
        email: "carlos.alberto@demo.tukuy.pe",
        nombre: "Carlos Alberto",
        estado: "ACEPTADA",
        alumnoId: "alu-demo",
      },
      {
        email: "carlos.mendoza@cipcusco.org.pe",
        nombre: "Carlos Mendoza Ruiz",
        estado: "ACEPTADA",
        alumnoId: "alu-008",
      },
    ],
    inscritos: 38,
    creadoPor: { portal: "organizacion", nombre: "Admin Colegio" },
  },
  {
    id: "sev-4",
    clasificacion: "CLASE_EN_VIVO",
    organizacionId: ORG,
    titulo: "Cierre de módulo · lectura de planos",
    cursoId: "doc-7",
    cursoTitulo: "Lectura de planos para personal de campo",
    docenteNombre: "Ing. Jorge Vargas",
    docenteEmail: "jorge.vargas@cipcusco.org.pe",
    fechaHoraInicio: isoLocal(-5, 15, 0),
    duracionMinutos: 60,
    estado: "FINALIZADA",
    proveedor: "GOOGLE_CALENDAR_MEET",
    calendarEventId: "gcal_sev_4_demo",
    meetUrl: "https://meet.google.com/tuk-planos-demo",
    invitados: [
      {
        email: "diana.chavez@cipcusco.org.pe",
        nombre: "Diana Chávez Puma",
        estado: "ACEPTADA",
        alumnoId: "alu-003",
      },
      {
        email: "carlos.alberto@demo.tukuy.pe",
        nombre: "Carlos Alberto",
        estado: "ACEPTADA",
        alumnoId: "alu-demo",
      },
    ],
    inscritos: 55,
    grabacionUrl: "https://drive.google.com/file/d/tukuy-grabacion-sev-4/view",
    creadoPor: { portal: "docente", nombre: "Ing. Jorge Vargas" },
  },
];

/** Cursos en los que el alumno demo figura matriculado (Colegio). */
export const cursosAlumnoDemoOrg = ["doc-1", "doc-3", "doc-7", "doc-11"] as const;

export const emailAlumnoDemo = "carlos.alberto@demo.tukuy.pe";
