/**
 * Google Calendar + Meet via OAuth refresh token.
 *
 * Secretos (supabase secrets set en el proyecto PRINCIPAL):
 *   GOOGLE_CALENDAR_CLIENT_ID
 *   GOOGLE_CALENDAR_CLIENT_SECRET
 *   GOOGLE_CALENDAR_REFRESH_TOKEN
 *   GOOGLE_CALENDAR_ID          (opcional, default "primary")
 *   GOOGLE_CALENDAR_TIMEZONE    (opcional, default "America/Lima")
 */

export type EventoMeetCreado = {
  calendarEventId: string;
  meetUrl: string;
  htmlLink?: string;
  simulado: false;
};

export type EventoMeetSimulado = {
  calendarEventId: string;
  meetUrl: string;
  simulado: true;
  motivo?: string;
};

export type ResultadoEventoMeet = EventoMeetCreado | EventoMeetSimulado;

function secretsListos() {
  return Boolean(
    Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")?.trim() &&
      Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")?.trim() &&
      Deno.env.get("GOOGLE_CALENDAR_REFRESH_TOKEN")?.trim(),
  );
}

export function googleCalendarConfigurado() {
  return secretsListos();
}

function mensajeErrorGoogle(data: unknown, status: number, etapa: string) {
  const obj = (data ?? {}) as Record<string, unknown>;
  // OAuth suele devolver { error: "invalid_grant", error_description: "..." }
  const errorCode =
    typeof obj.error === "string"
      ? obj.error
      : typeof (obj.error as Record<string, unknown> | undefined)?.message ===
          "string"
      ? String((obj.error as Record<string, unknown>).message)
      : "";
  const errorDesc =
    typeof obj.error_description === "string"
      ? obj.error_description
      : typeof (obj.error as Record<string, unknown> | undefined)?.message ===
          "string" && !errorCode
      ? String((obj.error as Record<string, unknown>).message)
      : "";
  const nested = typeof obj.error === "object" && obj.error
    ? (obj.error as Record<string, unknown>)
    : null;
  const details = Array.isArray(nested?.errors)
    ? nested!.errors
        .map((e) => {
          const item = e as Record<string, unknown>;
          return [item.reason, item.message].filter(Boolean).join(": ");
        })
        .filter(Boolean)
        .join(" | ")
    : "";
  const parts = [
    etapa,
    `HTTP ${status}`,
    errorCode,
    errorDesc,
    details,
    !errorCode && !errorDesc && !details
      ? JSON.stringify(obj).slice(0, 400)
      : "",
  ].filter(Boolean);
  return parts.join(" — ");
}

/** dateTime local sin offset + timeZone (evita Bad Request por Z + timeZone). */
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

async function accessTokenDesdeRefresh(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!.trim();
  const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!.trim();
  const refreshToken = Deno.env.get("GOOGLE_CALENDAR_REFRESH_TOKEN")!.trim();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const hint =
      res.status === 401
        ? " (suele ser CLIENT_ID/SECRET incorrectos o cliente Desktop mal usado con Playground: crea cliente Web + redirect https://developers.google.com/oauthplayground)"
        : res.status === 400
        ? " (suele ser REFRESH_TOKEN invalido o de otro cliente OAuth)"
        : "";
    throw new Error(
      mensajeErrorGoogle(data, res.status, "oauth/token") + hint,
    );
  }
  return String(data.access_token);
}

function meetUrlSimulado(titulo: string) {
  const slug = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18) || "tukuy";
  const sufijo = crypto.randomUUID().slice(0, 6);
  return {
    calendarEventId: `sim_${sufijo}`,
    // No usar meet.google.com falso: Google dice "nombre no valido".
    meetUrl: `https://tukuy.local/meet-simulado/${slug}-${sufijo}`,
    simulado: true as const,
  };
}

