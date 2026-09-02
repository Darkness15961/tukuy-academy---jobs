import { env } from "@/lib/env";

export type RedSocialSesion = "whatsapp" | "facebook" | "x" | "instagram";

export type DatosCompartirEnlace = {
  titulo: string;
  url: string;
  contexto?: string;
  fechaTexto?: string;
  /** Etiqueta del enlace final (p. ej. «Únete aquí», «Ver más»). */
  etiquetaEnlace?: string;
};

export type DatosCompartirSesion = {
  titulo: string;
  cursoTitulo?: string;
  urlMeet: string;
  fechaTexto?: string;
};

export function textoCompartirEnlace(datos: DatosCompartirEnlace): string {
  const lineas = [datos.titulo.trim()];
  const contexto = datos.contexto?.trim();
  if (contexto) lineas.push(contexto);
  const fecha = datos.fechaTexto?.trim();
  if (fecha) lineas.push(`Fecha: ${fecha}`);
  const etiqueta = datos.etiquetaEnlace?.trim() || "Ver más";
  lineas.push(`${etiqueta}: ${datos.url.trim()}`);
  return lineas.join("\n");
}

/** Enlace o texto listo para pegar en cada red social. */
export function enlaceCompartirEnlace(
  red: RedSocialSesion,
  datos: DatosCompartirEnlace,
): string {
  const texto = textoCompartirEnlace(datos);
  const url = datos.url.trim();

  if (red === "whatsapp") {
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }
  if (red === "facebook") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(texto)}`;
  }
  if (red === "x") {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}`;
  }
  return texto;
}

export async function copiarEnlaceCompartir(
  red: RedSocialSesion,
  datos: DatosCompartirEnlace,
): Promise<void> {
  const contenido = enlaceCompartirEnlace(red, datos);
  if (!navigator.clipboard?.writeText) {
    throw new Error("Portapapeles no disponible");
  }
  await navigator.clipboard.writeText(contenido);
}

/**
 * URL canónica pública del curso (sin login).
 * Es la que debe compartirse: ficha con Inscribirme / Iniciar sesión.
 */
export function urlPublicaCurso(cursoId: string): string {
  const id = cursoId.trim();
  const base = env.appUrl.replace(/\/$/, "");
  return `${base}/cursos/${id}`;
}

/**
 * URL para previews de WhatsApp/Facebook (Edge Function con Open Graph).
 * Al abrirla, personas van a `/cursos/:id`.
 */
export function urlCompartirCursoConOpenGraph(cursoId: string): string {
  const id = cursoId.trim();
  const supabase = env.supabasePrimaryUrl.replace(/\/$/, "");
  if (!id || !supabase) return urlPublicaCurso(id);
  return `${supabase}/functions/v1/meta-curso?id=${encodeURIComponent(id)}`;
}

export function textoCompartirSesion(datos: DatosCompartirSesion): string {
  return textoCompartirEnlace({
    titulo: `Clase en vivo: ${datos.titulo.trim()}`,
    contexto: datos.cursoTitulo?.trim()
      ? `Curso: ${datos.cursoTitulo.trim()}`
      : undefined,
    fechaTexto: datos.fechaTexto,
    url: datos.urlMeet.trim(),
    etiquetaEnlace: "Únete aquí",
  });
}

/** Enlace o texto listo para pegar en cada red social. */
export function enlaceCompartirSesion(
  red: RedSocialSesion,
  datos: DatosCompartirSesion,
): string {
  return enlaceCompartirEnlace(red, {
    titulo: `Clase en vivo: ${datos.titulo.trim()}`,
    contexto: datos.cursoTitulo?.trim()
      ? `Curso: ${datos.cursoTitulo.trim()}`
      : undefined,
    fechaTexto: datos.fechaTexto,
    url: datos.urlMeet.trim(),
    etiquetaEnlace: "Únete aquí",
  });
}

export async function copiarEnlaceCompartirSesion(
  red: RedSocialSesion,
  datos: DatosCompartirSesion,
): Promise<void> {
  const contenido = enlaceCompartirSesion(red, datos);
  if (!navigator.clipboard?.writeText) {
    throw new Error("Portapapeles no disponible");
  }
  await navigator.clipboard.writeText(contenido);
}

export const ETIQUETAS_RED_SOCIAL_SESION: Record<
  RedSocialSesion,
  { nombre: string; toastOk: string }
> = {
  whatsapp: {
    nombre: "WhatsApp",
    toastOk: "Enlace copiado para WhatsApp",
  },
  facebook: {
    nombre: "Facebook",
    toastOk: "Enlace copiado para Facebook",
  },
  x: {
    nombre: "X",
    toastOk: "Enlace copiado para X",
  },
  instagram: {
    nombre: "Instagram",
    toastOk: "Texto copiado para Instagram",
  },
};

export function formatearFechaSesion(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
