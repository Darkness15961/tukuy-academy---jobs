/**
 * Cuentas demo con accesos dedicados (una persona ≈ un rol / contexto).
 * Clave común de demostración: 123456
 *
 * Login acepta el correo o el alias corto (campo "usuario").
 */
import type { UserProfile } from "@/types/academia";
import type { MembresiaEntrada } from "@/types/membresia.types";
import { membresiasMock } from "@/data/contextos-sesion.mock";
import { PERMISOS_POR_PLANTILLA } from "@/lib/control-acceso";

const permisosEstudiante = [
  "cursos.ver",
  "aprendizaje.consumir",
  "certificados.ver",
  "perfil.editar",
  "bolsa.ver",
  "bolsa.postular",
  "bolsa.guardar",
  "comunidad.ver",
  "comunidad.publicar",
  "comunidad.comentar",
  "comunidad.reaccionar",
];

const permisosDocente = [
  "cursos.ver",
  "cursos.crear",
  "cursos.editar",
  "estudiantes.ver",
  "evaluaciones.calificar",
  "calificaciones.gestionar",
  "sesiones.gestionar",
  "mensajes.enviar",
  "analitica.ver",
  "certificados.emitir",
  "ingresos.ver",
  "bolsa.ver",
  "bolsa.postular",
  "bolsa.guardar",
  "comunidad.ver",
  "comunidad.publicar",
  "comunidad.comentar",
  "comunidad.reaccionar",
];

const permisosDireccionOrg = [
  ...PERMISOS_POR_PLANTILLA.DIRECCION,
  "vacantes.gestionar",
  "vacantes.publicar",
  "postulaciones.gestionar",
  "comunidad.ver",
  "comunidad.publicar",
  "comunidad.comentar",
  "comunidad.reaccionar",
];

const permisosAdminOrg = [
  ...PERMISOS_POR_PLANTILLA.ADMINISTRACION,
  "vacantes.gestionar",
  "vacantes.publicar",
  "postulaciones.gestionar",
  "comunidad.ver",
  "comunidad.publicar",
  "comunidad.comentar",
  "comunidad.reaccionar",
];

const orgCip = {
  id: "org-empresa-abc",
  nombre: "COLEGIO DE INGENIEROS CUSCO",
  tipo: "EMPRESA" as const,
  logo: "/img/LogoColegioING.png",
  estado: "ACTIVA" as const,
};

const orgAndina = {
  id: "org-andina-constructora",
  nombre: "Andina Constructora",
  tipo: "EMPRESA" as const,
  logo: "/img/logo-andina-constructora.png",
  estado: "ACTIVA" as const,
};

export type CuentaDemo = {
  /** Alias corto para login (además del correo). */
  alias: string;
  correo: string;
  password: string;
  nombre: string;
  apellidos: string;
  /** Texto corto en la pantalla de login. */
  etiqueta: string;
  perfil: UserProfile;
  membresias: MembresiaEntrada[];
};

function perfil(
  name: string,
  initials: string,
  trade: string,
  specialty: string,
): UserProfile {
  return {
    name,
    initials,
    trade,
    specialty,
    location: "Perú",
    profileProgress: 60,
    employabilityScore: 55,
    certificates: 0,
    applications: 0,
  };
}

