import type {
  ActividadRevisionCurso,
  ModuloRevisionCurso,
  RecursoRevisionCurso,
  TipoActividadRevision,
} from "@/portal-organizacion/types/revision-curso.types";
import {
  detectarFuenteVideo,
  etiquetaFuenteVideo,
  normalizarFuenteVideo,
} from "@/lib/video-curso";

function formatearTamanio(bytes: unknown): string | undefined {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function urlUtil(valor: unknown): string {
  const url = String(valor ?? "").trim();
  if (!url) return "";
  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("s3://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return "";
}

function tipoActividad(raw: unknown): TipoActividadRevision {
  const t = String(raw ?? "").toLowerCase();
  if (t === "video") return "video";
  if (t === "quiz" || t === "cuestionario") return "quiz";
  if (t === "assignment" || t === "entrega_pdf") return "assignment";
  return "lectura";
}

function etiquetaTipo(tipo: TipoActividadRevision): string {
  switch (tipo) {
    case "video":
      return "Video";
    case "quiz":
      return "Cuestionario";
    case "assignment":
      return "Entrega PDF";
    default:
      return "Lectura";
  }
}

function tipoRecurso(raw: unknown, url: string): RecursoRevisionCurso["tipo"] {
  const t = String(raw ?? "").toUpperCase();
  if (t === "VIDEO" || t.includes("VIDEO")) return "VIDEO";
  if (t === "ENLACE" || t === "LINK" || t === "URL") return "ENLACE";
  if (t === "PLANTILLA" || t.includes("SHEET") || t.includes("XLS")) {
    return "PLANTILLA";
  }
  if (url && !/\.(pdf|doc|docx|ppt|pptx)$/i.test(url) && /^https?:\/\//i.test(url)) {
    return "ENLACE";
  }
  return "PDF";
}

export function mapearSeccionesAModulosRevision(
  secciones: Array<Record<string, unknown>>,
  cursoId: string,
): ModuloRevisionCurso[] {
  return secciones.map((seccion, indice) => {
    const items = Array.isArray(seccion.items)
      ? (seccion.items as Array<Record<string, unknown>>)
      : [];
    const clases = Array.isArray(seccion.clases)
      ? seccion.clases.map(String).filter((c) => c.trim())
      : [];
    const recursosRaw = Array.isArray(seccion.recursos)
      ? (seccion.recursos as Array<Record<string, unknown>>)
      : [];

    const actividades: ActividadRevisionCurso[] = items.map((item, iIdx) => {
      const tipo = tipoActividad(item.tipo);
      const preguntas = Array.isArray(item.preguntas) ? item.preguntas : [];
      const urlYoutube = urlUtil(item.urlYoutube ?? item.url_youtube);
      const fuenteVideo =
        normalizarFuenteVideo(
          String(item.fuenteVideo ?? item.videoFuente ?? ""),
        ) ?? detectarFuenteVideo(urlYoutube) ?? undefined;
      return {
        id: String(item.id ?? `${cursoId}-m${indice}-a${iIdx}`),
        titulo: String(item.titulo ?? clases[iIdx] ?? `Actividad ${iIdx + 1}`),
        tipo,
        tipoEtiqueta: etiquetaTipo(tipo),
        urlYoutube: urlYoutube || undefined,
        fuenteVideo,
        totalPreguntas: tipo === "quiz" ? preguntas.length : undefined,
      };
    });

    // Si solo hay clases planas sin items tipados, mostrarlas como lecturas.
    if (!actividades.length && clases.length) {
      for (const [iIdx, titulo] of clases.entries()) {
        actividades.push({
          id: `${cursoId}-m${indice}-c${iIdx}`,
          titulo,
          tipo: "lectura",
          tipoEtiqueta: "Clase",
        });
      }
    }

    const recursos: RecursoRevisionCurso[] = recursosRaw
      .map((recurso, rIdx) => {
        const crudo = urlUtil(
          recurso.contenido ?? recurso.url ?? recurso.urlDemo ?? recurso.href,
        );
        const url = crudo
          ? /^https?:\/\//i.test(crudo) ||
            crudo.startsWith("data:") ||
            crudo.startsWith("blob:")
            ? crudo
            : `https://tukuy-academy-media.s3.us-east-2.amazonaws.com/${crudo.replace(/^s3:\/\//i, "").replace(/^\//, "")}`
          : "";
        return {
          id: String(recurso.id ?? `r-${indice}-${rIdx}`),
          nombre: String(recurso.nombre ?? recurso.titulo ?? "Material"),
          tipo: tipoRecurso(recurso.tipo, url || crudo),
          tamanio: formatearTamanio(recurso.tamanio),
          urlDemo: url || "#",
        };
      })
      .filter((recurso) => recurso.nombre.trim().length > 0);

    return {
      id: String(seccion.id ?? `${cursoId}-m${indice}`),
      titulo: String(seccion.titulo ?? `Módulo ${indice + 1}`),
      descripcion: String(seccion.descripcion ?? ""),
      clases: actividades.map((a) => a.titulo),
      recursos,
      actividades: actividades.map((a) => a.titulo),
      actividadesDetalle: actividades,
    };
  });
}
