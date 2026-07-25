export type TipoEntidadPublica =
  | "COLEGIO"
  | "EMPRESA"
  | "ACADEMIA"
  | "ONG"
  | "INSTITUCION";

export type EstadoMembresiaEntidad =
  | "NINGUNA"
  | "SOLICITADA"
  | "MIEMBRO"
  | "CONTACTADO";

export type EntidadPublicaComunidad = {
  id: string;
  nombre: string;
  slug: string;
  tipo: TipoEntidadPublica;
  sector: string;
  ciudad: string;
  region: string;
  descripcionCorta: string;
  descripcion: string;
  logo: string;
  portada: string;
  verificada: boolean;
  miembros: number;
  publicaciones: number;
  cursosActivos: number;
  vacantesAbiertas: number;
  sitioWeb?: string;
  correoContacto: string;
  etiquetas: string[];
  requiereDniEnrolamiento: boolean;
};

export type PublicacionEntidadResumen = {
  id: string;
  titulo: string;
  extracto: string;
  fecha: string;
  tipo: string;
};

export type CategoriaCursoEntidad = {
  id: string;
  organizacionId: string;
  nombre: string;
  descripcion: string;
  color: string;
  categoriaPadreId?: string;
  visibleEnCatalogo: boolean;
  seleccionableComoInteres: boolean;
  orden: number;
  estado: "ACTIVA" | "INACTIVA";
};

export type AlcanceCursoEntidad = "PUBLICO" | "INTERNO";

export type CursoPerfilEntidad = {
  id: string;
  organizacionId: string;
  titulo: string;
  resumen: string;
  imagen: string;
  docente: string;
  duracion: string;
  categoriaIds: string[];
  alcance: AlcanceCursoEntidad;
  nodoIdsPermitidos: string[];
  incluirDescendientes: boolean;
  modalidadAcceso: "LIBRE" | "CON_APROBACION" | "SOLO_ASIGNACION";
  gratuito: boolean;
  precio: number;
  moneda: "PEN" | "USD";
  estado: "PUBLICADO" | "CERRADO";
};

export type EvaluacionAccesoCursoPerfil = {
  disponible: boolean;
  condicion: "INTERNO" | "EXTERNO";
  origenAcceso: "CURSO_PUBLICO" | "NODO_INTERNO" | "ASIGNACION" | "APROBACION";
  motivo: string;
  nodoOrigenId?: string;
  nodoOrigenNombre?: string;
};

export type MatriculaCursoEntidadPerfil = {
  id: string;
  usuarioReferencia: string;
  cursoId: string;
  organizacionId: string;
  condicionAlInscribirse: "INTERNO" | "EXTERNO";
  origenAcceso: EvaluacionAccesoCursoPerfil["origenAcceso"];
  nodoOrigenId?: string;
  estado: "ACTIVA" | "PENDIENTE";
  fechaInscripcion: string;
};
