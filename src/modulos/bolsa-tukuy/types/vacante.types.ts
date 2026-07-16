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

export type Vacante = {
  id: string;
  titulo: string;
  empresa: string;
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

