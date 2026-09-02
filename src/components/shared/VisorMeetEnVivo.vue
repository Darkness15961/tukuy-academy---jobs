<script setup lang="ts">
import {
  Calendar,
  Copy,
  ExternalLink,
  Link2,
  PlayCircle,
  Video,
} from "lucide-vue-next";
import { computed } from "vue";

import ReproductorPlyrYoutube from "@/components/shared/ReproductorPlyrYoutube.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatearFechaSesion } from "@/lib/compartir-sesion-en-vivo";
import { toast } from "@/lib/toast";
import { idVideoYoutube } from "@/lib/youtube";
import type { SesionEnVivoOrganizacion } from "@/portal-organizacion/types/sesiones-en-vivo.types";

const props = withDefaults(
  defineProps<{
    titulo: string;
    meetUrl?: string;
    grabacionUrl?: string;
    fechaHoraInicio?: string;
    estado?: SesionEnVivoOrganizacion["estado"];
    docenteNombre?: string;
    duracionMinutos?: number;
    /** Versión reducida para la barra lateral de módulos. */
    compacto?: boolean;
    /** Ocupa el área principal del reproductor. */
    pantallaCompleta?: boolean;
  }>(),
  {
    meetUrl: "",
    grabacionUrl: "",
    fechaHoraInicio: "",
    estado: "PROGRAMADA",
    docenteNombre: "",
    duracionMinutos: 0,
    compacto: false,
    pantallaCompleta: false,
  },
);

const meetUrlLimpia = computed(() => props.meetUrl?.trim() ?? "");
const grabacionUrlLimpia = computed(() => props.grabacionUrl?.trim() ?? "");
const videoGrabacionId = computed(() =>
  idVideoYoutube(grabacionUrlLimpia.value),
);

const puedeUnirse = computed(
  () =>
    Boolean(meetUrlLimpia.value) &&
    props.estado !== "CANCELADA" &&
    props.estado !== "FINALIZADA",
);

const mostrarGrabacion = computed(
  () =>
    Boolean(videoGrabacionId.value) ||
    (props.estado === "FINALIZADA" && Boolean(grabacionUrlLimpia.value)),
);

const etiquetaEstado = computed(() => {
  const mapa: Record<SesionEnVivoOrganizacion["estado"], string> = {
    PROGRAMADA: "Programada",
    HOY: "Hoy",
    EN_VIVO: "En vivo ahora",
    FINALIZADA: "Finalizada",
    CANCELADA: "Cancelada",
  };
  return mapa[props.estado] ?? props.estado;
});

const claseEstado = computed(() => {
  if (props.estado === "EN_VIVO" || props.estado === "HOY") {
    return "border-rose-500/40 bg-rose-500/15 text-rose-800 dark:text-rose-200";
  }
  if (props.estado === "FINALIZADA") {
    return "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
  }
  if (props.estado === "CANCELADA") {
    return "border-border bg-muted text-muted-foreground";
  }
  return "border-sky-500/35 bg-sky-500/10 text-sky-800 dark:text-sky-200";
});

function abrirMeet() {
  if (!meetUrlLimpia.value) return;
  window.open(meetUrlLimpia.value, "_blank", "noopener,noreferrer");
}

function abrirGrabacion() {
  if (!grabacionUrlLimpia.value) return;
  window.open(grabacionUrlLimpia.value, "_blank", "noopener,noreferrer");
}

async function copiarEnlace() {
  if (!meetUrlLimpia.value) return;
  try {
    await navigator.clipboard.writeText(meetUrlLimpia.value);
    toast.success("Enlace de Meet copiado");
  } catch {
    toast.error("No se pudo copiar el enlace");
  }
}
</script>

