import type {
  EntornoPago,
  RespuestaClienteIzipay,
  SesionPagoCurso,
} from "@/types/pago.types";

type InstanciaCheckoutIzipay = {
  LoadForm: (opciones: {
    authorization: string;
    keyRSA: string;
    callbackResponse: (respuesta: RespuestaClienteIzipay) => void;
  }) => void;
};

type ConstructorCheckoutIzipay = new (opciones: {
  config: SesionPagoCurso["configuracion"];
}) => InstanciaCheckoutIzipay;

declare global {
  interface Window {
    Izipay?: ConstructorCheckoutIzipay;
  }
}

const URL_SDK: Record<EntornoPago, string> = {
  pruebas: "https://sandbox-checkout.izipay.pe/payments/v1/js/index.js",
  produccion: "https://checkout.izipay.pe/payments/v1/js/index.js",
};

let cargaSdk: Promise<ConstructorCheckoutIzipay> | null = null;

export function cargarSdkIzipay(
  entorno: EntornoPago,
): Promise<ConstructorCheckoutIzipay> {
  if (window.Izipay) return Promise.resolve(window.Izipay);
  if (cargaSdk) return cargaSdk;

  cargaSdk = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = URL_SDK[entorno];
    script.async = true;
    script.dataset.tukuyPaymentProvider = "izipay";
    script.onload = () => {
      if (window.Izipay) {
        resolve(window.Izipay);
        return;
      }
      cargaSdk = null;
      reject(new Error("Izipay no quedó disponible después de cargar el SDK."));
    };
    script.onerror = () => {
      cargaSdk = null;
      reject(new Error("No se pudo cargar el formulario seguro de Izipay."));
    };
    document.head.appendChild(script);
  });

  return cargaSdk;
}

export async function abrirCheckoutIzipay(
  sesion: SesionPagoCurso,
  alResponder: (respuesta: RespuestaClienteIzipay) => void,
) {
  const Izipay = await cargarSdkIzipay(sesion.entorno);
  const checkout = new Izipay({ config: sesion.configuracion });

  checkout.LoadForm({
    authorization: sesion.autorizacionSesion,
    keyRSA: sesion.llaveRsaPublica,
    callbackResponse: alResponder,
  });
}

