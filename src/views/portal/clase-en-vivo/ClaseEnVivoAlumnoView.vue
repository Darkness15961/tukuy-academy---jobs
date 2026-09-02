<script setup lang="ts">
import {
  ArrowLeft,
  Calendar,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Video,
} from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { apiConfig } from "@/api/config";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import CompartirSesionRedes from "@/components/shared/CompartirSesionRedes.vue";
import VisorMeetEnVivo from "@/components/shared/VisorMeetEnVivo.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { asegurarCursosCargados } from "@/composables/useCursos";
import { cursoEstaMatriculado } from "@/lib/acceso-curso";
import { formatearFechaSesion } from "@/lib/compartir-sesion-en-vivo";
import { INSTALACION_TUKUY_ACADEMY_ID } from "@/lib/constants";
import type { SesionEnVivoSecundaria } from "@/lib/contrato-secundaria";
import { meetUrlEsSimulado } from "@/lib/meet-sesion";
import {
  etiquetaModalidadCurso,
  modalidadSecundariaAMode,
} from "@/lib/presentacion-curso";
import {
  cursoEsSoloClasesEnVivo,
  modeConsumoCursoAlumno,
  rutaConsumoCursoAlumno,
} from "@/lib/ruta-consumo-curso";
import { toast } from "@/lib/toast";
import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";
import type { Course } from "@/types/academia";
import { usePortalContext } from "../composables/usePortalContext";

const route = useRoute();
const router = useRouter();
const portal = usePortalContext();

const courseId = computed(() => String(route.params.courseId ?? ""));
const courseFallback = ref<Course | null>(null);
const course = computed(
  () =>
    portal.courses.value.find((c) => c.id === courseId.value) ??
    courseFallback.value,
);

const cargando = ref(true);
const errorCarga = ref<string | null>(null);
const descripcionCurso = ref("");
const sesiones = ref<SesionEnVivoOrganizacion[]>([]);

function estadoCliente(
  raw: string | null | undefined,
  iniciaEn: string,
  terminaEn: string,
): SesionEnVivoOrganizacion["estado"] {
  const estado = String(raw ?? "PROGRAMADA").toUpperCase();
  if (estado === "CANCELADA" || estado === "FINALIZADA" || estado === "EN_VIVO") {
    return estado as SesionEnVivoOrganizacion["estado"];
  }
  const ahora = Date.now();
  const inicio = new Date(iniciaEn).getTime();
  const fin = new Date(terminaEn).getTime();
  if (Number.isFinite(inicio) && Number.isFinite(fin)) {
    if (ahora >= inicio && ahora <= fin) return "EN_VIVO";
    const mismoDia =
      new Date(iniciaEn).toDateString() === new Date().toDateString();
    if (mismoDia && ahora < fin) return "HOY";
  }
  return "PROGRAMADA";
}

function mapearSesion(sesion: SesionEnVivoSecundaria): SesionEnVivoOrganizacion {
  const inicio = new Date(sesion.iniciaEn);
  const fin = new Date(sesion.terminaEn);
  const minutos = Math.max(
    15,
    Math.round((fin.getTime() - inicio.getTime()) / 60000) || 60,
  );
  const meetUrl = String(sesion.urlAcceso ?? "").trim();
  return {
    id: sesion.id,
    clasificacion: "CLASE_EN_VIVO",
    organizacionId: INSTALACION_TUKUY_ACADEMY_ID,
    titulo: sesion.titulo,
    cursoId: sesion.cursoId,
    cursoTitulo: sesion.cursoTitulo,
    docenteNombre: "",
    docenteEmail: "",
    fechaHoraInicio: sesion.iniciaEn,
    duracionMinutos: minutos,
    estado: estadoCliente(sesion.estado, sesion.iniciaEn, sesion.terminaEn),
    proveedor: "GOOGLE_CALENDAR_MEET",
    calendarEventId: sesion.calendarEventId || "",
    meetUrl,
    meetSimulado: meetUrlEsSimulado(meetUrl, sesion.calendarEventId),
    invitados: [],
    inscritos: Number(sesion.inscritos ?? 0),
    creadoPor: { portal: "docente", nombre: "Docente" },
  };
}

const sesionesOrdenadas = computed(() =>
  [...sesiones.value].sort(
    (a, b) =>
      new Date(a.fechaHoraInicio).getTime() -
      new Date(b.fechaHoraInicio).getTime(),
  ),
);

const sesionDestacada = computed(() => {
  const activa = sesionesOrdenadas.value.find(
    (s) => s.estado === "EN_VIVO" || s.estado === "HOY",
  );
  if (activa) return activa;
  return (
    sesionesOrdenadas.value.find(
      (s) => s.estado !== "FINALIZADA" && s.estado !== "CANCELADA",
    ) ?? null
  );
});

const sesionesRestantes = computed(() => {
  if (!sesionDestacada.value) return sesionesOrdenadas.value;
  return sesionesOrdenadas.value.filter((s) => s.id !== sesionDestacada.value?.id);
});

