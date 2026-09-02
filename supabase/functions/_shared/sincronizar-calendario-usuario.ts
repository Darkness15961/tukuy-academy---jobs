/**
 * Sincroniza sesiones en vivo al Google Calendar personal de usuarios conectados
 * e invita al calendario institucional (org) por correo.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  actualizarEventoEnCalendarioUsuario,
  crearEventoEnCalendarioUsuario,
  eliminarEventoEnCalendarioUsuario,
} from "../_shared/google-calendar-usuario.ts";
import { agregarAsistentesEventoCalendar } from "../secondary-gateway/google-calendar.ts";

type UsuarioCalendarToken = {
  identidadId: string;
  correo: string;
  googleEmail: string;
  refreshToken: string;
};

type SesionSync = {
  id: string;
  titulo: string;
  cursoTitulo?: string;
  iniciaEn: string;
  terminaEn: string;
  meetUrl?: string;
};

async function tokensPorCorreos(
  principal: SupabaseClient,
  correos: string[],
): Promise<UsuarioCalendarToken[]> {
  const limpios = [
    ...new Set(
      correos
        .map((c) => c.trim().toLowerCase())
        .filter((c) => c.includes("@")),
    ),
  ];
  if (!limpios.length) return [];

  const { data, error } = await principal.rpc(
    "google_calendar_tokens_por_correos",
    { p_correos: limpios },
  );
  if (error || !data?.usuarios) return [];

  const usuarios = data.usuarios as Record<string, unknown>[];
  return usuarios
    .map((item) => ({
      identidadId: String(item.identidadId ?? "").trim(),
      correo: String(item.correo ?? item.googleEmail ?? "").trim()
        .toLowerCase(),
      googleEmail: String(item.googleEmail ?? "").trim().toLowerCase(),
      refreshToken: String(item.refreshToken ?? "").trim(),
    }))
    .filter((item) =>
      item.identidadId && item.refreshToken && item.googleEmail.includes("@")
    );
}

export async function sincronizarSesionEnCalendariosUsuarios(
  principal: SupabaseClient,
  secundaria: SupabaseClient,
  sesion: SesionSync,
  correos: string[],
) {
  if (!sesion.id || !sesion.iniciaEn || !sesion.terminaEn) return;

  const usuarios = await tokensPorCorreos(principal, correos);
  if (!usuarios.length) return;

  const existentes = await secundaria.rpc(
    "servicio_listar_sesion_calendario_usuario",
    { p_sesion_id: sesion.id },
  );
  const mapaExistente = new Map<string, string>();
  if (!existentes.error && Array.isArray(existentes.data?.eventos)) {
    for (const ev of existentes.data.eventos as Record<string, unknown>[]) {
      const identidadId = String(ev.identidadId ?? "").trim();
      const googleEventId = String(ev.googleEventId ?? "").trim();
      if (identidadId && googleEventId) {
        mapaExistente.set(identidadId, googleEventId);
      }
    }
  }

  const entrada = {
    titulo: sesion.titulo,
    descripcion: "Clase en vivo · Tukuy Academy",
    iniciaEn: sesion.iniciaEn,
    terminaEn: sesion.terminaEn,
    meetUrl: sesion.meetUrl,
    nombreCurso: sesion.cursoTitulo,
  };

  for (const usuario of usuarios) {
    try {
      const previo = mapaExistente.get(usuario.identidadId);
      if (previo) {
        await actualizarEventoEnCalendarioUsuario(
          usuario.refreshToken,
          previo,
          entrada,
        );
        continue;
      }

      const creado = await crearEventoEnCalendarioUsuario(
        usuario.refreshToken,
        entrada,
      );
      await secundaria.rpc("servicio_upsert_sesion_calendario_usuario", {
        p_sesion_id: sesion.id,
        p_identidad_ref: usuario.identidadId,
        p_google_event_id: creado.googleEventId,
        p_google_email: usuario.googleEmail,
      });
    } catch (err) {
      console.warn(
        "sincronizarSesionEnCalendariosUsuarios:",
        sesion.id,
        usuario.googleEmail,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

export async function eliminarSesionDeCalendariosUsuarios(
  principal: SupabaseClient,
  secundaria: SupabaseClient,
  sesionId: string,
) {
  const id = sesionId.trim();
  if (!id) return;

  const listado = await secundaria.rpc(
    "servicio_listar_sesion_calendario_usuario",
    { p_sesion_id: id },
  );
  if (listado.error || !Array.isArray(listado.data?.eventos)) return;

  const eventos = listado.data.eventos as Record<string, unknown>[];
  if (!eventos.length) return;

  const correos = eventos
    .map((ev) => String(ev.googleEmail ?? "").trim().toLowerCase())
    .filter((c) => c.includes("@"));
  const usuarios = await tokensPorCorreos(principal, correos);
  const tokensPorIdentidad = new Map(
    usuarios.map((u) => [u.identidadId, u.refreshToken]),
  );

  for (const ev of eventos) {
    const identidadId = String(ev.identidadId ?? "").trim();
    const googleEventId = String(ev.googleEventId ?? "").trim();
    const token = tokensPorIdentidad.get(identidadId);
    if (!token || !googleEventId) continue;
    try {
      await eliminarEventoEnCalendarioUsuario(token, googleEventId);
    } catch (err) {
      console.warn(
        "eliminarSesionDeCalendariosUsuarios:",
        id,
        googleEventId,
        err instanceof Error ? err.message : err,
      );
    }
  }

  await secundaria.rpc("servicio_eliminar_sesion_calendario_usuario", {
    p_sesion_id: id,
    p_identidad_ref: null,
  });
}

function normalizarCorreosCalendar(emails: unknown[]): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const crudo of emails) {
    const email = String(crudo ?? "").trim().toLowerCase();
    if (!email.includes("@") || vistos.has(email)) continue;
    vistos.add(email);
    resultado.push(email);
  }
  return resultado;
}

/** Correos del alumno: auth + Google conectado (si existe). */
export async function resolverCorreosAlumnoCalendar(
  principal: SupabaseClient,
  authUsuarioRef: string,
  correoAuth?: string | null,
): Promise<string[]> {
  const acumulado: unknown[] = [correoAuth ?? ""];

  const { data: tokenRow } = await principal
    .from("usuario_google_calendar")
    .select("google_email")
    .eq("auth_usuario_ref", authUsuarioRef)
    .maybeSingle();
  if (tokenRow?.google_email) {
    acumulado.push(tokenRow.google_email);
  }

  const parcial = normalizarCorreosCalendar(acumulado);
  if (parcial.length) {
    const ampliados = await tokensPorCorreos(principal, parcial);
    for (const usuario of ampliados) {
      acumulado.push(usuario.correo, usuario.googleEmail);
    }
  }

  return normalizarCorreosCalendar(acumulado);
}