export async function crearEventoCalendarMeet(entrada: {
  titulo: string;
  descripcion?: string;
  iniciaEn: string;
  terminaEn: string;
  attendees?: string[];
  /** Invitados que entran sin «solicitar unirse» (p. ej. docente creador). */
  anfitriones?: string[];
}): Promise<ResultadoEventoMeet> {
  if (!secretsListos()) {
    return {
      ...meetUrlSimulado(entrada.titulo),
      motivo: "Faltan secretos GOOGLE_CALENDAR_* en Edge Functions",
    };
  }

  try {
    const token = await accessTokenDesdeRefresh();
    const calendarId = encodeURIComponent(
      (Deno.env.get("GOOGLE_CALENDAR_ID") ?? "primary").trim() || "primary",
    );
    const timeZone =
      (Deno.env.get("GOOGLE_CALENDAR_TIMEZONE") ?? "America/Lima").trim() ||
      "America/Lima";

    const anfitriones = new Set(
      (entrada.anfitriones ?? [])
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@")),
    );

    const attendees = (entrada.attendees ?? [])
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"))
      .filter((e, i, arr) => arr.indexOf(e) === i)
      .map((email) => ({
        email,
        ...(anfitriones.has(email)
          ? { responseStatus: "accepted" as const }
          : {}),
      }));

    const startLocal = fechaEnZona(entrada.iniciaEn, timeZone);
    const endLocal = fechaEnZona(entrada.terminaEn, timeZone);

    const payload = {
      summary: entrada.titulo,
      description: entrada.descripcion ?? "Sesión en vivo · Tukuy Academy",
      start: { dateTime: startLocal, timeZone },
      end: { dateTime: endLocal, timeZone },
      attendees: attendees.length ? attendees : undefined,
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const sendUpdates = attendees.length ? "all" : "none";
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events` +
      `?conferenceDataVersion=1&sendUpdates=${sendUpdates}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(mensajeErrorGoogle(data, res.status, "calendar.events.insert"));
    }

    const meetUrl =
      data.hangoutLink ||
      data.conferenceData?.entryPoints?.find(
        (ep: { entryPointType?: string; uri?: string }) =>
          ep.entryPointType === "video",
      )?.uri;

    if (!meetUrl || !data.id) {
      throw new Error(
        "Google creó el evento pero no devolvió enlace Meet (revisa Workspace/Meet habilitado en la cuenta)",
      );
    }

    return {
      calendarEventId: String(data.id),
      meetUrl: String(meetUrl),
      htmlLink: data.htmlLink ? String(data.htmlLink) : undefined,
      simulado: false,
    };
  } catch (err) {
    const motivo = err instanceof Error ? err.message : String(err);
    return {
      ...meetUrlSimulado(entrada.titulo),
      motivo,
    };
  }
}

export async function agregarAsistentesEventoCalendar(
  calendarEventId: string,
  emails: string[],
): Promise<{ ok: boolean; omitido?: boolean; motivo?: string }> {
  if (!secretsListos()) {
    return { ok: false, omitido: true, motivo: "Sin secretos Google Calendar" };
  }
  const eventId = calendarEventId.trim();
  if (!eventId || eventId.startsWith("sim_")) {
    return { ok: true, omitido: true };
  }

  const nuevos = (emails ?? [])
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"))
    .filter((e, i, arr) => arr.indexOf(e) === i);
  if (!nuevos.length) return { ok: true, omitido: true };

  try {
    const token = await accessTokenDesdeRefresh();
    const calendarId = encodeURIComponent(
      (Deno.env.get("GOOGLE_CALENDAR_ID") ?? "primary").trim() || "primary",
    );
    const getUrl =
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/` +
      `${encodeURIComponent(eventId)}`;

    const existente = await fetch(getUrl, {
      headers: { authorization: `Bearer ${token}` },
    });
    const evento = await existente.json();
    if (!existente.ok) {
      throw new Error(
        mensajeErrorGoogle(evento, existente.status, "calendar.events.get"),
      );
    }

    const actuales = Array.isArray(evento.attendees)
      ? (evento.attendees as Array<{ email?: string }>)
          .map((a) => String(a.email ?? "").trim().toLowerCase())
          .filter((e) => e.includes("@"))
      : [];
    const vistos = new Set(actuales);
    const merged = [...actuales];
    for (const email of nuevos) {
      if (vistos.has(email)) continue;
      vistos.add(email);
      merged.push(email);
    }
    if (merged.length === actuales.length) {
      return { ok: true, omitido: true };
    }

    const patchUrl = `${getUrl}?sendUpdates=all`;
    const res = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        attendees: merged.map((email) => ({ email })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        mensajeErrorGoogle(data, res.status, "calendar.events.patch"),
      );
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      motivo: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function cancelarEventoCalendar(calendarEventId: string) {
  if (!secretsListos()) return { ok: false as const, motivo: "Sin secretos" };
  if (!calendarEventId || calendarEventId.startsWith("sim_")) {
    return { ok: true as const, omitido: true };
  }
  try {
    const token = await accessTokenDesdeRefresh();
    const calendarId = encodeURIComponent(
      (Deno.env.get("GOOGLE_CALENDAR_ID") ?? "primary").trim() || "primary",
    );
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(calendarEventId)}?sendUpdates=all`,
      {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      },
    );
    if (res.status === 404 || res.status === 410 || res.ok) {
      return { ok: true as const };
    }
    const data = await res.json().catch(() => ({}));
    return {
      ok: false as const,
      motivo: mensajeErrorGoogle(data, res.status, "calendar.events.delete"),
    };
  } catch (err) {
    return {
      ok: false as const,
      motivo: err instanceof Error ? err.message : String(err),
    };
  }
}
