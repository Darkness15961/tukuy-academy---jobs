<script setup lang="ts">
import { Calendar, Link2, PlayCircle, Video } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { sesionesEnVivoCompartidas } from "@/api/services/sesiones-en-vivo-compartidas.service";
import CompartirSesionRedes from "@/components/shared/CompartirSesionRedes.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { formatearFechaSesion } from "@/lib/compartir-sesion-en-vivo";
import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";
import type { Course } from "@/types/academia";
import { usePortalContext } from "@/views/portal/composables/usePortalContext";

const props = defineProps<{
  cursoId: string;
  cursoTitulo: string;
  compacto?: boolean;
}>();

const { contextoActivo } = useContextoSesion();
const portal = usePortalContext();

const cargando = ref(true);
const sesiones = ref<SesionEnVivoOrganizacion[]>([]);
const sesionExpandida = ref<string>();

const sesionesCurso = computed(() =>
  sesiones.value
    .filter((s) => s.cursoId === props.cursoId)
    .sort(
      (a, b) =>
        new Date(b.fechaHoraInicio).getTime() -
        new Date(a.fechaHoraInicio).getTime(),
    ),
);

const proximaSesion = computed(() => {
  const ahora = Date.now();
  return (
    sesionesCurso.value.find(
      (s) =>
        s.estado !== "CANCELADA" &&
        s.estado !== "FINALIZADA" &&
        new Date(s.fechaHoraInicio).getTime() >= ahora - 2 * 60 * 60 * 1000,
    ) ?? sesionesCurso.value.find((s) => s.estado !== "CANCELADA")
  );
});

async function cargar() {
  if (!contextoActivo.value) {
    sesiones.value = [];
    return;
  }
  cargando.value = true;
  try {
    sesiones.value = await sesionesEnVivoCompartidas.listarParaContexto(
      contextoActivo.value,
      portal.enrolledCourses.value as Course[],
    );
  } finally {
    cargando.value = false;
  }
}

onMounted(() => {
  void cargar();
  window.addEventListener(sesionesEnVivoCompartidas.EVENTO, cargar);
});

onUnmounted(() => {
  window.removeEventListener(sesionesEnVivoCompartidas.EVENTO, cargar);
});

watch(
  () => props.cursoId,
  () => {
    void cargar();
  },
);

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
  if (estado === "CANCELADA") {
    return "border-border bg-muted text-muted-foreground";
  }
  return "border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-200";
}

function unirse(sesion: SesionEnVivoOrganizacion) {
  if (!sesion.meetUrl?.trim()) return;
  window.open(sesion.meetUrl, "_blank", "noopener,noreferrer");
}

function abrirGrabacion(sesion: SesionEnVivoOrganizacion) {
  const url = sesion.grabacionUrl?.trim();
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function puedeUnirse(sesion: SesionEnVivoOrganizacion) {
  return (
    Boolean(sesion.meetUrl?.trim()) &&
    sesion.estado !== "CANCELADA" &&
    sesion.estado !== "FINALIZADA"
  );
}
</script>

<template>
  <section
    class="flex flex-col"
    :class="compacto ? 'gap-3 p-4' : 'gap-5 p-6 sm:p-8'"
  >
    <div v-if="!compacto" class="space-y-2">
      <div class="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          class="border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200"
        >
          Clases en vivo
        </Badge>
        <span class="text-xs text-muted-foreground">{{ cursoTitulo }}</span>
      </div>
      <h2 class="text-xl font-black text-foreground sm:text-2xl">
        Calendario y enlaces de clase
      </h2>
      <p class="max-w-2xl text-sm text-muted-foreground">
        Aquí verás las sesiones sincrónicas con Google Meet. Cuando termine una
        clase, el docente puede publicar la grabación en el mismo listado.
      </p>
    </div>

    <div
      v-if="cargando"
      class="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
    >
      Cargando clases en vivo…
    </div>

    <div
      v-else-if="!sesionesCurso.length"
      class="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center"
    >
      <Video class="mx-auto h-10 w-10 text-muted-foreground/60" />
      <p class="mt-3 text-sm font-semibold text-foreground">
        Aún no hay clases programadas
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        Tu docente publicará aquí los enlaces de Meet y las grabaciones.
      </p>
    </div>

    <template v-else>
      <VisorMeetEnVivo
        v-if="proximaSesion && !compacto"
        pantalla-completa
        :titulo="proximaSesion.titulo"
        :meet-url="proximaSesion.meetUrl"
        :grabacion-url="proximaSesion.grabacionUrl"
        :fecha-hora-inicio="proximaSesion.fechaHoraInicio"
        :estado="proximaSesion.estado"
        :docente-nombre="proximaSesion.docenteNombre"
        :duracion-minutos="proximaSesion.duracionMinutos"
      />
      <CompartirSesionRedes
        v-if="proximaSesion && !compacto && proximaSesion.meetUrl?.trim()"
        class="px-1"
        :titulo="proximaSesion.titulo"
        :curso-titulo="cursoTitulo"
        :url-meet="proximaSesion.meetUrl"
        :fecha-hora-inicio="proximaSesion.fechaHoraInicio"
      />

      <ul class="grid gap-3">
        <li
          v-for="sesion in sesionesCurso"
          :key="sesion.id"
          class="rounded-lg border border-border bg-card"
        >
          <button
            type="button"
            class="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/30"
            @click="
              sesionExpandida =
                sesionExpandida === sesion.id ? undefined : sesion.id
            "
          >
            <div
              class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
            >
              <Video class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  class="text-[10px]"
                  :class="claseEstado(sesion.estado)"
                >
                  {{ etiquetaEstado(sesion.estado) }}
                </Badge>
                <span class="text-xs text-muted-foreground">
                  {{ formatearFechaSesion(sesion.fechaHoraInicio) }}
                </span>
              </div>
              <p class="mt-1 font-semibold text-foreground">
                {{ sesion.titulo }}
              </p>
            </div>
          </button>

          <div
            v-if="sesionExpandida === sesion.id || compacto"
            class="space-y-3 border-t border-border px-4 pb-4 pt-3"
          >
            <p
              v-if="sesion.notas"
              class="text-xs text-muted-foreground"
            >
              {{ sesion.notas }}
            </p>

            <div
              v-if="sesion.meetUrl?.trim()"
              class="break-all text-xs text-muted-foreground"
            >
              <Link2 class="mr-1 inline h-3.5 w-3.5" />
              {{ sesion.meetUrl }}
            </div>

            <div class="flex flex-wrap gap-2">
              <Button
                v-if="puedeUnirse(sesion)"
                size="sm"
                class="bg-primary text-primary-foreground"
                @click="unirse(sesion)"
              >
                <Video class="h-4 w-4" />
                Unirme a Meet
              </Button>
              <Button
                v-if="sesion.grabacionUrl?.trim()"
                size="sm"
                variant="outline"
                @click="abrirGrabacion(sesion)"
              >
                <PlayCircle class="h-4 w-4" />
                Ver grabación
              </Button>
              <Button
                v-else-if="sesion.estado === 'FINALIZADA'"
                size="sm"
                variant="outline"
                disabled
              >
                Grabación pendiente
              </Button>
            </div>

            <CompartirSesionRedes
              v-if="sesion.meetUrl?.trim()"
              :titulo="sesion.titulo"
              :curso-titulo="cursoTitulo"
              :url-meet="sesion.meetUrl"
              :fecha-hora-inicio="sesion.fechaHoraInicio"
            />
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>
