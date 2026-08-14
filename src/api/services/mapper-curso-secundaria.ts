import type {
  CursoSecundaria,
  MatriculaCursoSecundaria,
  ResultadoContenidoAprendizajeSecundaria,
} from "@/lib/contrato-secundaria";
import type { Course } from "@/types/academia";
import type {
  ContenidoCursoAprendizaje,
  ProgresoCursoAprendizaje,
} from "@/types/aprendizaje.types";
import type {
  BorradorCursoDocente,
  CursoDocente,
  EstadoCursoDocente,
  ModalidadImparticion,
  SesionDocente,
} from "@/portal-docente/types/docente.types";
import type { ContextoSesion } from "@/types/membresia.types";
import type { SesionEnVivoSecundaria } from "@/lib/contrato-secundaria";
import { cursoEstadoVisibleEnCatalogoAlumno } from "@/lib/catalogo-alumno";
import {
  normalizarPosicionPortada,
  urlPublicaMedia,
} from "@/lib/storage-academia";
import { normalizarRequisitos } from "@/lib/requisitos-curso";

const ESTADOS_DOCENTE = new Set<EstadoCursoDocente>([
  "BORRADOR",
  "EN_REVISION",
  "CONTENIDO_REVISADO",
  "OBSERVADO",
  "APROBADO",
  "PUBLICADO",
  "ARCHIVADO",
]);

const IMAGEN_FALLBACK =
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=900&q=80";

type TipoItemConstructor = "lectura" | "video" | "quiz" | "assignment";

/** Normaliza tipos de secundaria (cuestionario, entrega_pdf) al constructor. */
export function tipoItemConstructor(
  tipoRaw: string,
  tienePreguntas = false,
): TipoItemConstructor {
  const tipo = tipoRaw.trim().toLowerCase();
  if (tipo === "quiz" || tipo === "cuestionario") return "quiz";
  if (tipo === "assignment" || tipo === "entrega_pdf" || tipo === "entrega") {
    return "assignment";
  }
  if (tipo === "video") return "video";
  if (tienePreguntas) return "quiz";
  return "lectura";
}

function mapearEstado(estado: string): EstadoCursoDocente {
  const normalizado = estado.trim().toUpperCase();
  if (ESTADOS_DOCENTE.has(normalizado as EstadoCursoDocente)) {
    return normalizado as EstadoCursoDocente;
  }
  if (normalizado === "ACTIVO" || normalizado === "HABILITADO") {
    return "PUBLICADO";
  }
  if (normalizado === "INACTIVO" || normalizado === "ANULADO") {
    return "ARCHIVADO";
  }
  return "BORRADOR";
}

function mapearModalidad(modalidad: string): ModalidadImparticion {
  const normalizado = modalidad.trim().toUpperCase();
  if (normalizado === "EN_VIVO" || normalizado === "PRESENCIAL") {
    return "EN_VIVO";
  }
  if (
    normalizado === "HIBRIDA" ||
    normalizado === "HIBRIDO" ||
    normalizado === "MIXTO"
  ) {
    return "HIBRIDA";
  }
  return "VIRTUAL";
}

function mapearModalidadPortal(modalidad: string): Course["mode"] {
  const valor = modalidad.toUpperCase();
  if (valor === "EN_VIVO" || valor === "PRESENCIAL") return "Presencial";
  if (valor === "HIBRIDA" || valor === "HIBRIDO" || valor === "MIXTO") {
    return "Mixto";
  }
  return "Virtual";
}