<template>
  <!-- Versión compacta (módulo en sidebar) -->
  <div
    v-if="compacto"
    class="space-y-2 rounded-lg border border-rose-500/25 bg-rose-500/5 p-3"
  >
    <div class="flex flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        class="text-[10px]"
        :class="claseEstado"
      >
        {{ etiquetaEstado }}
      </Badge>
      <span
        v-if="fechaHoraInicio"
        class="text-[10px] text-muted-foreground"
      >
        {{ formatearFechaSesion(fechaHoraInicio) }}
      </span>
    </div>
    <p
      v-if="meetUrlLimpia"
      class="break-all text-[11px] text-muted-foreground"
    >
      <Link2 class="mr-0.5 inline h-3 w-3" />
      {{ meetUrlLimpia }}
    </p>
    <div class="flex flex-wrap gap-1.5">
      <Button
        v-if="puedeUnirse"
        size="sm"
        class="h-8 flex-1 bg-rose-600 text-xs text-white hover:bg-rose-600/90"
        @click="abrirMeet"
      >
        <Video class="h-3.5 w-3.5" />
        Unirme
      </Button>
      <Button
        v-if="meetUrlLimpia"
        size="sm"
        variant="outline"
        class="h-8 px-2"
        aria-label="Copiar enlace"
        @click="copiarEnlace"
      >
        <Copy class="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>

  <!-- Versión principal -->
  <div
    v-else
    class="flex w-full flex-col"
    :class="
      pantallaCompleta
        ? 'min-h-[min(62vh,680px)]'
        : 'overflow-hidden rounded-xl border border-border'
    "
  >
    <ReproductorPlyrYoutube
      v-if="mostrarGrabacion && videoGrabacionId"
      :key="videoGrabacionId"
      :url="grabacionUrlLimpia"
      :titulo="titulo"
      class="aspect-video w-full bg-black"
    />

    <div
      v-else
      class="flex flex-1 flex-col"
      :class="
        pantallaCompleta
          ? 'justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/40 p-6 sm:p-10'
          : 'bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/30 p-5 sm:p-8'
      "
    >
      <div class="mx-auto w-full max-w-2xl space-y-6 text-center text-white">
        <div class="flex flex-wrap items-center justify-center gap-2">
          <Badge
            variant="outline"
            :class="claseEstado"
          >
            {{ etiquetaEstado }}
          </Badge>
          <span
            v-if="fechaHoraInicio"
            class="inline-flex items-center gap-1 text-xs text-slate-300"
          >
            <Calendar class="h-3.5 w-3.5" />
            {{ formatearFechaSesion(fechaHoraInicio) }}
            <template v-if="duracionMinutos">
              · {{ duracionMinutos }} min
            </template>
          </span>
        </div>

        <div
          class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-rose-500/15 ring-4 ring-rose-500/25"
        >
          <Video class="h-9 w-9 text-rose-400" />
        </div>

        <div class="space-y-2">
          <p class="text-xs font-bold uppercase tracking-widest text-rose-300/90">
            Clase sincrónica · Google Meet
          </p>
          <h3 class="text-2xl font-black sm:text-3xl">
            {{ titulo }}
          </h3>
          <p
            v-if="docenteNombre"
            class="text-sm text-slate-400"
          >
            Docente: {{ docenteNombre }}
          </p>
        </div>

        <p class="text-sm text-slate-400">
          Google Meet no se puede incrustar aquí. Usa el enlace para unirte con
          la misma cuenta de Tukuy Academy.
        </p>

        <div
          v-if="meetUrlLimpia"
          class="rounded-lg border border-white/10 bg-white/5 p-3 text-left"
        >
          <p class="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Enlace de la clase
          </p>
          <p class="break-all font-mono text-xs text-slate-200 sm:text-sm">
            {{ meetUrlLimpia }}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <Button
            v-if="puedeUnirse"
            size="lg"
            class="bg-rose-600 px-8 text-white hover:bg-rose-600/90"
            @click="abrirMeet"
          >
            <ExternalLink class="h-5 w-5" />
            Unirme a la clase
          </Button>
          <Button
            v-if="meetUrlLimpia"
            size="lg"
            variant="outline"
            class="border-white/20 bg-white/5 text-white hover:bg-white/10"
            @click="copiarEnlace"
          >
            <Copy class="h-4 w-4" />
            Copiar enlace
          </Button>
          <Button
            v-if="mostrarGrabacion && !videoGrabacionId"
            size="lg"
            variant="outline"
            class="border-white/20 bg-white/5 text-white hover:bg-white/10"
            @click="abrirGrabacion"
          >
            <PlayCircle class="h-4 w-4" />
            Ver grabación
          </Button>
        </div>

        <p
          v-if="estado === 'FINALIZADA' && !grabacionUrlLimpia"
          class="text-xs text-slate-500"
        >
          La grabación se publicará aquí cuando el docente la suba.
        </p>

        <p
          v-if="!meetUrlLimpia"
          class="text-sm text-slate-400"
        >
          El docente aún no publicó el enlace de Meet.
        </p>
      </div>
    </div>
  </div>
</template>
