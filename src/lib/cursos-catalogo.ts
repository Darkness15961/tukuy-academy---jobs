import {
  categoriasCursosEntidadesMock,
  cursosPerfilesEntidadesMock,
  entidadesPublicasMock,
} from "@/modulos/comunidad/data/entidades-publicas.mock";
import type { CursoPerfilEntidad } from "@/modulos/comunidad/types/entidad-publica.types";
import type { Course } from "@/types/academia";

const TONOS = [
  "from-blue-800 to-teal-700",
  "from-amber-600 to-slate-700",
  "from-sky-700 to-slate-800",
  "from-indigo-700 to-blue-900",
  "from-slate-700 to-blue-700",
  "from-blue-600 to-teal-600",
] as const;

function nivelDesdeDuracion(duracion: string): Course["level"] {
  const horas = Number.parseInt(duracion, 10);
  if (!Number.isFinite(horas) || horas <= 4) return "Basico";
  if (horas <= 10) return "Intermedio";
  return "Avanzado";
}

function categoriaPrincipal(curso: CursoPerfilEntidad) {
  const primera = curso.categoriaIds[0];
  return (
    categoriasCursosEntidadesMock.find((item) => item.id === primera)?.nombre ??
    "Formación entidad"
  );
}

export function mapearCursoEntidadACatalogo(
  curso: CursoPerfilEntidad,
): Course {
  const entidad = entidadesPublicasMock.find(
    (item) => item.id === curso.organizacionId,
  );
  const indice = Math.abs(
    curso.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
  );

  return {
    id: curso.id,
    title: curso.titulo,
    category: categoriaPrincipal(curso),
    duration: curso.duracion.includes("hora")
      ? curso.duracion
      : `${curso.duracion.replace(/\s*h\b/i, " horas")}`,
    level: nivelDesdeDuracion(curso.duracion),
    mode: curso.alcance === "INTERNO" ? "Virtual" : "Mixto",
    progress: 0,
    status: "Disponible",
    pricing: curso.gratuito || curso.precio <= 0 ? "free" : "paid",
    price: curso.gratuito ? undefined : curso.precio,
    imageTone: TONOS[indice % TONOS.length]!,
    image: curso.imagen,
    instructor: curso.docente,
    origen: "entidad",
    alcance: curso.alcance,
    organizacionId: curso.organizacionId,
    organizacionNombre: entidad?.nombre ?? "Organización",
  };
}

/**
 * Une catálogo Tukuy + cursos publicados por entidades (públicos e internos).
 * Los IDs de entidad tienen prioridad de metadatos (origen / alcance / org).
 */
export function fusionarCatalogoConEntidades(cursosBase: Course[]): Course[] {
  const porId = new Map<string, Course>();

  for (const curso of cursosBase) {
    porId.set(curso.id, {
      ...curso,
      origen: curso.origen ?? (curso.id.startsWith("c-") ? "tukuy" : "entidad"),
      alcance: curso.alcance ?? "PUBLICO",
    });
  }

  for (const cursoEntidad of cursosPerfilesEntidadesMock.filter(
    (item) => item.estado === "PUBLICADO",
  )) {
    const mapeado = mapearCursoEntidadACatalogo(cursoEntidad);
    const existente = porId.get(cursoEntidad.id);
    if (existente) {
      porId.set(cursoEntidad.id, {
        ...existente,
        ...mapeado,
        progress: existente.progress,
        status: existente.status,
        mode:
          existente.mode === "Mixto" || existente.mode === "Presencial"
            ? existente.mode
            : mapeado.mode,
      });
    } else {
      porId.set(cursoEntidad.id, mapeado);
    }
  }

  return [...porId.values()];
}
