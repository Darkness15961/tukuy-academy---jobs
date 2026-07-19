export type PlantillaPerfilEntidad =
  | "DIRECCION"
  | "ADMINISTRACION"
  | "GESTION"
  | "SUPERVISION"
  | "DOCENCIA"
  | "APRENDIZAJE"
  | "PERSONALIZADO";

export type TipoPerfilEntidad =
  | "DIRECCION"
  | "ADMINISTRADOR"
  | "PERSONALIZADO";

export interface PerfilEntidad {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoPerfilEntidad;
  plantilla: PlantillaPerfilEntidad;
  nivelAutoridad: number;
  permisos: string[];
  alcanceDefecto:
    | "PROPIO"
    | "CURSOS_PROPIOS"
    | "UNIDAD"
    | "SEDE"
    | "ENTIDAD";
  rutaInicial: string;
  esSistema: boolean;
  estado: "ACTIVO" | "INACTIVO";
}

export interface TipoUnidadEntidad {
  id: string;
  nombreSingular: string;
  nombrePlural: string;
  descripcion?: string;
  color: string;
  permiteSubunidades: boolean;
  estado: "ACTIVO" | "INACTIVO";
}

export interface UnidadOrganizacional {
  id: string;
  nombre: string;
  descripcion?: string;
  codigo?: string;
  tipoUnidadId: string;
  unidadPadreId: string | null;
  responsableUsuarioId?: string;
  politicaIncorporacionId?: string;
  /** Permite convertir una unidad concreta en terminal o contenedora. */
  permiteSubunidades?: boolean;
  orden: number;
  estado: "ACTIVA" | "INACTIVA";
}

export type ModalidadIncorporacion =
  | "AUTOMATICA"
  | "CON_APROBACION"
  | "ASIGNACION_ADMIN"
  | "ABIERTA";

export interface PoliticaIncorporacionUnidad {
  id: string;
  nombre: string;
  modalidad: ModalidadIncorporacion;
  capacidadMaxima?: number;
  especialidadesPermitidas?: string[];
  requiereColegiaturaActiva?: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

export interface VinculacionUnidad {
  id: string;
  usuarioId: string;
  unidadId: string;
  sedeId?: string;
  tipo: "PRINCIPAL" | "SECUNDARIA" | "TEMPORAL";
  origen:
    | "ASIGNACION_ADMINISTRATIVA"
    | "SOLICITUD_USUARIO"
    | "IMPORTACION"
    | "REGLA_AUTOMATICA";
  estado: "PENDIENTE" | "ACTIVA" | "RECHAZADA" | "FINALIZADA";
  fechaInicio?: string;
  fechaFin?: string;
  aprobadaPor?: string;
}

export interface AsignacionPerfilUsuario {
  id: string;
  usuarioId: string;
  perfilId: string;
  unidadIds: string[];
  sedeIds: string[];
  incluirDescendientes: boolean;
  esPrincipal: boolean;
  estado: "ACTIVA" | "INACTIVA";
}

export type PublicoCursoEntidad =
  | "TODA_LA_ENTIDAD"
  | "UNIDADES"
  | "ESPECIALIDADES"
  | "PERFILES";

export type ModalidadAccesoCursoEntidad =
  | "LIBRE"
  | "CON_APROBACION"
  | "SOLO_ASIGNACION"
  | "INVITACION";

/**
 * Define quién puede matricularse en un curso institucional. La regla apunta
 * a identificadores estables y no depende de etiquetas como "área".
 */
export interface ReglaAccesoCursoEntidad {
  id: string;
  cursoId: string;
  cursoTitulo: string;
  publico: PublicoCursoEntidad;
  publicoIds: string[];
  incluirDescendientes: boolean;
  modalidad: ModalidadAccesoCursoEntidad;
  cupo?: number;
  estado: "ACTIVA" | "INACTIVA";
}

export interface EvaluacionAccesoCursoEntidad {
  disponible: boolean;
  requiereAprobacion: boolean;
  modalidad: ModalidadAccesoCursoEntidad | null;
  motivo: string;
  unidadOrigenId?: string;
  reglaId?: string;
}
