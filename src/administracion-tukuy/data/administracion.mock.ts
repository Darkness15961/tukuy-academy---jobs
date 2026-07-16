export type EstadoOrganizacion =
  | "ACTIVA"
  | "PRUEBA"
  | "POR_VENCER"
  | "SUSPENDIDA";

export type OrganizacionAdministrada = {
  id: string;
  nombre: string;
  ruc: string;
  tipo: string;
  plan: string;
  usuarios: number;
  limiteUsuarios: number;
  cursos: number;
  vence: string;
  estado: EstadoOrganizacion;
};

export const organizacionesAdministracion: OrganizacionAdministrada[] = [
  {
    id: "org-001",
    nombre: "Andina Constructora",
    ruc: "20123456789",
    tipo: "Empresa",
    plan: "Empresa Pro",
    usuarios: 427,
    limiteUsuarios: 500,
    cursos: 22,
    vence: "2026-09-30",
    estado: "ACTIVA",
  },
  {
    id: "org-002",
    nombre: "Constructora Andina",
    ruc: "20548796321",
    tipo: "Empresa",
    plan: "Empresa Pro",
    usuarios: 812,
    limiteUsuarios: 1000,
    cursos: 38,
    vence: "2027-01-15",
    estado: "ACTIVA",
  },
  {
    id: "org-003",
    nombre: "Instituto Técnico del Sur",
    ruc: "20445566771",
    tipo: "Instituto",
    plan: "Empresa Básica",
    usuarios: 168,
    limiteUsuarios: 200,
    cursos: 17,
    vence: "2026-08-08",
    estado: "POR_VENCER",
  },
  {
    id: "org-004",
    nombre: "Municipalidad de Cusco",
    ruc: "20177201612",
    tipo: "Entidad pública",
    plan: "Empresa Básica",
    usuarios: 96,
    limiteUsuarios: 200,
    cursos: 11,
    vence: "2026-12-20",
    estado: "ACTIVA",
  },
  {
    id: "org-005",
    nombre: "Academia Horizonte",
    ruc: "20609178234",
    tipo: "Academia",
    plan: "Prueba empresarial",
    usuarios: 31,
    limiteUsuarios: 50,
    cursos: 6,
    vence: "2026-07-28",
    estado: "PRUEBA",
  },
  {
    id: "org-006",
    nombre: "Fundación Avanza Perú",
    ruc: "20555111998",
    tipo: "ONG",
    plan: "Empresa Básica",
    usuarios: 74,
    limiteUsuarios: 200,
    cursos: 9,
    vence: "2026-06-30",
    estado: "SUSPENDIDA",
  },
];

export const usuariosAdministracion = [
  {
    id: "usr-001",
    nombre: "Carlos Alberto",
    correo: "carlos@tukuy.pe",
    organizacion: "Tukuy Academy",
    perfiles: ["Administrador Tukuy", "Docente"],
    ultimoAcceso: "Hoy, 10:42",
    estado: "ACTIVO",
  },
  {
    id: "usr-002",
    nombre: "María Fernanda Soto",
    correo: "maria.soto@andinaconstructora.pe",
    organizacion: "Andina Constructora",
    perfiles: ["Estudiante"],
    ultimoAcceso: "Hace 12 min",
    estado: "ACTIVO",
  },
  {
    id: "usr-003",
    nombre: "Luis Alberto Rojas",
    correo: "luis.rojas@andinaconstructora.pe",
    organizacion: "Andina Constructora",
    perfiles: ["Docente", "Estudiante"],
    ultimoAcceso: "Hace 2 h",
    estado: "ACTIVO",
  },
  {
    id: "usr-004",
    nombre: "Diana Chávez Puma",
    correo: "diana@andina.pe",
    organizacion: "Constructora Andina",
    perfiles: ["Administradora de organización"],
    ultimoAcceso: "Ayer",
    estado: "ACTIVO",
  },
  {
    id: "usr-005",
    nombre: "José Manuel Vera",
    correo: "jose.vera@horizonte.edu.pe",
    organizacion: "Academia Horizonte",
    perfiles: ["Docente"],
    ultimoAcceso: "Hace 5 días",
    estado: "INVITADO",
  },
  {
    id: "usr-006",
    nombre: "Andrea Huamán Díaz",
    correo: "andrea@fundacionavanza.org",
    organizacion: "Fundación Avanza Perú",
    perfiles: ["Estudiante"],
    ultimoAcceso: "Hace 18 días",
    estado: "SUSPENDIDO",
  },
];

export type EstadoRevisionCurso = "EN_REVISION" | "OBSERVADO" | "APROBADO";

