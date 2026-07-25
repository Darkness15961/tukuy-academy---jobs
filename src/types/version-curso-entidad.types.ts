import type { ConfiguracionPublicacionCurso } from "@/types/comercializacion-curso.types";
import type { RevisionAcademicaCurso } from "@/portal-organizacion/types/revision-curso.types";

export type EstadoVersionCursoEntidad =
  | "BORRADOR"
  | "EN_REVISION"
  | "OBSERVADO"
  | "APROBADO"
  | "PUBLICADO";

export interface ClasificacionCurso {
  categoriaPrincipalId: string;
  categoriaSecundariaIds: string[];
  etiquetas: string[];
  nivel?: string;
  recomendarPorIntereses: boolean;
  visibleEnFiltrosPublicos: boolean;
}

/** Instantánea enviada a revisión: no muta si el docente edita su borrador. */
export interface VersionCursoEntidad {
  id: string;
  cursoId: string;
  propuestaId: string;
  numeroVersion: number;
  contenido: RevisionAcademicaCurso;
  clasificacion?: ClasificacionCurso;
  publicacion?: ConfiguracionPublicacionCurso;
  estado: EstadoVersionCursoEntidad;
  enviadaPor: string;
  enviadaEn: string;
  revisadaPor?: string;
  revisadaEn?: string;
  observacion?: string;
}
