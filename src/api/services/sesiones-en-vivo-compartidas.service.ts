import { api } from "@/api/client";
import { apiConfig } from "@/api/config";
import { API } from "@/api/endpoints";
import { crearRepositorioLocal } from "@/api/repositorio-local";
import {
  cursosAlumnoDemoOrg,
  emailAlumnoDemo,
  sesionesEnVivoOrganizacion,
} from "@/portal-organizacion/data/sesiones-en-vivo.mock";
import { matriculasOrganizacion } from "@/portal-organizacion/data/organizacion.mock";
import type {
  InvitadoSesionEnVivo,
  ProgramarSesionEnVivoInput,
  SesionEnVivoOrganizacion,
} from "@/portal-organizacion/types/sesiones-en-vivo.types";
import { cursoAdmiteSesionesEnVivo } from "@/portal-organizacion/types/sesiones-en-vivo.types";
import type { ContextoSesion } from "@/types/membresia.types";
import type { Course } from "@/types/academia";
import type { SesionDocente } from "@/portal-docente/types/docente.types";
import { cursosDocente } from "@/portal-docente/data/docente.mock";
import { enrichCourse } from "@/lib/presentacion-curso";
import { cursoEstaMatriculado } from "@/lib/acceso-curso";

const VERSION = 3;
const EVENTO = "tukuy:sesiones-en-vivo";
const ORG_ACADEMIA_TUKUY = "org-academia-tukuy";

type AlumnoCalendario = {
  id: string;
  nombre: string;
  email: string;
};

const alumnoDemoCalendario: AlumnoCalendario = {
  id: "alu-demo",
  nombre: "Carlos Alberto",
  email: emailAlumnoDemo,
};

/**
 * Repositorio único de clases en vivo (no cursos virtuales asíncronos).
 * Clave por organización institucional o por docente independiente.
 */
function clavePorOrganizacion(organizacionId: string) {
  return `tukuy_demo_sesiones_en_vivo_${organizacionId}`;
}

export function claveSesionesContexto(contexto: ContextoSesion) {
  if (
    contexto.organizacionId &&
    !contexto.organizacionId.startsWith("org-personal-") &&
    contexto.ambitoDocencia !== "INDEPENDIENTE"
  ) {
    return contexto.organizacionId;
  }
  if (contexto.portal === "organizacion" && contexto.organizacionId) {
    return contexto.organizacionId;
  }
  return `independiente-${contexto.membresiaId}`;
}

function emitirCambio(organizacionId: string) {
  window.dispatchEvent(
    new CustomEvent(EVENTO, { detail: { organizacionId } }),
  );
}

function semillaPara(organizacionId: string) {
  return sesionesEnVivoOrganizacion.filter(
    (sesion) => sesion.organizacionId === organizacionId,
  );
}

function repo(organizacionId: string) {
  return crearRepositorioLocal<SesionEnVivoOrganizacion>({
    clave: clavePorOrganizacion(organizacionId),
    ruta: API.organizacion.sesionesEnVivo,
    semilla: semillaPara(organizacionId),
    version: VERSION,
  });
}

function isoLocal(diasDesdeHoy: number, hora: number, minuto = 0) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + diasDesdeHoy);
  base.setHours(hora, minuto, 0, 0);
  return base.toISOString();
}

function simularEventoCalendarMeet(titulo: string, sufijoFijo?: string) {
  const slug = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18);
  const sufijo = sufijoFijo ?? Math.random().toString(36).slice(2, 6);
  return {
    calendarEventId: `gcal_${sufijo}`,
    meetUrl: `https://meet.google.com/${slug || "tukuy"}-${sufijo}`,
  };
}

function emailDesdeNombre(nombre: string, alumnoId: string) {
  const slug = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 28);
  return `${slug || alumnoId}@cipcusco.org.pe`;
}

function emailDocente(nombre: string) {
  const slug = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(ing|lic|arq|mg)\.?\s+/i, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 28);
  return `${slug || "docente"}@tukuy.academy`;
}

/** Cursos Mixto/Presencial (o con sesiones institucionales) generan clases en vivo. */
export function cursoCatalogoAdmiteCalendario(course: Course) {
  if (course.mode === "Mixto" || course.mode === "Presencial") return true;
  return (cursosAlumnoDemoOrg as readonly string[]).includes(course.id);
}

