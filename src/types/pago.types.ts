export type ProveedorPago = "izipay";

export type EntornoPago = "pruebas" | "produccion";

export type MetodoPagoIzipay =
  | "CARD"
  | "QR"
  | "YAPE_CODE"
  | "PAGO_PUSH"
  | "APPLE_PAY";

export type EstadoOrdenPago =
  | "creada"
  | "pendiente"
  | "pagada"
  | "rechazada"
  | "cancelada"
  | "expirada";

export type CrearOrdenPagoCurso = {
  cursoId: string;
};

export type CrearOrdenPagoCarrito = {
  cursoIds: string[];
};

export type ConfiguracionPublicaIzipay = {
  transactionId: string;
  action: "pay";
  merchantCode: string;
  order: {
    orderNumber: string;
    currency: "PEN";
    amount: string;
    processType: "AT" | "PA";
    merchantBuyerId: string;
    dateTimeTransaction: string;
  };
  billing?: Record<string, string>;
  render: {
    typeForm: "pop-up" | "embedded" | "redirect";
  };
  appearance?: Record<string, unknown>;
};

export type SesionPagoCurso = {
  ordenId: string;
  proveedor: ProveedorPago;
  estado: EstadoOrdenPago;
  entorno: EntornoPago;
  moneda: "PEN";
  importe: number;
  cursoIds: string[];
  metodosDisponibles: MetodoPagoIzipay[];
  autorizacionSesion: string;
  llaveRsaPublica: string;
  configuracion: ConfiguracionPublicaIzipay;
  demostracion?: boolean;
};

export type RespuestaClienteIzipay = {
  code?: string;
  message?: string;
  messageUser?: string;
  payloadHttp?: string;
  signature?: string;
  transactionId?: string;
};

export type ConfirmarRespuestaPago = Pick<
  RespuestaClienteIzipay,
  "code" | "payloadHttp" | "signature" | "transactionId"
>;

export type ResumenOrdenPago = {
  ordenId: string;
  estado: EstadoOrdenPago;
  mensaje?: string;
};
