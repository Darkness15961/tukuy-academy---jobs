/**
 * Google Calendar por usuario (OAuth refresh token individual).
 * Complementa el calendario institucional (GOOGLE_CALENDAR_REFRESH_TOKEN).
 */

const SCOPE_CALENDAR =
  "https://www.googleapis.com/auth/calendar.events";

export function scopeGoogleCalendarUsuario() {
  return SCOPE_CALENDAR;
}

function mensajeErrorGoogle(data: unknown, status: number, etapa: string) {
  const obj = (data ?? {}) as Record<string, unknown>;
  const errorCode = typeof obj.error === "string" ? obj.error : "";
  const errorDesc = typeof obj.error_description === "string"
    ? obj.error_description
    : "";
  return [etapa, `HTTP ${status}`, errorCode, errorDesc].filter(Boolean).join(
    " — ",
  );
}

function fechaEnZona(iso: string, timeZone: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha invalida: ${iso}`);
  }
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export async function accessTokenUsuario(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")?.trim() ?? "";
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")?.trim() ??
    "";
  const token = refreshToken.trim();
  if (!clientId || !clientSecret || !token) {
    throw new Error("Faltan credenciales OAuth de Google Calendar");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(mensajeErrorGoogle(data, res.status, "oauth/token-usuario"));
  }
  return String(data.access_token);
}

export type EventoUsuarioEntrada = {
  titulo: string;
  descripcion?: string;
  iniciaEn: string;
  terminaEn: string;
  meetUrl?: string;
  nombreCurso?: string;
};

function payloadEventoUsuario(
  entrada: EventoUsuarioEntrada,
  timeZone: string,
) {
  const meetUrl = entrada.meetUrl?.trim() ?? "";
  const descripcionBase = entrada.descripcion?.trim() ||
    "Sesión en vivo · Tukuy Academy";
  const descripcion = entrada.nombreCurso
    ? `${descripcionBase}\n\nCurso: ${entrada.nombreCurso}`
    : descripcionBase;

  return {
    summary: entrada.titulo,
    description: meetUrl ? `${descripcion}\n\nEnlace Meet: ${meetUrl}` : descripcion,
    location: meetUrl || undefined,
    start: {
      dateTime: fechaEnZona(entrada.iniciaEn, timeZone),
      timeZone,
    },
    end: {
      dateTime: fechaEnZona(entrada.terminaEn, timeZone),
      timeZone,
    },
    reminders: {
      useDefault: true,
    },
  };
}

export async function crearEventoEnCalendarioUsuario(
  refreshToken: string,
  entrada: EventoUsuarioEntrada,
): Promise<{ googleEventId: string }> {
  const token = await accessTokenUsuario(refreshToken);
  const timeZone =
    (Deno.env.get("GOOGLE_CALENDAR_TIMEZONE") ?? "America/Lima").trim() ||
    "America/Lima";
  const calendarId = encodeURIComponent("primary");
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payloadEventoUsuario(entrada, timeZone)),
  });
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(
      mensajeErrorGoogle(data, res.status, "calendar.events.insert-usuario"),
    );
  }
  return { googleEventId: String(data.id) };
}

export async function actualizarEventoEnCalendarioUsuario(
  refreshToken: string,
  googleEventId: string,
  entrada: EventoUsuarioEntrada,
): Promise<void> {
  const eventId = googleEventId.trim();
  if (!eventId) return;

  const token = await accessTokenUsuario(refreshToken);
  const timeZone =
    (Deno.env.get("GOOGLE_CALENDAR_TIMEZONE") ?? "America/Lima").trim() ||
    "America/Lima";
  const calendarId = encodeURIComponent("primary");
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${
      encodeURIComponent(eventId)
    }`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payloadEventoUsuario(entrada, timeZone)),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      mensajeErrorGoogle(data, res.status, "calendar.events.patch-usuario"),
    );
  }
}

export async function eliminarEventoEnCalendarioUsuario(
  refreshToken: string,
  googleEventId: string,
): Promise<void> {
  const eventId = googleEventId.trim();
  if (!eventId) return;

  const token = await accessTokenUsuario(refreshToken);
  const calendarId = encodeURIComponent("primary");
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${
      encodeURIComponent(eventId)
    }`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 404 || res.status === 410 || res.ok) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(
    mensajeErrorGoogle(data, res.status, "calendar.events.delete-usuario"),
  );
}
