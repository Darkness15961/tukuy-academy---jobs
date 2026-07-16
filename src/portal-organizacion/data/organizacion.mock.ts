export const indicadoresOrganizacion = {
  licencias: 500,
  utilizadas: 427,
  usuariosActivos: 381,
  cursosAsignados: 32,
  finalizacion: 72,
  certificados: 316,
};

const ORGANIZACION = "COLEGIO DE INGENIEROS CUSCO";

/**
 * Matrículas institucionales. `alumnoId` identifica a la persona y `id` a su
 * inscripción en un curso, por lo que un alumno puede llevar varios cursos.
 */
export const matriculasOrganizacion = [
  { id: "mat-001", alumnoId: "alu-001", cursoId: "doc-1", nombre: "María Fernanda Soto", iniciales: "MS", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 82, ultimoAcceso: "Hace 12 min", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-06-02", estado: "ACTIVO" },
  { id: "mat-002", alumnoId: "alu-001", cursoId: "doc-7", nombre: "María Fernanda Soto", iniciales: "MS", curso: "Lectura de planos para personal de campo", organizacion: ORGANIZACION, progreso: 100, ultimoAcceso: "Ayer", ultimoAccesoFecha: "2026-07-15", fechaInscripcion: "2026-04-18", estado: "COMPLETADO" },
  { id: "mat-003", alumnoId: "alu-001", cursoId: "doc-11", nombre: "María Fernanda Soto", iniciales: "MS", curso: "Control de calidad en obras civiles", organizacion: ORGANIZACION, progreso: 46, ultimoAcceso: "Hace 2 días", ultimoAccesoFecha: "2026-07-14", fechaInscripcion: "2026-07-01", estado: "ACTIVO" },
  { id: "mat-004", alumnoId: "alu-002", cursoId: "doc-1", nombre: "Luis Alberto Rojas", iniciales: "LR", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 64, ultimoAcceso: "Hace 2 h", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-06-18", estado: "ACTIVO" },
  { id: "mat-005", alumnoId: "alu-002", cursoId: "doc-11", nombre: "Luis Alberto Rojas", iniciales: "LR", curso: "Control de calidad en obras civiles", organizacion: ORGANIZACION, progreso: 25, ultimoAcceso: "Hace 8 días", ultimoAccesoFecha: "2026-07-08", fechaInscripcion: "2026-06-25", estado: "EN_RIESGO" },
  { id: "mat-006", alumnoId: "alu-003", cursoId: "doc-7", nombre: "Diana Chávez Puma", iniciales: "DC", curso: "Lectura de planos para personal de campo", organizacion: ORGANIZACION, progreso: 100, ultimoAcceso: "Ayer", ultimoAccesoFecha: "2026-07-15", fechaInscripcion: "2026-05-11", estado: "COMPLETADO" },
  { id: "mat-007", alumnoId: "alu-003", cursoId: "doc-1", nombre: "Diana Chávez Puma", iniciales: "DC", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 91, ultimoAcceso: "Hace 1 h", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-05-20", estado: "ACTIVO" },
  { id: "mat-008", alumnoId: "alu-003", cursoId: "doc-11", nombre: "Diana Chávez Puma", iniciales: "DC", curso: "Control de calidad en obras civiles", organizacion: ORGANIZACION, progreso: 76, ultimoAcceso: "Hoy", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-06-03", estado: "ACTIVO" },
  { id: "mat-009", alumnoId: "alu-004", cursoId: "doc-1", nombre: "José Manuel Vera", iniciales: "JV", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 28, ultimoAcceso: "Hace 5 días", ultimoAccesoFecha: "2026-07-11", fechaInscripcion: "2026-07-01", estado: "EN_RIESGO" },
  { id: "mat-010", alumnoId: "alu-004", cursoId: "doc-7", nombre: "José Manuel Vera", iniciales: "JV", curso: "Lectura de planos para personal de campo", organizacion: ORGANIZACION, progreso: 55, ultimoAcceso: "Hace 3 días", ultimoAccesoFecha: "2026-07-13", fechaInscripcion: "2026-06-10", estado: "ACTIVO" },
  { id: "mat-011", alumnoId: "alu-005", cursoId: "doc-1", nombre: "Andrea Huamán Díaz", iniciales: "AH", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 76, ultimoAcceso: "Hace 3 h", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-07-08", estado: "ACTIVO" },
  { id: "mat-012", alumnoId: "alu-005", cursoId: "doc-7", nombre: "Andrea Huamán Díaz", iniciales: "AH", curso: "Lectura de planos para personal de campo", organizacion: ORGANIZACION, progreso: 100, ultimoAcceso: "Hace 1 semana", ultimoAccesoFecha: "2026-07-09", fechaInscripcion: "2026-03-15", estado: "COMPLETADO" },
  { id: "mat-013", alumnoId: "alu-005", cursoId: "doc-11", nombre: "Andrea Huamán Díaz", iniciales: "AH", curso: "Control de calidad en obras civiles", organizacion: ORGANIZACION, progreso: 68, ultimoAcceso: "Hoy", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-06-28", estado: "ACTIVO" },
  { id: "mat-014", alumnoId: "alu-006", cursoId: "doc-1", nombre: "Renato Paredes León", iniciales: "RP", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 41, ultimoAcceso: "Ayer", ultimoAccesoFecha: "2026-07-15", fechaInscripcion: "2026-06-12", estado: "ACTIVO" },
  { id: "mat-015", alumnoId: "alu-006", cursoId: "doc-11", nombre: "Renato Paredes León", iniciales: "RP", curso: "Control de calidad en obras civiles", organizacion: ORGANIZACION, progreso: 19, ultimoAcceso: "Hace 10 días", ultimoAccesoFecha: "2026-07-06", fechaInscripcion: "2026-06-14", estado: "EN_RIESGO" },
  { id: "mat-016", alumnoId: "alu-007", cursoId: "doc-7", nombre: "Elena Salazar Medina", iniciales: "ES", curso: "Lectura de planos para personal de campo", organizacion: ORGANIZACION, progreso: 58, ultimoAcceso: "Hace 4 h", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-06-22", estado: "ACTIVO" },
  { id: "mat-017", alumnoId: "alu-007", cursoId: "doc-1", nombre: "Elena Salazar Medina", iniciales: "ES", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 33, ultimoAcceso: "Hace 2 días", ultimoAccesoFecha: "2026-07-14", fechaInscripcion: "2026-07-03", estado: "ACTIVO" },
  { id: "mat-018", alumnoId: "alu-008", cursoId: "doc-11", nombre: "Carlos Mendoza Ruiz", iniciales: "CM", curso: "Control de calidad en obras civiles", organizacion: ORGANIZACION, progreso: 91, ultimoAcceso: "Hoy", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-05-09", estado: "ACTIVO" },
  { id: "mat-019", alumnoId: "alu-008", cursoId: "doc-7", nombre: "Carlos Mendoza Ruiz", iniciales: "CM", curso: "Lectura de planos para personal de campo", organizacion: ORGANIZACION, progreso: 100, ultimoAcceso: "Hace 6 días", ultimoAccesoFecha: "2026-07-10", fechaInscripcion: "2026-03-08", estado: "COMPLETADO" },
  { id: "mat-020", alumnoId: "alu-009", cursoId: "doc-1", nombre: "Rosa Mendoza Quispe", iniciales: "RM", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 67, ultimoAcceso: "Hace 6 h", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-06-20", estado: "ACTIVO" },
  { id: "mat-021", alumnoId: "alu-009", cursoId: "doc-11", nombre: "Rosa Mendoza Quispe", iniciales: "RM", curso: "Control de calidad en obras civiles", organizacion: ORGANIZACION, progreso: 52, ultimoAcceso: "Ayer", ultimoAccesoFecha: "2026-07-15", fechaInscripcion: "2026-06-30", estado: "ACTIVO" },
  { id: "mat-022", alumnoId: "alu-010", cursoId: "doc-1", nombre: "Miguel Ángel Flores", iniciales: "MF", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 16, ultimoAcceso: "Hace 12 días", ultimoAccesoFecha: "2026-07-04", fechaInscripcion: "2026-06-15", estado: "EN_RIESGO" },
  { id: "mat-023", alumnoId: "alu-011", cursoId: "doc-7", nombre: "Patricia Gómez Ayala", iniciales: "PG", curso: "Lectura de planos para personal de campo", organizacion: ORGANIZACION, progreso: 88, ultimoAcceso: "Hace 2 h", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-05-28", estado: "ACTIVO" },
  { id: "mat-024", alumnoId: "alu-011", cursoId: "doc-11", nombre: "Patricia Gómez Ayala", iniciales: "PG", curso: "Control de calidad en obras civiles", organizacion: ORGANIZACION, progreso: 73, ultimoAcceso: "Hoy", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-06-19", estado: "ACTIVO" },
  { id: "mat-025", alumnoId: "alu-012", cursoId: "doc-1", nombre: "Hugo Valdivia Cruz", iniciales: "HV", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 22, ultimoAcceso: "Hace 9 días", ultimoAccesoFecha: "2026-07-07", fechaInscripcion: "2026-06-11", estado: "EN_RIESGO" },
  { id: "mat-026", alumnoId: "alu-013", cursoId: "doc-7", nombre: "Lucía Torres Benavides", iniciales: "LT", curso: "Lectura de planos para personal de campo", organizacion: ORGANIZACION, progreso: 73, ultimoAcceso: "Ayer", ultimoAccesoFecha: "2026-07-15", fechaInscripcion: "2026-06-01", estado: "ACTIVO" },
  { id: "mat-027", alumnoId: "alu-013", cursoId: "doc-11", nombre: "Lucía Torres Benavides", iniciales: "LT", curso: "Control de calidad en obras civiles", organizacion: ORGANIZACION, progreso: 61, ultimoAcceso: "Hace 5 h", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-06-27", estado: "ACTIVO" },
  { id: "mat-028", alumnoId: "alu-014", cursoId: "doc-1", nombre: "Fernando Quispe Ríos", iniciales: "FQ", curso: "Gestión digital de obras con Tukuy", organizacion: ORGANIZACION, progreso: 54, ultimoAcceso: "Hoy", ultimoAccesoFecha: "2026-07-16", fechaInscripcion: "2026-06-16", estado: "ACTIVO" },
  { id: "mat-029", alumnoId: "alu-014", cursoId: "doc-7", nombre: "Fernando Quispe Ríos", iniciales: "FQ", curso: "Lectura de planos para personal de campo", organizacion: ORGANIZACION, progreso: 38, ultimoAcceso: "Hace 3 días", ultimoAccesoFecha: "2026-07-13", fechaInscripcion: "2026-06-24", estado: "ACTIVO" },
];

export const certificadosOrganizacion = [
  { id: "CIC-2026-0218", nombre: "María Fernanda Soto", curso: "Lectura de planos para personal de campo", fecha: "15 Jul 2026", estado: "EMITIDO", cursoId: "doc-7", estudianteId: "alu-001", notaFinal: 18, horasCertificadas: 24, modulosCompletados: 5, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
  { id: "CIC-2026-0217", nombre: "Diana Chávez Puma", curso: "Gestión digital de obras con Tukuy", fecha: "14 Jul 2026", estado: "EMITIDO", cursoId: "doc-1", estudianteId: "alu-003", notaFinal: 19, horasCertificadas: 32, modulosCompletados: 6, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
  { id: "CIC-2026-0216", nombre: "Diana Chávez Puma", curso: "Lectura de planos para personal de campo", fecha: "12 Jul 2026", estado: "EMITIDO", cursoId: "doc-7", estudianteId: "alu-003", notaFinal: 17, horasCertificadas: 24, modulosCompletados: 5, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
  { id: "CIC-2026-0215", nombre: "Andrea Huamán Díaz", curso: "Lectura de planos para personal de campo", fecha: "11 Jul 2026", estado: "EMITIDO", cursoId: "doc-7", estudianteId: "alu-005", notaFinal: 18, horasCertificadas: 24, modulosCompletados: 5, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
  { id: "CIC-2026-0214", nombre: "Carlos Mendoza Ruiz", curso: "Lectura de planos para personal de campo", fecha: "10 Jul 2026", estado: "EMITIDO", cursoId: "doc-7", estudianteId: "alu-008", notaFinal: 16, horasCertificadas: 24, modulosCompletados: 5, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
  { id: "CIC-2026-0213", nombre: "Carlos Mendoza Ruiz", curso: "Control de calidad en obras civiles", fecha: "09 Jul 2026", estado: "EMITIDO", cursoId: "doc-11", estudianteId: "alu-008", notaFinal: 18, horasCertificadas: 40, modulosCompletados: 7, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
  { id: "CIC-2026-0212", nombre: "Patricia Gómez Ayala", curso: "Lectura de planos para personal de campo", fecha: "08 Jul 2026", estado: "EMITIDO", cursoId: "doc-7", estudianteId: "alu-011", notaFinal: 17, horasCertificadas: 24, modulosCompletados: 5, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
  { id: "CIC-2026-0211", nombre: "María Fernanda Soto", curso: "Seguridad y salud en trabajos de obra", fecha: "05 Jul 2026", estado: "EMITIDO", cursoId: "org-curso-sst", estudianteId: "alu-001", notaFinal: 19, horasCertificadas: 20, modulosCompletados: 4, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
  { id: "CIC-2026-0210", nombre: "Lucía Torres Benavides", curso: "Ética y responsabilidad profesional", fecha: "02 Jul 2026", estado: "EMITIDO", cursoId: "org-curso-etica", estudianteId: "alu-013", notaFinal: 18, horasCertificadas: 16, modulosCompletados: 4, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
  { id: "CIC-2026-0209", nombre: "Fernando Quispe Ríos", curso: "Seguridad y salud en trabajos de obra", fecha: "30 Jun 2026", estado: "EMITIDO", cursoId: "org-curso-sst", estudianteId: "alu-014", notaFinal: 16, horasCertificadas: 20, modulosCompletados: 4, versionPrograma: "2026.1", organizacionEmisora: ORGANIZACION },
];

export const certificadosPendientesOrganizacion = [
  { id: "cic-pend-001", nombre: "Andrea Huamán Díaz", curso: "Control de calidad en obras civiles", nota: 17, cursoId: "doc-11", estudianteId: "alu-005", horasCumplidas: 40, horasRequeridas: 40, modulosCompletados: 7, modulosTotales: 7, actividadesCalificadas: 12, actividadesRequeridas: 12 },
  { id: "cic-pend-002", nombre: "María Fernanda Soto", curso: "Gestión digital de obras con Tukuy", nota: 18, cursoId: "doc-1", estudianteId: "alu-001", horasCumplidas: 32, horasRequeridas: 32, modulosCompletados: 6, modulosTotales: 6, actividadesCalificadas: 10, actividadesRequeridas: 10 },
  { id: "cic-pend-003", nombre: "Patricia Gómez Ayala", curso: "Control de calidad en obras civiles", nota: 16, cursoId: "doc-11", estudianteId: "alu-011", horasCumplidas: 40, horasRequeridas: 40, modulosCompletados: 7, modulosTotales: 7, actividadesCalificadas: 12, actividadesRequeridas: 12 },
  { id: "cic-pend-004", nombre: "Rosa Mendoza Quispe", curso: "Gestión digital de obras con Tukuy", nota: 15, cursoId: "doc-1", estudianteId: "alu-009", horasCumplidas: 32, horasRequeridas: 32, modulosCompletados: 6, modulosTotales: 6, actividadesCalificadas: 10, actividadesRequeridas: 10 },
  { id: "cic-pend-005", nombre: "Luis Alberto Rojas", curso: "Control de calidad en obras civiles", nota: 12, cursoId: "doc-11", estudianteId: "alu-002", horasCumplidas: 18, horasRequeridas: 40, modulosCompletados: 3, modulosTotales: 7, actividadesCalificadas: 7, actividadesRequeridas: 12 },
];

export const usuariosOrganizacion = [
  {
    id: 1,
    nombre: "María Fernanda Soto",
    iniciales: "MS",
    correo: "maria.soto@cipcusco.org.pe",
    area: "Operaciones",
    sede: "Lima",
    rol: "Estudiante",
    progreso: 82,
    estado: "ACTIVO",
  },
  {
    id: 2,
    nombre: "Luis Alberto Rojas",
    iniciales: "LR",
    correo: "luis.rojas@cipcusco.org.pe",
    area: "Logística",
    sede: "Cusco",
    rol: "Estudiante",
    progreso: 64,
    estado: "ACTIVO",
  },
  {
    id: 3,
    nombre: "Diana Chávez Puma",
    iniciales: "DC",
    correo: "diana.chavez@cipcusco.org.pe",
    area: "Oficina técnica",
    sede: "Lima",
    rol: "Supervisora",
    progreso: 100,
    estado: "ACTIVO",
  },
  {
    id: 4,
    nombre: "José Manuel Vera",
    iniciales: "JV",
    correo: "jose.vera@cipcusco.org.pe",
    area: "Operaciones",
    sede: "Cusco",
    rol: "Estudiante",
    progreso: 28,
    estado: "INVITADO",
  },
  {
    id: 5,
    nombre: "Andrea Huamán Díaz",
    iniciales: "AH",
    correo: "andrea.huaman@cipcusco.org.pe",
    area: "Oficina técnica",
    sede: "Lima",
    rol: "Estudiante",
    progreso: 76,
    estado: "ACTIVO",
  },
  {
    id: 6,
    nombre: "Renato Paredes León",
    iniciales: "RP",
    correo: "renato.paredes@cipcusco.org.pe",
    area: "Logística",
    sede: "Lima",
    rol: "Estudiante",
    progreso: 41,
    estado: "ACTIVO",
  },
  {
    id: 7,
    nombre: "Elena Salazar Medina",
    iniciales: "ES",
    correo: "elena.salazar@cipcusco.org.pe",
    area: "Administración",
    sede: "Lima",
    rol: "Estudiante",
    progreso: 58,
    estado: "ACTIVO",
  },
  {
    id: 8,
    nombre: "Carlos Mendoza Ruiz",
    iniciales: "CM",
    correo: "carlos.mendoza@cipcusco.org.pe",
    area: "Operaciones",
    sede: "Cusco",
    rol: "Supervisor",
    progreso: 91,
    estado: "ACTIVO",
  },
  {
    id: 9,
    nombre: "Rosa Mendoza Quispe",
    iniciales: "RM",
    correo: "rosa.mendoza@cipcusco.org.pe",
    area: "Administración",
    sede: "Lima",
    rol: "Administradora",
    progreso: 67,
    estado: "ACTIVO",
  },
  {
    id: 10,
    nombre: "Miguel Ángel Flores",
    iniciales: "MF",
    correo: "miguel.flores@cipcusco.org.pe",
    area: "Operaciones",
    sede: "Lima",
    rol: "Estudiante",
    progreso: 35,
    estado: "EN_RIESGO",
  },
  {
    id: 11,
    nombre: "Patricia Gómez Ayala",
    iniciales: "PG",
    correo: "patricia.gomez@cipcusco.org.pe",
    area: "Oficina técnica",
    sede: "Cusco",
    rol: "Estudiante",
    progreso: 88,
    estado: "ACTIVO",
  },
  {
    id: 12,
    nombre: "Hugo Valdivia Cruz",
    iniciales: "HV",
    correo: "hugo.valdivia@cipcusco.org.pe",
    area: "Logística",
    sede: "Cusco",
    rol: "Estudiante",
    progreso: 22,
    estado: "SUSPENDIDO",
  },
  {
    id: 13,
    nombre: "Lucía Torres Benavides",
    iniciales: "LT",
    correo: "lucia.torres@cipcusco.org.pe",
    area: "Administración",
    sede: "Cusco",
    rol: "Estudiante",
    progreso: 73,
    estado: "ACTIVO",
  },
  {
    id: 14,
    nombre: "Fernando Quispe Ríos",
    iniciales: "FQ",
    correo: "fernando.quispe@cipcusco.org.pe",
    area: "Operaciones",
    sede: "Lima",
    rol: "Estudiante",
    progreso: 54,
    estado: "ACTIVO",
  },
];

export const areasOrganizacion = [
  {
    id: "area-operaciones",
    nombre: "Operaciones",
    usuarios: 168,
    responsable: "Diana Chávez",
    progreso: 76,
    color: "bg-blue-600",
  },
  {
    id: "area-logistica",
    nombre: "Logística",
    usuarios: 94,
    responsable: "Luis Rojas",
    progreso: 68,
    color: "bg-teal-600",
  },
  {
    id: "area-oficina-tecnica",
    nombre: "Oficina técnica",
    usuarios: 72,
    responsable: "Andrea Huamán",
    progreso: 84,
    color: "bg-violet-600",
  },
  {
    id: "area-administracion",
    nombre: "Administración",
    usuarios: 47,
    responsable: "Rosa Mendoza",
    progreso: 61,
    color: "bg-amber-500",
  },
];

export const asignacionesOrganizacion = [
  {
    id: "asig-001",
    curso: "Seguridad y salud en trabajos de obra",
    destino: "Todos los empleados",
    asignados: 381,
    completados: 298,
    vence: "20 Ago 2026",
    obligatorio: true,
  },
  {
    id: "asig-002",
    curso: "Control de almacén y Kardex",
    destino: "Área Logística",
    asignados: 94,
    completados: 61,
    vence: "05 Ago 2026",
    obligatorio: true,
  },
  {
    id: "asig-003",
    curso: "Gestión digital de obras con Tukuy",
    destino: "Área Oficina técnica",
    asignados: 72,
    completados: 49,
    vence: "Sin fecha límite",
    obligatorio: false,
  },
  {
    id: "asig-004",
    curso: "Lectura de planos para personal de campo",
    destino: "Área Operaciones",
    asignados: 168,
    completados: 112,
    vence: "15 Sep 2026",
    obligatorio: true,
  },
  {
    id: "asig-005",
    curso: "Avance físico y financiero de obra",
    destino: "Área Oficina técnica",
    asignados: 72,
    completados: 38,
    vence: "30 Ago 2026",
    obligatorio: true,
  },
  {
    id: "asig-006",
    curso: "Cuaderno de obra digital y evidencias",
    destino: "Sede Lima",
    asignados: 263,
    completados: 141,
    vence: "10 Sep 2026",
    obligatorio: false,
  },
  {
    id: "asig-007",
    curso: "Valorizaciones, metrados y reportes de obra",
    destino: "Área Oficina técnica",
    asignados: 72,
    completados: 55,
    vence: "22 Ago 2026",
    obligatorio: true,
  },
  {
    id: "asig-008",
    curso: "Tukuy Almacén: materiales, stock y movimientos",
    destino: "Área Logística",
    asignados: 94,
    completados: 27,
    vence: "18 Sep 2026",
    obligatorio: true,
  },
  {
    id: "asig-009",
    curso: "Introducción a Tukuy Obra: gestión y control de proyectos",
    destino: "Sede Cusco",
    asignados: 118,
    completados: 86,
    vence: "01 Sep 2026",
    obligatorio: false,
  },
  {
    id: "asig-010",
    curso: "Empleabilidad y CV para perfiles de obra",
    destino: "Área Administración",
    asignados: 47,
    completados: 19,
    vence: "Sin fecha límite",
    obligatorio: false,
  },
  {
    id: "asig-011",
    curso: "IA aplicada a reportes y decisiones de obra",
    destino: "Área Administración",
    asignados: 47,
    completados: 12,
    vence: "28 Sep 2026",
    obligatorio: false,
  },
  {
    id: "asig-012",
    curso: "Inducción de personal de obra",
    destino: "Área Operaciones",
    asignados: 168,
    completados: 150,
    vence: "12 Jul 2026",
    obligatorio: true,
  },
  {
    id: "asig-013",
    curso: "Supervisión de equipos de obra",
    destino: "Todos los empleados",
    asignados: 381,
    completados: 94,
    vence: "05 Oct 2026",
    obligatorio: false,
  },
];

export const rutasOrganizacion = [
  {
    id: "ruta-001",
    nombre: "Formación para supervisores",
    descripcion: "Itinerario para liderazgo y control de equipos en obra.",
    cursos: 3,
    cursosSeleccionados: [
      {
        id: "prop-doc-5",
        titulo: "Supervisión de equipos de obra",
        docente: "Ing. Jorge Vargas",
        orden: 1,
      },
      {
        id: "prop-doc-13",
        titulo: "Programación de obra con MS Project",
        docente: "Ing. Renato Salazar",
        orden: 2,
      },
      {
        id: "prop-doc-1",
        titulo: "Gestión digital de obras con Tukuy",
        docente: "Ing. Diana Chávez",
        orden: 3,
      },
    ],
    usuarios: 72,
    progreso: 68,
    certificado: true,
    precio: 349,
    gratuito: false,
    moneda: "PEN" as const,
    alcance: "AREA" as const,
    destinoArea: "Operaciones",
    descuentoInterno: 20,
    descuentoAplicaA: "AREA" as const,
    descuentoArea: "Operaciones",
  },
  {
    id: "ruta-002",
    nombre: "Inducción de personal de obra",
    descripcion: "Base operativa para personal nuevo en campo.",
    cursos: 2,
    cursosSeleccionados: [
      {
        id: "prop-doc-7",
        titulo: "Lectura de planos para personal de campo",
        docente: "Arq. Luis Quispe",
        orden: 1,
      },
      {
        id: "prop-doc-11",
        titulo: "Control de calidad en obras civiles",
        docente: "Ing. Patricia Soto",
        orden: 2,
      },
    ],
    usuarios: 118,
    progreso: 84,
    certificado: true,
    precio: 0,
    gratuito: true,
    moneda: "PEN" as const,
    alcance: "TODOS" as const,
    destinoArea: null,
    descuentoInterno: 100,
    descuentoAplicaA: "ORGANIZACION" as const,
    descuentoArea: null,
  },
  {
    id: "ruta-003",
    nombre: "Especialización en logística",
    descripcion: "Control de materiales y evidencias digitales.",
    cursos: 2,
    cursosSeleccionados: [
      {
        id: "prop-doc-9",
        titulo: "IA aplicada a reportes y decisiones de obra",
        docente: "Mg. Carla Mendoza",
        orden: 1,
      },
      {
        id: "prop-doc-1",
        titulo: "Gestión digital de obras con Tukuy",
        docente: "Ing. Diana Chávez",
        orden: 2,
      },
    ],
    usuarios: 46,
    progreso: 57,
    certificado: false,
    precio: 199,
    gratuito: false,
    moneda: "PEN" as const,
    alcance: "AREA" as const,
    destinoArea: "Logística",
    descuentoInterno: 30,
    descuentoAplicaA: "AREA" as const,
    descuentoArea: "Logística",
  },
  {
    id: "ruta-004",
    nombre: "Digitalización de obra con Tukuy",
    descripcion: "Ruta completa de adopción digital institucional.",
    cursos: 4,
    cursosSeleccionados: [
      {
        id: "prop-doc-1",
        titulo: "Gestión digital de obras con Tukuy",
        docente: "Ing. Diana Chávez",
        orden: 1,
      },
      {
        id: "prop-doc-9",
        titulo: "IA aplicada a reportes y decisiones de obra",
        docente: "Mg. Carla Mendoza",
        orden: 2,
      },
      {
        id: "prop-doc-13",
        titulo: "Programación de obra con MS Project",
        docente: "Ing. Renato Salazar",
        orden: 3,
      },
      {
        id: "prop-doc-5",
        titulo: "Supervisión de equipos de obra",
        docente: "Ing. Jorge Vargas",
        orden: 4,
      },
    ],
    usuarios: 95,
    progreso: 43,
    certificado: true,
    precio: 499,
    gratuito: false,
    moneda: "PEN" as const,
    alcance: "TODOS" as const,
    destinoArea: null,
    descuentoInterno: 0,
    descuentoAplicaA: "NINGUNO" as const,
    descuentoArea: null,
  },
  {
    id: "ruta-005",
    nombre: "Seguridad y cumplimiento normativo",
    descripcion: "Calidad y control para cumplimiento interno.",
    cursos: 2,
    cursosSeleccionados: [
      {
        id: "prop-doc-11",
        titulo: "Control de calidad en obras civiles",
        docente: "Ing. Patricia Soto",
        orden: 1,
      },
      {
        id: "prop-doc-7",
        titulo: "Lectura de planos para personal de campo",
        docente: "Arq. Luis Quispe",
        orden: 2,
      },
    ],
    usuarios: 210,
    progreso: 79,
    certificado: true,
    precio: 0,
    gratuito: true,
    moneda: "PEN" as const,
    alcance: "TODOS" as const,
    destinoArea: null,
    descuentoInterno: 100,
    descuentoAplicaA: "ORGANIZACION" as const,
    descuentoArea: null,
  },
];

export const alertasOrganizacion = [
  {
    id: 1,
    titulo: "Vencimiento próximo",
    detalle:
      "Seguridad y salud en obra vence en 36 días con 83 usuarios pendientes.",
    prioridad: "alta" as const,
  },
  {
    id: 2,
    titulo: "Baja finalización",
    detalle:
      "Administración registra 61% de avance, por debajo del promedio corporativo.",
    prioridad: "media" as const,
  },
  {
    id: 3,
    titulo: "Licencias por agotarse",
    detalle:
      "Quedan 73 licencias disponibles. Considera ampliar el plan antes de Q4.",
    prioridad: "media" as const,
  },
  {
    id: 4,
    titulo: "Asignación rezagada",
    detalle:
      "Tukuy Almacén en Logística solo alcanzó 29% de finalización.",
    prioridad: "alta" as const,
  },
  {
    id: 5,
    titulo: "Cohorte lista para certificar",
    detalle:
      "Inducción de personal de obra tiene 150 de 168 colaboradores listos.",
    prioridad: "baja" as const,
  },
];

export const actividadOrganizacion = [
  {
    titulo: "Nueva asignación publicada",
    detalle: "Control de almacén y Kardex asignado al área Logística.",
    tiempo: "Hace 2 h",
  },
  {
    titulo: "Certificados emitidos",
    detalle: "18 colaboradores completaron Seguridad y salud en obra.",
    tiempo: "Ayer",
  },
  {
    titulo: "Usuarios invitados",
    detalle: "12 nuevos accesos enviados al área Operaciones.",
    tiempo: "Hace 3 días",
  },
  {
    titulo: "Asignación a sede",
    detalle: "Cuaderno de obra digital publicado para Sede Lima.",
    tiempo: "Hace 5 h",
  },
  {
    titulo: "Ruta actualizada",
    detalle: "Digitalización de obra con Tukuy sumó 2 módulos nuevos.",
    tiempo: "Hace 1 día",
  },
  {
    titulo: "Progreso destacado",
    detalle: "Oficina técnica superó 84% de avance promedio.",
    tiempo: "Hace 2 días",
  },
];

export type EstadoPropuestaCursoOrganizacion =
  | "EN_REVISION"
  | "APROBADO"
  | "OBSERVADO"
  | "PUBLICADO";

export type AlcanceCursoOrganizacion =
  | "ORGANIZACION"
  | "AREA"
  | "EXTERNO"
  | "TODOS";

export type DestinatarioDescuento =
  | "NINGUNO"
  | "ORGANIZACION"
  | "AREA"
  | "EXTERNO";

export interface PropuestaCursoOrganizacionMock {
  id: string;
  cursoDocenteId: string;
  titulo: string;
  imagen: string;
  docente: string;
  categoria: string;
  enviado: string;
  lecciones: number;
  duracion: string;
  estado: EstadoPropuestaCursoOrganizacion;
  precio?: number;
  moneda?: "PEN" | "USD";
  gratuito?: boolean;
  alcance?: AlcanceCursoOrganizacion;
  destinoArea?: string | null;
  descuentoInterno?: number;
  descuentoAplicaA?: DestinatarioDescuento;
  descuentoArea?: string | null;
}

/** Propuestas enviadas por docentes de la organización para visto bueno. */
export const catalogoCursosOrganizacion: PropuestaCursoOrganizacionMock[] = [
  {
    id: "prop-doc-3",
    cursoDocenteId: "doc-3",
    titulo: "Valorizaciones y avance de obra",
    imagen:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80",
    docente: "Ing. Diana Chávez",
    categoria: "Gestión de obra",
    enviado: "12 Jul 2026",
    lecciones: 16,
    duracion: "6 h",
    estado: "EN_REVISION",
  },
  {
    id: "prop-doc-8",
    cursoDocenteId: "doc-8",
    titulo: "Cuaderno de obra digital y evidencias",
    imagen:
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80",
    docente: "Ing. Marco Ruiz",
    categoria: "Documentación digital",
    enviado: "Ayer, 10:40",
    lecciones: 12,
    duracion: "4 h 30 min",
    estado: "EN_REVISION",
  },
  {
    id: "prop-doc-12",
    cursoDocenteId: "doc-12",
    titulo: "Gestión de expedientes técnicos",
    imagen:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=80",
    docente: "Arq. Lucía Mendoza",
    categoria: "Expedientes técnicos",
    enviado: "11 Jul 2026",
    lecciones: 20,
    duracion: "8 h",
    estado: "EN_REVISION",
  },
  {
    id: "prop-doc-5",
    cursoDocenteId: "doc-5",
    titulo: "Supervisión de equipos de obra",
    imagen:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80",
    docente: "Ing. Jorge Vargas",
    categoria: "Operaciones",
    enviado: "08 Jul 2026",
    lecciones: 14,
    duracion: "5 h",
    estado: "APROBADO",
    precio: 149,
    moneda: "PEN",
    gratuito: false,
    alcance: "AREA",
    destinoArea: "Operaciones",
    descuentoInterno: 20,
    descuentoAplicaA: "AREA",
    descuentoArea: "Operaciones",
  },
  {
    id: "prop-doc-9",
    cursoDocenteId: "doc-9",
    titulo: "IA aplicada a reportes y decisiones de obra",
    imagen:
      "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&w=900&q=80",
    docente: "Mg. Carla Mendoza",
    categoria: "Tecnología",
    enviado: "13 Jul 2026",
    lecciones: 10,
    duracion: "3 h 40 min",
    estado: "APROBADO",
    precio: 0,
    moneda: "PEN",
    gratuito: true,
    alcance: "TODOS",
    destinoArea: null,
    descuentoInterno: 100,
    descuentoAplicaA: "ORGANIZACION",
    descuentoArea: null,
  },
  {
    id: "prop-doc-13",
    cursoDocenteId: "doc-13",
    titulo: "Programación de obra con MS Project",
    imagen:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
    docente: "Ing. Renato Salazar",
    categoria: "Planificación",
    enviado: "09 Jul 2026",
    lecciones: 18,
    duracion: "7 h",
    estado: "APROBADO",
    precio: 199,
    moneda: "PEN",
    gratuito: false,
    alcance: "AREA",
    destinoArea: "Oficina técnica",
    descuentoInterno: 25,
    descuentoAplicaA: "AREA",
    descuentoArea: "Oficina técnica",
  },
  {
    id: "prop-doc-1",
    cursoDocenteId: "doc-1",
    titulo: "Gestión digital de obras con Tukuy",
    imagen:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
    docente: "Ing. Diana Chávez",
    categoria: "Tukuy Obra",
    enviado: "01 Jul 2026",
    lecciones: 24,
    duracion: "10 h",
    estado: "PUBLICADO",
    precio: 0,
    moneda: "PEN",
    gratuito: true,
    alcance: "TODOS",
    destinoArea: null,
    descuentoInterno: 100,
    descuentoAplicaA: "ORGANIZACION",
    descuentoArea: null,
  },
  {
    id: "prop-doc-7",
    cursoDocenteId: "doc-7",
    titulo: "Lectura de planos para personal de campo",
    imagen:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
    docente: "Arq. Luis Quispe",
    categoria: "Construcción civil",
    enviado: "28 Jun 2026",
    lecciones: 15,
    duracion: "5 h 20 min",
    estado: "PUBLICADO",
    precio: 89,
    moneda: "PEN",
    gratuito: false,
    alcance: "TODOS",
    destinoArea: null,
    descuentoInterno: 15,
    descuentoAplicaA: "AREA",
    descuentoArea: "Operaciones",
  },
  {
    id: "prop-doc-11",
    cursoDocenteId: "doc-11",
    titulo: "Control de calidad en obras civiles",
    imagen:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
    docente: "Ing. Patricia Soto",
    categoria: "Calidad",
    enviado: "20 Jun 2026",
    lecciones: 22,
    duracion: "9 h",
    estado: "PUBLICADO",
    precio: 129,
    moneda: "PEN",
    gratuito: false,
    alcance: "EXTERNO",
    destinoArea: null,
    descuentoInterno: 0,
    descuentoAplicaA: "NINGUNO",
    descuentoArea: null,
  },
];