function etiquetaEstado(estado: SesionEnVivoOrganizacion["estado"]) {
  return (
    {
      PROGRAMADA: "Programada",
      HOY: "Hoy",
      EN_VIVO: "En vivo ahora",
      FINALIZADA: "Finalizada",
      CANCELADA: "Cancelada",
    }[estado] ?? estado
  );
}

function claseEstado(estado: SesionEnVivoOrganizacion["estado"]) {
  if (estado === "EN_VIVO" || estado === "HOY") {
    return "border-rose-500/40 bg-rose-500/15 text-rose-800 dark:text-rose-200";
  }
  if (estado === "FINALIZADA") {
    return "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
  }
  return "border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-200";
}

function puedeUnirse(sesion: SesionEnVivoOrganizacion) {
  return (
    Boolean(sesion.meetUrl?.trim()) &&
    sesion.estado !== "CANCELADA" &&
    sesion.estado !== "FINALIZADA"
  );
}

function unirse(url: string) {
  if (!url.trim()) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copiarEnlace(url: string) {
  if (!url.trim()) return;
  try {
    await navigator.clipboard.writeText(url.trim());
    toast.success("Enlace copiado");
  } catch {
    toast.error("No se pudo copiar el enlace");
  }
}

function volver() {
  void router.push("/tukuy-academy/mi-aprendizaje");
}

async function cargar() {
  cargando.value = true;
  errorCarga.value = null;
  courseFallback.value = null;
  descripcionCurso.value = "";
  sesiones.value = [];

  try {
    await asegurarCursosCargados();

    let curso = portal.courses.value.find((c) => c.id === courseId.value);

    if (apiConfig.secundariaCursos) {
      const [remotoResult, listadoResult] = await Promise.allSettled([
        secundariaGatewayService.obtenerCurso(courseId.value),
        secundariaGatewayService.listarSesiones(courseId.value),
      ]);

      const remoto =
        remotoResult.status === "fulfilled" ? remotoResult.value : null;
      const listado =
        listadoResult.status === "fulfilled" ? listadoResult.value : null;

      if (listado?.sesiones?.length) {
        sesiones.value = listado.sesiones.map(mapearSesion);
      }

      if (remoto) {
        descripcionCurso.value = String(remoto.resumen ?? "").trim();
        const modeEfectivo = modeConsumoCursoAlumno({
          mode: modalidadSecundariaAMode(remoto.modalidad),
          modalidad: remoto.modalidad,
          categoria: remoto.categoria,
          tieneSesionesEnVivo: sesiones.value.length > 0,
        });

        if (!curso) {
          courseFallback.value = {
            id: courseId.value,
            title: remoto.titulo,
            category: String(remoto.categoria ?? ""),
            duration: "",
            level: "Intermedio",
            mode: modeEfectivo,
            progress: 0,
            status: "En curso",
            pricing: remoto.gratuito === false ? "paid" : "free",
            price: Number(remoto.precio ?? 0),
            imageTone: "from-rose-500/20 to-rose-500/5",
            image: "",
            origen: "tukuy",
            alcance: "PUBLICO",
          };
          curso = courseFallback.value;
        } else if (curso.mode !== modeEfectivo) {
          curso = {
            ...curso,
            mode: modeEfectivo,
            category: String(remoto.categoria ?? curso.category),
          };
          courseFallback.value = curso;
        }

        if (
          !cursoEsSoloClasesEnVivo({
            mode: modeEfectivo,
            modalidad: remoto.modalidad,
            categoria: remoto.categoria,
            tieneSesionesEnVivo: sesiones.value.length > 0,
          })
        ) {
          await router.replace(
            rutaConsumoCursoAlumno(courseId.value, {
              mode: modeEfectivo,
              modalidad: remoto.modalidad,
              categoria: remoto.categoria,
            }),
          );
          return;
        }
      }
    }

    curso = course.value ?? curso;
    if (!curso) {
      errorCarga.value = "No encontramos esta clase.";
      return;
    }

    if (
      !cursoEsSoloClasesEnVivo({
        mode: curso.mode,
        categoria: curso.category,
        tieneSesionesEnVivo: sesiones.value.length > 0,
      })
    ) {
      await router.replace(
        rutaConsumoCursoAlumno(courseId.value, {
          mode: curso.mode,
          categoria: curso.category,
        }),
      );
      return;
    }

    if (!cursoEstaMatriculado(curso) && !courseFallback.value) {
      await router.replace(`/tukuy-academy/cursos/${courseId.value}`);
      return;
    }
  } catch (error) {
    errorCarga.value =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la clase en vivo.";
  } finally {
    cargando.value = false;
  }
}

onMounted(() => {
  void cargar();
});
watch(courseId, () => {
  void cargar();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-background via-background to-rose-500/5">
    <header class="border-b border-border bg-card/80 backdrop-blur-sm">
      <div
        class="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4"
      >
        <Button
          variant="ghost"
          size="sm"
          class="shrink-0"
          @click="volver"
        >
          <ArrowLeft class="h-4 w-4" />
          Mi aprendizaje
        </Button>
        <Badge
          variant="outline"
          class="border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-200"
        >
          {{ course ? etiquetaModalidadCurso(course.mode) : "Clases en vivo" }}
        </Badge>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <div
        v-if="cargando"
        class="grid place-items-center gap-3 py-24 text-center text-muted-foreground"
      >
        <Loader2 class="h-8 w-8 animate-spin text-primary" />
        <p class="text-sm">Cargando tu clase en vivo…</p>
      </div>

      <div
        v-else-if="errorCarga"
        class="rounded-xl border border-border bg-card p-8 text-center"
      >
        <p class="text-sm text-muted-foreground">{{ errorCarga }}</p>
        <Button
          class="mt-4"
          variant="outline"
          @click="volver"
        >
          Volver
        </Button>
      </div>

      <template v-else-if="course">
        <div class="mb-8 space-y-3">
          <p class="text-xs font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">
            Clase sincrónica
          </p>
          <h1 class="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {{ course.title }}
          </h1>
          <p
            v-if="descripcionCurso"
            class="max-w-2xl whitespace-pre-line text-base leading-relaxed text-muted-foreground"
          >
            {{ descripcionCurso }}
          </p>
          <p
            v-else
            class="text-sm text-muted-foreground"
          >
            Únete a la sala de Google Meet en la hora programada. Usa la misma
            cuenta con la que ingresas a Tukuy Academy.
          </p>
        </div>

        <div
          v-if="!sesionesOrdenadas.length"
          class="rounded-xl border border-dashed border-border bg-card/60 p-10 text-center"
        >
          <Video class="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p class="mt-4 font-semibold text-foreground">
            Aún no hay sesión publicada
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            Tu docente compartirá el enlace de Meet cuando programe la clase.
          </p>
        </div>

        <div
          v-else
          class="space-y-8"
        >
          <VisorMeetEnVivo
            v-if="sesionDestacada"
            pantalla-completa
            :titulo="sesionDestacada.titulo"
            :meet-url="sesionDestacada.meetUrl ?? ''"
            :grabacion-url="sesionDestacada.grabacionUrl ?? ''"
            :fecha-hora-inicio="sesionDestacada.fechaHoraInicio"
            :estado="sesionDestacada.estado"
            :docente-nombre="sesionDestacada.docenteNombre ?? ''"
            :duracion-minutos="sesionDestacada.duracionMinutos ?? 0"
          />

          <section v-if="sesionesRestantes.length">
            <h2 class="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Otras sesiones programadas
            </h2>
            <ul class="grid gap-5">
              <li
                v-for="sesion in sesionesRestantes"
                :key="sesion.id"
                class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div class="border-b border-border bg-muted/30 px-5 py-4 sm:px-6">
                  <div class="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      :class="claseEstado(sesion.estado)"
                    >
                      {{ etiquetaEstado(sesion.estado) }}
                    </Badge>
                    <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar class="h-3.5 w-3.5" />
                      {{ formatearFechaSesion(sesion.fechaHoraInicio) }}
                      <template v-if="sesion.duracionMinutos">
                        · {{ sesion.duracionMinutos }} min
                      </template>
                    </span>
                  </div>
                  <h2 class="mt-2 text-xl font-bold text-foreground">
                    {{ sesion.titulo }}
                  </h2>
                </div>

                <div class="space-y-5 px-5 py-5 sm:px-6">
                  <div
                    v-if="sesion.meetUrl?.trim()"
                    class="rounded-lg border border-border bg-muted/20 p-4"
                  >
                    <p class="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Enlace de la sala
                    </p>
                    <p class="break-all font-mono text-xs text-foreground sm:text-sm">
                      <Link2 class="mr-1 inline h-3.5 w-3.5 text-primary" />
                      {{ sesion.meetUrl }}
                    </p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        :disabled="!puedeUnirse(sesion)"
                        @click="unirse(sesion.meetUrl)"
                      >
                        <ExternalLink class="h-4 w-4" />
                        Unirme a Meet
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        @click="copiarEnlace(sesion.meetUrl)"
                      >
                        <Copy class="h-4 w-4" />
                        Copiar enlace
                      </Button>
                    </div>
                  </div>

                  <CompartirSesionRedes
                    v-if="sesion.meetUrl?.trim()"
                    etiqueta="Compartir Meet"
                    :titulo="sesion.titulo"
                    :curso-titulo="sesion.cursoTitulo"
                    :url-meet="sesion.meetUrl"
                    :fecha-hora-inicio="sesion.fechaHoraInicio"
                  />
                </div>
              </li>
            </ul>
          </section>
        </div>
      </template>
    </main>
  </div>
</template>
