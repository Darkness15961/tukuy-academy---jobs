import { api } from "@/api/client";
import { academicoService } from "@/api/services/academico.service";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import {
  crearAlmacenDocumento,
  crearRepositorioLocal,
} from "@/api/repositorio-local";
import { CONTEXTO_SESION_KEY } from "@/lib/constants";
import { env } from "@/lib/env";
import { urlPortalLoginClaseEnVivo } from "@/lib/ruta-consumo-curso";
import { mapearCursoSecundariaADocente, mapearDocumentoABorrador, mapearSesionSecundariaADocente } from "@/api/services/mapper-curso-secundaria";
import { perfilDocenteService } from "@/api/services/perfil-docente.service";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import { sesionesEnVivoCompartidas } from "@/api/services/sesiones-en-vivo-compartidas.service";
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
  cargo: string;
  especialidad: string;
  biografia: string;
  experiencia: string[];
  fotoUrl?: string;
}

const contextoPredeterminado: ContextoSesion = {
  membresiaId: "mem-docente-organizacion",
  funcionId: "mem-docente-organizacion",
  rolId: "INSTRUCTOR",
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
    const sinDemo =
      apiConfig.sinDatosDemo || apiConfig.secundariaCursos;
    return crearRepositorioLocal<T>({
      clave: claveContextual(recurso, contexto.membresiaId),
      ruta,
      semilla: sinDemo ? [] : crearSemilla(contexto),
      version: sinDemo ? 10 : 6,
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

function cursoEsDelDocenteActual(
  curso: CursoDocente,
  contexto: ContextoSesion,
) {
  const yo = contexto.usuarioId?.trim();
  if (!yo) return false;
  if (curso.docenteResponsableId && curso.docenteResponsableId === yo) {
    return true;
  }
  const asignados = contexto.alcance?.cursoIds;
  return Boolean(asignados?.length && asignados.includes(curso.id));
}

/** Org-admin ve el catálogo institucional; el docente solo lo suyo. */
function limitarCursosSegunPortal(
  cursos: CursoDocente[],
  contexto: ContextoSesion,
) {
  if (contexto.portal !== "docente") return cursos;
  return cursos.filter((curso) => cursoEsDelDocenteActual(curso, contexto));
}

function cursosDelContexto(contexto: ContextoSesion): CursoDocente[] {
  const ambito = contexto.ambitoDocencia ?? "ORGANIZACION";
  const base = cursosDocente.filter((curso) => {
    if (ambito === "INDEPENDIENTE") return curso.ambito === "INDEPENDIENTE";
    return (
      curso.ambito === "ORGANIZACION" &&
      (!contexto.organizacionId ||
        curso.organizacionId === contexto.organizacionId)
    );
  });

  // Docente de organización: solo cursos asignados en la membresía.
  const idsAlcance = contexto.alcance?.cursoIds;
  if (
    contexto.portal === "docente" &&
    ambito === "ORGANIZACION" &&
    idsAlcance?.length
  ) {
    const permitidos = new Set(idsAlcance);
    return base.filter((curso) => permitidos.has(curso.id));
  }

  return base;
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
  const ids = new Set(cursosDelContexto(contexto).map((curso) => curso.id));
  return sesionesDocente.filter((sesion) => ids.has(sesion.cursoId));
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
      ruta: "/docente/calendario",
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
    if (apiConfig.secundariaCursos) {
      const contexto = obtenerContextoActual();
      const listado = await secundariaGatewayService.listarCursos();
      const base = listado.cursos.map((curso) =>
        mapearCursoSecundariaADocente(curso, contexto),
      );
      const observados = base.filter((curso) => curso.estado === "OBSERVADO");
      if (!observados.length) {
        return limitarCursosSegunPortal(base, contexto);
      }

      const enriquecidos = await Promise.all(
        observados.map(async (curso) => {
          try {
            const detalle =
              await secundariaGatewayService.obtenerBorrador(curso.id);
            const obs = (detalle.borrador as { observacion?: string } | null)
              ?.observacion;
            return obs
              ? mapearCursoSecundariaADocente(
                  listado.cursos.find((c) => c.id === curso.id)!,
                  contexto,
                  { observacion: obs },
                )
              : curso;
          } catch {
            return curso;
          }
        }),
      );
      const porId = new Map(enriquecidos.map((c) => [c.id, c]));
      return limitarCursosSegunPortal(
        base.map((curso) => porId.get(curso.id) ?? curso),
        contexto,
      );
    }

    const registros = await cursosRepositorio.listar();
    if (!apiConfig.useMock || apiConfig.sinDatosDemo) return registros;
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
  async obtener(id: string) {
    if (apiConfig.secundariaCursos) {
      if (esCursoTemporal(id)) {
        throw new Error("Curso no encontrado");
      }
      const curso = await secundariaGatewayService.obtenerCurso(id);
      return mapearCursoSecundariaADocente(curso, obtenerContextoActual());
    }
    return cursosRepositorio.obtener(id);
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
    if (apiConfig.secundariaCursos) {
      const listado = await secundariaGatewayService.listarEstudiantes();
      return listado.estudiantes.map(
        (item): EstudianteDocente => ({
          id: item.id,
          alumnoId: item.alumnoId,
          cursoId: item.cursoId,
          nombre: item.nombre,
          iniciales: item.iniciales,
          curso: item.curso,
          organizacion: item.organizacion,
          progreso: Number(item.progreso ?? 0),
          ultimoAcceso: item.ultimoAcceso,
          ultimoAccesoFecha: item.ultimoAccesoFecha,
          fechaInscripcion: item.fechaInscripcion,
          estado: item.estado,
        }),
      );
    }
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
const sesionesRepositorio = crearRepositorioDocente(
  "sesiones",
  API.docente.sesiones,
  sesionesDelContexto,
);

const sesiones = {
  async listar(): Promise<SesionDocente[]> {
    if (apiConfig.secundariaCursos) {
      const listado = await secundariaGatewayService.listarSesiones();
      return listado.sesiones.map(mapearSesionSecundariaADocente);
    }
    const contexto = obtenerContextoActual();
    const lista = await sesionesEnVivoCompartidas.listarParaContexto(contexto);
    return lista.map(sesionesEnVivoCompartidas.aSesionDocente);
  },
  async obtener(id: string) {
    const lista = await this.listar();
    return lista.find((item) => item.id === id) ?? null;
  },
  async crear(sesion: SesionDocente) {
    if (apiConfig.secundariaCursos) {
      const inicio = new Date(sesion.fechaHoraIso ?? Date.now());
      const minutos = Number.parseInt(sesion.duracion, 10) || 60;
      const fin = new Date(inicio.getTime() + minutos * 60_000);
      const creada = await secundariaGatewayService.crearSesion({
        cursoId: sesion.cursoId,
        titulo: sesion.titulo,
        iniciaEn: inicio.toISOString(),
        terminaEn: fin.toISOString(),
        urlAcceso: null,
      });
      const mapeada = mapearSesionSecundariaADocente(creada.sesion);
      const correos = (sesion.invitadosEmails ?? []).filter((item) =>
        item.includes("@"),
      );
      if (correos.length) {
        const { notificacionesCorreoService } = await import(
          "@/api/services/notificaciones-correo.service"
        );
        const { correoEnSegundoPlano } = await import(
          "@/lib/correo-en-segundo-plano"
        );
        correoEnSegundoPlano(
          notificacionesCorreoService.enviarClaseProgramadaMasivo({
            correos,
            datosBase: {
              tituloClase: sesion.titulo,
              nombreCurso: creada.sesion.cursoTitulo || sesion.curso,
              fechaHora: inicio.toISOString(),
              urlMeet:
                creada.googleMeet?.meetUrl ??
                creada.sesion.urlAcceso ??
                mapeada.enlace ??
                undefined,
              urlCurso: urlPortalLoginClaseEnVivo(sesion.cursoId),
            },
          }),
          "clase_programada",
        );
      }
      return mapeada;
    }
    const contexto = obtenerContextoActual();
    const creada = await sesionesEnVivoCompartidas.programar({
      organizacionId: sesionesEnVivoCompartidas.claveSesionesContexto(contexto),
      titulo: sesion.titulo,
      cursoId: sesion.cursoId,
      cursoTitulo: sesion.curso,
      docenteNombre: "Docente",
      docenteEmail: "docente@cipcusco.org.pe",
      fechaHoraInicio: sesion.fechaHoraIso ?? new Date().toISOString(),
      duracionMinutos: Number.parseInt(sesion.duracion, 10) || 60,
      emailsInvitados: sesion.invitadosEmails ?? [],
      creadoPor: {
        portal: "docente",
        nombre: contexto.organizacionNombre || "Docente",
      },
    });
    return sesionesEnVivoCompartidas.aSesionDocente(creada);
  },
  async actualizar(id: string, cambios: Partial<SesionDocente>) {
    if (apiConfig.secundariaCursos) {
      const actual = await this.obtener(id);
      if (!actual) throw new Error("Sesión no encontrada");
      const inicio = cambios.fechaHoraIso
        ? new Date(cambios.fechaHoraIso)
        : new Date(actual.fechaHoraIso ?? Date.now());
      const minutos =
        Number.parseInt(cambios.duracion ?? actual.duracion, 10) || 60;
      const fin = new Date(inicio.getTime() + minutos * 60_000);
      let resultado = await secundariaGatewayService.actualizarSesion({
        sesionId: id,
        titulo: cambios.titulo ?? actual.titulo,
        iniciaEn: inicio.toISOString(),
        terminaEn: fin.toISOString(),
        urlAcceso: cambios.enlace ?? actual.enlace ?? null,
      });
      if (cambios.estado && cambios.estado !== actual.estado) {
        resultado = await secundariaGatewayService.actualizarEstadoSesion(
          id,
          cambios.estado,
        );
      }
      return mapearSesionSecundariaADocente(resultado.sesion);
    }
    return sesionesRepositorio.actualizar(id, cambios);
  },
  async eliminar(id: string) {
    if (apiConfig.secundariaCursos) {
      await secundariaGatewayService.eliminarSesion(id);
      return;
    }
    return sesionesRepositorio.eliminar(id);
  },
  reemplazar: (regs: SesionDocente[]) => sesionesRepositorio.reemplazar(regs),
  reiniciar: () => sesionesRepositorio.reiniciar(),
};
const conversacionesRepositorio = crearRepositorioDocente(
  "conversaciones",
  API.docente.conversaciones,
  conversacionesDelContexto,
);
const conversaciones = {
  ...conversacionesRepositorio,
  async listar() {
    if (apiConfig.secundariaCursos) {
      const data = await secundariaGatewayService.listarConversaciones();
      return (data.conversaciones ?? []).map(
        (item): ConversacionDocente => ({
          id: item.id,
          nombre: item.nombre,
          iniciales: item.iniciales,
          mensaje: item.mensaje,
          hora: item.hora,
          noLeidos: Number(item.noLeidos ?? 0),
          mensajes: [],
        }),
      );
    }
    return conversacionesRepositorio.listar();
  },
  async obtener(id: string) {
    if (apiConfig.secundariaCursos) {
      const lista = await this.listar();
      const base = lista.find((item) => item.id === id);
      if (!base) return null;
      const mensajes = await secundariaGatewayService.obtenerMensajes(id);
      return {
        ...base,
        mensajes: (mensajes.mensajes ?? []).map((mensaje) => ({
          id: mensaje.id,
          contenido: mensaje.contenido,
          hora: mensaje.hora,
          autor: mensaje.autor,
          adjunto: mensaje.adjunto ?? undefined,
        })),
        noLeidos: 0,
      };
    }
    return conversacionesRepositorio.obtener(id);
  },
};
const calificaciones = crearRepositorioDocente(
  "calificaciones",
  API.docente.calificaciones,
  calificacionesDelContexto,
);
const certificadosRepositorio = crearRepositorioDocente(
  "certificados",
  API.docente.certificados,
  certificadosDelContexto,
);
const certificadosPendientesRepositorio = crearRepositorioDocente(
  "certificados_pendientes",
  API.docente.certificadosPendientes,
  pendientesDelContexto,
);

function mapearCertificadoEmitidoSecundaria(
  item: import("@/lib/contrato-secundaria").CertificadoEmitidoSecundaria,
): CertificadoEmitidoDocente {
  const fecha = item.emitidoEn || item.fecha;
  const codigo = item.codigoVerificacion || undefined;
  const estado =
    item.revocadoEn || String(item.estado ?? "").toUpperCase() === "REVOCADO"
      ? "REVOCADO"
      : "EMITIDO";
  return {
    id: item.id,
    certificadoId: item.id,
    codigoVerificacion: codigo,
    nombre: item.nombre,
    curso: item.curso,
    fecha: fecha
      ? new Intl.DateTimeFormat("es-PE", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(new Date(fecha))
      : "—",
    estado,
    cursoId: item.cursoId ?? undefined,
    estudianteId: item.estudianteId ?? undefined,
    notaFinal: item.notaFinal ?? undefined,
    horasCertificadas: item.horasCertificadas,
    modulosCompletados: item.modulosCompletados,
    versionPrograma: item.versionPrograma,
    organizacionEmisora: item.organizacionEmisora,
    documentoId: item.documentoId ?? undefined,
    claveAlmacenamiento: item.claveAlmacenamiento ?? undefined,
    revocadoEn: item.revocadoEn ?? undefined,
    origenEmision: item.origenEmision ?? undefined,
    detalleManual: item.detalleManual ?? undefined,
    plantillaRef: item.plantillaRef ?? undefined,
  };
}

function mapearCertificadoPendienteSecundaria(
  item: import("@/lib/contrato-secundaria").CertificadoPendienteSecundaria,
): CertificadoPendienteDocente {
  return {
    id: item.id,
    nombre: item.nombre,
    curso: item.curso,
    nota: Number(item.nota ?? 0),
    cursoId: item.cursoId,
    estudianteId: item.estudianteId,
    horasCumplidas: item.horasCumplidas,
    horasRequeridas: item.horasRequeridas,
    modulosCompletados: item.modulosCompletados,
    modulosTotales: item.modulosTotales,
  };
}

async function persistirPdfCertificadoEmitido(
  certificado: CertificadoEmitidoDocente,
  opciones: {
    logoEntidadUrl?: string | null;
    /** Reemplazo puntual de logo (emisión / temporal), sin alterar el diseño guardado. */
    logoOverrideUrl?: string | null;
    plantillaCertificadoId?: string | null;
    cantidadFirmas?: number | null;
    detalleTexto?: string | null;
    categoriaTexto?: string | null;
    /** Firma(s) puntuales de esta emisión (nombre + imagen). */
    firmantes?: Array<{
      nombre: string;
      cargo?: string;
      imagen?: string;
    }> | null;
    /** Layout ajustado solo para esta emisión (no persiste el diseño). */
    layoutOverride?: import("@/lib/plantilla-certificado").LayoutPlantillaCertificado | null;
  } = {},
): Promise<CertificadoEmitidoDocente> {
  const certificadoId = certificado.certificadoId || certificado.id;
  const codigo =
    certificado.codigoVerificacion?.trim() || certificado.id;
  if (!certificadoId || !/^[0-9a-f-]{36}$/i.test(certificadoId)) {
    return certificado;
  }
  try {
    const { blobCertificatePdf } = await import("@/lib/certificado-pdf");
    const { storageAcademia } = await import("@/lib/storage-academia");
    const { plantillasCertificadoService } = await import(
      "@/api/services/plantillas-certificado.service"
    );
    const { INSTALACION_TUKUY_ACADEMY_ID, CONTEXTO_SESION_KEY } = await import(
      "@/lib/constants"
    );
    const { clampCantidadFirmasCertificado } = await import(
      "@/lib/certificado-curso"
    );

    let instalacionId = INSTALACION_TUKUY_ACADEMY_ID;
    try {
      const raw = localStorage.getItem(CONTEXTO_SESION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { organizacionId?: string };
        if (parsed.organizacionId?.trim()) {
          instalacionId = parsed.organizacionId.trim();
        }
      }
    } catch {
      /* usa Tukuy Academy */
    }

    const config =
      await plantillasCertificadoService.obtenerConfig(instalacionId);
    const plantillaId = String(opciones.plantillaCertificadoId ?? "").trim();
    const plantillaBase =
      (plantillaId
        ? config.plantillas.find((p) => p.id === plantillaId)
        : null) ??
      config.plantillas.find((p) => p.esDefault) ??
      (await plantillasCertificadoService.obtenerDefault(instalacionId));

    const overrideLogo = String(opciones.logoOverrideUrl ?? "").trim();
    const firmantesEmitidos = (opciones.firmantes ?? [])
      .map((f) => ({
        nombre: String(f.nombre ?? "").trim(),
        cargo: String(f.cargo ?? "").trim() || undefined,
        imagen: String(f.imagen ?? "").trim() || undefined,
      }))
      .filter((f) => f.nombre);

    let plantilla = plantillaBase
      ? {
          ...plantillaBase,
          usarLogoEntidad: true,
          logoOverrideUrl: overrideLogo || plantillaBase.logoOverrideUrl,
          layout: opciones.layoutOverride
            ? opciones.layoutOverride
            : plantillaBase.layout,
        }
      : null;

    if (plantilla && firmantesEmitidos.length === 1 && !opciones.layoutOverride) {
      const { layoutDeModelo } = await import("@/lib/plantilla-certificado");
      const derivado = layoutDeModelo(plantilla.layout, 1);
      plantilla = {
        ...plantilla,
        layout: {
          ...plantilla.layout,
          ...derivado,
          cantidadFirmantesActiva: 1,
        },
      };
    } else if (plantilla && opciones.layoutOverride) {
      plantilla = {
        ...plantilla,
        layout: {
          ...opciones.layoutOverride,
          cantidadFirmantesActiva: 1,
        },
      };
    }

    const cantidadFirmas = clampCantidadFirmasCertificado(
      firmantesEmitidos.length === 1
        ? 1
        : (opciones.cantidadFirmas ??
            plantilla?.layout?.cantidadFirmantesActiva ??
            1),
    );

    const blob = await blobCertificatePdf({
      holderName: certificado.nombre,
      courseTitle: certificado.curso,
      category:
        opciones.categoriaTexto?.trim() || "Certificación institucional",
      duration: opciones.detalleTexto?.trim()
        ? opciones.detalleTexto.trim()
        : certificado.horasCertificadas
          ? `${certificado.horasCertificadas} horas certificadas`
          : "Certificación institucional",
      level: "Aprobado",
      mode: "Virtual",
      issuedAt: certificado.fecha,
      certificateCode: codigo,
      issuerName: certificado.organizacionEmisora ?? "Tukuy Academy",
      issuerLogoUrl: opciones.logoEntidadUrl || undefined,
      firmantes: firmantesEmitidos.length ? firmantesEmitidos : undefined,
      plantilla: plantilla ?? undefined,
    });
    const archivo = new File(
      [blob],
      `certificado-${codigo}.pdf`,
      { type: "application/pdf" },
    );
    const subida = await storageAcademia.subirCertificado(archivo);
    await secundariaGatewayService.actualizarDocumentoCertificado({
      certificadoId,
      claveAlmacenamiento: subida.objectKey,
      tamanoBytes: archivo.size,
      datosPlantilla: plantilla
        ? {
            id: plantilla.id,
            nombre: plantilla.nombre,
            cantidadFirmantes: cantidadFirmas,
            versionPlantilla: `plantilla:${plantilla.id}:f${cantidadFirmas}`,
            instalacionId,
          }
        : null,
    });
    return {
      ...certificado,
      claveAlmacenamiento: subida.objectKey,
    };
  } catch (error) {
    console.warn(
      "[certificados] No se pudo subir el PDF a S3; se usará generación local.",
      error,
    );
    return certificado;
  }
}

const certificados = {
  ...certificadosRepositorio,
  async listar() {
    if (apiConfig.secundariaCursos) {
      const data = await secundariaGatewayService.listarCertificadosEmitidos();
      return data.emitidos.map(mapearCertificadoEmitidoSecundaria);
    }
    return certificadosRepositorio.listar();
  },
};

const certificadosPendientes = {
  ...certificadosPendientesRepositorio,
  async listar() {
    if (apiConfig.secundariaCursos) {
      const data =
        await secundariaGatewayService.listarCertificadosPendientes(100);
      return data.pendientes.map(mapearCertificadoPendienteSecundaria);
    }
    return certificadosPendientesRepositorio.listar();
  },
  async obtener(id: string) {
    if (apiConfig.secundariaCursos) {
      const lista = await this.listar();
      return lista.find((item) => item.id === id) ?? null;
    }
    return certificadosPendientesRepositorio.obtener(id);
  },
  async eliminar(id: string) {
    if (apiConfig.secundariaCursos) return;
    return certificadosPendientesRepositorio.eliminar(id);
  },
};
const ingresosRepositorio = crearRepositorioDocente(
  "ingresos",
  API.docente.ingresos,
  ingresosDelContexto,
);
const ingresos = {
  ...ingresosRepositorio,
  async listar() {
    if (apiConfig.secundariaCursos) {
      const data = await secundariaGatewayService.listarIngresos();
      return (data.movimientos ?? []).map(
        (item): MovimientoIngresoDocente => ({
          id: item.id,
          curso: item.curso,
          fecha: item.fecha,
          concepto: item.concepto,
          importe: Number(item.importe ?? 0),
          estado: item.estado,
        }),
      );
    }
    return ingresosRepositorio.listar();
  },
};
const notificacionesRepositorio = crearRepositorioDocente(
  "notificaciones",
  API.docente.notificaciones,
  notificacionesDelContexto,
);
const actividadesRepositorio = crearRepositorioDocente(
  "actividades",
  API.docente.actividades,
  actividadesDelContexto,
);

const NOTIF_LEIDAS_KEY = "tukuy_docente_notif_leidas";
const ACTIVIDADES_LOCAL_KEY = "tukuy_docente_actividades_local";

function leerIdsNotificacionesLeidas(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIF_LEIDAS_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

function guardarIdsNotificacionesLeidas(ids: Set<string>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(NOTIF_LEIDAS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function leerActividadesLocales(): ActividadDocente[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = JSON.parse(sessionStorage.getItem(ACTIVIDADES_LOCAL_KEY) || "[]");
    return Array.isArray(raw) ? (raw as ActividadDocente[]) : [];
  } catch {
    return [];
  }
}

function guardarActividadLocal(item: ActividadDocente) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const lista = [item, ...leerActividadesLocales()].slice(0, 40);
    sessionStorage.setItem(ACTIVIDADES_LOCAL_KEY, JSON.stringify(lista));
  } catch {
    // ignore
  }
}

async function sintetizarNotificacionesSecundaria(): Promise<
  NotificacionDocente[]
> {
  const leidas = leerIdsNotificacionesLeidas();
  const [entregas, sesiones, pendientes] = await Promise.all([
    academicoService.listarEntregasDocente().catch(() => []),
    secundariaGatewayService.listarSesiones().catch(() => ({
      ok: true as const,
      total: 0,
      sesiones: [],
    })),
    secundariaGatewayService.listarCertificadosPendientes(100).catch(() => ({
      ok: true as const,
      total: 0,
      pendientes: [],
    })),
  ]);

  const items: NotificacionDocente[] = [];
  for (const entrega of entregas) {
    if (!["ENTREGADA", "EN_REVISION", "OBSERVADA"].includes(entrega.estado)) {
      continue;
    }
    const id = `not-ent-${entrega.id}`;
    items.push({
      id,
      titulo: "Entrega por revisar",
      detalle: `${entrega.estudianteNombre} · ${entrega.actividadTitulo}`,
      fecha: entrega.entregadaEn ?? new Date().toISOString(),
      leida: leidas.has(id),
      ruta: "/docente/evaluaciones",
      tipo: "EVALUACION",
    });
  }

  const ahora = Date.now();
  for (const sesion of sesiones.sesiones) {
    const inicio = new Date(sesion.iniciaEn).getTime();
    if (
      !Number.isFinite(inicio) ||
      inicio < ahora - 2 * 60 * 60_000 ||
      inicio > ahora + 48 * 60 * 60_000
    ) {
      continue;
    }
    if (["CANCELADA", "FINALIZADA"].includes(String(sesion.estado ?? ""))) {
      continue;
    }
    const id = `not-ses-${sesion.id}`;
    items.push({
      id,
      titulo: "Sesión próxima",
      detalle: `${sesion.titulo} · ${sesion.cursoTitulo}`,
      fecha: sesion.iniciaEn,
      leida: leidas.has(id),
      ruta: "/docente/calendario",
      tipo: "SESION",
    });
  }

  for (const pendiente of pendientes.pendientes.slice(0, 8)) {
    const id = `not-cert-${pendiente.id}`;
    items.push({
      id,
      titulo: "Certificado pendiente",
      detalle: `${pendiente.nombre} · ${pendiente.curso}`,
      fecha: new Date().toISOString(),
      leida: leidas.has(id),
      ruta: "/docente/certificados",
      tipo: "CERTIFICADO",
    });
  }

  return items
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 25);
}

async function sintetizarActividadesSecundaria(): Promise<ActividadDocente[]> {
  const [entregas, sesiones, locales] = await Promise.all([
    academicoService.listarEntregasDocente().catch(() => []),
    secundariaGatewayService.listarSesiones().catch(() => ({
      ok: true as const,
      total: 0,
      sesiones: [],
    })),
    Promise.resolve(leerActividadesLocales()),
  ]);

  const sintetizadas: ActividadDocente[] = [];
  for (const entrega of entregas.slice(0, 12)) {
    sintetizadas.push({
      id: `act-ent-${entrega.id}`,
      titulo:
        entrega.estado === "CALIFICADA"
          ? "Entrega calificada"
          : "Nueva entrega recibida",
      detalle: `${entrega.estudianteNombre} · ${entrega.actividadTitulo}`,
      fecha:
        entrega.calificadaEn ??
        entrega.entregadaEn ??
        new Date().toISOString(),
    });
  }
  for (const sesion of sesiones.sesiones.slice(0, 8)) {
    sintetizadas.push({
      id: `act-ses-${sesion.id}`,
      titulo: "Sesión en vivo",
      detalle: `${sesion.titulo} · ${sesion.cursoTitulo}`,
      fecha: sesion.iniciaEn,
    });
  }

  return [...locales, ...sintetizadas]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 30);
}

const notificaciones = {
  ...notificacionesRepositorio,
  async listar() {
    if (apiConfig.secundariaCursos) {
      return sintetizarNotificacionesSecundaria();
    }
    return notificacionesRepositorio.listar();
  },
  async reemplazar(regs: NotificacionDocente[]) {
    if (apiConfig.secundariaCursos) {
      guardarIdsNotificacionesLeidas(
        new Set(regs.filter((item) => item.leida).map((item) => item.id)),
      );
      return regs;
    }
    return notificacionesRepositorio.reemplazar(regs);
  },
};

const actividades = {
  ...actividadesRepositorio,
  async listar() {
    if (apiConfig.secundariaCursos) {
      return sintetizarActividadesSecundaria();
    }
    return actividadesRepositorio.listar();
  },
  async crear(item: ActividadDocente) {
    if (apiConfig.secundariaCursos) {
      guardarActividadLocal(item);
      return item;
    }
    return actividadesRepositorio.crear(item);
  },
};

const configuracionSemilla: ConfiguracionDocente = {
  nombre: "",
  cargo: "",
  especialidad: "",
  biografia: "",
  experiencia: [],
  fotoUrl: undefined,
};

function clonarAnalitica(origen: AnaliticaDocente): AnaliticaDocente {
  return JSON.parse(JSON.stringify(origen)) as AnaliticaDocente;
}

function almacenConfiguracion() {
  return crearAlmacenDocumento(
    claveContextual("configuracion"),
    configuracionSemilla,
    3,
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

function esCursoTemporal(cursoId: string) {
  return (
    cursoId === "nuevo" ||
    cursoId.startsWith("borrador-") ||
    cursoId.startsWith("curso-institucional-")
  );
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

function borradorSemillaDesdeCurso(curso: CursoDocente): BorradorCursoDocente {
  return {
    titulo: curso.titulo,
    subtitulo: "",
    descripcion: "",
    publico: "",
    objetivos: [""],
    requisitos: [],
    categoria: "",
    nivel: "Básico",
    imagen: curso.imagen ?? "",
    ambito: curso.ambito,
    organizacionId: curso.organizacionId,
    acceso: curso.modeloAcceso === "VENTA_INDIVIDUAL" ? "PAGO" : "ORGANIZACION",
    precio: 0,
    visibilidad: curso.ambito === "INDEPENDIENTE" ? "PUBLICO" : "ORGANIZACION",
    permiteEmpresas: curso.ambito === "INDEPENDIENTE",
    certificado: true,
    nombreCertificado: "",
    notaMinima: 14,
    vigenciaMeses: 0,
    docenteResponsableId: curso.docenteResponsableId,
    docenteResponsableNombre: curso.docenteResponsableNombre,
    cargadoPorNombre: curso.cargadoPorNombre,
    origenCarga: curso.origenCarga,
    secciones: [],
  };
}

function borradorCopiaSinIds(
  borrador: BorradorCursoDocente,
  titulo: string,
): BorradorCursoDocente {
  return {
    ...borrador,
    titulo,
    secciones: borrador.secciones.map((seccion) => ({
      ...seccion,
      id: undefined,
      items: seccion.items?.map((item) => ({ ...item, id: undefined })),
      recursos: seccion.recursos?.map((recurso) => ({
        ...recurso,
        id: `${recurso.id}-copia-${Date.now()}`,
      })),
    })),
  };
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
    const local = almacenConfiguracion().leer();
    if (env.authProvider === "supabase") {
      try {
        const perfil = await perfilDocenteService.obtenerMio();
        return {
          ...configuracionSemilla,
          ...local,
          nombre: perfil.nombre || local.nombre,
          cargo: perfil.cargo,
          especialidad: perfil.especialidad,
          biografia: perfil.biografia,
          experiencia: perfil.experiencia.length
            ? perfil.experiencia
            : local.experiencia ?? [],
          fotoUrl: perfil.fotoUrl,
        };
      } catch {
        return { ...configuracionSemilla, ...local };
      }
    }
    if (apiConfig.useMock) return local;
    const { data } = await api.get<ConfiguracionDocente>(
      API.docente.configuracion,
    );
    return data;
  },

  async guardarConfiguracion(
    configuracion: ConfiguracionDocente,
  ): Promise<ConfiguracionDocente> {
    const preferencias = almacenConfiguracion().guardar(configuracion);
    if (env.authProvider === "supabase") {
      const perfil = await perfilDocenteService.guardar({
        nombre: configuracion.nombre,
        cargo: configuracion.cargo,
        especialidad: configuracion.especialidad,
        biografia: configuracion.biografia,
        experiencia: configuracion.experiencia,
        fotoUrl: configuracion.fotoUrl,
      });
      return {
        ...preferencias,
        nombre: perfil.nombre,
        cargo: perfil.cargo,
        especialidad: perfil.especialidad,
        biografia: perfil.biografia,
        experiencia: perfil.experiencia,
        fotoUrl: perfil.fotoUrl,
      };
    }
    if (apiConfig.useMock) {
      emitirCambio("configuracion");
      return preferencias;
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
    if (apiConfig.secundariaCursos) {
      if (esCursoTemporal(cursoId)) return semilla;
      try {
        const resultado =
          await secundariaGatewayService.obtenerBorrador(cursoId);
        return mapearDocumentoABorrador(
          resultado.borrador as Record<string, unknown>,
          {
            ...semilla,
            titulo: resultado.curso.titulo || semilla.titulo,
            descripcion: resultado.curso.resumen || semilla.descripcion,
            categoria: resultado.curso.categoria || semilla.categoria,
            imagen: semilla.imagen,
          },
        );
      } catch {
        return semilla;
      }
    }
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
    if (apiConfig.secundariaCursos) {
      const resultado = await secundariaGatewayService.guardarCurso({
        cursoId: esCursoTemporal(cursoId) ? null : cursoId,
        borrador,
      });
      return mapearDocumentoABorrador(
        resultado.borrador as Record<string, unknown>,
        borrador,
      );
    }
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
  ): Promise<{ curso: CursoDocente; borrador: BorradorCursoDocente }> {
    if (apiConfig.secundariaCursos) {
      const contexto = obtenerContextoActual();
      const resultado = await secundariaGatewayService.guardarCurso({
        cursoId: esCursoTemporal(cursoId) ? null : cursoId,
        borrador,
      });
      const mapeado = mapearCursoSecundariaADocente(resultado.curso, contexto);
      const borradorPersistido = mapearDocumentoABorrador(
        (resultado.borrador ?? borrador) as Record<string, unknown>,
        borrador,
      );
      return {
        curso: {
          ...mapeado,
          titulo: borradorPersistido.titulo || mapeado.titulo,
          imagen: borradorPersistido.imagen || mapeado.imagen,
          progreso: progresoBorrador(borradorPersistido),
          docenteResponsableId: borradorPersistido.docenteResponsableId,
          docenteResponsableNombre: borradorPersistido.docenteResponsableNombre,
          cargadoPorNombre: borradorPersistido.cargadoPorNombre,
          origenCarga: borradorPersistido.origenCarga,
          actualizado: "Ahora",
        },
        borrador: borradorPersistido,
      };
    }

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
      docenteResponsableId: borrador.docenteResponsableId,
      docenteResponsableNombre: borrador.docenteResponsableNombre,
      cargadoPorNombre: borrador.cargadoPorNombre,
      origenCarga: borrador.origenCarga,
    };

    const guardado = existente
      ? await cursos.actualizar(id, datos)
      : await cursos.crear(datos);
    await academicoService.sincronizarEstructuraCurso(id, borrador.secciones);
    return { curso: guardado, borrador };
  },

  async enviarBorradorRevision(
    membresiaId: string,
    cursoId: string,
    borrador: BorradorCursoDocente,
  ): Promise<CursoDocente> {
    if (apiConfig.secundariaCursos) {
      const contexto = obtenerContextoActual();
      const resultado = await secundariaGatewayService.guardarCurso({
        cursoId: esCursoTemporal(cursoId) ? null : cursoId,
        borrador,
        estado: "EN_REVISION",
      });
      return {
        ...mapearCursoSecundariaADocente(resultado.curso, contexto),
        estado: "EN_REVISION",
        progreso: 100,
        actualizado: "Enviado ahora",
        imagen: borrador.imagen,
      };
    }

    if (!apiConfig.useMock) {
      const { data } = await api.post<CursoDocente>(
        API.docente.enviarCursoARevision(cursoId),
        borrador,
      );
      return data;
    }

    const { curso } = await this.guardarCursoDesdeBorrador(
      membresiaId,
      cursoId,
      borrador,
    );
    const actualizado = await cursos.actualizar(curso.id, {
      estado: "EN_REVISION",
      progreso: 100,
      actualizado: "Enviado ahora",
    });
    if (actualizado.ambito === "ORGANIZACION") {
      const { organizacionService } = await import(
        "@/api/services/organizacion.service"
      );
      await organizacionService.catalogoCursos.registrarParaRevision({
        cursoDocenteId: actualizado.id,
        titulo: borrador.titulo,
        imagen: borrador.imagen,
        docenteResponsableId: borrador.docenteResponsableId,
        docenteResponsableNombre:
          borrador.docenteResponsableNombre || "Docente por asignar",
        cargadoPor: borrador.cargadoPorNombre,
        origenCarga: borrador.origenCarga,
        categoria: borrador.categoria,
        lecciones: borrador.secciones.reduce(
          (total, seccion) => total + seccion.clases.length,
          0,
        ),
      });
    }
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
    if (apiConfig.secundariaCursos) {
      const contexto = obtenerContextoActual();
      const original = await cursos.obtener(id);
      if (!original) throw new Error("No se encontró el curso a duplicar");
      const resultadoBorrador =
        await secundariaGatewayService.obtenerBorrador(id);
      const borrador = mapearDocumentoABorrador(
        resultadoBorrador.borrador as Record<string, unknown>,
        borradorSemillaDesdeCurso(original),
      );
      const tituloCopia = `${(borrador.titulo || original.titulo).trim()} · copia`;
      const borradorCopia = borradorCopiaSinIds(borrador, tituloCopia);
      const resultado = await secundariaGatewayService.guardarCurso({
        cursoId: null,
        borrador: borradorCopia,
        estado: "BORRADOR",
      });
      const mapeado = mapearCursoSecundariaADocente(resultado.curso, contexto);
      await registrarActividad("Curso duplicado", tituloCopia);
      return {
        ...mapeado,
        titulo: tituloCopia,
        estado: "BORRADOR",
        estudiantes: 0,
        valoracion: 0,
        progreso: progresoBorrador(borradorCopia),
        actualizado: "Ahora",
      };
    }
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
    if (apiConfig.secundariaCursos) {
      const resultado = await secundariaGatewayService.actualizarEstadoCurso(
        id,
        "ARCHIVADO",
      );
      return mapearCursoSecundariaADocente(
        resultado.curso,
        obtenerContextoActual(),
      );
    }
    return cursos.actualizar(id, { estado: "ARCHIVADO", actualizado: "Ahora" });
  },

  async eliminarCurso(id: string) {
    if (apiConfig.secundariaCursos) {
      const resultado = await secundariaGatewayService.eliminarCurso(id);
      return mapearCursoSecundariaADocente(
        resultado.curso,
        obtenerContextoActual(),
      );
    }
    return this.archivarCurso(id);
  },

  async eliminarCursoPermanente(id: string) {
    if (apiConfig.secundariaCursos) {
      const resultado =
        await secundariaGatewayService.eliminarCursoPermanente(id);
      return mapearCursoSecundariaADocente(
        resultado.curso,
        obtenerContextoActual(),
      );
    }
    return this.archivarCurso(id);
  },

  async actualizarEstadoCurso(
    id: string,
    estado: EstadoCursoDocente,
    extras?: { observacion?: string },
  ): Promise<CursoDocente | null> {
    const cambiosEstado: Partial<CursoDocente> = {
      estado,
      actualizado: "Ahora",
      ...(estado === "APROBADO" ||
      estado === "PUBLICADO" ||
      estado === "CONTENIDO_REVISADO"
        ? { progreso: 100 }
        : {}),
      ...(estado === "OBSERVADO"
        ? { observacion: extras?.observacion }
        : { observacion: undefined }),
    };

    if (apiConfig.secundariaCursos) {
      const contexto = obtenerContextoActual();
      if (estado === "PUBLICADO" || estado === "APROBADO") {
        const publicado = await secundariaGatewayService.publicarCurso({
          cursoId: id,
          estadoPublicacion: "PUBLICADO",
        });
        return mapearCursoSecundariaADocente(publicado.curso, contexto);
      }
      const resultado = await secundariaGatewayService.actualizarEstadoCurso(
        id,
        estado,
      );
      const mapeado = mapearCursoSecundariaADocente(resultado.curso, contexto);
      return {
        ...mapeado,
        ...cambiosEstado,
        estado: mapeado.estado,
      };
    }

    if (!apiConfig.useMock) {
      const { data } = await api.patch<CursoDocente>(
        API.docente.cursoPorId(id),
        { estado, ...extras },
      );
      return data;
    }

    const actual = await cursos.obtener(id);
    if (actual) {
      return cursos.actualizar(id, cambiosEstado);
    }

    // La organización aprueba desde otro contexto: sincroniza el repo del docente.
    const claveDocenteOrg = claveContextual("cursos", "mem-organizacion-cip");
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
        ...cambiosEstado,
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
    if (apiConfig.secundariaCursos) {
      const matriculaId = pendienteId.startsWith("pend-")
        ? pendienteId.slice(5)
        : pendienteId;
      const resultado =
        await secundariaGatewayService.emitirCertificado(matriculaId);
      const emitido = resultado.emitidos.find(
        (item) =>
          item.id === resultado.certificadoId ||
          item.codigoVerificacion === resultado.codigoVerificacion ||
          item.matriculaId === matriculaId,
      );
      if (!emitido) {
        const lista =
          await secundariaGatewayService.listarCertificadosEmitidos();
        const encontrado = lista.emitidos.find(
          (item) => item.matriculaId === matriculaId,
        );
        if (!encontrado) throw new Error("No se pudo emitir el certificado");
        const mapeado = mapearCertificadoEmitidoSecundaria(encontrado);
        const certificadoMapeado = await persistirPdfCertificadoEmitido({
          ...mapeado,
          requiereFirmaInstitucional:
            resultado.requiereFirmaInstitucional === true,
        });
        const { notificacionesCorreoService } = await import(
          "@/api/services/notificaciones-correo.service"
        );
        const { correoEnSegundoPlano } = await import(
          "@/lib/correo-en-segundo-plano"
        );
        void notificacionesCorreoService
          .resolverCorreoIdentidad(String(encontrado.estudianteId ?? "").trim())
          .then((correo) => {
            if (!correo) return;
            correoEnSegundoPlano(
              notificacionesCorreoService.enviarCertificadoEmitido({
                para: correo,
                datos: {
                  nombrePersona: encontrado.nombre,
                  nombreCurso: encontrado.curso,
                  codigoVerificacion:
                    resultado.codigoVerificacion ??
                    encontrado.codigoVerificacion,
                },
              }),
              "certificado-emitido",
            );
          });
        return certificadoMapeado;
      }
      await registrarActividad(
        "Certificado emitido",
        `${emitido.nombre} · ${emitido.curso}`,
      );
      const certificadoMapeado = await persistirPdfCertificadoEmitido({
        ...mapearCertificadoEmitidoSecundaria(emitido),
        certificadoId: resultado.certificadoId || emitido.id,
        documentoId: resultado.documentoId || undefined,
        requiereFirmaInstitucional: resultado.requiereFirmaInstitucional === true,
      });
      const { notificacionesCorreoService } = await import(
        "@/api/services/notificaciones-correo.service"
      );
      const { correoEnSegundoPlano } = await import(
        "@/lib/correo-en-segundo-plano"
      );
      void notificacionesCorreoService
        .resolverCorreoIdentidad(String(emitido.estudianteId ?? "").trim())
        .then((correo) => {
          if (!correo) return;
          correoEnSegundoPlano(
            notificacionesCorreoService.enviarCertificadoEmitido({
              para: correo,
              datos: {
                nombrePersona: emitido.nombre,
                nombreCurso: emitido.curso,
                codigoVerificacion:
                  resultado.codigoVerificacion ?? emitido.codigoVerificacion,
              },
            }),
            "certificado-emitido",
          );
        });
      return certificadoMapeado;
    }

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
    const emitido = await certificadosRepositorio.crear({
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

  /** Emisión libre (sin matrícula): titular + motivo + plantilla. */
  async emitirCertificadoManual(entrada: {
    titularNombre: string;
    motivoTitulo: string;
    correoTitular?: string | null;
    detalle?: string | null;
    titularIdentidadRef?: string | null;
    plantillaId?: string | null;
    logoEntidadUrl?: string | null;
    logoOverrideUrl?: string | null;
    /** Firma temporal de esta emisión (una sola). */
    firmanteNombre?: string | null;
    firmanteCargo?: string | null;
    firmaImagenUrl?: string | null;
    layoutOverride?: import("@/lib/plantilla-certificado").LayoutPlantillaCertificado | null;
  }): Promise<CertificadoEmitidoDocente> {
    if (!apiConfig.secundariaCursos) {
      throw new Error(
        "La emisión manual requiere secundaria (VITE_SECUNDARIA_CURSOS=true).",
      );
    }
    const titular = entrada.titularNombre.trim();
    const motivo = entrada.motivoTitulo.trim();
    if (!titular || !motivo) {
      throw new Error("Indica el nombre del titular y el motivo o título.");
    }

    const resultado = await secundariaGatewayService.emitirCertificadoManual({
      titularNombre: titular,
      motivoTitulo: motivo,
      correoTitular: entrada.correoTitular?.trim() || null,
      detalle: entrada.detalle?.trim() || null,
      titularIdentidadRef: entrada.titularIdentidadRef?.trim() || null,
      plantillaId: entrada.plantillaId?.trim() || null,
    });

    const emitido =
      resultado.emitidos.find(
        (item) =>
          item.id === resultado.certificadoId ||
          item.codigoVerificacion === resultado.codigoVerificacion,
      ) ??
      ({
        id: resultado.certificadoId,
        codigoVerificacion: resultado.codigoVerificacion,
        nombre: resultado.titular ?? titular,
        curso: resultado.curso ?? motivo,
        estado: "EMITIDO",
        fecha: new Date().toISOString(),
        emitidoEn: new Date().toISOString(),
        documentoId: resultado.documentoId,
        origenEmision: "MANUAL",
        plantillaRef: resultado.plantillaRef ?? entrada.plantillaId,
      } as import("@/lib/contrato-secundaria").CertificadoEmitidoSecundaria);

    const firmanteNombre = String(entrada.firmanteNombre ?? "").trim();
    const firmaImagenUrl = String(entrada.firmaImagenUrl ?? "").trim();
    const firmantes =
      firmanteNombre
        ? [
            {
              nombre: firmanteNombre,
              cargo: String(entrada.firmanteCargo ?? "").trim() || undefined,
              imagen: firmaImagenUrl || undefined,
            },
          ]
        : null;

    const mapeado = await persistirPdfCertificadoEmitido(
      {
        ...mapearCertificadoEmitidoSecundaria(emitido),
        certificadoId: resultado.certificadoId || emitido.id,
        documentoId: resultado.documentoId || emitido.documentoId || undefined,
        requiereFirmaInstitucional: false,
      },
      {
        logoEntidadUrl: entrada.logoEntidadUrl,
        logoOverrideUrl: entrada.logoOverrideUrl,
        plantillaCertificadoId:
          entrada.plantillaId ?? resultado.plantillaRef ?? null,
        detalleTexto: entrada.detalle,
        categoriaTexto: "Certificación institucional",
        cantidadFirmas: firmantes ? 1 : null,
        firmantes,
        layoutOverride: entrada.layoutOverride ?? null,
      },
    );

    // Asegura índice público aunque el flujo de firmas org deje pendientes.
    const certUuid = mapeado.certificadoId || resultado.certificadoId;
    if (certUuid && /^[0-9a-f-]{36}$/i.test(certUuid)) {
      try {
        await secundariaGatewayService.publicarIndiceCertificado(certUuid);
      } catch {
        /* el PDF ya se emitió; el índice puede republicarse desde el listado */
      }
    }

    await registrarActividad(
      "Certificado manual emitido",
      `${mapeado.nombre} · ${mapeado.curso}`,
    );

    const correo = entrada.correoTitular?.trim();
    if (correo) {
      const { notificacionesCorreoService } = await import(
        "@/api/services/notificaciones-correo.service"
      );
      const { correoEnSegundoPlano } = await import(
        "@/lib/correo-en-segundo-plano"
      );
      correoEnSegundoPlano(
        notificacionesCorreoService.enviarCertificadoEmitido({
          para: correo,
          datos: {
            nombrePersona: mapeado.nombre,
            nombreCurso: mapeado.curso,
            codigoVerificacion:
              resultado.codigoVerificacion ?? mapeado.codigoVerificacion,
          },
        }),
        "certificado-manual-emitido",
      );
    }

    return mapeado;
  },

  /** Genera PDF con plantilla default y guarda snapshot en el documento (emisión o auto-cert). */
  async asegurarPdfCertificado(
    certificado: CertificadoEmitidoDocente,
    opciones: { logoEntidadUrl?: string | null } = {},
  ) {
    return persistirPdfCertificadoEmitido(certificado, opciones);
  },

  async listarPendientesFirma() {
    if (!apiConfig.secundariaCursos) return [];
    const data =
      await secundariaGatewayService.listarCertificadosPendientesFirma();
    return data.pendientesFirma ?? [];
  },

  async firmarCertificado(certificadoId: string, firmaId?: string) {
    if (!apiConfig.secundariaCursos) {
      throw new Error("Las firmas requieren la secundaria activa.");
    }
    const resultado = await secundariaGatewayService.firmarCertificado({
      certificadoId,
      firmaId,
    });
    await registrarActividad("Certificado firmado", certificadoId);
    return resultado;
  },

  async revocarCertificado(certificadoId: string, motivo?: string) {
    if (!apiConfig.secundariaCursos) {
      throw new Error("La revocación requiere la secundaria activa.");
    }
    const id = certificadoId.trim();
    if (!id) throw new Error("certificadoId requerido");
    const resultado = await secundariaGatewayService.revocarCertificado({
      certificadoId: id,
      motivo,
    });
    await registrarActividad("Certificado revocado", id);
    return resultado;
  },

  async sincronizarCertificadosElegibles(cursoId?: string) {
    if (apiConfig.secundariaCursos) {
      const [pendientesData, emitidosData] = await Promise.all([
        secundariaGatewayService.listarCertificadosPendientes(100),
        secundariaGatewayService.listarCertificadosEmitidos(),
      ]);
      return {
        pendientes: pendientesData.pendientes
          .filter((item) => !cursoId || item.cursoId === cursoId)
          .map(mapearCertificadoPendienteSecundaria),
        emitidos: emitidosData.emitidos
          .filter((item) => !cursoId || item.cursoId === cursoId)
          .map(mapearCertificadoEmitidoSecundaria),
      };
    }

    const [elegibilidades, pendientesActuales, emitidosActuales] =
      await Promise.all([
        academicoService.listarElegibilidades(cursoId),
        certificadosPendientesRepositorio.listar(),
        certificadosRepositorio.listar(),
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
    if (apiConfig.secundariaCursos) {
      await secundariaGatewayService.enviarMensaje(
        conversacionId,
        contenido,
        adjunto,
      );
      const actualizada = await conversaciones.obtener(conversacionId);
      if (!actualizada) throw new Error("No se encontró la conversación");
      await registrarActividad("Mensaje enviado", actualizada.nombre);
      return actualizada;
    }
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
    if (apiConfig.secundariaCursos) {
      await secundariaGatewayService.marcarConversacionLeida(conversacionId);
      const actualizada = await conversaciones.obtener(conversacionId);
      if (!actualizada) throw new Error("No se encontró la conversación");
      return { ...actualizada, noLeidos: 0 };
    }
    if (!apiConfig.useMock) {
      const { data } = await api.post<ConversacionDocente>(
        API.docente.leerConversacion(conversacionId),
      );
      return data;
    }
    return conversaciones.actualizar(conversacionId, { noLeidos: 0 });
  },

  async iniciarSesion(sesionId: string) {
    if (apiConfig.secundariaCursos) {
      const actualizada =
        await secundariaGatewayService.actualizarEstadoSesion(
          sesionId,
          "EN_VIVO",
        );
      await registrarActividad("Sesión iniciada", actualizada.sesion.titulo);
      return mapearSesionSecundariaADocente(actualizada.sesion);
    }
    if (!apiConfig.useMock) {
      const { data } = await api.post<SesionDocente>(
        API.docente.iniciarSesion(sesionId),
      );
      return data;
    }
    const contexto = obtenerContextoActual();
    const clave = sesionesEnVivoCompartidas.claveSesionesContexto(contexto);
    const actualizada = await sesionesEnVivoCompartidas.iniciar(
      clave,
      sesionId,
    );
    await registrarActividad("Sesión iniciada", actualizada.titulo);
    return sesionesEnVivoCompartidas.aSesionDocente(actualizada);
  },

  async cancelarSesion(sesionId: string) {
    if (apiConfig.secundariaCursos) {
      const actualizada =
        await secundariaGatewayService.actualizarEstadoSesion(
          sesionId,
          "CANCELADA",
        );
      return mapearSesionSecundariaADocente(actualizada.sesion);
    }
    if (!apiConfig.useMock) {
      const { data } = await api.post<SesionDocente>(
        API.docente.cancelarSesion(sesionId),
      );
      return data;
    }
    const contexto = obtenerContextoActual();
    const clave = sesionesEnVivoCompartidas.claveSesionesContexto(contexto);
    const actualizada = await sesionesEnVivoCompartidas.cancelar(
      clave,
      sesionId,
    );
    return sesionesEnVivoCompartidas.aSesionDocente(actualizada);
  },

  async marcarNotificacionesLeidas() {
    if (apiConfig.secundariaCursos) {
      const lista = await notificaciones.listar();
      guardarIdsNotificacionesLeidas(new Set(lista.map((item) => item.id)));
      return;
    }
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
    if (!apiConfig.secundariaCursos && !apiConfig.useMock) {
      const { data } = await api.get<AnaliticaDocente>(
        API.docente.analitica,
        { params: { periodo } },
      );
      return data;
    }

    if (apiConfig.secundariaCursos) {
      await secundariaGatewayService.bootstrapDocente();
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
      (estudiante) =>
        estudiante.estado === "EN_RIESGO" ||
        (estudiante.progreso < 40 && estudiante.estado !== "COMPLETADO"),
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
    const horasEstimadas = Math.round(listaEstudiantes.length * 4.4);
    const valores: Record<string, string> = {
      estudiantes: String(listaEstudiantes.length),
      finalizacion: `${tasaFinalizacion}%`,
      horas: String(horasEstimadas),
      certificados: String(emitidos.length),
      satisfaccion: valoracion.length ? promedioValoracion.toFixed(1) : "—",
      riesgo: String(enRiesgo.length),
      progreso: `${promedioProgreso}%`,
    };
    const detallesKpi: Record<string, string> = {
      estudiantes: listaEstudiantes.length
        ? "Matriculados en tus cursos"
        : "Sin estudiantes aún",
      finalizacion: listaEstudiantes.length
        ? `${completados} de ${listaEstudiantes.length} completaron`
        : "Sin datos de finalización",
      horas: "Estimado · ~4.4 h por estudiante",
      certificados: emitidos.length
        ? "Certificados emitidos en tus cursos"
        : "Ninguno emitido aún",
      satisfaccion: valoracion.length
        ? `Promedio de ${valoracion.length} curso(s) con valoración`
        : "Sin valoraciones aún",
      riesgo: enRiesgo.length
        ? "Progreso bajo o estado en riesgo"
        : "Ninguno en riesgo",
    };
    resultado.kpis = resultado.kpis.map((kpi) => ({
      ...kpi,
      valor: valores[kpi.id] ?? kpi.valor,
      // Sin serie histórica real: no inventar % de variación.
      variacion: "",
      tendencia: "sube",
      detalle: detallesKpi[kpi.id] ?? "",
    }));
    // Gráficos temporales requieren eventos diarios/mensuales: aún no hay fuente.
    resultado.actividadSemanal = [];
    resultado.tendenciaMensual = [];
    resultado.organizaciones = [];
    resultado.modulosDestacados = [];
    resultado.horasPico = [];
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
        cantidad: listaEstudiantes.filter(
          (item) =>
            item.estado === "ACTIVO" ||
            item.estado === "MATRICULADO" ||
            item.estado === "EN_CURSO",
        ).length,
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
    // Un viaje gateway rellena caché; listar()* reutiliza fragmentos ~45s.
    if (apiConfig.secundariaCursos) {
      await secundariaGatewayService.bootstrapDocente();
    }

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
