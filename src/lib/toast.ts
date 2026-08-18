import { toast as sonnerToast } from "vue-sonner";
import type { Router } from "vue-router";

import { mensajeUsuarioDeError } from "@/lib/mensaje-error";

type ToastOpts = {
  description?: string;
  duration?: number;
};

function descripcionSegura(texto?: string) {
  if (!texto?.trim()) return undefined;
  const original = texto.trim();
  const limpio = mensajeUsuarioDeError(original, "");
  if (!limpio || limpio !== original) return undefined;
  return original.slice(0, 180);
}

/** API única de notificaciones (vue-sonner) para todo el proyecto. */
export const toast = {
  success(message: string, opts?: ToastOpts) {
    sonnerToast.success(message, {
      description: opts?.description,
      duration: opts?.duration ?? 3500,
    });
  },
  error(message: string, opts?: ToastOpts) {
    sonnerToast.error(mensajeUsuarioDeError(message), {
      description: descripcionSegura(opts?.description),
      duration: opts?.duration ?? 6000,
    });
  },
  info(message: string, opts?: ToastOpts) {
    sonnerToast.info(message, {
      description: opts?.description,
      duration: opts?.duration ?? 4000,
    });
  },
  warning(message: string, opts?: ToastOpts) {
    sonnerToast.warning(mensajeUsuarioDeError(message), {
      description: descripcionSegura(opts?.description),
      duration: opts?.duration ?? 4500,
    });
  },
  message(message: string, opts?: ToastOpts) {
    sonnerToast.message(message, {
      description: opts?.description,
      duration: opts?.duration ?? 3500,
    });
  },
  promise: sonnerToast.promise.bind(sonnerToast),
  dismiss: sonnerToast.dismiss.bind(sonnerToast),
};

/** Compat estilo PrimeVue toast.add({ severity, summary, detail, life }). */
export function toastPrimeStyle(entrada: {
  severity?: "success" | "info" | "warn" | "error" | "secondary" | "contrast";
  summary?: string;
  detail?: string;
  life?: number;
}) {
  const msg = entrada.summary?.trim() || entrada.detail?.trim() || "Listo";
  const description =
    entrada.summary && entrada.detail ? entrada.detail : undefined;
  const duration = entrada.life;
  const sev = entrada.severity ?? "info";
  if (sev === "success") toast.success(msg, { description, duration });
  else if (sev === "error") toast.error(msg, { description, duration });
  else if (sev === "warn") toast.warning(msg, { description, duration });
  else toast.info(msg, { description, duration });
}

/**
 * Lee `?mensaje=` / `?toastError=` de la ruta, muestra toast y limpia el query
 * para que funcione en cualquier vista (p. ej. redirecciones post-guardar).
 */
export function consumirToastDeRuta(
  router: Router,
  query: Record<string, unknown>,
) {
  const mensaje =
    typeof query.mensaje === "string" ? query.mensaje.trim() : "";
  const toastError =
    typeof query.toastError === "string" ? query.toastError.trim() : "";
  if (!mensaje && !toastError) return;

  if (toastError) toast.error(toastError);
  else if (mensaje) toast.success(mensaje);

  const siguiente = { ...query };
  delete siguiente.mensaje;
  delete siguiente.toastError;
  void router.replace({ query: siguiente as Record<string, string | string[]> });
}

/** Toast de error a partir de un catch de API/BD. */
export function avisarError(causa: unknown, fallback?: string) {
  toast.error(mensajeUsuarioDeError(causa, fallback));
}