async function invitarOrgAlumnoSesionesFuturasCurso(
  secundaria: SupabaseClient,
  cursoId: string,
  emailAlumno: string,
) {
  const email = emailAlumno.trim().toLowerCase();
  if (!email.includes("@")) return;

  const listado = await secundaria.rpc("servicio_listar_sesiones_en_vivo", {
    p_curso_id: cursoId,
    p_limite: 100,
  });
  if (listado.error || !Array.isArray(listado.data?.sesiones)) return;

  const ahora = Date.now();
  for (const ses of listado.data.sesiones as Record<string, unknown>[]) {
    const eventId = String(ses.calendarEventId ?? ses.calendar_event_id ?? "")
      .trim();
    if (!eventId || eventId.startsWith("sim_")) continue;

    const estado = String(ses.estado ?? "PROGRAMADA").trim().toUpperCase();
    if (estado === "CANCELADA" || estado === "FINALIZADA") continue;

    const inicio = new Date(String(ses.iniciaEn ?? "")).getTime();
    if (Number.isNaN(inicio) || inicio < ahora) continue;

    const invitacion = await agregarAsistentesEventoCalendar(eventId, [email]);
    if (invitacion.ok === false && !invitacion.omitido) {
      console.warn(
        "invitarOrgAlumnoSesionesFuturasCurso:",
        eventId,
        invitacion.motivo,
      );
    }
  }
}

