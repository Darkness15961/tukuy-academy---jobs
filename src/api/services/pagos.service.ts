import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { resolveMock } from "@/api/mock";
import { courses } from "@/data/academia.mock";
import type {
  ConfirmarRespuestaPago,
  CrearOrdenPagoCarrito,
  CrearOrdenPagoCurso,
  ResumenOrdenPago,
  SesionPagoCurso,
} from "@/types/pago.types";

const estadoOrdenesMock = new Map<string, ResumenOrdenPago>();

function obtenerCursosPagados(ids: string[]) {
  const unicos = [...new Set(ids)];
  const seleccionados = courses.filter(
    (item) =>
      unicos.includes(item.id) && item.pricing === "paid" && (item.price ?? 0) > 0,
  );

  if (!seleccionados.length) {
    throw new Error("No hay cursos de pago válidos para generar la orden.");
  }

  return seleccionados;
}

function crearSesionMock(cursoIds: string[]): SesionPagoCurso {
  const seleccionados = obtenerCursosPagados(cursoIds);
  const ahora = Date.now();
  const ordenId = `demo-${ahora}`;
  const numeroOrden = `TUKUY-${ahora}`;
  const transactionId = String(ahora);
  const importe = seleccionados.reduce(
    (total, curso) => total + (curso.price ?? 0),
    0,
  );

  estadoOrdenesMock.set(ordenId, {
    ordenId,
    estado: "pendiente",
    mensaje: "Orden de demostración pendiente.",
  });

  return {
    ordenId,
    proveedor: "izipay",
    estado: "pendiente",
    entorno: "pruebas",
    moneda: "PEN",
    importe,
    cursoIds: seleccionados.map((curso) => curso.id),
    metodosDisponibles: ["CARD", "YAPE_CODE", "QR", "PAGO_PUSH"],
    autorizacionSesion: "sesion-demostracion",
    llaveRsaPublica: "llave-publica-demostracion",
    demostracion: true,
    configuracion: {
      transactionId,
      action: "pay",
      merchantCode: "comercio-demostracion",
      order: {
        orderNumber: numeroOrden,
        currency: "PEN",
        amount: importe.toFixed(2),
        processType: "AT",
        merchantBuyerId: "estudiante-demostracion",
        dateTimeTransaction: new Date().toISOString(),
      },
      render: { typeForm: "pop-up" },
    },
  };
}

export const pagosService = {
  async crearOrdenCurso(
    solicitud: CrearOrdenPagoCurso,
  ): Promise<SesionPagoCurso> {
    if (apiConfig.useMock) {
      return resolveMock(crearSesionMock([solicitud.cursoId]));
    }

    const { data } = await api.post<SesionPagoCurso>(
      API.payments.orders,
      solicitud,
    );
    return data;
  },

  async crearOrdenCarrito(
    solicitud: CrearOrdenPagoCarrito,
  ): Promise<SesionPagoCurso> {
    if (apiConfig.useMock) {
      return resolveMock(crearSesionMock(solicitud.cursoIds));
    }

    const { data } = await api.post<SesionPagoCurso>(
      API.payments.cartOrders,
      solicitud,
    );
    return data;
  },

  async confirmarRespuestaIzipay(
    ordenId: string,
    respuesta: ConfirmarRespuestaPago,
  ): Promise<ResumenOrdenPago> {
    if (apiConfig.useMock) {
      const resultado: ResumenOrdenPago = {
        ordenId,
        estado: respuesta.code === "00" ? "pagada" : "rechazada",
        mensaje:
          respuesta.code === "00"
            ? "Pago de demostración aprobado."
            : "Pago de demostración rechazado.",
      };
      estadoOrdenesMock.set(ordenId, resultado);
      return resolveMock(resultado);
    }

    const { data } = await api.post<ResumenOrdenPago>(
      API.payments.confirmClientResponse(ordenId),
      respuesta,
    );
    return data;
  },

  async obtenerOrden(ordenId: string): Promise<ResumenOrdenPago> {
    if (apiConfig.useMock) {
      const orden = estadoOrdenesMock.get(ordenId);
      if (!orden) throw new Error("No se encontró la orden de pago.");
      return resolveMock(orden);
    }

    const { data } = await api.get<ResumenOrdenPago>(
      API.payments.byId(ordenId),
    );
    return data;
  },
};
