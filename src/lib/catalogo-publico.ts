import type { Course } from "@/types/academia";
import { cursoEstadoVisibleEnCatalogoAlumno } from "@/lib/catalogo-alumno";
import {
  normalizarPosicionPortada,
  urlPublicaMedia,
} from "@/lib/storage-academia";
import { resolverDuracionCursoTexto } from "@/lib/duracion-curso";

const IMAGEN_FALLBACK =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80";

function mapearModalidadPortal(modalidad: string, categoria?: string | null): Course["mode"] {
  const valor = modalidad.toUpperCase();
  if (valor === "EN_VIVO" || valor === "PRESENCIAL") return "Presencial";
  if (valor === "HIBRIDA" || valor === "HIBRIDO" || valor === "MIXTO") {
    return "Mixto";
  }
  if (/clase(s)?\s+en\s+vivo/i.test(String(categoria ?? ""))) {
    return "Presencial";
  }
  return "Virtual";
}

export type CursoCatalogoPublico = {
  id?: string;
  cursoSecundarioRef: string;
  titulo: string;
  resumen?: string | null;
  modalidad?: string | null;
  categoria?: string | null;
  imagenPublicaRef?: string | null;
  duracionMinutos?: number | null;
  estadoPublicacion?: string | null;
  datosHistoricos?: Record<string, unknown> | null;
  /** Campos enriquecidos desde secundaria (gateway). */
  portadaClave?: string | null;
  imagenPosicion?: string | null;
  precio?: number | null;
  gratuito?: boolean | null;
  categoriaSecundaria?: string | null;
  duracionMinutosTotal?: number | null;
  /** Estado en secundaria (PUBLICADO, ARCHIVADO, …). */
  estadoSecundaria?: string | null;
  /** visibilidad del borrador (PUBLICO, PRIVADO, ORGANIZACION). */
  visibilidad?: string | null;
  /** Alcance docente (TODOS, ORGANIZACION, UNIDADES). */
  alcanceDirigido?: string | null;
};

export function mapearCursoCatalogoPublico(
  item: CursoCatalogoPublico,
): Course {
  const historico = item.datosHistoricos ?? {};
  const precioHistorico = Number(historico.precio ?? NaN);
  const precio = Number.isFinite(precioHistorico)
    ? precioHistorico
    : Number(item.precio ?? 0);
  const gratuitoHistorico = historico.gratuito;
  const gratuito =
    item.gratuito === true ||
    gratuitoHistorico === true ||
    (item.gratuito !== false &&
      gratuitoHistorico !== false &&
      precio <= 0);
  const portada =
    item.portadaClave ||
    item.imagenPublicaRef ||
    (typeof historico.imagen === "string" ? historico.imagen : "") ||
    "";
  const minutosDuracion =
    item.duracionMinutosTotal ??
    item.duracionMinutos ??
    Number(historico.duracionMinutos ?? 0);
  const duracionTexto = resolverDuracionCursoTexto({
    duracionMinutosTotal: minutosDuracion > 0 ? minutosDuracion : undefined,
    horasVersion:
      typeof historico.horasVersion === "number"
        ? historico.horasVersion
        : undefined,
  });

  const nivelRaw = String(historico.nivel ?? "Intermedio");
  const nivel: Course["level"] =
    nivelRaw === "Basico" || nivelRaw === "Intermedio" || nivelRaw === "Avanzado"
      ? nivelRaw
      : "Intermedio";

  return {
    id: item.cursoSecundarioRef,
    title: item.titulo,
    category:
      item.categoriaSecundaria ||
      item.categoria ||
      String(historico.categoria ?? "") ||
      "Academia",
    duration: duracionTexto === "—" ? "—" : duracionTexto,
    level: nivel,
    mode: mapearModalidadPortal(
      item.modalidad ?? "VIRTUAL",
      item.categoriaSecundaria || item.categoria,
    ),
    progress: 0,
    status: "Disponible",
    pricing: gratuito ? "free" : "paid",
    price: gratuito ? 0 : precio,
    imageTone: "from-slate-700 to-slate-900",
    image: urlPublicaMedia(portada, IMAGEN_FALLBACK),
    imagenPosicion: normalizarPosicionPortada(
      item.imagenPosicion ??
        (typeof historico.imagenPosicion === "string"
          ? historico.imagenPosicion
          : "50% 50%"),
    ),
    origen: "tukuy",
    alcance: "PUBLICO",
    estadoPublicacion: item.estadoPublicacion ?? "PUBLICADO",
    visibleEnCatalogo: cursoEstadoVisibleEnCatalogoAlumno(
      item.estadoPublicacion ?? "PUBLICADO",
    ),
    resumen:
      String(item.resumen ?? historico.resumen ?? historico.descripcion ?? "")
        .trim() || undefined,
  };
}

export function normalizarListadoCatalogoPublico(
  cursos: Course[],
): Course[] {
  return cursos.map((curso) => ({
    ...curso,
    progress: 0,
    status: "Disponible" as const,
  }));
}
