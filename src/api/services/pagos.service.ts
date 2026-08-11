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

function usarPagosSecundaria() {
  return apiConfig.secundariaCursos;
}

function obtenerCursosPagados(ids: string[]) {
  const unicos = [...new Set(ids)];
  const seleccionados = courses.filter(
    (item) =>
      unicos.includes(item.id) && item.pricing === "paid" && (item.price ?? 0) > 0,
  );

  if (!seleccionados.length) {
    // Con secundaria los IDs son UUID reales; armamos ítems mínimos.
    return unicos.map((id) => ({
      id,
      title: "Curso",
      price: 0,
      pricing: "paid" as const,
    }));
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

function mapearEstadoOrden(raw: string): ResumenOrdenPago["estado"] {
  const estado = raw.toUpperCase();
  if (estado.includes("PAGAD") || estado.includes("CONFIRM")) return "pagada";
  if (estado.includes("RECHAZ")) return "rechazada";
  if (estado.includes("CANCEL")) return "cancelada";
  if (estado.includes("EXPIR")) return "expirada";
  if (estado.includes("PEND")) return "pendiente";
  return "creada";
}

function sesionDesdeOrdenSecundaria(
  data: {
    ordenId: string;
    estado: string;
    moneda?: string;
    importe?: number;
    totalCentavos?: number;
    cursoIds?: string[] | unknown;
  },
): SesionPagoCurso {
  const cursoIds = Array.isArray(data.cursoIds)
    ? data.cursoIds.map(String)
    : [];
  const importe =
    typeof data.importe === "number"
      ? data.importe
      : Number(data.totalCentavos ?? 0) / 100;
  const ahora = Date.now();
  return {
    ordenId: data.ordenId,
    proveedor: "izipay",
    estado: mapearEstadoOrden(data.estado),
    entorno: "pruebas",
    moneda: "PEN",
    importe,
    cursoIds,
    metodosDisponibles: ["CARD", "YAPE_CODE", "QR", "PAGO_PUSH"],
    autorizacionSesion: "sesion-secundaria",
    llaveRsaPublica: "llave-publica-demostracion",
    // Mientras no haya merchant Izipay real, la UI usa la pasarela simulada.
    demostracion: true,
    configuracion: {
      transactionId: String(ahora),
      action: "pay",
      merchantCode: "comercio-secundaria",
      order: {
        orderNumber: `TUKUY-${data.ordenId.slice(0, 8)}`,
        currency: "PEN",
        amount: importe.toFixed(2),
        processType: "AT",
        merchantBuyerId: "estudiante",
        dateTimeTransaction: new Date().toISOString(),
      },
      render: { typeForm: "pop-up" },
    },
  };
}

async function crearOrdenEnSecundaria(items: Array<{
  cursoId: string;
  titulo?: string;
  importe?: number;
}>): Promise<SesionPagoCurso> {
  const { secundariaGatewayService } = await import(
    "@/api/services/secundaria-gateway.service"
  );
  const data = await secundariaGatewayService.crearOrdenCompra({
    items: items.map((item) => ({
      cursoId: item.cursoId,
      titulo: item.titulo,
      importe: item.importe ?? 0,
    })),
    moneda: "PEN",
  });
  return sesionDesdeOrdenSecundaria(data);
}

export const pagosService = {
  async crearOrdenCurso(
    solicitud: CrearOrdenPagoCurso & { titulo?: string; importe?: number },
  ): Promise<SesionPagoCurso> {
    if (usarPagosSecundaria()) {
      const desdeCatalogo = courses.find((item) => item.id === solicitud.cursoId);
      return crearOrdenEnSecundaria([
        {
          cursoId: solicitud.cursoId,
          titulo: solicitud.titulo ?? desdeCatalogo?.title ?? "Curso",
          importe:
            solicitud.importe ??
            (desdeCatalogo?.pricing === "paid" ? desdeCatalogo.price ?? 0 : 0),
        },
      ]);
    }

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
    solicitud: CrearOrdenPagoCarrito & {
      items?: Array<{ cursoId: string; titulo?: string; importe?: number }>;
    },
  ): Promise<SesionPagoCurso> {
    if (usarPagosSecundaria()) {
      const items =
        solicitud.items?.length
          ? solicitud.items
          : obtenerCursosPagados(solicitud.cursoIds).map((curso) => ({
            cursoId: curso.id,
            titulo: "title" in curso ? String(curso.title) : "Curso",
            importe: curso.price ?? 0,
          }));
      return crearOrdenEnSecundaria(items);
    }

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
    if (usarPagosSecundaria()) {
      const { secundariaGatewayService } = await import(
        "@/api/services/secundaria-gateway.service"
      );
      const data = await secundariaGatewayService.confirmarPagoOrden(ordenId, {
        code: respuesta.code ?? "00",
        transactionId: respuesta.transactionId,
      });
      return {
        ordenId: data.ordenId,
        estado: mapearEstadoOrden(String(data.estado ?? "")),
        mensaje: data.mensaje,
      };
    }

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
    if (usarPagosSecundaria()) {
      const { secundariaGatewayService } = await import(
        "@/api/services/secundaria-gateway.service"
      );
      const data = await secundariaGatewayService.obtenerOrdenCompra(ordenId);
      return {
        ordenId: data.ordenId,
        estado: mapearEstadoOrden(String(data.estado ?? "")),
      };
    }

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
