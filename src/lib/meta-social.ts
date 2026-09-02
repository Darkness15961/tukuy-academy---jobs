import { env } from "@/lib/env";

export const META_SITIO = {
  siteName: "Tukuy Academy",
  title: "Tukuy Academy & Jobs",
  description:
    "Formación técnica, certificaciones y empleabilidad para construcción e infraestructura en Perú.",
  image: "/img/iconoTukuyAcademy.png",
  locale: "es_PE",
  type: "website" as const,
};

export type MetaSocialEntrada = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
};

const CLAVES_OG = [
  ["property", "og:title"],
  ["property", "og:description"],
  ["property", "og:image"],
  ["property", "og:url"],
  ["property", "og:type"],
  ["property", "og:site_name"],
  ["property", "og:locale"],
  ["name", "twitter:card"],
  ["name", "twitter:title"],
  ["name", "twitter:description"],
  ["name", "twitter:image"],
  ["name", "description"],
] as const;

function truncarMeta(texto: string, max = 200) {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (!limpio) return "";
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1).trimEnd()}…`;
}

export function urlAbsolutaMeta(rutaOUrl?: string) {
  const base = env.appUrl.replace(/\/$/, "");
  const raw = (rutaOUrl ?? "").trim();
  if (!raw) return base;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function upsertMeta(attr: "name" | "property", clave: string, contenido: string) {
  const selector = `meta[${attr}="${clave}"]`;
  let elemento = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!elemento) {
    elemento = document.createElement("meta");
    elemento.setAttribute(attr, clave);
    document.head.appendChild(elemento);
  }
  elemento.content = contenido;
}

function removerMetasDinamicas() {
  for (const [attr, clave] of CLAVES_OG) {
    document.head.querySelector(`meta[${attr}="${clave}"]`)?.remove();
  }
}

function metaPorDefecto(): Required<
  Pick<MetaSocialEntrada, "title" | "description" | "image" | "url" | "type">
> {
  return {
    title: META_SITIO.title,
    description: META_SITIO.description,
    image: urlAbsolutaMeta(META_SITIO.image),
    url: urlAbsolutaMeta("/"),
    type: META_SITIO.type,
  };
}

/** Actualiza title, description y etiquetas Open Graph / Twitter Card. */
export function aplicarMetaSocial(entrada: MetaSocialEntrada = {}) {
  const base = metaPorDefecto();
  const titulo = truncarMeta(entrada.title?.trim() || base.title, 70);
  const descripcion = truncarMeta(
    entrada.description?.trim() || base.description,
    200,
  );
  const imagen = urlAbsolutaMeta(entrada.image || base.image);
  const url = urlAbsolutaMeta(entrada.url || base.url);
  const tipo = entrada.type || base.type;

  document.title = titulo;

  upsertMeta("name", "description", descripcion);
  upsertMeta("property", "og:title", titulo);
  upsertMeta("property", "og:description", descripcion);
  upsertMeta("property", "og:image", imagen);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:type", tipo);
  upsertMeta("property", "og:site_name", META_SITIO.siteName);
  upsertMeta("property", "og:locale", META_SITIO.locale);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", titulo);
  upsertMeta("name", "twitter:description", descripcion);
  upsertMeta("name", "twitter:image", imagen);
}

export function restaurarMetaSocial() {
  removerMetasDinamicas();
  aplicarMetaSocial();
}

export function descripcionCursoParaMeta(curso: {
  title: string;
  resumen?: string;
  category?: string;
  duration?: string;
  level?: string;
  instructor?: string;
}) {
  const resumen = curso.resumen?.trim();
  if (resumen) return resumen;

  const partes = [
    curso.category?.trim(),
    curso.duration?.trim(),
    curso.level ? `Nivel ${curso.level}` : "",
    curso.instructor ? `Con ${curso.instructor}` : "",
  ].filter(Boolean);

  if (partes.length) return partes.join(" · ");
  return `Curso de ${curso.title.trim()} en Tukuy Academy.`;
}
