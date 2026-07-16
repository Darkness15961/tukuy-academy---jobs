export type TipoOrganizacion =
  | "PERSONAL"
  | "EMPRESA"
  | "ACADEMIA"
  | "INSTITUTO"
  | "UNIVERSIDAD"
  | "ONG"
  | "ENTIDAD_PUBLICA"
  | "DOCENTE_INDEPENDIENTE";

export type EstadoOrganizacion = "ACTIVA" | "SUSPENDIDA" | "INACTIVA";

export type Organizacion = {
  id: string;
  nombre: string;
  tipo: TipoOrganizacion;
  logo?: string;
  estado: EstadoOrganizacion;
};