function formatearActualizado(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function mapearCursoSecundariaADocente(
  curso: CursoSecundaria,
  contexto?: ContextoSesion | null,
  extras?: { observacion?: string | null },
): CursoDocente {
  const organizacionId = contexto?.organizacionId ?? null;
  const organizacionNombre = contexto?.organizacionNombre ?? "Tukuy Academy";
  const estado = mapearEstado(curso.estado);

  return {
    id: curso.id,
    ambito: organizacionId ? "ORGANIZACION" : "INDEPENDIENTE",
    organizacionId,
    organizacionNombre,
    modeloAcceso: "ORGANIZACION",
    titulo: curso.titulo,
    imagen: urlPublicaMedia(curso.portadaClave, IMAGEN_FALLBACK),
    imagenPosicion: normalizarPosicionPortada(curso.imagenPosicion),
    estado,
    observacion:
      estado === "OBSERVADO"
        ? extras?.observacion?.trim() || undefined
        : undefined,
    modalidadImparticion: mapearModalidad(curso.modalidad),
    estudiantes: 0,
    progreso: 0,
    valoracion: 0,
    actualizado: formatearActualizado(curso.actualizadoEn),
    docenteResponsableId: curso.autorIdentidadRef,
    origenCarga: "DOCENTE",
  };
}

export function mapearDocumentoABorrador(
  documento: Record<string, unknown>,
  semilla: BorradorCursoDocente,
): BorradorCursoDocente {
  const seccionesRaw = Array.isArray(documento.secciones)
    ? documento.secciones
    : semilla.secciones;

  return {
    ...semilla,
    ...documento,
    titulo: String(documento.titulo ?? semilla.titulo ?? ""),
    subtitulo: String(documento.subtitulo ?? semilla.subtitulo ?? ""),
    descripcion: String(documento.descripcion ?? semilla.descripcion ?? ""),
    publico: String(documento.publico ?? semilla.publico ?? ""),
    objetivos: Array.isArray(documento.objetivos)
      ? documento.objetivos.map(String)
      : semilla.objetivos,
    requisitos: Array.isArray(documento.requisitos)
      ? normalizarRequisitos(documento.requisitos)
      : normalizarRequisitos(semilla.requisitos),
    requisitosAccesoActivos: documento.requisitosAccesoActivos === true,
    categoria: String(documento.categoria ?? semilla.categoria ?? ""),
    nivel: String(documento.nivel ?? semilla.nivel ?? ""),
    imagen: urlPublicaMedia(
      String(documento.imagen ?? semilla.imagen ?? ""),
      String(semilla.imagen ?? ""),
    ),
    imagenPosicion: normalizarPosicionPortada(
      String(
        documento.imagenPosicion ?? semilla.imagenPosicion ?? "50% 50%",
      ),
    ),
    ambito: String(documento.ambito ?? semilla.ambito ?? "ORGANIZACION"),
    organizacionId:
      (documento.organizacionId as string | null | undefined) ??
      semilla.organizacionId,
    acceso: String(documento.acceso ?? semilla.acceso ?? "GRATUITO"),
    precio: Number(documento.precio ?? semilla.precio ?? 0),
    visibilidad: String(documento.visibilidad ?? semilla.visibilidad ?? ""),
    permiteEmpresas: Boolean(
      documento.permiteEmpresas ?? semilla.permiteEmpresas,
    ),
    certificado: Boolean(documento.certificado ?? semilla.certificado),
    nombreCertificado: String(
      documento.nombreCertificado ?? semilla.nombreCertificado ?? "",
    ),
    notaMinima: Number(documento.notaMinima ?? semilla.notaMinima ?? 11),
    vigenciaMeses: Number(documento.vigenciaMeses ?? semilla.vigenciaMeses ?? 12),
    secciones: seccionesRaw.map((seccion) => {
      const item = seccion as {
        id?: string;
        titulo?: string;
        clases?: unknown;
        items?: unknown;
        recursos?: unknown;
      };
      const clases = Array.isArray(item.clases)
        ? item.clases.map(String)
        : [];
      const itemsRaw = Array.isArray(item.items) ? item.items : [];
      const items =
        itemsRaw.length > 0
          ? itemsRaw.map((raw, indice) => {
              const fila = raw as {
                id?: string;
                titulo?: string;
                tipo?: string;
                urlYoutube?: string;
                videoUrl?: string;
                preguntas?: unknown;
              };
              const tipoRaw = String(fila.tipo ?? "").toLowerCase();
              const tienePreguntas = Array.isArray(fila.preguntas)
                ? fila.preguntas.length > 0
                : false;
              const tipo = tipoItemConstructor(tipoRaw, tienePreguntas);
              const urlYoutube = String(
                fila.urlYoutube ?? fila.videoUrl ?? "",
              ).trim();
              const preguntas = Array.isArray(fila.preguntas)
                ? fila.preguntas
                    .map((pregunta) => {
                      const p = pregunta as {
                        question?: string;
                        options?: unknown;
                        correctIndex?: number;
                        imagenReferencia?: string;
                        imagen_referencia?: string;
                        imagen?: string;
                        imageUrl?: string;
                      };
                      const imagenReferencia = String(
                        p.imagenReferencia ??
                          p.imagen_referencia ??
                          p.imagen ??
                          p.imageUrl ??
                          "",
                      ).trim();
                      return {
                        question: String(p.question ?? ""),
                        options: Array.isArray(p.options)
                          ? p.options.map(String)
                          : [],
                        correctIndex: Number(p.correctIndex ?? 0),
                        ...(imagenReferencia ? { imagenReferencia } : {}),
                      };
                    })
                    .filter((p) => p.question && p.options.length > 0)
                  : undefined;
              return {
                id: fila.id ? String(fila.id) : undefined,
                titulo: String(fila.titulo ?? clases[indice] ?? "Actividad"),
                tipo,
                ...(tipo === "video" && urlYoutube ? { urlYoutube } : {}),
                ...(tipo === "quiz"
                  ? {
                      preguntas:
                        preguntas && preguntas.length
                          ? preguntas
                          : [
                              {
                                question: "",
                                options: ["", "", "", ""],
                                correctIndex: 0,
                              },
                            ],
                    }
                  : {}),
              };
            })
          : clases.map((titulo, indice) => ({
              id: crypto.randomUUID(),
              titulo,
              tipo: (indice === 0 ? "video" : "lectura") as
                | "video"
                | "lectura",
            }));
      return {
        id: item.id ? String(item.id) : undefined,
        titulo: String(item.titulo ?? "Sección"),
        clases: items.map((actividad) => actividad.titulo),
        items,
        recursos: Array.isArray(item.recursos)
          ? (item.recursos as BorradorCursoDocente["secciones"][number]["recursos"])
          : [],
      };
    }),
  };
}

export function mapearCursoSecundariaAPortal(
  curso: CursoSecundaria,
  matricula?: MatriculaCursoSecundaria | null,
): Course {
  const progreso = Number(matricula?.progresoPorcentaje ?? 0);
  const estado: Course["status"] =
    progreso >= 100
      ? "Completado"
      : progreso > 0 || matricula
        ? "En curso"
        : "Disponible";
  const precio = Number(curso.precio ?? 0);
  const gratuito =
    curso.gratuito === true || (curso.gratuito !== false && precio <= 0);
  const dePago = !gratuito && precio > 0;

  return {
    id: curso.id,
    title: curso.titulo,
    category: curso.categoria || "Academia",
    duration: `${Math.max(1, Number(curso.versionActual?.horas ?? 1))} h`,
    level: "Intermedio",
    mode: mapearModalidadPortal(curso.modalidad),
    progress: progreso,
    status: estado,
    pricing: dePago ? "paid" : "free",
    price: dePago ? precio : 0,
    imageTone: "from-slate-700 to-slate-900",
    image: urlPublicaMedia(curso.portadaClave, IMAGEN_FALLBACK),
    origen: "tukuy",
    alcance: "PUBLICO",
    estadoPublicacion: curso.estado,
    visibleEnCatalogo: cursoEstadoVisibleEnCatalogoAlumno(curso.estado),
  };
}

export function mapearMatriculaAPortal(item: MatriculaCursoSecundaria): Course {
  const progreso = Number(item.progresoPorcentaje ?? 0);
  return {
    id: item.cursoId,
    title: item.titulo,
    category: item.categoria || "Academia",
    duration: "—",
    level: "Intermedio",
    mode: mapearModalidadPortal(item.modalidad),
    progress: progreso,
    status: progreso >= 100 ? "Completado" : "En curso",
    pricing: "free",
    price: 0,
    imageTone: "from-slate-700 to-slate-900",
    image: urlPublicaMedia(
      (item as { portadaClave?: string | null }).portadaClave,
      IMAGEN_FALLBACK,
    ),
    origen: "tukuy",
    alcance: "PUBLICO",
    visibleEnCatalogo: false,
  };
}

export function mapearContenidoAprendizajeSecundaria(
  data: ResultadoContenidoAprendizajeSecundaria,
): {
  contenido: ContenidoCursoAprendizaje;
  progreso: ProgresoCursoAprendizaje;
  apuntes: string;
} {
  const modulos = (data.contenido.modulos ?? []).map((modulo) => ({
    id: modulo.id,
    title: modulo.title,
    recursos: Array.isArray(modulo.recursos)
      ? modulo.recursos
          .map((recurso) => ({
            id: String(recurso.id ?? ""),
            nombre: String(recurso.nombre ?? "Recurso"),
            tipo: String(recurso.tipo ?? "application/octet-stream"),
            tamanio: Number(recurso.tamanio ?? 0) || undefined,
            contenido: String(recurso.contenido ?? "").trim() || undefined,
          }))
          .filter((recurso) => recurso.nombre && recurso.contenido)
      : [],
    items: (modulo.items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      type:
        item.type === "video" ||
        item.type === "quiz" ||
        item.type === "assignment"
          ? item.type
          : ("reading" as const),
      duration: item.duration ?? undefined,
      description: item.description,
      videoUrl: item.videoUrl ? String(item.videoUrl) : undefined,
    })),
  }));

  const items = modulos.flatMap((modulo) => modulo.items);
  const itemsCompletados = data.itemsCompletados ?? [];
  const progresoNum = Number(data.progresoPorcentaje ?? 0);
  const itemActivoServidor =
    typeof data.itemActivoId === "string" && data.itemActivoId
      ? data.itemActivoId
      : "";
  const itemActivoId =
    (itemActivoServidor &&
      items.some((item) => item.id === itemActivoServidor) &&
      itemActivoServidor) ||
    items.find((item) => !itemsCompletados.includes(item.id))?.id ||
    items[0]?.id ||
    "";
  const quizzesRaw = data.contenido.quizzes ?? {};
  const quizzes: ContenidoCursoAprendizaje["quizzes"] = {};
  for (const [actividadId, preguntas] of Object.entries(quizzesRaw)) {
    if (!Array.isArray(preguntas)) continue;
    quizzes[actividadId] = preguntas
      .map((pregunta) => {
        const correctRaw = pregunta.correctIndex;
        const correctIndex =
          typeof correctRaw === "number" && Number.isFinite(correctRaw)
            ? correctRaw
            : undefined;
        const imagenReferencia = String(
          pregunta.imagenReferencia ??
            (pregunta as { imagen_referencia?: string }).imagen_referencia ??
            "",
        ).trim();
        return {
          question: String(pregunta.question ?? ""),
          options: Array.isArray(pregunta.options)
            ? pregunta.options.map((opcion) => String(opcion))
            : [],
          ...(correctIndex !== undefined ? { correctIndex } : {}),
          ...(imagenReferencia ? { imagenReferencia } : {}),
        };
      })
      .filter((pregunta) => pregunta.question && pregunta.options.length > 0);
  }

  const notas: Record<string, number> = {};
  for (const [actividadId, nota] of Object.entries(data.notas ?? {})) {
    const valor = Number(nota);
    if (Number.isFinite(valor)) notas[actividadId] = valor;
  }

  return {
    contenido: {
      id: data.contenido.id,
      modulos,
      quizzes,
      notaMinima: Number.isFinite(Number(data.notaMinima))
        ? Number(data.notaMinima)
        : 14,
    },
    progreso: {
      id: data.contenido.id,
      itemsCompletados,
      notas,
      itemActivoId,
      progreso: progresoNum,
      estado:
        progresoNum >= 100
          ? "Completado"
          : progresoNum > 0 || data.matriculaId
            ? "En curso"
            : "Disponible",
      actualizadoEn: new Date().toISOString(),
    },
    apuntes: typeof data.apuntes === "string" ? data.apuntes : "",
  };
}

