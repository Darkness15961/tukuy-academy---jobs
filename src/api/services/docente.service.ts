import { api } from "@/api/client";
import { academicoService } from "@/api/services/academico.service";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import {
  crearAlmacenDocumento,
  crearRepositorioLocal,
} from "@/api/repositorio-local";
import { CONTEXTO_SESION_KEY } from "@/lib/constants";
import {
  actividadRecienteDocente,
  analiticaDocente,
  calificacionesDocente,
  certificadosEmitidosDocente,
  certificadosPendientesDocente,
  conversacionesDocente,
  cursosDocente,
  estudiantesDocente,
  evaluacionesPendientes,
  sesionesDocente,
} from "@/portal-docente/data/docente.mock";
import type {
  ActividadDocente,
  AnaliticaDocente,
  BorradorCursoDocente,
  CalificacionDocente,
  CertificadoEmitidoDocente,
  CertificadoPendienteDocente,
  ConversacionDocente,
  CursoDocente,
  EstadoCursoDocente,
  EstudianteDocente,
  EvaluacionDocente,
  MensajeDocente,
  MovimientoIngresoDocente,
  NotificacionDocente,
  SesionDocente,
} from "@/portal-docente/types/docente.types";
import type { ContextoSesion } from "@/types/membresia.types";

export type {
  ActividadDocente,
  AnaliticaDocente,
  BorradorCursoDocente,
  CalificacionDocente,
  CertificadoEmitidoDocente,
  CertificadoPendienteDocente,
  ConversacionDocente,
  CursoDocente,
  EstudianteDocente,
  EvaluacionDocente,
  KpiAnaliticaDocente,
  MensajeDocente,
  MovimientoIngresoDocente,
  NotificacionDocente,
  SesionDocente,
} from "@/portal-docente/types/docente.types";

type Identificador = string | number;
type RegistroIdentificable = { id: Identificador };

export interface ConfiguracionDocente {
  nombre: string;
  especialidad: string;
  biografia: string;
  avisos: boolean;
  autenticacionDosPasos: boolean;
  alertasInicioSesion: boolean;
  zonaHoraria: string;
}

const contextoPredeterminado: ContextoSesion = {
  membresiaId: "mem-docente-organizacion",
  usuarioId: "usuario-actual",
  organizacionId: "org-empresa-abc",
  organizacionNombre: "COLEGIO DE INGENIEROS CUSCO",
  rol: "INSTRUCTOR",
  permisos: [],
  portal: "docente",
  ambitoDocencia: "ORGANIZACION",
};

function obtenerContextoActual(): ContextoSesion {
  const guardado = localStorage.getItem(CONTEXTO_SESION_KEY);
  if (!guardado) return contextoPredeterminado;

  try {
    return JSON.parse(guardado) as ContextoSesion;
  } catch {
    localStorage.removeItem(CONTEXTO_SESION_KEY);
    return contextoPredeterminado;
  }
}

function claveContextual(recurso: string, membresiaId?: string) {
  return `tukuy_demo_docente_${membresiaId ?? obtenerContextoActual().membresiaId}_${recurso}`;
}

function emitirCambio(recurso: string) {
  window.dispatchEvent(
    new CustomEvent("tukuy:docente-datos", { detail: { recurso } }),
  );
}

