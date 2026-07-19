import type {
  AsignacionPerfilUsuario,
  PerfilEntidad,
  PoliticaIncorporacionUnidad,
  ReglaAccesoCursoEntidad,
  TipoUnidadEntidad,
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";

export const tiposUnidadEntidad: TipoUnidadEntidad[] = [
  { id: "tipo-capitulo", nombreSingular: "Capítulo profesional", nombrePlural: "Capítulos profesionales", descripcion: "Agrupa miembros por especialidad profesional.", color: "#0B3A78", permiteSubunidades: true, estado: "ACTIVO" },
  { id: "tipo-direccion", nombreSingular: "Dirección", nombrePlural: "Direcciones", descripcion: "Unidad de conducción institucional.", color: "#B87A00", permiteSubunidades: true, estado: "ACTIVO" },
  { id: "tipo-administracion", nombreSingular: "Administración", nombrePlural: "Administraciones", descripcion: "Nivel encargado de ejecutar las decisiones de Dirección y administrar la estructura institucional.", color: "#C58A00", permiteSubunidades: true, estado: "ACTIVO" },
  { id: "tipo-comite", nombreSingular: "Comité", nombrePlural: "Comités", descripcion: "Equipo especializado permanente.", color: "#0E7490", permiteSubunidades: true, estado: "ACTIVO" },
  { id: "tipo-comision", nombreSingular: "Comisión", nombrePlural: "Comisiones", descripcion: "Grupo de trabajo temporal o temático.", color: "#6D28D9", permiteSubunidades: false, estado: "ACTIVO" },
];

export const politicasIncorporacionEntidad: PoliticaIncorporacionUnidad[] = [
  { id: "pol-especialidad", nombre: "Validación por especialidad", modalidad: "CON_APROBACION", especialidadesPermitidas: ["Ingeniería Civil"], requiereColegiaturaActiva: true, estado: "ACTIVA" },
  { id: "pol-admin", nombre: "Asignación administrativa", modalidad: "ASIGNACION_ADMIN", estado: "ACTIVA" },
  { id: "pol-abierta", nombre: "Incorporación abierta", modalidad: "ABIERTA", capacidadMaxima: 200, estado: "ACTIVA" },
];

export const unidadesOrganizacionales: UnidadOrganizacional[] = [
  { id: "unidad-direccion-gobierno", nombre: "Dirección", codigo: "DIR", tipoUnidadId: "tipo-direccion", unidadPadreId: null, responsableUsuarioId: "3", politicaIncorporacionId: "pol-admin", orden: 1, estado: "ACTIVA" },
  { id: "unidad-administracion", nombre: "Administración", codigo: "ADM", tipoUnidadId: "tipo-administracion", unidadPadreId: "unidad-direccion-gobierno", responsableUsuarioId: "9", politicaIncorporacionId: "pol-admin", orden: 1, estado: "ACTIVA" },
  { id: "unidad-capitulo-civil", nombre: "Capítulo de Ingeniería Civil", codigo: "CIC", tipoUnidadId: "tipo-capitulo", unidadPadreId: "unidad-administracion", responsableUsuarioId: "8", politicaIncorporacionId: "pol-especialidad", orden: 1, estado: "ACTIVA" },
  { id: "unidad-comite-construccion", nombre: "Comité de Construcción", codigo: "CC", tipoUnidadId: "tipo-comite", unidadPadreId: "unidad-capitulo-civil", responsableUsuarioId: "3", politicaIncorporacionId: "pol-abierta", orden: 1, estado: "ACTIVA" },
  { id: "unidad-comite-estructuras", nombre: "Comité de Estructuras", codigo: "CE", tipoUnidadId: "tipo-comite", unidadPadreId: "unidad-capitulo-civil", responsableUsuarioId: "11", politicaIncorporacionId: "pol-especialidad", orden: 2, estado: "ACTIVA" },
  { id: "unidad-comision-certificacion", nombre: "Comisión de Certificación", codigo: "CRC", tipoUnidadId: "tipo-comision", unidadPadreId: "unidad-administracion", responsableUsuarioId: "5", politicaIncorporacionId: "pol-admin", permiteSubunidades: true, orden: 4, estado: "ACTIVA" },
  { id: "unidad-capitulo-industrial", nombre: "Capítulo de Ingeniería Industrial", codigo: "CII", tipoUnidadId: "tipo-capitulo", unidadPadreId: "unidad-administracion", responsableUsuarioId: "2", politicaIncorporacionId: "pol-admin", orden: 2, estado: "ACTIVA" },
  { id: "unidad-capitulo-sistemas", nombre: "Capítulo de Ingeniería de Sistemas", codigo: "CIS", tipoUnidadId: "tipo-capitulo", unidadPadreId: "unidad-administracion", responsableUsuarioId: "7", politicaIncorporacionId: "pol-admin", orden: 3, estado: "ACTIVA" },
];

export const perfilesEntidad: PerfilEntidad[] = [
  { id: "perfil-direccion", nombre: "Dirección", descripcion: "Máxima autoridad y gobierno de la entidad.", tipo: "DIRECCION", plantilla: "DIRECCION", nivelAutoridad: 1000, permisos: ["entidad.gobernar", "administradores.designar", "auditoria.ver", "facturacion.ver", "reportes.ver"], alcanceDefecto: "ENTIDAD", rutaInicial: "/organizacion/inicio", esSistema: true, estado: "ACTIVO" },
  { id: "perfil-administracion", nombre: "Administración", descripcion: "Gestiona la operación, estructura, accesos y capacitación.", tipo: "ADMINISTRADOR", plantilla: "ADMINISTRACION", nivelAutoridad: 900, permisos: ["usuarios.administrar", "estructura.administrar", "perfiles.administrar", "cursos.ver", "cursos.crear", "cursos.editar", "asignaciones.crear", "certificados.emitir", "reportes.ver"], alcanceDefecto: "ENTIDAD", rutaInicial: "/organizacion/inicio", esSistema: true, estado: "ACTIVO" },
  { id: "perfil-director-academico", nombre: "Coordinación de certificación", descripcion: "Gestiona la oferta académica y los procesos de certificación bajo Administración.", tipo: "PERSONALIZADO", plantilla: "GESTION", nivelAutoridad: 700, permisos: ["cursos.ver", "cursos.aprobar", "asignaciones.crear", "certificados.emitir", "reportes.ver"], alcanceDefecto: "UNIDAD", rutaInicial: "/organizacion/inicio", esSistema: false, estado: "ACTIVO" },
  { id: "perfil-presidente-capitulo", nombre: "Presidente de capítulo", descripcion: "Supervisa miembros y resultados de su capítulo.", tipo: "PERSONALIZADO", plantilla: "SUPERVISION", nivelAutoridad: 600, permisos: ["alumnos.ver", "asignaciones.ver", "reportes.ver"], alcanceDefecto: "UNIDAD", rutaInicial: "/organizacion/inicio", esSistema: false, estado: "ACTIVO" },
  { id: "perfil-docente-especialista", nombre: "Docente especialista", descripcion: "Imparte cursos y evalúa a sus estudiantes.", tipo: "PERSONALIZADO", plantilla: "DOCENCIA", nivelAutoridad: 400, permisos: ["cursos.ver", "cursos.crear", "alumnos.ver", "evaluaciones.calificar"], alcanceDefecto: "CURSOS_PROPIOS", rutaInicial: "/docente/inicio", esSistema: false, estado: "ACTIVO" },
  { id: "perfil-colegiado", nombre: "Colegiado", descripcion: "Accede a aprendizaje, certificaciones y comunidad.", tipo: "PERSONALIZADO", plantilla: "APRENDIZAJE", nivelAutoridad: 100, permisos: ["cursos.ver", "aprendizaje.consumir", "certificados.ver"], alcanceDefecto: "PROPIO", rutaInicial: "/tukuy-academy/cursos", esSistema: false, estado: "ACTIVO" },
];

export const vinculacionesUnidad: VinculacionUnidad[] = [
  { id: "vin-001", usuarioId: "1", unidadId: "unidad-capitulo-civil", sedeId: "sede-cusco", tipo: "PRINCIPAL", origen: "REGLA_AUTOMATICA", estado: "ACTIVA", fechaInicio: "2026-01-10" },
  { id: "vin-002", usuarioId: "1", unidadId: "unidad-comite-construccion", sedeId: "sede-cusco", tipo: "SECUNDARIA", origen: "SOLICITUD_USUARIO", estado: "ACTIVA", fechaInicio: "2026-02-02", aprobadaPor: "usuario-demo" },
  { id: "vin-003", usuarioId: "2", unidadId: "unidad-capitulo-industrial", sedeId: "sede-cusco", tipo: "PRINCIPAL", origen: "IMPORTACION", estado: "ACTIVA", fechaInicio: "2026-01-10" },
  { id: "vin-004", usuarioId: "3", unidadId: "unidad-direccion-gobierno", sedeId: "sede-lima", tipo: "PRINCIPAL", origen: "ASIGNACION_ADMINISTRATIVA", estado: "ACTIVA", fechaInicio: "2025-08-01" },
  { id: "vin-005", usuarioId: "3", unidadId: "unidad-comite-construccion", sedeId: "sede-lima", tipo: "SECUNDARIA", origen: "ASIGNACION_ADMINISTRATIVA", estado: "ACTIVA", fechaInicio: "2026-01-15" },
  { id: "vin-006", usuarioId: "4", unidadId: "unidad-capitulo-civil", sedeId: "sede-cusco", tipo: "PRINCIPAL", origen: "SOLICITUD_USUARIO", estado: "PENDIENTE" },
  { id: "vin-007", usuarioId: "5", unidadId: "unidad-comision-certificacion", sedeId: "sede-lima", tipo: "PRINCIPAL", origen: "ASIGNACION_ADMINISTRATIVA", estado: "ACTIVA", fechaInicio: "2025-11-03" },
  { id: "vin-009", usuarioId: "6", unidadId: "unidad-capitulo-industrial", sedeId: "sede-lima", tipo: "PRINCIPAL", origen: "IMPORTACION", estado: "ACTIVA", fechaInicio: "2026-01-10" },
  { id: "vin-010", usuarioId: "7", unidadId: "unidad-capitulo-sistemas", sedeId: "sede-lima", tipo: "PRINCIPAL", origen: "REGLA_AUTOMATICA", estado: "ACTIVA", fechaInicio: "2026-01-10" },
  { id: "vin-011", usuarioId: "8", unidadId: "unidad-capitulo-civil", sedeId: "sede-cusco", tipo: "PRINCIPAL", origen: "ASIGNACION_ADMINISTRATIVA", estado: "ACTIVA", fechaInicio: "2025-06-01" },
  { id: "vin-012", usuarioId: "9", unidadId: "unidad-administracion", sedeId: "sede-lima", tipo: "PRINCIPAL", origen: "ASIGNACION_ADMINISTRATIVA", estado: "ACTIVA", fechaInicio: "2026-01-10" },
  { id: "vin-013", usuarioId: "10", unidadId: "unidad-capitulo-civil", sedeId: "sede-lima", tipo: "PRINCIPAL", origen: "REGLA_AUTOMATICA", estado: "ACTIVA", fechaInicio: "2026-02-18" },
  { id: "vin-014", usuarioId: "11", unidadId: "unidad-comite-estructuras", sedeId: "sede-cusco", tipo: "PRINCIPAL", origen: "ASIGNACION_ADMINISTRATIVA", estado: "ACTIVA", fechaInicio: "2025-09-20" },
  { id: "vin-015", usuarioId: "12", unidadId: "unidad-capitulo-civil", sedeId: "sede-cusco", tipo: "PRINCIPAL", origen: "SOLICITUD_USUARIO", estado: "PENDIENTE" },
  { id: "vin-016", usuarioId: "13", unidadId: "unidad-administracion", sedeId: "sede-cusco", tipo: "PRINCIPAL", origen: "ASIGNACION_ADMINISTRATIVA", estado: "ACTIVA", fechaInicio: "2026-01-10" },
  { id: "vin-017", usuarioId: "14", unidadId: "unidad-capitulo-civil", sedeId: "sede-lima", tipo: "PRINCIPAL", origen: "REGLA_AUTOMATICA", estado: "ACTIVA", fechaInicio: "2026-01-10" },
  { id: "vin-018", usuarioId: "15", unidadId: "unidad-capitulo-civil", sedeId: "sede-cusco", tipo: "PRINCIPAL", origen: "REGLA_AUTOMATICA", estado: "ACTIVA", fechaInicio: "2026-07-01" },
];

export const asignacionesPerfilUsuario: AsignacionPerfilUsuario[] = [
  { id: "apu-001", usuarioId: "5", perfilId: "perfil-director-academico", unidadIds: ["unidad-comision-certificacion"], sedeIds: [], incluirDescendientes: true, esPrincipal: true, estado: "ACTIVA" },
  { id: "apu-002", usuarioId: "8", perfilId: "perfil-presidente-capitulo", unidadIds: ["unidad-capitulo-civil"], sedeIds: [], incluirDescendientes: true, esPrincipal: true, estado: "ACTIVA" },
  { id: "apu-003", usuarioId: "5", perfilId: "perfil-docente-especialista", unidadIds: ["unidad-comision-certificacion"], sedeIds: [], incluirDescendientes: false, esPrincipal: false, estado: "ACTIVA" },
  { id: "apu-004", usuarioId: "15", perfilId: "perfil-colegiado", unidadIds: ["unidad-capitulo-civil"], sedeIds: ["sede-cusco"], incluirDescendientes: false, esPrincipal: true, estado: "ACTIVA" },
  { id: "apu-005", usuarioId: "3", perfilId: "perfil-direccion", unidadIds: ["unidad-direccion-gobierno"], sedeIds: ["sede-lima"], incluirDescendientes: true, esPrincipal: true, estado: "ACTIVA" },
  { id: "apu-006", usuarioId: "9", perfilId: "perfil-administracion", unidadIds: ["unidad-administracion"], sedeIds: ["sede-lima"], incluirDescendientes: true, esPrincipal: true, estado: "ACTIVA" },
];

export const reglasAccesoCursoEntidad: ReglaAccesoCursoEntidad[] = [
  {
    id: "regla-curso-000",
    cursoId: "c-000",
    cursoTitulo: "Introducción a Tukuy Obra: gestión y control de proyectos",
    publico: "TODA_LA_ENTIDAD",
    publicoIds: [],
    incluirDescendientes: true,
    modalidad: "LIBRE",
    estado: "ACTIVA",
  },
  {
    id: "regla-curso-001",
    cursoId: "c-001",
    cursoTitulo: "Seguridad y salud en trabajos de obra",
    publico: "TODA_LA_ENTIDAD",
    publicoIds: [],
    incluirDescendientes: true,
    modalidad: "LIBRE",
    cupo: 500,
    estado: "ACTIVA",
  },
  {
    id: "regla-curso-004",
    cursoId: "c-004",
    cursoTitulo: "Lectura de planos para personal de campo",
    publico: "UNIDADES",
    publicoIds: ["unidad-capitulo-civil"],
    incluirDescendientes: true,
    modalidad: "LIBRE",
    cupo: 120,
    estado: "ACTIVA",
  },
  {
    id: "regla-curso-005",
    cursoId: "c-005",
    cursoTitulo: "Avance físico y financiero de obra",
    publico: "ESPECIALIDADES",
    publicoIds: ["Ingeniería Civil"],
    incluirDescendientes: false,
    modalidad: "CON_APROBACION",
    cupo: 80,
    estado: "ACTIVA",
  },
  {
    id: "regla-curso-009",
    cursoId: "c-009",
    cursoTitulo: "IA aplicada a reportes y decisiones de obra",
    publico: "PERFILES",
    publicoIds: ["perfil-director-academico", "perfil-presidente-capitulo"],
    incluirDescendientes: false,
    modalidad: "SOLO_ASIGNACION",
    estado: "ACTIVA",
  },
];
