import { computed, ref } from "vue";

import { pagosService } from "@/api/services/pagos.service";
import type {
  RespuestaClienteIzipay,
  ResumenOrdenPago,
  SesionPagoCurso,
} from "@/types/pago.types";

export type FasePasarelaPago =
  | "inicial"
  | "creando"
  | "checkout"
  | "validando"
  | "pagado"
  | "rechazado";

export const MEDIOS_PAGO_IZIPAY = [
  {
    codigo: "CARD" as const,
    nombre: "Tarjetas",
    detalle: "Visa, Mastercard, Diners y Amex",
  },
  {
    codigo: "YAPE_CODE" as const,
    nombre: "Yape",
    detalle: "Pago desde tu billetera Yape",
  },
  {
    codigo: "QR" as const,
    nombre: "Código QR",
    detalle: "Escanea con una billetera compatible",
  },
  {
    codigo: "PAGO_PUSH" as const,
    nombre: "Plin",
    detalle: "Confirmación desde la aplicación afiliada",
  },
];

export function formatPrecioSoles(valor: number) {
  return `S/ ${valor.toFixed(2).replace(".", ",")}`;
}

export function usePasarelaIzipay() {
  const fase = ref<FasePasarelaPago>("inicial");
  const sesion = ref<SesionPagoCurso | null>(null);
  const orden = ref<ResumenOrdenPago | null>(null);
  const error = ref<string | null>(null);

  const procesando = computed(() =>
    ["creando", "validando"].includes(fase.value),
  );

  async function procesarRespuesta(respuesta: RespuestaClienteIzipay) {
    if (!sesion.value) return;

    fase.value = "validando";
    error.value = null;

    try {
      orden.value = await pagosService.confirmarRespuestaIzipay(
        sesion.value.ordenId,
        {
          code: respuesta.code,
          payloadHttp: respuesta.payloadHttp,
          signature: respuesta.signature,
          transactionId: respuesta.transactionId,
        },
      );
      fase.value = orden.value.estado === "pagada" ? "pagado" : "rechazado";
    } catch (err) {
      fase.value = "rechazado";
      error.value =
        err instanceof Error
          ? err.message
          : "No se pudo confirmar el resultado del pago.";
    }
  }

  async function iniciarPagoCurso(cursoId: string) {
    fase.value = "creando";
    error.value = null;

    try {
      sesion.value = await pagosService.crearOrdenCurso({ cursoId });
      fase.value = "checkout";

      if (!sesion.value.demostracion) {
        const { abrirCheckoutIzipay } = await import("@/lib/checkout-izipay");
        await abrirCheckoutIzipay(sesion.value, (respuesta) => {
          void procesarRespuesta(respuesta);
        });
      }
    } catch (err) {
      fase.value = "rechazado";
      error.value =
        err instanceof Error
          ? err.message
          : "No se pudo iniciar el pago seguro.";
    }
  }

  async function iniciarPagoCarrito(cursoIds: string[]) {
    fase.value = "creando";
    error.value = null;

    try {
      sesion.value = await pagosService.crearOrdenCarrito({ cursoIds });
      fase.value = "checkout";

      if (!sesion.value.demostracion) {
        const { abrirCheckoutIzipay } = await import("@/lib/checkout-izipay");
        await abrirCheckoutIzipay(sesion.value, (respuesta) => {
          void procesarRespuesta(respuesta);
        });
      }
    } catch (err) {
      fase.value = "rechazado";
      error.value =
        err instanceof Error
          ? err.message
          : "No se pudo iniciar el pago seguro.";
    }
  }

  async function simularAprobacion() {
    if (!sesion.value?.demostracion) return;
    await procesarRespuesta({
      code: "00",
      transactionId: sesion.value.configuracion.transactionId,
      payloadHttp: "respuesta-de-demostracion",
      signature: "firma-de-demostracion",
    });
  }

  async function consultarEstado() {
    if (!sesion.value) return;
    orden.value = await pagosService.obtenerOrden(sesion.value.ordenId);
    if (orden.value.estado === "pagada") fase.value = "pagado";
  }

  function reiniciar() {
    fase.value = "inicial";
    sesion.value = null;
    orden.value = null;
    error.value = null;
  }

  function estaHabilitado(codigo: SesionPagoCurso["metodosDisponibles"][number]) {
    if (!sesion.value) return null;
    return sesion.value.metodosDisponibles.includes(codigo);
  }

  return {
    fase,
    sesion,
    orden,
    error,
    procesando,
    iniciarPagoCurso,
    iniciarPagoCarrito,
    simularAprobacion,
    consultarEstado,
    reiniciar,
    estaHabilitado,
  };
}
