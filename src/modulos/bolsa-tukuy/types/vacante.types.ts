export type OrigenVacante = "plataforma" | "externa";

export type ModalidadVacante = "Presencial" | "Remoto" | "Híbrido";

export type TipoContrato =
  | "Tiempo completo"
  | "Medio tiempo"
  | "Por proyecto"
  | "Prácticas";

export type EstadoVacante =
  | "borrador"
  | "en_revision"
  | "publicada"
  | "pausada"
  | "cerrada";

/**
 * Empleador de la vacante.
 * - plataforma: organización interna de Tukuy que publica en la bolsa.
 * - externa: oferta obtenida por scraping / agregación de portales laborales.
 */
export type EmpleadorVacante = {
  nombre: string;
  origen: OrigenVacante;
  /** Logo simulado (asset local). Si falta, la UI usa iniciales. */
  logoUrl?: string;
  /** Solo plataforma: id de organización en Tukuy. */
  organizacionId?: string;
  /** Solo externa: portal de donde se extrajo (p. ej. Computrabajo). */
  fuenteExterna?: string;
  /** Color de respaldo para iniciales / badge. */
  colorMarca?: string;
};

export type Vacante = {
  id: string;
  titulo: string;
  /** @deprecated Preferir `empleador.nombre`. Se mantiene por compatibilidad. */
  empresa: string;
  empleador: EmpleadorVacante;
  ubicacion: string;
  modalidad: ModalidadVacante;
  tipoContrato: TipoContrato;
  compatibilidad: number;
  publicadaEn: string;
  cierreEn: string;
  cierreTexto: string;
  etiquetas: string[];
  descripcion: string;
  responsabilidades: string[];
  requisitos: string[];
  salario?: string;
  destacada?: boolean;
  estado: EstadoVacante;
};

export type EstadoPostulacion =
  | "enviada"
  | "en_revision"
  | "preseleccionada"
  | "entrevista"
  | "finalizada"
  | "no_seleccionada";

export type Postulacion = {
  id: string;
  vacanteId: string;
  fecha: string;
  estado: EstadoPostulacion;
};

export function inicialesEmpleador(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0] ?? "")
    .join("")
    .toUpperCase();
}

export function etiquetaOrigen(origen: OrigenVacante) {
  return origen === "plataforma" ? "Organización Tukuy" : "Fuente externa";
}