export function mapearSesionSecundariaADocente(
  sesion: SesionEnVivoSecundaria,
): SesionDocente {
  const inicio = new Date(sesion.iniciaEn);
  const fin = new Date(sesion.terminaEn);
  const minutos = Math.max(
    15,
    Math.round((fin.getTime() - inicio.getTime()) / 60000),
  );
  const hoy = new Date();
  const mismoDia =
    inicio.toDateString() === hoy.toDateString() && inicio > hoy;
  const enCurso = inicio <= hoy && fin >= hoy;
  const estadoPersistido = String(sesion.estado ?? "").toUpperCase();
  const estadosValidos: SesionDocente["estado"][] = [
    "PROGRAMADA",
    "HOY",
    "EN_VIVO",
    "FINALIZADA",
    "CANCELADA",
  ];
  const estado: SesionDocente["estado"] =
    estadoPersistido === "CANCELADA" ||
    estadoPersistido === "EN_VIVO" ||
    estadoPersistido === "FINALIZADA"
      ? (estadoPersistido as SesionDocente["estado"])
      : enCurso
        ? "EN_VIVO"
        : mismoDia
          ? "HOY"
          : fin < hoy
            ? "FINALIZADA"
            : estadosValidos.includes(
                  estadoPersistido as SesionDocente["estado"],
                )
              ? (estadoPersistido as SesionDocente["estado"])
              : "PROGRAMADA";

  return {
    id: sesion.id,
    titulo: sesion.titulo,
    curso: sesion.cursoTitulo,
    cursoId: sesion.cursoId,
    fecha: new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
    })
      .format(inicio)
      .toUpperCase()
      .replace(".", ""),
    hora: new Intl.DateTimeFormat("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(inicio),
    duracion: `${minutos} min`,
    inscritos: Number(sesion.inscritos ?? 0),
    estado,
    fechaHoraIso: sesion.iniciaEn,
    enlace: sesion.urlAcceso ?? undefined,
  };
}

export function mapearMatriculaAProgreso(
  item: MatriculaCursoSecundaria,
): ProgresoCursoAprendizaje {
  const progreso = Number(item.progresoPorcentaje ?? 0);
  return {
    id: item.cursoId,
    itemsCompletados: [],
    notas: {},
    itemActivoId: "",
    progreso,
    estado:
      progreso >= 100
        ? "Completado"
        : item.estadoMatricula
          ? "En curso"
          : "Disponible",
    actualizadoEn: item.matriculadoEn || new Date().toISOString(),
  };
}
