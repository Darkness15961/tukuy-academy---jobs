export type MonedaCurso = "PEN" | "USD";
export type AlcanceOfertaCurso = "PUBLICO" | "INTERNO";
/** Inscripción libre: nodo (si aplica) + precio/gratuidad. Otros valores reservados. */
export type ModalidadMatriculaCurso = "LIBRE" | "CON_APROBACION" | "SOLO_ASIGNACION";
/** Gratuito o curso completo. POR_MODULOS queda reservado / no expuesto en UI. */
export type ModalidadPrecioCurso = "GRATUITO" | "CURSO_COMPLETO" | "POR_MODULOS";
export type PoliticaCombinacionDescuentos = "SOLO_MEJOR" | "POR_PRIORIDAD" | "ACUMULABLES";

export interface PrecioModuloCurso {
  moduloId: string;
  precio: number;
  vendibleIndividualmente: boolean;
}

export interface ConfiguracionPrecioCurso {
  modalidad: ModalidadPrecioCurso;
  moneda: MonedaCurso;
  precioCompleto: number;
  modulos: PrecioModuloCurso[];
}

export interface ConfiguracionCertificacionComercial {
  habilitada: boolean;
  incluidaConCurso: boolean;
  compraOpcional: boolean;
  precio: number;
  moneda: MonedaCurso;
  notaMinima: number;
  porcentajeMinimoAvance: number;
  requiereCompletarActividades: boolean;
}

export interface ReglaDescuentoCurso {
  id: string;
  nombre: string;
  /** AUTOMATICO = por audiencia; CODIGO = cupón que el alumno ingresa. */
  modo: "AUTOMATICO" | "CODIGO";
  /** Código del cupón (solo modo CODIGO). */
  codigo?: string;
  aplicaSobre: "CURSO_COMPLETO" | "CERTIFICADO" | "MODULO";
  moduloIds: string[];
  beneficiario: "TODOS" | "INTERNOS" | "EXTERNOS" | "NODOS" | "PERSONAS";
  nodoIds: string[];
  usuarioIds: string[];
  tipo: "PORCENTAJE" | "MONTO_FIJO";
  valor: number;
  acumulable: boolean;
  prioridad: number;
  activa: boolean;
}

export interface ConfiguracionPublicacionCurso {
  categoriaPrincipalId: string;
  categoriaSecundariaIds: string[];
  recomendarPorIntereses: boolean;
  alcance: AlcanceOfertaCurso;
  nodoIds: string[];
  incluirDescendientes: boolean;
  modalidadMatricula: ModalidadMatriculaCurso;
  visibleParaExternos: boolean;
  precio: ConfiguracionPrecioCurso;
  certificacion: ConfiguracionCertificacionComercial;
  politicaDescuentos: PoliticaCombinacionDescuentos;
  descuentos: ReglaDescuentoCurso[];
  obligatorio: boolean;
  fechaLimite?: string;
}

export interface PerfilPrecioCurso {
  condicion: "INTERNO" | "EXTERNO";
  nodoIds: string[];
  usuarioId?: string;
}

export interface ResultadoPrecioCurso {
  precioBase: number;
  descuentoTotal: number;
  precioFinal: number;
  reglasAplicadas: ReglaDescuentoCurso[];
}