function organizacionIdParaCurso(course: Course) {
  if (
    course.organizacionId &&
    !course.organizacionId.startsWith("org-personal-")
  ) {
    return course.organizacionId;
  }
  return ORG_ACADEMIA_TUKUY;
}

function hashCurso(cursoId: string) {
  return [...cursoId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function estadoDesdeFecha(fechaIso: string): SesionEnVivoOrganizacion["estado"] {
  const inicio = new Date(fechaIso);
  const ahora = new Date();
  if (inicio.getTime() < ahora.getTime() - 2 * 60 * 60 * 1000) {
    return "FINALIZADA";
  }
  const mismaFecha =
    inicio.getFullYear() === ahora.getFullYear() &&
    inicio.getMonth() === ahora.getMonth() &&
    inicio.getDate() === ahora.getDate();
  return mismaFecha ? "HOY" : "PROGRAMADA";
}

function titulosSesionParaCurso(course: Course) {
  const base = course.title.split(":")[0]?.trim() || course.title;
  return [
    `Sesión en vivo · ${base}`,
    `Práctica guiada · ${course.category}`,
    `Cierre / dudas · ${base}`,
  ];
}

/** Semilla determinística por curso + alumno (localStorage estable). */
function generarSesionesCursoAlumno(
  course: Course,
  alumno: AlumnoCalendario,
  organizacionId: string,
): SesionEnVivoOrganizacion[] {
  const enriquecido = enrichCourse(course);
  const docenteNombre = enriquecido.instructor ?? "Docente Tukuy";
  const docenteEmail = emailDocente(docenteNombre);
  const h = hashCurso(course.id);
  const offsets =
    course.status === "Completado"
      ? [-12, -5, -1]
      : course.progress > 50
        ? [-4, 0, 5]
        : [-2, 1, 8];
  const horas = [16 + (h % 3), 17, 18 + (h % 2)];
  const titulos = titulosSesionParaCurso(course);

  return offsets.map((dias, indice) => {
    const fechaHoraInicio = isoLocal(
      dias,
      horas[indice] ?? 17,
      indice === 1 ? 30 : 0,
    );
    const { calendarEventId, meetUrl } = simularEventoCalendarMeet(
      titulos[indice] ?? course.title,
      `${course.id}-${indice + 1}`,
    );
    const invitados: InvitadoSesionEnVivo[] = [
      {
        email: alumno.email,
        nombre: alumno.nombre,
        estado: dias < 0 ? "ACEPTADA" : "PENDIENTE",
        alumnoId: alumno.id,
      },
    ];

    return {
      id: `sev-alum-${course.id}-${indice + 1}`,
      clasificacion: "CLASE_EN_VIVO" as const,
      organizacionId,
      titulo: titulos[indice] ?? `Sesión · ${course.title}`,
      cursoId: course.id,
      cursoTitulo: course.title,
      docenteNombre,
      docenteEmail,
      fechaHoraInicio,
      duracionMinutos: course.mode === "Presencial" ? 90 : 60,
      estado: estadoDesdeFecha(fechaHoraInicio),
      proveedor: "GOOGLE_CALENDAR_MEET" as const,
      calendarEventId,
      meetUrl,
      invitados,
      inscritos: Math.max(12 + (h % 30), invitados.length),
      creadoPor: {
        portal: (organizacionId === ORG_ACADEMIA_TUKUY
          ? "docente"
          : "organizacion") as "docente" | "organizacion",
        nombre:
          organizacionId === ORG_ACADEMIA_TUKUY
            ? docenteNombre
            : (course.organizacionNombre ?? "Admin entidad"),
      },
      notas: course.organizacionNombre
        ? `Clase vinculada a ${course.organizacionNombre}`
        : "Clase sincronizada con el curso del alumno",
    };
  });
}

async function asegurarSesionesCursoAlumno(
  course: Course,
  alumno: AlumnoCalendario,
) {
  const organizacionId = organizacionIdParaCurso(course);
  const lista = await repo(organizacionId).listar();
  const delCurso = lista.filter((sesion) => sesion.cursoId === course.id);

  if (delCurso.length > 0) {
    for (const sesion of delCurso) {
      const email = alumno.email.toLowerCase();
      if (sesion.invitados.some((i) => i.email === email)) continue;
      await repo(organizacionId).actualizar(sesion.id, {
        invitados: [
          ...sesion.invitados,
          {
            email: alumno.email,
            nombre: alumno.nombre,
            estado: "ACEPTADA",
            alumnoId: alumno.id,
          },
        ],
        inscritos: sesion.inscritos + 1,
      });
    }
    return;
  }

  const nuevas = generarSesionesCursoAlumno(course, alumno, organizacionId);
  await repo(organizacionId).reemplazar([...nuevas, ...lista]);
  emitirCambio(organizacionId);
}

/**
 * Genera / sincroniza en localStorage las clases en vivo de los cursos
 * matriculados del alumno (Tukuy + entidad), con docente y organización coherentes.
 */
async function sincronizarCalendarioAlumno(
  cursosMatriculados: Course[],
  alumno: AlumnoCalendario = alumnoDemoCalendario,
) {
  const conCalendario = cursosMatriculados.filter(cursoCatalogoAdmiteCalendario);
  for (const curso of conCalendario) {
    await asegurarSesionesCursoAlumno(curso, alumno);
  }
  return conCalendario.map((c) => c.id);
}

/** Invitados desde matrículas del curso + correos manuales + alumno demo. */
function construirInvitados(
  cursoId: string,
  emailsExtra: string[],
): InvitadoSesionEnVivo[] {
  const vistos = new Set<string>();
  const resultado: InvitadoSesionEnVivo[] = [];

  function agregar(invitado: InvitadoSesionEnVivo) {
    const email = invitado.email.trim().toLowerCase();
    if (!email.includes("@") || vistos.has(email)) return;
    vistos.add(email);
    resultado.push({ ...invitado, email });
  }

  for (const matricula of matriculasOrganizacion) {
    if (matricula.cursoId !== cursoId) continue;
    if (matricula.estado === "PENDIENTE") continue;
    agregar({
      email: emailDesdeNombre(matricula.nombre, matricula.alumnoId),
      nombre: matricula.nombre,
      estado: "PENDIENTE",
      alumnoId: matricula.alumnoId,
    });
  }

  if ((cursosAlumnoDemoOrg as readonly string[]).includes(cursoId)) {
    agregar({
      email: emailAlumnoDemo,
      nombre: "Carlos Alberto",
      estado: "PENDIENTE",
      alumnoId: "alu-demo",
    });
  }

  for (const email of emailsExtra) {
    agregar({ email, estado: "PENDIENTE" });
  }

  return resultado;
}

function estadoInicial(fechaIso: string): SesionEnVivoOrganizacion["estado"] {
  const estado = estadoDesdeFecha(fechaIso);
  return estado === "FINALIZADA" ? "PROGRAMADA" : estado;
}

async function listarPorOrganizacion(organizacionId: string) {
  if (!apiConfig.useMock) {
    const { data } = await api.get<SesionEnVivoOrganizacion[]>(
      API.organizacion.sesionesEnVivo,
      { params: { organizacionId } },
    );
    return data.filter((s) => s.clasificacion === "CLASE_EN_VIVO");
  }
  const lista = await repo(organizacionId).listar();
  return lista
    .filter((sesion) => sesion.clasificacion === "CLASE_EN_VIVO")
    .sort(
      (a, b) =>
        new Date(a.fechaHoraInicio).getTime() -
        new Date(b.fechaHoraInicio).getTime(),
    );
}

async function programar(input: ProgramarSesionEnVivoInput) {
  if (!apiConfig.useMock) {
    const { data } = await api.post<SesionEnVivoOrganizacion>(
      API.organizacion.sesionesEnVivo,
      input,
    );
    return data;
  }

  const invitadosFinal =
    input.invitarMatriculados === false
      ? (() => {
          const extras = [...input.emailsInvitados];
          if ((cursosAlumnoDemoOrg as readonly string[]).includes(input.cursoId)) {
            extras.push(emailAlumnoDemo);
          }
          const vistos = new Set<string>();
          const limpios: string[] = [];
          for (const crudo of extras) {
            const email = crudo.trim().toLowerCase();
            if (!email.includes("@") || vistos.has(email)) continue;
            vistos.add(email);
            limpios.push(email);
          }
          return limpios.map((email) => ({
            email,
            nombre: email === emailAlumnoDemo ? "Carlos Alberto" : undefined,
            estado: "PENDIENTE" as const,
            alumnoId: email === emailAlumnoDemo ? "alu-demo" : undefined,
          }));
        })()
      : construirInvitados(input.cursoId, input.emailsInvitados);

  const { calendarEventId, meetUrl } = simularEventoCalendarMeet(input.titulo);
  const sesion: SesionEnVivoOrganizacion = {
    id: `sev-${Date.now()}`,
    clasificacion: "CLASE_EN_VIVO",
    organizacionId: input.organizacionId,
    titulo: input.titulo.trim(),
    cursoId: input.cursoId,
    cursoTitulo: input.cursoTitulo,
    docenteNombre: input.docenteNombre,
    docenteEmail: input.docenteEmail.trim().toLowerCase(),
    fechaHoraInicio: new Date(input.fechaHoraInicio).toISOString(),
    duracionMinutos: input.duracionMinutos,
    estado: estadoInicial(input.fechaHoraInicio),
    proveedor: "GOOGLE_CALENDAR_MEET",
    calendarEventId,
    meetUrl,
    invitados: invitadosFinal,
    inscritos: Math.max(invitadosFinal.length, 0),
    notas: input.notas?.trim() || undefined,
    creadoPor: input.creadoPor,
  };

  const creada = await repo(input.organizacionId).crear(sesion);
  emitirCambio(input.organizacionId);
  return creada;
}

async function actualizar(
  organizacionId: string,
  id: string,
  cambios: Partial<SesionEnVivoOrganizacion>,
) {
  if (!apiConfig.useMock) {
    const { data } = await api.patch<SesionEnVivoOrganizacion>(
      API.organizacion.sesionEnVivoPorId(id),
      cambios,
    );
    return data;
  }
  const actualizada = await repo(organizacionId).actualizar(id, cambios);
  emitirCambio(organizacionId);
  return actualizada;
}

async function iniciar(organizacionId: string, id: string) {
  if (!apiConfig.useMock) {
    const { data } = await api.post<SesionEnVivoOrganizacion>(
      API.organizacion.iniciarSesionEnVivo(id),
    );
    return data;
  }
  return actualizar(organizacionId, id, { estado: "EN_VIVO" });
}

async function cancelar(organizacionId: string, id: string) {
  if (!apiConfig.useMock) {
    const { data } = await api.post<SesionEnVivoOrganizacion>(
      API.organizacion.cancelarSesionEnVivo(id),
    );
    return data;
  }
  return actualizar(organizacionId, id, { estado: "CANCELADA" });
}

async function reenviarInvitaciones(organizacionId: string, id: string) {
  if (!apiConfig.useMock) {
    const { data } = await api.post<SesionEnVivoOrganizacion>(
      API.organizacion.reenviarInvitacionesSesion(id),
    );
    return data;
  }
  const actual = await repo(organizacionId).obtener(id);
  if (!actual) throw new Error("Sesión no encontrada");
  return actualizar(organizacionId, id, {
    invitados: actual.invitados.map((invitado) =>
      invitado.estado === "ACEPTADA"
        ? invitado
        : { ...invitado, estado: "PENDIENTE" },
    ),
  });
}

async function listarSesionesDeOrgs(orgIds: string[]) {
  const porId = new Map<string, SesionEnVivoOrganizacion>();
  for (const orgId of orgIds) {
    const lista = await listarPorOrganizacion(orgId);
    for (const sesion of lista) {
      porId.set(sesion.id, sesion);
    }
  }
  return [...porId.values()].sort(
    (a, b) =>
      new Date(a.fechaHoraInicio).getTime() -
      new Date(b.fechaHoraInicio).getTime(),
  );
}

/**
 * Visibilidad por perfil (solo CLASE_EN_VIVO):
 * - organización: todas las de la entidad
 * - docente: cursos de su alcance
 * - estudiante: cursos matriculados (sync localStorage + vínculo docente/entidad)
 */
async function listarParaContexto(
  contexto: ContextoSesion,
  cursosMatriculados?: Course[],
) {
  if (contexto.portal === "estudiante") {
    const matriculados = (cursosMatriculados ?? []).filter(cursoEstaMatriculado);
    const idsMatricula = new Set(matriculados.map((c) => c.id));

    if (matriculados.length) {
      await sincronizarCalendarioAlumno(matriculados);
    }

    const orgIds = new Set<string>();
    for (const curso of matriculados) {
      orgIds.add(organizacionIdParaCurso(curso));
    }
    if (
      contexto.organizacionId &&
      !contexto.organizacionId.startsWith("org-personal-")
    ) {
      orgIds.add(contexto.organizacionId);
    }
    if (
      [...idsMatricula].some((id) =>
        (cursosAlumnoDemoOrg as readonly string[]).includes(id),
      )
    ) {
      orgIds.add("org-empresa-abc");
    }

    const todas = await listarSesionesDeOrgs([...orgIds]);
    return todas.filter(
      (sesion) =>
        idsMatricula.has(sesion.cursoId) ||
        sesion.invitados.some(
          (invitado) => invitado.email === emailAlumnoDemo,
        ),
    );
  }

  const clave = claveSesionesContexto(contexto);
  const todas = await listarPorOrganizacion(clave);

  if (contexto.portal === "organizacion") {
    return todas;
  }

  if (contexto.portal === "docente") {
    const ids = contexto.alcance?.cursoIds;
    if (
      contexto.ambitoDocencia === "INDEPENDIENTE" ||
      !contexto.organizacionId ||
      contexto.organizacionId.startsWith("org-personal-")
    ) {
      return todas;
    }
    if (ids?.length) {
      return todas.filter((sesion) => ids.includes(sesion.cursoId));
    }
    return todas;
  }

  return todas;
}

/**
 * Cursos que pueden tener clases en el calendario (EN_VIVO / HIBRIDA).
 * Los VIRTUALes quedan fuera: viven en el catálogo asíncrono.
 */
function listarCursosParaCalendario(contexto: ContextoSesion) {
  const independiente =
    contexto.ambitoDocencia === "INDEPENDIENTE" ||
    !contexto.organizacionId ||
    contexto.organizacionId.startsWith("org-personal-");

  return cursosDocente
    .filter((curso) => {
      if (!cursoAdmiteSesionesEnVivo(curso.modalidadImparticion ?? "VIRTUAL")) {
        return false;
      }
      if (independiente && contexto.portal === "docente") {
        return curso.ambito === "INDEPENDIENTE";
      }
      if (contexto.organizacionId) {
        if (curso.organizacionId !== contexto.organizacionId) return false;
        const ids = contexto.alcance?.cursoIds;
        if (
          contexto.portal === "docente" &&
          ids?.length &&
          !ids.includes(curso.id)
        ) {
          return false;
        }
        return true;
      }
      return false;
    })
    .map((curso) => ({
      id: curso.id,
      titulo: curso.titulo,
      modalidadImparticion: curso.modalidadImparticion ?? "VIRTUAL",
    }));
}

function formatoCortoFecha(fecha: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  })
    .format(fecha)
    .toUpperCase()
    .replace(".", "");
}

