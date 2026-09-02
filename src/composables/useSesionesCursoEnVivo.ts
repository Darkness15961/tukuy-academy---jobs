import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";

import { apiConfig } from "@/api/config";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import { sesionesEnVivoCompartidas } from "@/api/services/sesiones-en-vivo-compartidas.service";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import { meetUrlEsSimulado } from "@/lib/meet-sesion";
import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";
import type { Course } from "@/types/academia";
import type { SesionEnVivoSecundaria } from "@/lib/contrato-secundaria";

function ordenarSesiones(sesiones: SesionEnVivoOrganizacion[]) {
  return [...sesiones].sort(
    (a, b) =>
      new Date(b.fechaHoraInicio).getTime() -
      new Date(a.fechaHoraInicio).getTime(),
  );
}

function priorizarSesion(sesiones: SesionEnVivoOrganizacion[]) {
  const enCurso = sesiones.find(
    (s) => s.estado === "EN_VIVO" || s.estado === "HOY",
  );
  if (enCurso) return enCurso;

  const ahora = Date.now();
  const proxima = sesiones
    .filter(
      (s) =>
        s.estado !== "CANCELADA" &&
        s.estado !== "FINALIZADA" &&
        new Date(s.fechaHoraInicio).getTime() >= ahora - 2 * 60 * 60 * 1000,
    )
    .sort(
      (a, b) =>
        new Date(a.fechaHoraInicio).getTime() -
        new Date(b.fechaHoraInicio).getTime(),
    )[0];
  if (proxima) return proxima;

  return sesiones.find((s) => s.estado !== "CANCELADA") ?? sesiones[0];
}

function mapearSesionCurso(
  sesion: SesionEnVivoSecundaria,
  organizacionId: string,
): SesionEnVivoOrganizacion {
  const inicio = new Date(sesion.iniciaEn);
  const fin = new Date(sesion.terminaEn);
  const minutos = Math.max(
    15,
    Math.round((fin.getTime() - inicio.getTime()) / 60000),
  );
  const meetSimulado = meetUrlEsSimulado(
    sesion.urlAcceso,
    sesion.calendarEventId,
  );
  const estadoRaw = String(sesion.estado ?? "PROGRAMADA").toUpperCase();
  const estado = (
    ["PROGRAMADA", "HOY", "EN_VIVO", "FINALIZADA", "CANCELADA"].includes(
      estadoRaw,
    )
      ? estadoRaw
      : "PROGRAMADA"
  ) as SesionEnVivoOrganizacion["estado"];

  return {
    id: sesion.id,
    clasificacion: "CLASE_EN_VIVO",
    organizacionId,
    titulo: sesion.titulo,
    cursoId: sesion.cursoId,
    cursoTitulo: sesion.cursoTitulo,
    docenteNombre: "Docente",
    docenteEmail: "docente@tukuy.academy",
    fechaHoraInicio: sesion.iniciaEn,
    duracionMinutos: minutos,
    estado,
    proveedor: "GOOGLE_CALENDAR_MEET",
    calendarEventId: sesion.calendarEventId || `sec-${sesion.id}`,
    meetUrl: sesion.urlAcceso || "",
    meetSimulado,
    meetAviso: meetSimulado
      ? "Enlace de demostración: Google Calendar no está configurado o falló al crear el evento."
      : undefined,
    invitados: [],
    inscritos: Number(sesion.inscritos ?? 0),
    creadoPor: { portal: "docente", nombre: "Docente" },
  };
}

export function useSesionesCursoEnVivo(
  cursoId: Ref<string>,
  cursosMatriculados?: Ref<Course[]>,
) {
  const { contextoActivo } = useContextoSesion();
  const cargando = ref(false);
  const sesiones = ref<SesionEnVivoOrganizacion[]>([]);

  async function cargar() {
    if (!cursoId.value) {
      sesiones.value = [];
      return;
    }
    cargando.value = true;
    try {
      // Alumno en clase en vivo: cargar directo por curso (sin caché global ni filtro de matrícula).
      if (apiConfig.secundariaCursos) {
        const orgId =
          contextoActivo.value?.organizacionId &&
          !contextoActivo.value.organizacionId.startsWith("org-personal-")
            ? contextoActivo.value.organizacionId
            : INSTALACION_TUKUY_ACADEMY_ID;
        const listado = await secundariaGatewayService.listarSesiones(
          cursoId.value,
        );
        sesiones.value = ordenarSesiones(
          (listado.sesiones ?? []).map((s) => mapearSesionCurso(s, orgId)),
        );
        return;
      }

      if (!contextoActivo.value) {
        sesiones.value = [];
        return;
      }
      const todas = await sesionesEnVivoCompartidas.listarParaContexto(
        contextoActivo.value,
        cursosMatriculados?.value,
      );
      sesiones.value = ordenarSesiones(
        todas.filter((s) => s.cursoId === cursoId.value),
      );
    } catch {
      sesiones.value = [];
    } finally {
      cargando.value = false;
    }
  }

  const sesionDestacada = computed(() => priorizarSesion(sesiones.value));

  onMounted(() => {
    void cargar();
    window.addEventListener(sesionesEnVivoCompartidas.EVENTO, cargar);
  });

  onUnmounted(() => {
    window.removeEventListener(sesionesEnVivoCompartidas.EVENTO, cargar);
  });

  watch(cursoId, () => {
    void cargar();
  });

  return {
    cargando,
    sesiones,
    sesionDestacada,
    recargar: cargar,
  };
}
