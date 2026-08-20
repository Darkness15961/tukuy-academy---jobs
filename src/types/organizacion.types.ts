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
  /** Logo institucional (selector de espacios, header, certificados). */
  logo?: string;
  /**
   * Fondo del selector de espacios para todos los perfiles de esta organización.
   * Coincide con `org_presencia.portada_url`.
   */
  portada?: string;
  estado: EstadoOrganizacion;
};