function formatoHora(fecha: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

/** Adaptador para la UI docente existente. */
function aSesionDocente(sesion: SesionEnVivoOrganizacion): SesionDocente {
  const fecha = new Date(sesion.fechaHoraInicio);
  return {
    id: sesion.id,
    titulo: sesion.titulo,
    curso: sesion.cursoTitulo,
    cursoId: sesion.cursoId,
    fecha: formatoCortoFecha(fecha),
    hora: formatoHora(fecha),
    duracion: `${sesion.duracionMinutos} min`,
    inscritos: sesion.inscritos,
    estado: sesion.estado,
    fechaHoraIso: sesion.fechaHoraInicio,
    enlace: sesion.meetUrl,
    calendarEventId: sesion.calendarEventId,
    invitadosEmails: sesion.invitados.map((i) => i.email),
    grabacion: sesion.grabacionUrl,
  };
}

export const sesionesEnVivoCompartidas = {
  listarPorOrganizacion,
  listarParaContexto,
  listarCursosParaCalendario,
  sincronizarCalendarioAlumno,
  cursoCatalogoAdmiteCalendario,
  claveSesionesContexto,
  programar,
  iniciar,
  cancelar,
  reenviarInvitaciones,
  actualizar,
  aSesionDocente,
  emailAlumnoDemo,
  cursosAlumnoDemoOrg,
  cursoAdmiteSesionesEnVivo,
  EVENTO,
};
