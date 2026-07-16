export const API = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  courses: {
    list: "/courses",
    byId: (id: string) => `/courses/${id}` as const,
    publicDetail: (id: string) => `/courses/${id}/public-detail` as const,
    progress: (id: string) => `/courses/${id}/progress` as const,
    content: (id: string) => `/courses/${id}/content` as const,
  },
  aprendizaje: {
    contenidos: "/aprendizaje/contenidos",
    progresos: "/aprendizaje/progresos",
    progresoPorCurso: (id: string) => `/aprendizaje/progresos/${id}` as const,
  },
  academico: {
    modulos: "/academico/modulos",
    entregas: "/academico/entregas",
    resumenCalificaciones: "/docente/calificaciones/cursos",
    estructuraCurso: (cursoId: string) =>
      `/academico/cursos/${cursoId}/estructura` as const,
    entregasCurso: (cursoId: string) =>
      `/docente/cursos/${cursoId}/entregas` as const,
    calificarEntrega: (entregaId: string) =>
      `/docente/entregas/${entregaId}/calificacion` as const,
    solicitarCorreccion: (entregaId: string) =>
      `/docente/entregas/${entregaId}/solicitar-correccion` as const,
    archivoEntrega: (entregaId: string) =>
      `/docente/entregas/${entregaId}/archivo` as const,
    entregarActividad: (cursoId: string, actividadId: string) =>
      `/aprendizaje/cursos/${cursoId}/actividades/${actividadId}/entregas` as const,
    verificarCertificado: (codigo: string) =>
      `/certificados/verificar/${codigo}` as const,
  },
  jobs: {
    list: "/jobs",
    apply: (id: string) => `/jobs/${id}/apply` as const,
  },
  bolsa: {
    vacantes: "/bolsa/vacantes",
    vacantePorId: (id: string) => `/bolsa/vacantes/${id}` as const,
    postulaciones: "/bolsa/mis-postulaciones",
    postular: (id: string) => `/bolsa/vacantes/${id}/postulaciones` as const,
    guardar: (id: string) => `/bolsa/vacantes/${id}/guardar` as const,
  },
  comunidad: {
    publicaciones: "/comunidad/publicaciones",
    publicacionPorId: (id: string) => `/comunidad/publicaciones/${id}` as const,
    comentarios: (id: string) =>
      `/comunidad/publicaciones/${id}/comentarios` as const,
    reacciones: (id: string) =>
      `/comunidad/publicaciones/${id}/reacciones` as const,
    grupos: "/comunidad/grupos",
    eventos: "/comunidad/eventos",
  },
  user: {
    profile: "/user/profile",
    experiences: "/user/experiences",
  },
  content: {
    carousel: "/content/carousel",
    modules: "/content/modules",
    hero: "/content/hero",
    nav: "/content/nav",
  },
  payments: {
    orders: "/pagos/ordenes",
    cartOrders: "/pagos/ordenes/carrito",
    byId: (id: string) => `/pagos/ordenes/${id}` as const,
    confirmClientResponse: (id: string) =>
      `/pagos/ordenes/${id}/respuesta-izipay` as const,
  },
  docente: {
    resumen: "/docente/resumen",
    cursos: "/docente/cursos",
    borradorCurso: "/docente/cursos/borrador",
    enviarCursoRevision: "/docente/cursos/enviar-revision",
    estudiantes: "/docente/estudiantes",
    evaluaciones: "/docente/evaluaciones",
    sesiones: "/docente/sesiones",
    calificaciones: "/docente/calificaciones",
    certificados: "/docente/certificados",
    certificadosPendientes: "/docente/certificados/pendientes",
    conversaciones: "/docente/conversaciones",
    configuracion: "/docente/configuracion",
    analitica: "/docente/analitica",
    actividades: "/docente/actividades",
    notificaciones: "/docente/notificaciones",
    ingresos: "/docente/ingresos",
    cursoPorId: (id: string) => `/docente/cursos/${id}` as const,
    duplicarCurso: (id: string) => `/docente/cursos/${id}/duplicar` as const,
    enviarCursoARevision: (id: string) =>
      `/docente/cursos/${id}/enviar-revision` as const,
    calificarEvaluacion: (id: string) =>
      `/docente/evaluaciones/${id}/calificacion` as const,
    iniciarSesion: (id: string) => `/docente/sesiones/${id}/iniciar` as const,
    cancelarSesion: (id: string) => `/docente/sesiones/${id}/cancelar` as const,
    mensajesConversacion: (id: string) =>
      `/docente/conversaciones/${id}/mensajes` as const,
    leerConversacion: (id: string) =>
      `/docente/conversaciones/${id}/leer` as const,
    emitirCertificado: (id: string) =>
      `/docente/certificados/pendientes/${id}/emitir` as const,
    leerNotificaciones: "/docente/notificaciones/leer",
  },
  organizacion: {
    resumen: "/organizacion/resumen",
    alumnos: "/organizacion/alumnos",
    certificados: "/organizacion/certificados",
    certificadosPendientes: "/organizacion/certificados/pendientes",
    emitirCertificado: (id: string) =>
      `/organizacion/certificados/pendientes/${id}/emitir` as const,
    usuarios: "/organizacion/usuarios",
    areas: "/organizacion/areas",
    sedes: "/organizacion/sedes",
    asignaciones: "/organizacion/asignaciones",
    rutas: "/organizacion/rutas-aprendizaje",
    configuracion: "/organizacion/configuracion",
    integraciones: "/organizacion/integraciones",
    licencia: "/organizacion/licencia",
    facturacion: "/organizacion/facturacion",
    comprobantes: "/organizacion/facturacion/comprobantes",
    notificaciones: "/organizacion/notificaciones",
    catalogoCursos: "/organizacion/catalogo-cursos",
    aprobarCurso: (id: string) =>
      `/organizacion/catalogo-cursos/${id}/aprobar` as const,
    observarCurso: (id: string) =>
      `/organizacion/catalogo-cursos/${id}/observar` as const,
  },
  administracion: {
    resumen: "/administracion/resumen",
    organizaciones: "/administracion/organizaciones",
    usuarios: "/administracion/usuarios",
    cursos: "/administracion/cursos",
    planes: "/administracion/planes",
    facturas: "/administracion/facturas",
    auditoria: "/administracion/auditoria",
    configuracion: "/administracion/configuracion",
  },
} as const;
