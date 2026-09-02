/**
 * Envía correos transaccionales de Tukuy Academy vía SMTP (cPanel).
 *
 * Plantillas: nodo_asignado | matricula_curso | clase_programada |
 *             recordatorio_clase | certificado_emitido
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.10.1";

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const desdeSecret = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
  const locales = [
    "http://localhost:5178",
    "http://127.0.0.1:5178",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
  const permitidos = new Set([...desdeSecret, ...locales]);
  const originPermitido = permitidos.has(origin) ? origin : "";
  const requestedHeaders = req.headers.get("access-control-request-headers");
  return {
    ...(originPermitido
      ? { "access-control-allow-origin": originPermitido }
      : {}),
    "access-control-allow-headers":
      requestedHeaders ||
      "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

type PlantillaCorreo =
  | "nodo_asignado"
  | "matricula_curso"
  | "clase_programada"
  | "recordatorio_clase"
  | "certificado_emitido";

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function str(datos: Record<string, unknown>, clave: string, fallback = "") {
  const valor = String(datos[clave] ?? fallback).trim();
  return valor || fallback;
}

function urlPortalPublica(override?: string) {
  const raw =
    override?.trim() ||
    Deno.env.get("APP_PUBLIC_URL")?.trim() ||
    "https://tukuyacademy.edu.pe";
  return raw.replace(/\/$/, "");
}

function urlLogoTukuy() {
  return (
    Deno.env.get("APP_LOGO_URL")?.trim() ||
    "https://tukuyacademy.edu.pe/img/iconoTukuyAcademy.png"
  );
}

function formatearFechaHora(iso?: string) {
  if (!iso?.trim()) return "Por confirmar";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  }).format(fecha);
}

function envolturaCorreo(opciones: {
  titulo: string;
  cuerpo: string;
  botonTexto?: string;
  botonUrl?: string;
  pie?: string;
}) {
  const logo = escaparHtml(urlLogoTukuy());
  const boton =
    opciones.botonTexto && opciones.botonUrl
      ? `<tr>
            <td style="padding:0 24px 28px;">
              <a href="${escaparHtml(opciones.botonUrl)}"
                style="display:inline-block;background:#0b3a78;color:#ffffff;text-decoration:none;padding:12px 18px;font-weight:700;font-size:14px;">
                ${escaparHtml(opciones.botonTexto)}
              </a>
            </td>
          </tr>`
      : "";
  const pie =
    opciones.pie ??
    "Este mensaje fue enviado por Tukuy Academy. Si no esperabas este correo, puedes ignorarlo.";
  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;">
          <tr>
            <td align="center" style="padding:22px 24px;background:#111317;text-align:center;">
              <img src="${logo}" alt="Tukuy Academy" width="140" style="display:block;margin:0 auto;border:0;max-width:140px;height:auto;" />
              <p style="margin:12px 0 0;color:#f5b400;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;text-align:center;">
                Tukuy Academy
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;font-size:22px;font-weight:800;line-height:1.25;">
              ${escaparHtml(opciones.titulo)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 20px;font-size:15px;line-height:1.6;color:#3f3f46;">
              ${opciones.cuerpo}
            </td>
          </tr>
          ${boton}
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">
              ${escaparHtml(pie)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function armarPlantilla(
  plantilla: PlantillaCorreo,
  datos: Record<string, unknown>,
): { asunto: string; html: string; texto: string } {
  const url = urlPortalPublica(
    typeof datos.urlPortal === "string" ? datos.urlPortal : undefined,
  );

  if (plantilla === "nodo_asignado") {
    const nombre = str(datos, "nombrePersona", "Hola");
    const org = str(datos, "nombreOrganizacion", "tu organización");
    const nodo = str(datos, "nombreNodo", "un equipo");
    const asunto = `Te asignaron a ${nodo} · ${org}`;
    const html = envolturaCorreo({
      titulo: "Te asignaron a un equipo",
      cuerpo:
        `Hola <strong>${escaparHtml(nombre)}</strong>,<br/><br/>` +
        `En <strong>${escaparHtml(org)}</strong> quedaste vinculado al nodo ` +
        `<strong>${escaparHtml(nodo)}</strong>. Ya puedes ingresar al portal para ver tu espacio.`,
      botonTexto: "Ir al portal",
      botonUrl: url,
      pie: `Este mensaje se envió desde ${org} a través de Tukuy Academy.`,
    });
    const texto =
      `Hola ${nombre},\n\nEn ${org} quedaste vinculado al nodo ${nodo}.\n` +
      `Ingresa al portal: ${url}\n`;
    return { asunto, html, texto };
  }

  if (plantilla === "matricula_curso") {
    const nombre = str(datos, "nombrePersona", "Hola");
    const curso = str(datos, "nombreCurso", "tu curso");
    const org = str(datos, "nombreOrganizacion", "");
    const urlCurso =
      typeof datos.urlCurso === "string" && datos.urlCurso.trim()
        ? datos.urlCurso.trim()
        : `${url}/login?continuar=/tukuy-academy/aprendizaje`;
    const meetUrl =
      typeof datos.urlMeet === "string" && datos.urlMeet.trim()
        ? datos.urlMeet.trim()
        : "";
    const tituloClase = str(datos, "tituloClase", "");
    const fechaHoraSesion = formatearFechaHora(
      typeof datos.fechaHora === "string" ? datos.fechaHora : undefined,
    );
    const tieneSesion = Boolean(meetUrl || tituloClase || (typeof datos.fechaHora === "string" && datos.fechaHora.trim()));
    const asunto = `Inscripción confirmada · ${curso}`;
    const orgLinea = org
      ? ` en <strong>${escaparHtml(org)}</strong>`
      : "";
    const sesionBloque = tieneSesion
      ? `<br/><br/><strong>Tu próxima clase en vivo</strong><br/>` +
        (tituloClase
          ? `Sesión: <strong>${escaparHtml(tituloClase)}</strong><br/>`
          : "") +
        (typeof datos.fechaHora === "string" && datos.fechaHora.trim()
          ? `<strong>Fecha y hora:</strong> ${escaparHtml(fechaHoraSesion)}<br/>`
          : "") +
        (meetUrl
          ? `<br/><strong>Enlace de la sala Meet:</strong><br/>` +
            `<a href="${escaparHtml(meetUrl)}" style="color:#0b3a78;">${escaparHtml(meetUrl)}</a>`
          : `<br/><em>El enlace de Meet aparecerá en el portal cuando la sesión esté lista.</em>`)
      : "";
    const portalLinea =
      `<br/><br/><strong>Ver en el portal:</strong><br/>` +
      `<a href="${escaparHtml(urlCurso)}" style="color:#0b3a78;">Abrir curso en Tukuy Academy</a>`;
    const html = envolturaCorreo({
      titulo: "Ya estás inscrito",
      cuerpo:
        `Hola <strong>${escaparHtml(nombre)}</strong>,<br/><br/>` +
        `Tu inscripción al curso <strong>${escaparHtml(curso)}</strong>${orgLinea} ` +
        `quedó confirmada. Ingresa cuando quieras para comenzar o continuar tu aprendizaje.` +
        sesionBloque +
        portalLinea,
      botonTexto: meetUrl ? "Unirme a la clase" : "Ir a mi aprendizaje",
      botonUrl: meetUrl || urlCurso,
    });
    const texto =
      `Hola ${nombre},\n\nQuedaste inscrito en ${curso}.\n` +
      (tituloClase ? `Sesión: ${tituloClase}\n` : "") +
      (typeof datos.fechaHora === "string" && datos.fechaHora.trim()
        ? `Fecha: ${fechaHoraSesion}\n`
        : "") +
      (meetUrl ? `Meet: ${meetUrl}\n` : "") +
      `Portal: ${urlCurso}\n`;
    return { asunto, html, texto };
  }

  if (plantilla === "clase_programada" || plantilla === "recordatorio_clase") {
    const nombre = str(datos, "nombrePersona", "Hola");
    const tituloClase = str(datos, "tituloClase", "Clase en vivo");
    const curso = str(datos, "nombreCurso", "");
    const fechaHora = formatearFechaHora(
      typeof datos.fechaHora === "string" ? datos.fechaHora : undefined,
    );
    const meetUrl =
      typeof datos.urlMeet === "string" && datos.urlMeet.trim()
        ? datos.urlMeet.trim()
        : "";
    const urlCursoClase =
      typeof datos.urlCurso === "string" && datos.urlCurso.trim()
        ? datos.urlCurso.trim()
        : "";
    const anticipacion = str(datos, "anticipacion", "");
    const esRecordatorio = plantilla === "recordatorio_clase";
    const asunto = esRecordatorio
      ? anticipacion === "1 hora"
        ? `Tu clase comienza en 1 hora · ${tituloClase}`
        : `Recordatorio: ${tituloClase}${curso ? ` · ${curso}` : ""}`
      : `Clase programada: ${tituloClase}${curso ? ` · ${curso}` : ""}`;
    const cursoLinea = curso
      ? `<br/><strong>Curso:</strong> ${escaparHtml(curso)}`
      : "";
    const meetLinea = meetUrl
      ? `<br/><br/><strong>Enlace de la sesión:</strong><br/>` +
        `<a href="${escaparHtml(meetUrl)}" style="color:#0b3a78;">${escaparHtml(meetUrl)}</a>`
      : "";
    const introRecordatorio = anticipacion === "1 hora"
      ? `Tu sesión <strong>${escaparHtml(tituloClase)}</strong> comienza en aproximadamente <strong>1 hora</strong>.<br/>`
      : anticipacion === "24 horas"
        ? `Te recordamos que mañana tienes la sesión <strong>${escaparHtml(tituloClase)}</strong>.<br/>`
        : `Te recordamos que tienes la sesión <strong>${escaparHtml(tituloClase)}</strong> programada.<br/>`;
    const portalLinea = urlCursoClase
      ? `<br/><br/><strong>Ver en el portal:</strong><br/>` +
        `<a href="${escaparHtml(urlCursoClase)}" style="color:#0b3a78;">Abrir clase en Tukuy Academy</a>`
      : "";
    const html = envolturaCorreo({
      titulo: esRecordatorio ? "Recordatorio de clase en vivo" : "Nueva clase en vivo",
      cuerpo:
        `Hola <strong>${escaparHtml(nombre)}</strong>,<br/><br/>` +
        (esRecordatorio
          ? introRecordatorio
          : `Se programó la sesión <strong>${escaparHtml(tituloClase)}</strong>.<br/>`) +
        `<strong>Fecha y hora:</strong> ${escaparHtml(fechaHora)}` +
        cursoLinea +
        meetLinea +
        portalLinea,
      botonTexto: meetUrl ? "Unirme a la clase" : "Ir al calendario",
      botonUrl:
        meetUrl ||
        urlCursoClase ||
        `${url}/login?continuar=/tukuy-academy/calendario`,
    });
    const texto =
      `Hola ${nombre},\n\n${esRecordatorio ? "Recordatorio" : "Clase"}: ${tituloClase}\n` +
      `Fecha: ${fechaHora}\n` +
      (curso ? `Curso: ${curso}\n` : "") +
      (meetUrl ? `Enlace: ${meetUrl}\n` : "");
    return { asunto, html, texto };
  }

  if (plantilla === "certificado_emitido") {
    const nombre = str(datos, "nombrePersona", "Hola");
    const curso = str(datos, "nombreCurso", "tu curso");
    const codigo = str(datos, "codigoVerificacion", "");
    const urlVerificacion =
      typeof datos.urlVerificacion === "string" && datos.urlVerificacion.trim()
        ? datos.urlVerificacion.trim()
        : codigo
          ? `${url}/certificados/verificar/${encodeURIComponent(codigo)}`
          : `${url}/tukuy-academy/certificados`;
    const asunto = `Certificado emitido · ${curso}`;
    const codigoLinea = codigo
      ? `<br/><strong>Código de verificación:</strong> ${escaparHtml(codigo)}`
      : "";
    const html = envolturaCorreo({
      titulo: "Tu certificado está listo",
      cuerpo:
        `Hola <strong>${escaparHtml(nombre)}</strong>,<br/><br/>` +
        `Emitimos tu certificado del curso <strong>${escaparHtml(curso)}</strong>. ` +
        `Puedes consultarlo en el portal y compartir el código de verificación.` +
        codigoLinea,
      botonTexto: "Ver certificado",
      botonUrl: urlVerificacion,
    });
    const texto =
      `Hola ${nombre},\n\nTu certificado de ${curso} ya está disponible.\n` +
      (codigo ? `Código: ${codigo}\n` : "") +
      `Verificar: ${urlVerificacion}\n`;
    return { asunto, html, texto };
  }

  throw new Error(`Plantilla no soportada: ${plantilla}`);
}

function transporterSmtp() {
  const host = Deno.env.get("SMTP_HOST")?.trim() ?? "";
  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const user = Deno.env.get("SMTP_USER")?.trim() ?? "";
  const pass = Deno.env.get("SMTP_PASS") ?? "";
  if (!host || !user || !pass) {
    throw new Error(
      "Faltan secretos SMTP_HOST / SMTP_USER / SMTP_PASS en la Edge Function.",
    );
  }
  const secure = port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function fromAddress() {
  return (
    Deno.env.get("SMTP_FROM")?.trim() ||
    Deno.env.get("SMTP_USER")?.trim() ||
    "noreply@tukuyacademy.edu.pe"
  );
}

Deno.serve(async (req) => {
  const corsHeaders = cors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Método no permitido" }, 405, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const esInterno =
      !!serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

    if (!esInterno) {
      if (!supabaseUrl || !anonKey || !authHeader) {
        return json({ ok: false, error: "No autorizado" }, 401, corsHeaders);
      }

      const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        return json({ ok: false, error: "Sesión inválida" }, 401, corsHeaders);
      }
    }

    const body = (await req.json()) as {
      plantilla?: string;
      para?: string;
      datos?: Record<string, unknown>;
    };

    const plantilla = String(body.plantilla ?? "").trim() as PlantillaCorreo;
    const para = String(body.para ?? "").trim().toLowerCase();
    const datos = body.datos && typeof body.datos === "object" ? body.datos : {};

    const plantillasOk: PlantillaCorreo[] = [
      "nodo_asignado",
      "matricula_curso",
      "clase_programada",
      "recordatorio_clase",
      "certificado_emitido",
    ];
    if (!plantillasOk.includes(plantilla)) {
      return json({ ok: false, error: "Plantilla inválida" }, 400, corsHeaders);
    }
    if (!para || !para.includes("@")) {
      return json({ ok: false, error: "Correo destino inválido" }, 400, corsHeaders);
    }

    const contenido = armarPlantilla(plantilla, datos);
    const transport = transporterSmtp();
    const info = await transport.sendMail({
      from: fromAddress(),
      to: para,
      subject: contenido.asunto,
      text: contenido.texto,
      html: contenido.html,
    });

    return json(
      {
        ok: true,
        messageId: info.messageId ?? null,
        plantilla,
        para,
      },
      200,
      corsHeaders,
    );
  } catch (causa) {
    const mensaje =
      causa instanceof Error ? causa.message : "No se pudo enviar el correo";
    return json({ ok: false, error: mensaje }, 500, corsHeaders);
  }
});