/** Invitación org + copia en calendario personal (OAuth conectado). */
export async function sincronizarAlumnoCalendarioCompleto(
  principal: SupabaseClient,
  secundaria: SupabaseClient,
  cursoId: string,
  emails: string[],
) {
  for (const email of normalizarCorreosCalendar(emails)) {
    await invitarOrgAlumnoSesionesFuturasCurso(secundaria, cursoId, email);
    await sincronizarAlumnoSesionesFuturasCurso(
      principal,
      secundaria,
      cursoId,
      email,
    );
  }
}

/** Tras conectar Google Calendar: sesiones futuras de todos los cursos matriculados. */
export async function backfillCalendarioAlumnoMatriculado(
  principal: SupabaseClient,
  secundaria: SupabaseClient,
  authUsuarioRef: string,
  correosExtra: string[] = [],
) {
  const emails = await resolverCorreosAlumnoCalendar(
    principal,
    authUsuarioRef,
    correosExtra[0] ?? null,
  );
  for (const extra of correosExtra) {
    emails.push(...normalizarCorreosCalendar([extra]));
  }
  const unicos = normalizarCorreosCalendar(emails);
  if (!unicos.length) return;

  const mis = await secundaria.rpc("servicio_listar_mis_cursos", {
    p_estudiante_identidad_ref: authUsuarioRef,
  });
  if (mis.error || !Array.isArray(mis.data?.cursos)) return;

  for (const curso of mis.data.cursos as Record<string, unknown>[]) {
    const cursoId = String(curso.id ?? curso.cursoId ?? "").trim();
    if (!cursoId) continue;
    await sincronizarAlumnoCalendarioCompleto(
      principal,
      secundaria,
      cursoId,
      unicos,
    );
  }
}

export async function sincronizarAlumnoSesionesFuturasCurso(
  principal: SupabaseClient,
  secundaria: SupabaseClient,
  cursoId: string,
  emailAlumno: string,
) {
  const email = emailAlumno.trim().toLowerCase();
  if (!email.includes("@")) return;

  const usuarios = await tokensPorCorreos(principal, [email]);
  if (!usuarios.length) return;

  const listado = await secundaria.rpc("servicio_listar_sesiones_en_vivo", {
    p_curso_id: cursoId,
    p_limite: 100,
  });
  if (listado.error || !Array.isArray(listado.data?.sesiones)) return;

  const ahora = Date.now();
  for (const ses of listado.data.sesiones as Record<string, unknown>[]) {
    const estado = String(ses.estado ?? "PROGRAMADA").trim().toUpperCase();
    if (estado === "CANCELADA" || estado === "FINALIZADA") continue;

    const inicio = new Date(String(ses.iniciaEn ?? "")).getTime();
    if (Number.isNaN(inicio) || inicio < ahora) continue;

    const sesionId = String(ses.id ?? "").trim();
    if (!sesionId) continue;

    await sincronizarSesionEnCalendariosUsuarios(
      principal,
      secundaria,
      {
        id: sesionId,
        titulo: String(ses.titulo ?? "Clase en vivo"),
        cursoTitulo: String(ses.cursoTitulo ?? ""),
        iniciaEn: String(ses.iniciaEn ?? ""),
        terminaEn: String(ses.terminaEn ?? ses.iniciaEn ?? ""),
        meetUrl: String(ses.urlAcceso ?? "").trim() || undefined,
      },
      [email],
    );
  }
}
