/**
 * Open Graph para compartir cursos en WhatsApp / Facebook / etc.
 *
 * GET /functions/v1/meta-curso?id=<cursoUuid>
 * - Bots de redes: HTML con og:* (preview con título, imagen, descripción)
 * - Humanos: 302 a {APP_PUBLIC_URL}/cursos/<id>
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const INSTALACION_TUKUY = "30000000-0000-4000-8000-000000000001";

const BOT_RE =
  /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|googlebot|bingbot|embedly|quora link preview|pinterest|vkShare|W3C_Validator|redditbot|applebot|preview/i;

function appPublicUrl() {
  return (
    Deno.env.get("APP_PUBLIC_URL")?.trim() ||
    Deno.env.get("APP_URL")?.trim() ||
    "https://tukuyacademy.edu.pe"
  ).replace(/\/$/, "");
}

function esc(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncar(texto: string, max: number) {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1).trimEnd()}…`;
}

function absUrl(base: string, rutaOUrl: string) {
  const raw = (rutaOUrl || "").trim();
  if (!raw) return `${base}/img/iconoTukuyAcademy.png`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function htmlOg(entrada: {
  titulo: string;
  descripcion: string;
  imagen: string;
  urlCanonico: string;
}) {
  const titulo = esc(truncar(entrada.titulo, 70));
  const descripcion = esc(truncar(entrada.descripcion, 200));
  const imagen = esc(entrada.imagen);
  const url = esc(entrada.urlCanonico);
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${titulo}</title>
  <meta name="description" content="${descripcion}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Tukuy Academy">
  <meta property="og:locale" content="es_PE">
  <meta property="og:title" content="${titulo}">
  <meta property="og:description" content="${descripcion}">
  <meta property="og:image" content="${imagen}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${titulo}">
  <meta name="twitter:description" content="${descripcion}">
  <meta name="twitter:image" content="${imagen}">
  <link rel="canonical" href="${url}">
  <meta http-equiv="refresh" content="0;url=${url}">
</head>
<body>
  <p>Redirigiendo a <a href="${url}">${titulo}</a>…</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const cursoId = (
    url.searchParams.get("id") ||
    url.searchParams.get("cursoId") ||
    ""
  ).trim();
  const app = appPublicUrl();
  const destino = cursoId ? `${app}/cursos/${cursoId}` : `${app}/`;

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (!cursoId) {
    return Response.redirect(destino, 302);
  }

  const ua = req.headers.get("user-agent") ?? "";
  const esBot = BOT_RE.test(ua);

  if (!esBot && req.method === "GET") {
    return Response.redirect(destino, 302);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const secondaryUrl = Deno.env.get("SECONDARY_TUKUY_URL") ?? "";
  const secondaryKey = Deno.env.get("SECONDARY_TUKUY_SERVICE_ROLE_KEY") ?? "";

  let titulo = "Curso · Tukuy Academy";
  let descripcion =
    "Formación técnica y certificaciones en Tukuy Academy.";
  let imagen = `${app}/img/iconoTukuyAcademy.png`;

  try {
    if (supabaseUrl && serviceRole) {
      const principal = createClient(supabaseUrl, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const catalogo = await principal.rpc("public_listar_cursos_catalogo", {
        p_instalacion_id: INSTALACION_TUKUY,
      });
      const cursos = Array.isArray(catalogo.data?.cursos)
        ? (catalogo.data.cursos as Record<string, unknown>[])
        : [];
      const ref = cursos.find(
        (c) => String(c.cursoSecundarioRef ?? "").trim() === cursoId,
      );
      if (ref) {
        titulo = `${String(ref.titulo ?? "Curso").trim()} · Tukuy Academy`;
        descripcion =
          String(ref.resumen ?? "").trim() ||
          `${String(ref.categoria ?? "Curso").trim()} en Tukuy Academy.`;
        const img = String(ref.imagenPublicaRef ?? "").trim();
        if (img) imagen = absUrl(app, img);
      }
    }

    if (secondaryUrl && secondaryKey) {
      const secundaria = createClient(secondaryUrl, secondaryKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const detalle = await secundaria.rpc("servicio_obtener_curso_tipado", {
        p_curso_id: cursoId,
      });
      const curso = detalle.data?.curso as Record<string, unknown> | undefined;
      if (curso) {
        titulo = `${String(curso.titulo ?? "Curso").trim()} · Tukuy Academy`;
        const resumen = String(curso.resumen ?? "").trim();
        const categoria = String(curso.categoria ?? "").trim();
        descripcion =
          resumen ||
          (categoria
            ? `${categoria} en Tukuy Academy.`
            : "Formación en Tukuy Academy.");
        const portada = String(curso.portadaClave ?? "").trim();
        if (portada) imagen = absUrl(app, portada);
      }
    }
  } catch (err) {
    console.warn("meta-curso:", err instanceof Error ? err.message : err);
  }

  const body = htmlOg({
    titulo,
    descripcion,
    imagen,
    urlCanonico: destino,
  });

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
});
