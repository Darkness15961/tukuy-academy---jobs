#!/usr/bin/env bun
/**
 * Obtiene un refresh token de Google Calendar sin OAuth Playground.
 *
 * Requisitos previos (Google Cloud Console → console.cloud.google.com):
 * 1. Habilitar "Google Calendar API"
 * 2. Credenciales → Crear ID de cliente OAuth → Tipo "Aplicación web"
 * 3. URI de redirección autorizada EXACTA:
 *    http://localhost:53682/oauth2callback
 * 4. Pantalla de consentimiento → Publicar app (Producción), no dejar en "Prueba"
 *
 * Uso:
 *   GOOGLE_CALENDAR_CLIENT_ID="..." \
 *   GOOGLE_CALENDAR_CLIENT_SECRET="..." \
 *   bun scripts/google-calendar-auth.mjs
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";

const CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
const REDIRECT_URI = "http://localhost:53682/oauth2callback";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const PORT = 53682;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
Faltan variables de entorno.

Ejemplo:
  GOOGLE_CALENDAR_CLIENT_ID="123456.apps.googleusercontent.com" \\
  GOOGLE_CALENDAR_CLIENT_SECRET="GOCSPX-..." \\
  bun run google:calendar-auth

Obtén Client ID y Secret en:
  https://console.cloud.google.com/apis/credentials
`);
  process.exit(1);
}

function paginaHtml(titulo, cuerpo) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${titulo}</title></head>
<body style="font-family:system-ui;max-width:36rem;margin:3rem auto;padding:0 1rem">
  <h1>${titulo}</h1>
  <p>${cuerpo}</p>
  <p style="color:#666">Puedes cerrar esta pestaña y volver a la terminal.</p>
</body>
</html>`;
}

function abrirNavegador(url) {
  const comando =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  try {
    spawn(comando, [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    // El usuario puede abrir el enlace manualmente.
  }
}

const params = new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: "code",
  scope: SCOPE,
  access_type: "offline",
  prompt: "consent",
});

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

console.log("\n=== Google Calendar · obtener refresh token ===\n");
console.log("1. Se abrirá el navegador (o copia el enlace si no abre).");
console.log("2. Inicia sesión con la cuenta que organizará las clases (Tukuy).");
console.log("3. Acepta el permiso de Calendar.\n");
console.log("Si el navegador no abre, visita:\n");
console.log(authUrl);
console.log("");

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Ruta no encontrada");
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
    res.end(
      paginaHtml(
        "Autorización cancelada",
        `Google devolvió: <strong>${error}</strong>. Vuelve a ejecutar el script.`,
      ),
    );
    server.close();
    console.error(`\nError de Google: ${error}`);
    process.exit(1);
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
    res.end(
      paginaHtml(
        "Falta código",
        "No llegó el código de autorización. Repite el proceso.",
      ),
    );
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok || !data.refresh_token) {
      res.writeHead(500, { "content-type": "text/html; charset=utf-8" });
      res.end(
        paginaHtml(
          "No se obtuvo refresh token",
          `Respuesta: ${data.error ?? ""} ${data.error_description ?? JSON.stringify(data)}`,
        ),
      );
      server.close();
      console.error("\nNo se recibió refresh_token.");
      console.error("Causas habituales:");
      console.error("  - La app OAuth sigue en modo «Prueba» (publícala a Producción).");
      console.error("  - Ya autorizaste antes: revoca en https://myaccount.google.com/permissions");
      console.error("    y vuelve a ejecutar este script.");
      console.error("  - Redirect URI distinta a http://localhost:53682/oauth2callback");
      console.error("\nDetalle:", JSON.stringify(data, null, 2));
      process.exit(1);
      return;
    }

    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(
      paginaHtml(
        "Listo",
        "Refresh token generado. Revisa la terminal para copiarlo a Supabase.",
      ),
    );

    server.close();

    console.log("\n✅ Refresh token obtenido:\n");
    console.log(data.refresh_token);
    console.log("\n--- Copia esto en Supabase (proyecto PRINCIPAL) ---\n");
    console.log(`bunx supabase secrets set \\
  GOOGLE_CALENDAR_CLIENT_ID="${CLIENT_ID}" \\
  GOOGLE_CALENDAR_CLIENT_SECRET="${CLIENT_SECRET}" \\
  GOOGLE_CALENDAR_REFRESH_TOKEN="${data.refresh_token}" \\
  --project-ref nidkyztqapeqdplzvnkc`);
    console.log("\nLuego redeploy:");
    console.log(
      "bunx supabase functions deploy secondary-gateway --project-ref nidkyztqapeqdplzvnkc",
    );
    console.log(
      "\nCrea una sesión NUEVA: el enlace debe ser meet.google.com/... (no tukuy.local/meet-simulado).",
    );
    process.exit(0);
  } catch (causa) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(String(causa));
    server.close();
    console.error(causa);
    process.exit(1);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  abrirNavegador(authUrl);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Puerto ${PORT} ocupado. Cierra el proceso que lo usa o cambia PORT en el script.`,
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