export const CUENTAS_DEMO: CuentaDemo[] = [
  {
    alias: "admin",
    correo: "admin@tukuy.pe",
    password: "123456",
    nombre: "Carlos",
    apellidos: "Quispe (Tukuy)",
    etiqueta: "Admin plataforma Tukuy (todos los contextos)",
    perfil: perfil(
      "Carlos Alberto",
      "CA",
      "Administrador Tukuy",
      "Operación global",
    ),
    /** Cuenta maestra de demostración: ve todos los portales. */
    membresias: membresiasMock,
  },
  {
    alias: "tukuy",
    correo: "plataforma@tukuy.pe",
    password: "123456",
    nombre: "Rosa",
    apellidos: "Mendoza",
    etiqueta: "Solo administración global Tukuy",
    perfil: perfil("Rosa Mendoza", "RM", "Platform Admin", "SaaS Tukuy"),
    membresias: [
      {
        id: "mem-solo-plataforma",
        usuarioId: "usr-plataforma-rosa",
        organizacion: null,
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-platform-admin",
            codigo: "PLATFORM_ADMIN",
            portal: "admin",
            permisos: [
              "organizaciones.ver",
              "organizaciones.administrar",
              "usuarios.ver",
              "cursos.revisar",
              "planes.administrar",
              "licencias.administrar",
              "facturacion.ver",
              "auditoria.ver",
              "vacantes.gestionar",
              "vacantes.moderar",
              "comunidad.ver",
              "comunidad.moderar",
            ],
            alcance: { tipo: "PLATAFORMA" },
          },
        ],
      },
    ],
  },
  {
    alias: "revision",
    correo: "revision@tukuy.pe",
    password: "123456",
    nombre: "Luis",
    apellidos: "Torres",
    etiqueta: "Revisor de cursos (admin Tukuy)",
    perfil: perfil("Luis Torres", "LT", "Course Reviewer", "Calidad editorial"),
    membresias: [
      {
        id: "mem-solo-revision",
        usuarioId: "usr-revision-luis",
        organizacion: null,
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-course-reviewer",
            codigo: "COURSE_REVIEWER",
            portal: "admin",
            permisos: [
              "cursos.revisar",
              "organizaciones.ver",
              "auditoria.ver",
            ],
            alcance: { tipo: "PLATAFORMA" },
          },
        ],
      },
    ],
  },
  {
    alias: "direccion",
    correo: "direccion@cipcusco.org",
    password: "123456",
    nombre: "Jorge",
    apellidos: "Vargas",
    etiqueta: "Dirección · CIP Cusco",
    perfil: perfil(
      "Jorge Vargas",
      "JV",
      "Dirección CIP",
      "Consejo departamental",
    ),
    membresias: [
      {
        id: "mem-cip-direccion",
        usuarioId: "usr-cip-direccion",
        personaEntidadId: "per-cip-dir",
        organizacion: orgCip,
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-cip-owner",
            codigo: "OWNER",
            portal: "organizacion",
            permisos: permisosDireccionOrg,
            alcance: { tipo: "ENTIDAD" },
          },
        ],
      },
    ],
  },
  {
    alias: "orgadmin",
    correo: "admin@cipcusco.org",
    password: "123456",
    nombre: "Elena",
    apellidos: "Salazar",
    etiqueta: "Administración · CIP Cusco",
    perfil: perfil(
      "Elena Salazar",
      "ES",
      "Administración CIP",
      "Gestión académica",
    ),
    membresias: [
      {
        id: "mem-cip-admin",
        usuarioId: "usr-cip-admin",
        personaEntidadId: "per-cip-adm",
        organizacion: orgCip,
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-cip-admin",
            codigo: "ADMIN",
            portal: "organizacion",
            permisos: permisosAdminOrg,
            alcance: { tipo: "ENTIDAD" },
          },
        ],
      },
    ],
  },
  {
    alias: "docente",
    correo: "docente@cipcusco.org",
    password: "123456",
    nombre: "Diana",
    apellidos: "Chávez",
    etiqueta: "Docente · CIP Cusco",
    perfil: perfil(
      "Ing. Diana Chávez",
      "DC",
      "Docente CIP",
      "Gestión de obras",
    ),
    membresias: [
      {
        id: "mem-cip-docente",
        usuarioId: "usr-cip-docente",
        personaEntidadId: "15",
        organizacion: orgCip,
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-cip-instructor",
            codigo: "INSTRUCTOR",
            portal: "docente",
            permisos: permisosDocente,
            ambitoDocencia: "ORGANIZACION",
            alcance: {
              tipo: "CURSOS_PROPIOS",
              cursoIds: [
                "doc-1",
                "doc-3",
                "doc-5",
                "doc-7",
                "doc-8",
                "doc-10",
                "doc-11",
              ],
            },
          },
        ],
      },
    ],
  },
  {
    alias: "independiente",
    correo: "docente.libre@demo.tukuy.pe",
    password: "123456",
    nombre: "Marco",
    apellidos: "Ruiz",
    etiqueta: "Docente independiente (sin entidad)",
    perfil: perfil(
      "Ing. Marco Ruiz",
      "MR",
      "Docente independiente",
      "Tukuy Obra",
    ),
    membresias: [
      {
        id: "mem-doc-independiente",
        usuarioId: "usr-doc-independiente",
        organizacion: {
          id: "org-personal-usr-doc-independiente",
          nombre: "Tukuy Personal",
          tipo: "PERSONAL",
          estado: "ACTIVA",
        },
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-doc-indep",
            codigo: "INSTRUCTOR",
            portal: "docente",
            permisos: permisosDocente,
            ambitoDocencia: "INDEPENDIENTE",
            alcance: { tipo: "CURSOS_PROPIOS" },
          },
          {
            id: "rol-doc-indep-alumno",
            codigo: "LEARNER",
            portal: "estudiante",
            permisos: permisosEstudiante,
            alcance: { tipo: "PROPIO" },
          },
        ],
      },
    ],
  },
  {
    alias: "alumno",
    correo: "alumno@demo.tukuy.pe",
    password: "123456",
    nombre: "Patricia",
    apellidos: "Gómez",
    etiqueta: "Alumno sin entidad (solo Tukuy Personal)",
    perfil: perfil(
      "Patricia Gómez",
      "PG",
      "Estudiante",
      "Formación individual",
    ),
    membresias: [
      {
        id: "mem-alumno-personal",
        usuarioId: "usr-alumno-personal",
        organizacion: {
          id: "org-personal-usr-alumno-personal",
          nombre: "Tukuy Personal",
          tipo: "PERSONAL",
          estado: "ACTIVA",
        },
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-alumno-personal",
            codigo: "LEARNER",
            portal: "estudiante",
            permisos: permisosEstudiante,
            alcance: { tipo: "PROPIO" },
          },
        ],
      },
    ],
  },
  {
    alias: "alumnocip",
    correo: "alumno.cip@demo.tukuy.pe",
    password: "123456",
    nombre: "Carlos",
    apellidos: "Alberto",
    etiqueta: "Alumno con entidad · CIP Cusco",
    perfil: perfil(
      "Carlos Alberto",
      "CA",
      "Estudiante CIP",
      "Construcción civil",
    ),
    membresias: [
      {
        id: "mem-alumno-cip",
        usuarioId: "usr-alumno-cip",
        personaEntidadId: "15",
        organizacion: orgCip,
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-alumno-cip",
            codigo: "LEARNER",
            portal: "estudiante",
            permisos: permisosEstudiante,
            alcance: { tipo: "PROPIO" },
          },
        ],
      },
      {
        id: "mem-alumno-cip-personal",
        usuarioId: "usr-alumno-cip",
        organizacion: {
          id: "org-personal-usr-alumno-cip",
          nombre: "Tukuy Personal",
          tipo: "PERSONAL",
          estado: "ACTIVA",
        },
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-alumno-cip-personal",
            codigo: "LEARNER",
            portal: "estudiante",
            permisos: permisosEstudiante,
            alcance: { tipo: "PROPIO" },
          },
        ],
      },
    ],
  },
  {
    alias: "andina",
    correo: "admin@andinaconstructora.pe",
    password: "123456",
    nombre: "María",
    apellidos: "Soto",
    etiqueta: "Administración · Andina Constructora",
    perfil: perfil(
      "María Fernanda Soto",
      "MS",
      "Administración Andina",
      "Capacitación SSOMA",
    ),
    membresias: [
      {
        id: "mem-andina-admin",
        usuarioId: "usr-andina-admin",
        personaEntidadId: "per-and-1",
        organizacion: orgAndina,
        estado: "ACTIVA",
        roles: [
          {
            id: "rol-andina-admin",
            codigo: "ADMIN",
            portal: "organizacion",
            permisos: permisosAdminOrg,
            alcance: { tipo: "ENTIDAD" },
          },
        ],
      },
    ],
  },
];

export const CLAVE_DEMO_COMUN = "123456";

export function buscarCuentaDemo(
  usuarioOCorreo: string,
  password: string,
): CuentaDemo | null {
  const clave = usuarioOCorreo.trim().toLowerCase();
  const cuenta = CUENTAS_DEMO.find(
    (item) =>
      item.alias.toLowerCase() === clave ||
      item.correo.toLowerCase() === clave,
  );
  if (!cuenta || cuenta.password !== password) return null;
  return cuenta;
}

/** Resumen para la UI de login. */
export const RESUMEN_CUENTAS_DEMO = CUENTAS_DEMO.map((c) => ({
  alias: c.alias,
  correo: c.correo,
  etiqueta: c.etiqueta,
}));