function crearRepositorioDocente<T extends RegistroIdentificable>(
  recurso: string,
  ruta: string,
  crearSemilla: (contexto: ContextoSesion) => T[],
) {
  function actual() {
    const contexto = obtenerContextoActual();
    return crearRepositorioLocal<T>({
      clave: claveContextual(recurso, contexto.membresiaId),
      ruta,
      semilla: crearSemilla(contexto),
      version: 3,
    });
  }

  return {
    listar: () => actual().listar(),
    obtener: (id: Identificador) => actual().obtener(id),
    crear: async (registro: T) => {
      const creado = await actual().crear(registro);
      emitirCambio(recurso);
      return creado;
    },
    actualizar: async (id: Identificador, cambios: Partial<T>) => {
      const actualizado = await actual().actualizar(id, cambios);
      emitirCambio(recurso);
      return actualizado;
    },
    eliminar: async (id: Identificador) => {
      await actual().eliminar(id);
      emitirCambio(recurso);
    },
    reemplazar: async (registros: T[]) => {
      const resultado = await actual().reemplazar(registros);
      emitirCambio(recurso);
      return resultado;
    },
    reiniciar: () => actual().reiniciar(),
  };
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cursosDelContexto(contexto: ContextoSesion): CursoDocente[] {
  const ambito = contexto.ambitoDocencia ?? "ORGANIZACION";
  return cursosDocente.filter((curso) => {
    if (ambito === "INDEPENDIENTE") return curso.ambito === "INDEPENDIENTE";
    return (
      curso.ambito === "ORGANIZACION" &&
      (!contexto.organizacionId ||
        curso.organizacionId === contexto.organizacionId)
    );
  });
}

function coincideConCurso(nombre: string, cursos: CursoDocente[]) {
  const buscado = normalizar(nombre);
  return cursos.some((curso) => {
    const titulo = normalizar(curso.titulo);
    return titulo.includes(buscado) || buscado.includes(titulo);
  });
}

function estudiantesDelContexto(contexto: ContextoSesion): EstudianteDocente[] {
  const ids = new Set(cursosDelContexto(contexto).map((curso) => curso.id));
  return estudiantesDocente.filter((estudiante) => ids.has(estudiante.cursoId));
}

function evaluacionesDelContexto(
  contexto: ContextoSesion,
): EvaluacionDocente[] {
  const permitidos = cursosDelContexto(contexto);
  return evaluacionesPendientes
    .filter((evaluacion) => coincideConCurso(evaluacion.curso, permitidos))
    .map((evaluacion) => ({
      ...evaluacion,
      estado: evaluacion.estado ?? "PENDIENTE",
    }));
}

function sesionesDelContexto(contexto: ContextoSesion): SesionDocente[] {
  const permitidos = cursosDelContexto(contexto);
  return sesionesDocente.filter((sesion) =>
    coincideConCurso(sesion.curso, permitidos),
  );
}

function conversacionesDelContexto(): ConversacionDocente[] {
  return conversacionesDocente.map((conversacion, indice) => ({
    ...conversacion,
    mensajes: [
      {
        id: `mensaje-inicial-${indice + 1}`,
        contenido: conversacion.mensaje,
        hora: conversacion.hora,
        autor: "ESTUDIANTE",
      },
    ],
  }));
}

function calificacionesDelContexto(
  contexto: ContextoSesion,
): CalificacionDocente[] {
  const permitidos = cursosDelContexto(contexto);
  return calificacionesDocente.filter((item) =>
    coincideConCurso(item.curso, permitidos),
  );
}

function certificadosDelContexto(
  contexto: ContextoSesion,
): CertificadoEmitidoDocente[] {
  const permitidos = cursosDelContexto(contexto);
  return certificadosEmitidosDocente.filter((item) =>
    coincideConCurso(item.curso, permitidos),
  );
}

function pendientesDelContexto(
  contexto: ContextoSesion,
): CertificadoPendienteDocente[] {
  const permitidos = cursosDelContexto(contexto);
  return certificadosPendientesDocente.filter((item) =>
    coincideConCurso(item.curso, permitidos),
  );
}

function ingresosDelContexto(
  contexto: ContextoSesion,
): MovimientoIngresoDocente[] {
  if (contexto.ambitoDocencia === "INDEPENDIENTE") {
    return [
      {
        id: "ing-1",
        curso: "Control de almacén y Kardex",
        fecha: "2026-07-14",
        concepto: "Venta individual",
        importe: 129,
        estado: "DISPONIBLE",
      },
      {
        id: "ing-2",
        curso: "Excel aplicado al control de obra",
        fecha: "2026-07-12",
        concepto: "Venta individual",
        importe: 89,
        estado: "POR_LIQUIDAR",
      },
      {
        id: "ing-3",
        curso: "Control de almacén y Kardex",
        fecha: "2026-07-08",
        concepto: "Liquidación quincenal",
        importe: 516,
        estado: "PAGADO",
      },
    ];
  }

  return [
    {
      id: "ing-org-1",
      curso: "Gestión digital de obras con Tukuy",
      fecha: "2026-07-15",
      concepto: "Honorarios por cohorte",
      importe: 1600,
      estado: "POR_LIQUIDAR",
    },
    {
      id: "ing-org-2",
      curso: "Supervisión de equipos de obra",
      fecha: "2026-06-30",
      concepto: "Honorarios mensuales",
      importe: 1250,
      estado: "PAGADO",
    },
  ];
}

function notificacionesDelContexto(
  contexto: ContextoSesion,
): NotificacionDocente[] {
  const curso = cursosDelContexto(contexto)[0]?.titulo ?? "tu curso";
  return [
    {
      id: "not-1",
      titulo: "Nueva entrega por revisar",
      detalle: `Tienes una actividad pendiente en ${curso}.`,
      fecha: "2026-07-16T09:10:00-05:00",
      leida: false,
      ruta: "/docente/evaluaciones",
      tipo: "EVALUACION",
    },
    {
      id: "not-2",
      titulo: "Sesión próxima",
      detalle: "Revisa el enlace y los materiales antes de iniciar.",
      fecha: "2026-07-16T08:30:00-05:00",
      leida: false,
      ruta: "/docente/sesiones",
      tipo: "SESION",
    },
  ];
}

function actividadesDelContexto(): ActividadDocente[] {
  const fechas = [
    "2026-07-16T09:48:00-05:00",
    "2026-07-16T08:00:00-05:00",
    "2026-07-15T17:30:00-05:00",
  ];
  return actividadRecienteDocente.map((actividad, indice) => ({
    id: `actividad-${indice + 1}`,
    titulo: actividad.titulo,
    detalle: actividad.detalle,
    fecha: fechas[indice] ?? new Date().toISOString(),
  }));
}

const cursosRepositorio = crearRepositorioDocente(
  "cursos",
  API.docente.cursos,
  cursosDelContexto,
);
const cursos = {
  ...cursosRepositorio,
  async listar() {
    const registros = await cursosRepositorio.listar();
    if (!apiConfig.useMock) return registros;
    const actualizados = registros.map((curso) => ({
      ...curso,
      ...(curso.ambito === "ORGANIZACION" &&
      curso.organizacionId === "org-academia-tukuy"
        ? {
            organizacionId: "org-empresa-abc",
            organizacionNombre: "COLEGIO DE INGENIEROS CUSCO",
          }
        : {}),
      ...(curso.id === "doc-11"
        ? {
            imagen:
              "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80",
          }
        : {}),
    }));
    if (
      actualizados.some(
        (curso, indice) =>
          curso.organizacionId !== registros[indice]?.organizacionId ||
          curso.organizacionNombre !== registros[indice]?.organizacionNombre ||
          curso.imagen !== registros[indice]?.imagen,
      )
    ) {
      await cursosRepositorio.reemplazar(actualizados);
    }
    return actualizados;
  },
};
const estudiantesRepositorio = crearRepositorioDocente(
  "estudiantes",
  API.docente.estudiantes,
  estudiantesDelContexto,
);
const estudiantes = {
  ...estudiantesRepositorio,
  async listar() {
    const registros = await estudiantesRepositorio.listar();
    if (!apiConfig.useMock) return registros;
    const cursosInstitucionales = new Set(["doc-1", "doc-3", "doc-5"]);
    const actualizados = registros.map((estudiante) =>
      cursosInstitucionales.has(estudiante.cursoId) &&
      estudiante.organizacion !== "COLEGIO DE INGENIEROS CUSCO"
        ? {
            ...estudiante,
            organizacion: "COLEGIO DE INGENIEROS CUSCO",
          }
        : estudiante,
    );
    if (
      actualizados.some(
        (estudiante, indice) =>
          estudiante.organizacion !== registros[indice]?.organizacion,
      )
    ) {
      await estudiantesRepositorio.reemplazar(actualizados);
    }
    return actualizados;
  },
};
const evaluaciones = crearRepositorioDocente(
  "evaluaciones",
  API.docente.evaluaciones,
  evaluacionesDelContexto,
);
const sesiones = crearRepositorioDocente(
  "sesiones",
  API.docente.sesiones,
  sesionesDelContexto,
);
const conversaciones = crearRepositorioDocente(
  "conversaciones",
  API.docente.conversaciones,
  conversacionesDelContexto,
);
const calificaciones = crearRepositorioDocente(
  "calificaciones",
  API.docente.calificaciones,
  calificacionesDelContexto,
);
const certificados = crearRepositorioDocente(
  "certificados",
  API.docente.certificados,
  certificadosDelContexto,
);
const certificadosPendientes = crearRepositorioDocente(
  "certificados_pendientes",
  API.docente.certificadosPendientes,
  pendientesDelContexto,
);
const ingresos = crearRepositorioDocente(
  "ingresos",
  API.docente.ingresos,
  ingresosDelContexto,
);
const notificaciones = crearRepositorioDocente(
  "notificaciones",
  API.docente.notificaciones,
  notificacionesDelContexto,
);
const actividades = crearRepositorioDocente(
  "actividades",
  API.docente.actividades,
  actividadesDelContexto,
);

const configuracionSemilla: ConfiguracionDocente = {
  nombre: "Carlos Alberto",
  especialidad: "Gestión y control de obras",
  biografia:
    "Profesional especialista en gestión digital, logística y control operativo de obras.",
  avisos: true,
  autenticacionDosPasos: false,
  alertasInicioSesion: true,
  zonaHoraria: "America/Lima",
};

function clonarAnalitica(origen: AnaliticaDocente): AnaliticaDocente {
  return JSON.parse(JSON.stringify(origen)) as AnaliticaDocente;
}

function almacenConfiguracion() {
  return crearAlmacenDocumento(
    claveContextual("configuracion"),
    configuracionSemilla,
    2,
  );
}

function almacenBorrador(
  membresiaId: string,
  cursoId: string,
  semilla: BorradorCursoDocente,
) {
  return crearAlmacenDocumento(
    claveContextual(`borrador_${cursoId}`, membresiaId),
    semilla,
    2,
  );
}

function idCursoPersistente(membresiaId: string, cursoId: string) {
  return cursoId === "nuevo" ? `borrador-${membresiaId}` : cursoId;
}

function progresoBorrador(borrador: BorradorCursoDocente) {
  const requisitos = [
    borrador.titulo,
    borrador.descripcion,
    borrador.publico,
    borrador.imagen,
    borrador.objetivos.length,
    borrador.secciones.some((seccion) => seccion.clases.length > 0),
  ];
  return Math.round(
    (requisitos.filter((valor) => Boolean(valor)).length / requisitos.length) *
      100,
  );
}

async function registrarActividad(titulo: string, detalle: string) {
  await actividades.crear({
    id: `actividad-${Date.now()}`,
    titulo,
    detalle,
    fecha: new Date().toISOString(),
  });
}

async function registrarNotificacion(
  datos: Omit<NotificacionDocente, "id" | "fecha" | "leida">,
) {
  return notificaciones.crear({
    ...datos,
    id: `notificacion-${Date.now()}`,
    fecha: new Date().toISOString(),
    leida: false,
  });
}

export const docenteService = {
  cursos,
  estudiantes,
  evaluaciones,
  sesiones,
  conversaciones,
  calificaciones,
  certificados,
  certificadosPendientes,
  ingresos,
  notificaciones,
  actividades,

  async obtenerConfiguracion(): Promise<ConfiguracionDocente> {
    if (apiConfig.useMock) return almacenConfiguracion().leer();
    const { data } = await api.get<ConfiguracionDocente>(
      API.docente.configuracion,
    );
    return data;
  },

  async guardarConfiguracion(
    configuracion: ConfiguracionDocente,
  ): Promise<ConfiguracionDocente> {
    if (apiConfig.useMock) {
      const guardada = almacenConfiguracion().guardar(configuracion);
      emitirCambio("configuracion");
      return guardada;
    }
    const { data } = await api.put<ConfiguracionDocente>(
      API.docente.configuracion,
      configuracion,
    );
    return data;
  },

  async obtenerBorrador(
    membresiaId: string,
    cursoId: string,
    semilla: BorradorCursoDocente,
  ): Promise<BorradorCursoDocente> {
    if (apiConfig.useMock) {
      return almacenBorrador(membresiaId, cursoId, semilla).leer();
    }
    const { data } = await api.get<BorradorCursoDocente>(
      `${API.docente.cursoPorId(cursoId)}/borrador`,
    );
    return data;
  },

  async guardarBorrador(
    membresiaId: string,
    cursoId: string,
    borrador: BorradorCursoDocente,
  ): Promise<BorradorCursoDocente> {
    if (apiConfig.useMock) {
      const guardado = almacenBorrador(membresiaId, cursoId, borrador).guardar(
        borrador,
      );
      emitirCambio("borrador");
      return guardado;
    }
    const { data } = await api.put<BorradorCursoDocente>(
      `${API.docente.cursoPorId(cursoId)}/borrador`,
      borrador,
    );
    return data;
  },

  async guardarCursoDesdeBorrador(
    membresiaId: string,
    cursoId: string,
    borrador: BorradorCursoDocente,
  ): Promise<CursoDocente> {
    await this.guardarBorrador(membresiaId, cursoId, borrador);
    const id = idCursoPersistente(membresiaId, cursoId);
    const existente = await cursos.obtener(id);
    const contexto = obtenerContextoActual();
    const datos: CursoDocente = {
      id,
      ambito:
        borrador.ambito === "INDEPENDIENTE" ? "INDEPENDIENTE" : "ORGANIZACION",
      organizacionId:
        borrador.ambito === "INDEPENDIENTE"
          ? null
          : (borrador.organizacionId ?? contexto.organizacionId),
      organizacionNombre:
        borrador.ambito === "INDEPENDIENTE"
          ? "Curso propio"
          : contexto.organizacionNombre,
      modeloAcceso:
        borrador.acceso === "PAGO"
          ? "VENTA_INDIVIDUAL"
          : "ASIGNACION_INSTITUCIONAL",
      titulo: borrador.titulo || "Curso sin título",
      imagen: borrador.imagen,
      estado: existente?.estado ?? "BORRADOR",
      estudiantes: existente?.estudiantes ?? 0,
      progreso: progresoBorrador(borrador),
      valoracion: existente?.valoracion ?? 0,
      actualizado: "Ahora",
    };

    const guardado = existente
      ? await cursos.actualizar(id, datos)
      : await cursos.crear(datos);
    await academicoService.sincronizarEstructuraCurso(id, borrador.secciones);
    return guardado;
  },

  async enviarBorradorRevision(
    membresiaId: string,
    cursoId: string,
    borrador: BorradorCursoDocente,
  ): Promise<CursoDocente> {
    if (!apiConfig.useMock) {
      const { data } = await api.post<CursoDocente>(
        API.docente.enviarCursoARevision(cursoId),
        borrador,
      );
      return data;
    }

    const curso = await this.guardarCursoDesdeBorrador(
      membresiaId,
      cursoId,
      borrador,
    );
    const actualizado = await cursos.actualizar(curso.id, {
      estado: "EN_REVISION",
      progreso: 100,
      actualizado: "Enviado ahora",
    });
    await registrarActividad("Curso enviado a revisión", actualizado.titulo);
    await registrarNotificacion({
      titulo: "Curso recibido para revisión",
      detalle: `${actualizado.titulo} ya está en la cola académica.`,
      ruta: "/docente/cursos",
      tipo: "CURSO",
    });
    return actualizado;
  },

  async duplicarCurso(id: string): Promise<CursoDocente> {
    if (!apiConfig.useMock) {
      const { data } = await api.post<CursoDocente>(
        API.docente.duplicarCurso(id),
      );
      return data;
    }
    const original = await cursos.obtener(id);
    if (!original) throw new Error("No se encontró el curso a duplicar");
    return cursos.crear({
      ...original,
      id: `${id}-copia-${Date.now()}`,
      titulo: `${original.titulo} · copia`,
      estado: "BORRADOR",
      estudiantes: 0,
      progreso: Math.min(original.progreso, 90),
      valoracion: 0,
      actualizado: "Ahora",
    });
  },

  async archivarCurso(id: string) {
    return cursos.actualizar(id, { estado: "ARCHIVADO", actualizado: "Ahora" });
  },

  async actualizarEstadoCurso(
    id: string,
    estado: EstadoCursoDocente,
  ): Promise<CursoDocente | null> {
    if (!apiConfig.useMock) {
      const { data } = await api.patch<CursoDocente>(
        API.docente.cursoPorId(id),
        { estado },
      );
      return data;
    }

    const actual = await cursos.obtener(id);
    if (actual) {
      return cursos.actualizar(id, {
        estado,
        actualizado: "Ahora",
        ...(estado === "APROBADO" || estado === "PUBLICADO"
          ? { progreso: 100 }
          : {}),
      });
    }

    // La organización aprueba desde otro contexto: sincroniza el repo del docente.
    const claveDocenteOrg = claveContextual("cursos", "mem-docente-tukuy");
    const crudo = localStorage.getItem(claveDocenteOrg);
    if (!crudo) return null;
    try {
      const sobre = JSON.parse(crudo) as {
        version: number;
        actualizadoEn: string;
        datos: CursoDocente[];
      };
      if (!Array.isArray(sobre.datos)) return null;
      const indice = sobre.datos.findIndex((curso) => curso.id === id);
      if (indice < 0) return null;
      const actualizado: CursoDocente = {
        ...sobre.datos[indice]!,
        estado,
        actualizado: "Ahora",
        ...(estado === "APROBADO" || estado === "PUBLICADO"
          ? { progreso: 100 }
          : {}),
      };
      sobre.datos[indice] = actualizado;
      sobre.actualizadoEn = new Date().toISOString();
      localStorage.setItem(claveDocenteOrg, JSON.stringify(sobre));
      emitirCambio("cursos");
      return actualizado;
    } catch {
      return null;
    }
  },

  async calificarEntrega(
    evaluacionId: string,
    nota: number,
    retroalimentacion: string,
  ): Promise<EvaluacionDocente> {
    if (!apiConfig.useMock) {
      const { data } = await api.post<EvaluacionDocente>(
        API.docente.calificarEvaluacion(evaluacionId),
        { nota, retroalimentacion },
      );
      return data;
    }
    const entregaAcademica =
      await academicoService.obtenerEntrega(evaluacionId);
    if (entregaAcademica) {
      const calificada = await academicoService.calificarEntrega(
        evaluacionId,
        nota,
        retroalimentacion,
      );
      await this.sincronizarCertificadosElegibles(calificada.cursoId);
      return {
        id: calificada.id,
        estudiante: calificada.estudianteNombre,
        actividad: calificada.actividadTitulo,
        curso: calificada.cursoTitulo,
        entrega: calificada.entregadaEn ?? "",
        tipo: "PDF",
        prioridad: "NORMAL",
        estado: "REVISADA",
        nota: calificada.nota,
        retroalimentacion: calificada.retroalimentacion,
        revisadaEn: calificada.calificadaEn,
      };
    }

    const evaluacion = await evaluaciones.obtener(evaluacionId);
    if (!evaluacion) throw new Error("No se encontró la entrega");
    const revisada = await evaluaciones.actualizar(evaluacionId, {
      estado: "REVISADA",
      nota,
      retroalimentacion,
      revisadaEn: new Date().toISOString(),
    });

    const existentes = await calificaciones.listar();
    const actual = existentes.find(
      (item) =>
        item.nombre === evaluacion.estudiante &&
        item.curso === evaluacion.curso,
    );
    const esTarea = evaluacion.tipo.toLowerCase().includes("tarea");
    if (actual) {
      const tareas = esTarea ? nota : actual.tareas;
      const examen = esTarea ? actual.examen : nota;
      await calificaciones.actualizar(actual.id, {
        tareas,
        examen,
        final: Math.round((tareas + examen) / 2),
        estado: (tareas + examen) / 2 >= 14 ? "APROBADO" : "EN_RIESGO",
      });
    } else {
      await calificaciones.crear({
        id: Date.now(),
        nombre: evaluacion.estudiante,
        iniciales: evaluacion.estudiante
          .split(" ")
          .slice(0, 2)
          .map((parte) => parte.charAt(0))
          .join(""),
        curso: evaluacion.curso,
        tareas: esTarea ? nota : 0,
        examen: esTarea ? 0 : nota,
        final: nota,
        estado: nota >= 14 ? "APROBADO" : "EN_RIESGO",
      });
    }

    await registrarActividad(
      "Evaluación calificada",
      `${evaluacion.estudiante} · ${evaluacion.actividad}`,
    );
    return revisada;
  },

  async emitirCertificado(
    pendienteId: string,
  ): Promise<CertificadoEmitidoDocente> {
    if (!apiConfig.useMock) {
      const { data } = await api.post<CertificadoEmitidoDocente>(
        API.docente.emitirCertificado(pendienteId),
      );
      return data;
    }
    const pendiente = await certificadosPendientes.obtener(pendienteId);
    if (!pendiente) throw new Error("No se encontró el certificado pendiente");
    if (!pendiente.cursoId || !pendiente.estudianteId) {
      throw new Error(
        "El certificado no cuenta con evidencias académicas vinculadas",
      );
    }
    const elegibilidad = await academicoService.obtenerElegibilidad(
      pendiente.cursoId,
      pendiente.estudianteId,
    );
    if (!elegibilidad.elegible) {
      throw new Error(
        `El estudiante aún no cumple los requisitos: ${elegibilidad.motivos.join(". ")}`,
      );
    }
    const contexto = obtenerContextoActual();
    const emitido = await certificados.crear({
      id: `TA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      nombre: pendiente.nombre,
      curso: pendiente.curso,
      fecha: new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
      estado: "EMITIDO",
      cursoId: pendiente.cursoId,
      estudianteId: pendiente.estudianteId,
      notaFinal: elegibilidad?.notaFinal ?? pendiente.nota,
      horasCertificadas:
        elegibilidad?.horasCumplidas ?? pendiente.horasCumplidas,
      modulosCompletados:
        elegibilidad?.modulosCompletados ?? pendiente.modulosCompletados,
      versionPrograma: "2026.1",
      organizacionEmisora: contexto.organizacionNombre || "Tukuy Academy",
    });
    await certificadosPendientes.eliminar(pendienteId);
    await academicoService.registrarVerificacion({
      codigo: emitido.id,
      estado: "VIGENTE",
      estudiante: emitido.nombre,
      curso: emitido.curso,
      horasCertificadas: emitido.horasCertificadas ?? 0,
      notaFinal: emitido.notaFinal ?? pendiente.nota,
      emitidoEn: emitido.fecha,
      organizacion: emitido.organizacionEmisora ?? "Tukuy Academy",
      modulosCompletados: emitido.modulosCompletados ?? 0,
      versionPrograma: emitido.versionPrograma ?? "2026.1",
    });
    await registrarActividad(
      "Certificado emitido",
      `${emitido.nombre} · ${emitido.curso}`,
    );
    return emitido;
  },

  async sincronizarCertificadosElegibles(cursoId?: string) {
    const [elegibilidades, pendientesActuales, emitidosActuales] =
      await Promise.all([
        academicoService.listarElegibilidades(cursoId),
        certificadosPendientes.listar(),
        certificados.listar(),
      ]);
    const elegibles = elegibilidades.filter((item) => item.elegible);
    const contexto = obtenerContextoActual();
    const normalizar = (valor: string) =>
      valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const elegibilidadDe = (emitido: CertificadoEmitidoDocente) =>
      elegibles.find((item) => {
        const cursoCertificado = normalizar(emitido.curso);
        const cursoAcademico = normalizar(item.cursoTitulo);
        return (
          (emitido.estudianteId === item.estudianteId ||
            emitido.nombre === item.estudianteNombre) &&
          (emitido.cursoId === item.cursoId ||
            cursoAcademico.includes(cursoCertificado) ||
            cursoCertificado.includes(cursoAcademico))
        );
      });

    if (apiConfig.useMock) {
      const emitidosSincronizados: CertificadoEmitidoDocente[] =
        emitidosActuales.map((emitido) => {
          const elegibilidad = elegibilidadDe(emitido);
          if (!elegibilidad) return emitido;
          return {
            ...emitido,
            cursoId: elegibilidad.cursoId,
            estudianteId: elegibilidad.estudianteId,
            notaFinal: elegibilidad.notaFinal,
            horasCertificadas: elegibilidad.horasCumplidas,
            modulosCompletados: elegibilidad.modulosCompletados,
            versionPrograma: emitido.versionPrograma ?? "2026.1",
            organizacionEmisora:
              emitido.organizacionEmisora ??
              contexto.organizacionNombre ??
              "Tukuy Academy",
          };
        });
      const clavesElegibles = new Set(
        elegibles.map((item) => `${item.cursoId}:${item.estudianteId}`),
      );
      const pendientesSincronizados = pendientesActuales.filter(
        (pendiente) =>
          Boolean(pendiente.cursoId) &&
          Boolean(pendiente.estudianteId) &&
          clavesElegibles.has(
            `${pendiente.cursoId}:${pendiente.estudianteId}`,
          ),
      );

      for (const elegibilidad of elegibles) {
        const yaEmitido = emitidosSincronizados.some(
          (certificado) =>
            (certificado.estudianteId === elegibilidad.estudianteId &&
              certificado.cursoId === elegibilidad.cursoId) ||
            (certificado.nombre === elegibilidad.estudianteNombre &&
              certificado.curso === elegibilidad.cursoTitulo),
        );
        const yaPendiente = pendientesSincronizados.some(
          (certificado) =>
            certificado.estudianteId === elegibilidad.estudianteId &&
            certificado.cursoId === elegibilidad.cursoId,
        );
        if (!yaEmitido && !yaPendiente) {
          pendientesSincronizados.push({
            id: `pendiente-${elegibilidad.cursoId}-${elegibilidad.estudianteId}`,
            nombre: elegibilidad.estudianteNombre,
            curso: elegibilidad.cursoTitulo,
            nota: elegibilidad.notaFinal,
            cursoId: elegibilidad.cursoId,
            estudianteId: elegibilidad.estudianteId,
            horasCumplidas: elegibilidad.horasCumplidas,
            horasRequeridas: elegibilidad.horasRequeridas,
            modulosCompletados: elegibilidad.modulosCompletados,
            modulosTotales: elegibilidad.modulosTotales,
            actividadesCalificadas: elegibilidad.actividadesCalificadas,
            actividadesRequeridas: elegibilidad.actividadesRequeridas,
          });
        }
      }

      const verificaciones = emitidosSincronizados
        .filter(
          (emitido) =>
            emitido.cursoId &&
            emitido.estudianteId &&
            emitido.horasCertificadas,
        )
        .map((emitido) => ({
          codigo: emitido.id,
          estado: "VIGENTE" as const,
          estudiante: emitido.nombre,
          curso: emitido.curso,
          horasCertificadas: emitido.horasCertificadas ?? 0,
          notaFinal: emitido.notaFinal ?? 0,
          emitidoEn: emitido.fecha,
          organizacion: emitido.organizacionEmisora ?? "Tukuy Academy",
          modulosCompletados: emitido.modulosCompletados ?? 0,
          versionPrograma: emitido.versionPrograma ?? "2026.1",
        }));

      await Promise.all([
        certificados.reemplazar(emitidosSincronizados),
        certificadosPendientes.reemplazar(pendientesSincronizados),
        academicoService.registrarVerificaciones(verificaciones),
      ]);
      return pendientesSincronizados;
    }

    for (const emitido of emitidosActuales) {
      const elegibilidad = elegibilidadDe(emitido);
      if (!elegibilidad) continue;
      const actualizado = await certificados.actualizar(emitido.id, {
        cursoId: elegibilidad.cursoId,
        estudianteId: elegibilidad.estudianteId,
        notaFinal: elegibilidad.notaFinal,
        horasCertificadas: elegibilidad.horasCumplidas,
        modulosCompletados: elegibilidad.modulosCompletados,
        versionPrograma: emitido.versionPrograma ?? "2026.1",
        organizacionEmisora:
          emitido.organizacionEmisora ??
          contexto.organizacionNombre ??
          "Tukuy Academy",
      });
      Object.assign(emitido, actualizado);
      await academicoService.registrarVerificacion({
        codigo: actualizado.id,
        estado: "VIGENTE",
        estudiante: actualizado.nombre,
        curso: actualizado.curso,
        horasCertificadas: actualizado.horasCertificadas ?? 0,
        notaFinal: actualizado.notaFinal ?? 0,
        emitidoEn: actualizado.fecha,
        organizacion: actualizado.organizacionEmisora ?? "Tukuy Academy",
        modulosCompletados: actualizado.modulosCompletados ?? 0,
        versionPrograma: actualizado.versionPrograma ?? "2026.1",
      });
    }
    const clavesElegibles = new Set(
      elegibles.map((item) => `${item.cursoId}:${item.estudianteId}`),
    );
    for (const pendiente of [...pendientesActuales]) {
      const clave = `${pendiente.cursoId}:${pendiente.estudianteId}`;
      if (
        !pendiente.cursoId ||
        !pendiente.estudianteId ||
        !clavesElegibles.has(clave)
      ) {
        await certificadosPendientes.eliminar(pendiente.id);
        const indice = pendientesActuales.findIndex(
          (item) => item.id === pendiente.id,
        );
        if (indice >= 0) pendientesActuales.splice(indice, 1);
      }
    }
    for (const elegibilidad of elegibles) {
      const yaEmitido = emitidosActuales.some(
        (certificado) =>
          (certificado.estudianteId === elegibilidad.estudianteId &&
            certificado.cursoId === elegibilidad.cursoId) ||
          (certificado.nombre === elegibilidad.estudianteNombre &&
            certificado.curso === elegibilidad.cursoTitulo),
      );
      const yaPendiente = pendientesActuales.some(
        (certificado) =>
          (certificado.estudianteId === elegibilidad.estudianteId &&
            certificado.cursoId === elegibilidad.cursoId) ||
          (certificado.nombre === elegibilidad.estudianteNombre &&
            certificado.curso === elegibilidad.cursoTitulo),
      );
      if (!yaEmitido && !yaPendiente) {
        const nuevo = await certificadosPendientes.crear({
          id: `pendiente-${elegibilidad.cursoId}-${elegibilidad.estudianteId}`,
          nombre: elegibilidad.estudianteNombre,
          curso: elegibilidad.cursoTitulo,
          nota: elegibilidad.notaFinal,
          cursoId: elegibilidad.cursoId,
          estudianteId: elegibilidad.estudianteId,
          horasCumplidas: elegibilidad.horasCumplidas,
          horasRequeridas: elegibilidad.horasRequeridas,
          modulosCompletados: elegibilidad.modulosCompletados,
          modulosTotales: elegibilidad.modulosTotales,
          actividadesCalificadas: elegibilidad.actividadesCalificadas,
          actividadesRequeridas: elegibilidad.actividadesRequeridas,
        });
        pendientesActuales.push(nuevo);
      }
    }
    return certificadosPendientes.listar();
  },

  async enviarMensaje(
    conversacionId: string,
    contenido: string,
    adjunto?: MensajeDocente["adjunto"],
  ): Promise<ConversacionDocente> {
    if (!apiConfig.useMock) {
      const { data } = await api.post<ConversacionDocente>(
        API.docente.mensajesConversacion(conversacionId),
        { contenido, adjunto },
      );
      return data;
    }
    const conversacion = await conversaciones.obtener(conversacionId);
    if (!conversacion) throw new Error("No se encontró la conversación");
    const mensaje: MensajeDocente = {
      id: `mensaje-${Date.now()}`,
      contenido,
      hora: new Intl.DateTimeFormat("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
      autor: "DOCENTE",
      adjunto,
    };
    const actualizada = await conversaciones.actualizar(conversacionId, {
      mensaje: contenido,
      hora: mensaje.hora,
      mensajes: [...(conversacion.mensajes ?? []), mensaje],
      noLeidos: 0,
    });
    await registrarActividad("Mensaje enviado", conversacion.nombre);
    return actualizada;
  },

  async marcarConversacionLeida(conversacionId: string) {
    if (!apiConfig.useMock) {
      const { data } = await api.post<ConversacionDocente>(
        API.docente.leerConversacion(conversacionId),
      );
      return data;
    }
    return conversaciones.actualizar(conversacionId, { noLeidos: 0 });
  },

  async iniciarSesion(sesionId: string) {
    if (!apiConfig.useMock) {
      const { data } = await api.post<SesionDocente>(
        API.docente.iniciarSesion(sesionId),
      );
      return data;
    }
    const actualizada = await sesiones.actualizar(sesionId, {
      estado: "EN_VIVO",
      enlace: `https://meet.tukuy.academy/${sesionId}`,
    });
    await registrarActividad("Sesión iniciada", actualizada.titulo);
    return actualizada;
  },

  async cancelarSesion(sesionId: string) {
    if (!apiConfig.useMock) {
      const { data } = await api.post<SesionDocente>(
        API.docente.cancelarSesion(sesionId),
      );
      return data;
    }
    return sesiones.actualizar(sesionId, { estado: "CANCELADA" });
  },

  async marcarNotificacionesLeidas() {
    if (!apiConfig.useMock) {
      await api.post(API.docente.leerNotificaciones);
      return;
    }
    const lista = await notificaciones.listar();
    await notificaciones.reemplazar(
      lista.map((notificacion) => ({ ...notificacion, leida: true })),
    );
  },

  async obtenerAnalitica(periodo = "30d"): Promise<AnaliticaDocente> {
    if (!apiConfig.useMock) {
      const { data } = await api.get<AnaliticaDocente>(
        API.docente.analitica,
        { params: { periodo } },
      );
      return data;
    }

    const [listaCursos, listaEstudiantes, emitidos] = await Promise.all([
      cursos.listar(),
      estudiantes.listar(),
      certificados.listar(),
    ]);
    const resultado = clonarAnalitica(analiticaDocente);
    const etiquetasPeriodo: Record<string, string> = {
      "7d": "Últimos 7 días",
      "30d": "Últimos 30 días",
      "90d": "Últimos 90 días",
      "1a": "Último año",
      anio: "Este año",
    };
    resultado.periodo = etiquetasPeriodo[periodo] ?? "Últimos 30 días";

    const completados = listaEstudiantes.filter(
      (estudiante) => estudiante.estado === "COMPLETADO",
    ).length;
    const enRiesgo = listaEstudiantes.filter(
      (estudiante) => estudiante.estado === "EN_RIESGO",
    );
    const promedioProgreso = listaEstudiantes.length
      ? Math.round(
          listaEstudiantes.reduce((total, item) => total + item.progreso, 0) /
            listaEstudiantes.length,
        )
      : 0;
    const valoracion = listaCursos.filter((curso) => curso.valoracion > 0);
    const promedioValoracion = valoracion.length
      ? valoracion.reduce((total, curso) => total + curso.valoracion, 0) /
        valoracion.length
      : 0;
    const tasaFinalizacion = listaEstudiantes.length
      ? Math.round((completados / listaEstudiantes.length) * 100)
      : 0;
    const valores: Record<string, string> = {
      estudiantes: String(listaEstudiantes.length),
      finalizacion: `${tasaFinalizacion}%`,
      horas: String(Math.round(listaEstudiantes.length * 4.4)),
      certificados: String(emitidos.length),
      satisfaccion: promedioValoracion.toFixed(1),
      riesgo: String(enRiesgo.length),
      progreso: `${promedioProgreso}%`,
    };
    resultado.kpis = resultado.kpis.map((kpi) => ({
      ...kpi,
      valor: valores[kpi.id] ?? kpi.valor,
    }));
    resultado.rendimientoCursos = listaCursos.map((curso) => {
      const participantes = listaEstudiantes.filter(
        (estudiante) => estudiante.cursoId === curso.id,
      );
      const certificadosCurso = emitidos.filter((certificado) =>
        coincideConCurso(certificado.curso, [curso]),
      ).length;
      return {
        id: curso.id,
        nombre: curso.titulo,
        estudiantes: participantes.length,
        finalizacion: participantes.length
          ? Math.round(
              (participantes.filter((item) => item.estado === "COMPLETADO")
                .length /
                participantes.length) *
                100,
            )
          : 0,
        progresoMedio: participantes.length
          ? Math.round(
              participantes.reduce((total, item) => total + item.progreso, 0) /
                participantes.length,
            )
          : curso.progreso,
        valoracion: curso.valoracion,
        horas: Math.round(participantes.length * 4.4),
        certificados: certificadosCurso,
      };
    });
    resultado.distribucionEstados = [
      {
        estado: "ACTIVO",
        cantidad: listaEstudiantes.filter((item) => item.estado === "ACTIVO")
          .length,
        color: "#0B3A78",
      },
      { estado: "COMPLETADO", cantidad: completados, color: "#16A34A" },
      { estado: "EN_RIESGO", cantidad: enRiesgo.length, color: "#DC2626" },
    ];
    resultado.estudiantesEnRiesgo = enRiesgo.map((estudiante) => ({
      nombre: estudiante.nombre,
      iniciales: estudiante.iniciales,
      curso: estudiante.curso,
      progreso: estudiante.progreso,
      ultimoAcceso: estudiante.ultimoAcceso,
      motivo:
        estudiante.progreso < 20
          ? "Progreso estancado"
          : "Sin actividad reciente",
    }));
    resultado.embudoAprendizaje = [
      { etapa: "Inscritos", valor: listaEstudiantes.length, porcentaje: 100 },
      {
        etapa: "Iniciaron módulo 1",
        valor: listaEstudiantes.filter((item) => item.progreso > 0).length,
        porcentaje: listaEstudiantes.length
          ? Math.round(
              (listaEstudiantes.filter((item) => item.progreso > 0).length /
                listaEstudiantes.length) *
                100,
            )
          : 0,
      },
      {
        etapa: "Mitad del curso",
        valor: listaEstudiantes.filter((item) => item.progreso >= 50).length,
        porcentaje: listaEstudiantes.length
          ? Math.round(
              (listaEstudiantes.filter((item) => item.progreso >= 50).length /
                listaEstudiantes.length) *
                100,
            )
          : 0,
      },
      {
        etapa: "Completaron evaluaciones",
        valor: completados,
        porcentaje: listaEstudiantes.length
          ? Math.round((completados / listaEstudiantes.length) * 100)
          : 0,
      },
      {
        etapa: "Certificados",
        valor: emitidos.length,
        porcentaje: listaEstudiantes.length
          ? Math.round((emitidos.length / listaEstudiantes.length) * 100)
          : 0,
      },
    ];
    return resultado;
  },

  async obtenerPanel() {
    const [
      listaCursos,
      listaEstudiantes,
      listaEvaluaciones,
      listaSesiones,
      listaActividades,
      listaNotificaciones,
    ] = await Promise.all([
      cursos.listar(),
      estudiantes.listar(),
      academicoService.listarEntregasDocente(),
      sesiones.listar(),
      actividades.listar(),
      notificaciones.listar(),
    ]);

    return {
      cursos: listaCursos,
      estudiantes: listaEstudiantes,
      evaluaciones: listaEvaluaciones
        .filter((entrega) =>
          ["ENTREGADA", "EN_REVISION", "OBSERVADA"].includes(entrega.estado),
        )
        .map(
          (entrega): EvaluacionDocente => ({
            id: entrega.id,
            estudiante: entrega.estudianteNombre,
            actividad: entrega.actividadTitulo,
            curso: entrega.cursoTitulo,
            entrega: entrega.entregadaEn
              ? new Intl.DateTimeFormat("es-PE", {
                  day: "2-digit",
                  month: "short",
                }).format(new Date(entrega.entregadaEn))
              : "Sin entregar",
            tipo:
              entrega.archivo?.tipo === "application/pdf" ? "PDF" : "Archivo",
            prioridad: entrega.estado === "OBSERVADA" ? "ALTA" : "NORMAL",
            estado: "PENDIENTE",
            retroalimentacion: entrega.retroalimentacion,
          }),
        ),
      sesiones: listaSesiones,
      actividades: listaActividades,
      notificaciones: listaNotificaciones,
    };
  },
};