export const cursosRevisionAdministracion = [
  {
    id: "cur-101",
    titulo: "Control de almacén y Kardex",
    docente: "Carlos Quispe",
    organizacion: "Docencia independiente",
    categoria: "Gestión de obras",
    enviado: "2026-07-14",
    lecciones: 18,
    duracion: "6 h 20 min",
    estado: "EN_REVISION" as EstadoRevisionCurso,
  },
  {
    id: "cur-102",
    titulo: "Seguridad y salud en trabajos de obra",
    docente: "Diana Chávez",
    organizacion: "Constructora Andina",
    categoria: "Seguridad",
    enviado: "2026-07-13",
    lecciones: 24,
    duracion: "8 h 10 min",
    estado: "EN_REVISION" as EstadoRevisionCurso,
  },
  {
    id: "cur-103",
    titulo: "Lean Construction aplicado",
    docente: "Renato Salazar",
    organizacion: "Instituto Técnico del Sur",
    categoria: "Productividad",
    enviado: "2026-07-11",
    lecciones: 15,
    duracion: "5 h 40 min",
    estado: "OBSERVADO" as EstadoRevisionCurso,
  },
  {
    id: "cur-104",
    titulo: "Gestión digital de obras con Tukuy",
    docente: "Lucía Mendoza",
    organizacion: "Tukuy Academy",
    categoria: "Tecnología",
    enviado: "2026-07-09",
    lecciones: 32,
    duracion: "12 h",
    estado: "APROBADO" as EstadoRevisionCurso,
  },
];

export const planesAdministracion = [
  {
    id: "plan-individual",
    nombre: "Individual",
    precio: 89,
    periodo: "mensual",
    organizaciones: 38,
    estudiantes: 50,
    docentes: 1,
    cursos: 10,
    almacenamiento: 20,
    color: "#0B3A78",
  },
  {
    id: "plan-basico",
    nombre: "Empresa Básica",
    precio: 690,
    periodo: "mensual",
    organizaciones: 19,
    estudiantes: 200,
    docentes: 20,
    cursos: 100,
    almacenamiento: 200,
    color: "#0F766E",
  },
  {
    id: "plan-pro",
    nombre: "Empresa Pro",
    precio: 1890,
    periodo: "mensual",
    organizaciones: 11,
    estudiantes: 1000,
    docentes: -1,
    cursos: -1,
    almacenamiento: 1000,
    color: "#7C3AED",
  },
];

export const facturasAdministracion = [
  {
    id: "FAC-2026-0718",
    organizacion: "Andina Constructora",
    concepto: "Empresa Pro · Julio 2026",
    fecha: "2026-07-01",
    vencimiento: "2026-07-15",
    total: 2230.2,
    estado: "PAGADA",
  },
  {
    id: "FAC-2026-0717",
    organizacion: "Constructora Andina",
    concepto: "Empresa Pro · Julio 2026",
    fecha: "2026-07-01",
    vencimiento: "2026-07-15",
    total: 2230.2,
    estado: "PENDIENTE",
  },
  {
    id: "FAC-2026-0716",
    organizacion: "Instituto Técnico del Sur",
    concepto: "Empresa Básica · Julio 2026",
    fecha: "2026-07-01",
    vencimiento: "2026-07-10",
    total: 814.2,
    estado: "VENCIDA",
  },
  {
    id: "FAC-2026-0715",
    organizacion: "Municipalidad de Cusco",
    concepto: "Empresa Básica · Julio 2026",
    fecha: "2026-07-01",
    vencimiento: "2026-07-20",
    total: 814.2,
    estado: "PENDIENTE",
  },
];

export const eventosAuditoria = [
  {
    id: 1,
    fecha: "2026-07-15 10:42",
    usuario: "Carlos Quispe",
    accion: "Aprobó el curso Control de almacén y Kardex",
    modulo: "Revisión de cursos",
    origen: "190.42.18.24",
    nivel: "INFORMACION",
  },
  {
    id: 2,
    fecha: "2026-07-15 09:18",
    usuario: "Rosa Mendoza",
    accion: "Actualizó los límites de la licencia",
    modulo: "Planes y licencias",
    origen: "190.119.32.17",
    nivel: "CAMBIO",
  },
  {
    id: 3,
    fecha: "2026-07-14 18:05",
    usuario: "Sistema Tukuy",
    accion: "Suspendió una organización por vencimiento",
    modulo: "Organizaciones",
    origen: "Automático",
    nivel: "ALERTA",
  },
  {
    id: 4,
    fecha: "2026-07-14 16:31",
    usuario: "Carlos Quispe",
    accion: "Accedió al contexto de soporte de Andina Constructora",
    modulo: "Soporte",
    origen: "190.42.18.24",
    nivel: "SEGURIDAD",
  },
  {
    id: 5,
    fecha: "2026-07-14 14:12",
    usuario: "Lucía Torres",
    accion: "Registró una nueva organización",
    modulo: "Organizaciones",
    origen: "181.65.91.8",
    nivel: "CAMBIO",
  },
];

export const actividadMensual = [
  { mes: "Feb", ingresos: 48600, usuarios: 2310 },
  { mes: "Mar", ingresos: 53200, usuarios: 2590 },
  { mes: "Abr", ingresos: 57900, usuarios: 2840 },
  { mes: "May", ingresos: 61800, usuarios: 3105 },
  { mes: "Jun", ingresos: 67400, usuarios: 3420 },
  { mes: "Jul", ingresos: 72900, usuarios: 3786 },
];
