<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-vue-next";
import Skeleton from "primevue/skeleton";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import PortadaPanel from "@/components/shared/PortadaPanel.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  organizacionService,
  type AreaOrganizacion,
  type AsignacionOrganizacion,
  type LicenciaOrganizacion,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { useContextoSesion } from "@/composables/useContextoSesion";
import {
  actividadOrganizacion,
  alertasOrganizacion,
  indicadoresOrganizacion,
} from "../data/organizacion.mock";

const router = useRouter();
const { contextoActivo } = useContextoSesion();
const cargando = ref(true);
const areas = ref<AreaOrganizacion[]>([]);
const asignaciones = ref<AsignacionOrganizacion[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const licencia = ref<LicenciaOrganizacion | null>(null);

async function cargarDatos() {
  cargando.value = true;
  try {
    [areas.value, asignaciones.value, usuarios.value, licencia.value] = await Promise.all([
      organizacionService.areas.listar(),
      organizacionService.asignaciones.listar(),
      organizacionService.usuarios.listar(),
      organizacionService.obtenerLicencia(),
    ]);
  } finally {
    cargando.value = false;
  }
}
function actualizarDatos() { void cargarDatos(); }
onMounted(() => {
  void cargarDatos();
  window.addEventListener("tukuy:organizacion-datos", actualizarDatos);
});
onBeforeUnmount(() => window.removeEventListener("tukuy:organizacion-datos", actualizarDatos));

const nombreOrganizacion = computed(
  () =>
    contextoActivo.value?.organizacionNombre ??
    "COLEGIO DE INGENIEROS CUSCO",
);

const imagenesPortadaOrganizacion = [
  "/img/portal-organizacion.png",
  "/img/portada-planes-empresariales.png",
  "/img/portal-administracion.png",
];

const consumoUsuarios = computed(() => licencia.value?.consumos.find((item) => item.id === "usuarios"));
const porcentajeLicencias = computed(() => {
  const consumo = consumoUsuarios.value;
  return consumo ? Math.round((consumo.utilizado / consumo.limite) * 100) : 0;
});

const licenciasDisponibles = computed(
  () =>
    (consumoUsuarios.value?.limite ?? 0) - (consumoUsuarios.value?.utilizado ?? 0),
);

const promedioAreas = computed(() =>
  Math.round(
    areas.value.length
      ? areas.value.reduce((total, area) => total + area.progreso, 0) /
          areas.value.length
      : 0,
  ),
);

const indicadores = computed(() => [
  {
    etiqueta: "Licencias utilizadas",
    valor: `${consumoUsuarios.value?.utilizado ?? 0}/${consumoUsuarios.value?.limite ?? 0}`,
    detalle: `${porcentajeLicencias.value}% del plan corporativo`,
    icono: UsersRound,
    acento: "border-l-primary",
    fondo: "bg-muted",
    color: "text-primary",
    iconoFondo: "bg-primary/10",
  },
  {
    etiqueta: "Usuarios activos",
    valor: usuarios.value.filter((usuario) => usuario.estado === "ACTIVO").length,
    detalle: `${usuarios.value.length} usuarios registrados`,
    icono: TrendingUp,
    acento: "border-l-emerald-600",
    fondo: "bg-emerald-500/10",
    color: "text-emerald-700 dark:text-emerald-400",
    iconoFondo: "bg-emerald-500/10",
  },
  {
    etiqueta: "Cursos asignados",
    valor: asignaciones.value.length,
    detalle: `${asignaciones.value.filter((item) => item.obligatorio).length} asignaciones obligatorias`,
    icono: BookOpen,
    acento: "border-l-violet-600",
    fondo: "bg-violet-500/10",
    color: "text-violet-700 dark:text-violet-400",
    iconoFondo: "bg-violet-500/10",
  },
  {
    etiqueta: "Certificados emitidos",
    valor: indicadoresOrganizacion.certificados,
    detalle: `${indicadoresOrganizacion.finalizacion}% tasa de finalización`,
    icono: Award,
    acento: "border-l-[#F5B400]",
    fondo: "bg-[#FFFBEB]",
    color: "text-[#B87A00]",
    iconoFondo: "bg-[#F5B400]/15",
  },
]);

const colorBarraArea: Record<string, string> = {
  "bg-blue-600": "bg-blue-600",
  "bg-teal-600": "bg-teal-600",
  "bg-violet-600": "bg-violet-600",
  "bg-amber-500": "bg-amber-500",
};

function porcentajeAsignacion(completados: number, asignados: number) {
  if (!asignados) return 0;
  return Math.round((completados / asignados) * 100);
}

function clasePrioridad(prioridad: "alta" | "media" | "baja") {
  if (prioridad === "alta") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400";
  }
  if (prioridad === "baja") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400";
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <PortadaPanel
      :imagenes="imagenesPortadaOrganizacion"
      :etiqueta="nombreOrganizacion"
      titulo="Panel de capacitación"
      descripcion="Supervisa el aprendizaje, las asignaciones y el desarrollo de toda tu organización."
      texto-accion="Nueva asignación"
      etiqueta-accesible="Resumen de capacitación de la organización"
      @accion="router.push('/organizacion/asignaciones')"
    />

    <!-- KPIs -->
    <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-36 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="indicador in indicadores"
        :key="indicador.etiqueta"
        class="overflow-hidden border-border bg-card shadow-sm"
      >
        <CardContent
          :class="`border-l-4 p-5 ${indicador.acento} ${indicador.fondo}`"
        >
          <div class="flex items-start justify-between gap-3">
            <div
              class="grid h-11 w-11 shrink-0 place-items-center"
              :class="[indicador.iconoFondo, indicador.color]"
            >
              <component :is="indicador.icono" class="h-5 w-5" />
            </div>
            <span
              class="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
            >
              KPI
            </span>
          </div>
          <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {{ indicador.etiqueta }}
          </p>
          <strong class="mt-1 block text-3xl font-black tracking-tight text-foreground">
            {{ indicador.valor }}
          </strong>
          <p class="mt-1 text-xs font-medium" :class="indicador.color">
            {{ indicador.detalle }}
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Progreso + licencias -->
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
      <Card class="overflow-hidden border-border bg-card shadow-sm">
        <CardContent class="p-0">
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted px-5 py-4"
          >
            <div>
              <div class="flex items-center gap-2">
                <Building2 class="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <h2 class="text-lg font-black text-foreground">Progreso por área</h2>
              </div>
              <p class="mt-1 text-xs text-muted-foreground">
                Avance promedio corporativo:
                <strong class="text-primary">{{ promedioAreas }}%</strong>
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
              @click="router.push('/organizacion/equipos')"
            >
              Ver equipos
              <ArrowRight class="h-4 w-4" />
            </Button>
          </div>

          <div class="divide-y divide-border">
            <article
              v-for="(area, indice) in areas"
              :key="area.id"
              class="grid gap-4 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <div
                class="grid h-10 w-10 place-items-center bg-muted text-sm font-black text-primary"
              >
                {{ String(indice + 1).padStart(2, "0") }}
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-bold text-foreground">{{ area.nombre }}</h3>
                  <Badge
                    variant="outline"
                    class="border-border bg-card text-[10px] text-muted-foreground"
                  >
                    {{ area.usuarios }} usuarios
                  </Badge>
                </div>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  Responsable: {{ area.responsable }}
                </p>
                <div class="mt-3 flex items-center gap-3">
                  <div class="h-2 flex-1 overflow-hidden bg-muted">
                    <div
                      class="h-full transition-all"
                      :class="colorBarraArea[area.color] ?? 'bg-primary'"
                      :style="{ width: `${area.progreso}%` }"
                    />
                  </div>
                  <span class="min-w-10 text-right text-sm font-black text-primary">
                    {{ area.progreso }}%
                  </span>
                </div>
              </div>

              <div class="text-left sm:text-right">
                <span
                  class="inline-flex items-center gap-1 text-xs font-semibold"
                  :class="
                    area.progreso >= 75
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : area.progreso >= 65
                        ? 'text-primary'
                        : 'text-amber-700 dark:text-amber-400'
                  "
                >
                  <TrendingUp class="h-3.5 w-3.5" />
                  {{
                    area.progreso >= 75
                      ? "Alto desempeño"
                      : area.progreso >= 65
                        ? "En meta"
                        : "Requiere seguimiento"
                  }}
                </span>
              </div>
            </article>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-6">
        <Card class="overflow-hidden border-border bg-card shadow-sm">
          <CardContent class="p-0">
            <div class="border-b border-border bg-primary px-5 py-4 text-primary-foreground">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5B400]">
                    Plan corporativo
                  </p>
                  <h2 class="mt-1 text-lg font-black">Consumo de licencia</h2>
                </div>
                <ShieldCheck class="h-5 w-5 text-[#F5B400]" />
              </div>
            </div>

            <div class="p-5">
              <div class="flex items-center gap-5">
                <div class="relative grid h-24 w-24 shrink-0 place-items-center">
                  <svg class="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      class="stroke-muted"
                      stroke-width="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      class="stroke-primary"
                      stroke-width="10"
                      stroke-linecap="butt"
                      :stroke-dasharray="`${porcentajeLicencias * 2.64} 264`"
                    />
                  </svg>
                  <div class="absolute text-center">
                    <strong class="block text-xl font-black text-primary">
                      {{ porcentajeLicencias }}%
                    </strong>
                    <span class="text-[10px] text-muted-foreground">en uso</span>
                  </div>
                </div>

                <div class="min-w-0 flex-1 space-y-3">
                  <div class="border-l-4 border-l-primary bg-muted px-3 py-2.5">
                    <strong class="text-xl font-black text-foreground">
                      {{ consumoUsuarios?.utilizado ?? 0 }}
                    </strong>
                    <p class="text-xs text-muted-foreground">Licencias en uso</p>
                  </div>
                  <div class="border-l-4 border-l-[#F5B400] bg-[#FFFBEB] px-3 py-2.5 dark:bg-[#F5B400]/10">
                    <strong class="text-xl font-black text-foreground">
                      {{ licenciasDisponibles }}
                    </strong>
                    <p class="text-xs text-muted-foreground">Disponibles</p>
                  </div>
                </div>
              </div>

              <Button
                class="mt-5 w-full rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                variant="outline"
                @click="router.push('/organizacion/licencia')"
              >
                Gestionar licencia
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card class="border-border bg-card shadow-sm">
          <CardContent class="p-5">
            <div class="flex items-center gap-2">
              <AlertTriangle class="h-4 w-4 text-amber-600" />
              <h2 class="text-sm font-black text-foreground">Alertas operativas</h2>
            </div>
            <div class="mt-4 space-y-3">
              <div
                v-for="alerta in alertasOrganizacion"
                :key="alerta.id"
                class="border border-border bg-muted p-3"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-bold text-foreground">{{ alerta.titulo }}</p>
                  <Badge
                    variant="outline"
                    class="shrink-0 text-[10px]"
                    :class="clasePrioridad(alerta.prioridad)"
                  >
                    {{ alerta.prioridad }}
                  </Badge>
                </div>
                <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {{ alerta.detalle }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Asignaciones + actividad -->
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
      <Card class="overflow-hidden border-border bg-card shadow-sm">
        <CardContent class="p-0">
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
          >
            <div>
              <h2 class="text-lg font-black text-foreground">Asignaciones recientes</h2>
              <p class="mt-1 text-xs text-muted-foreground">
                Seguimiento de cumplimiento por curso y área
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="text-primary"
              @click="router.push('/organizacion/asignaciones')"
            >
              Ver todas
              <ArrowRight class="h-4 w-4" />
            </Button>
          </div>

          <div class="divide-y divide-border">
            <article
              v-for="asignacion in asignaciones"
              :key="asignacion.id"
              class="grid gap-4 px-5 py-4 lg:grid-cols-[auto_minmax(0,1fr)_180px]"
            >
              <div
                class="grid h-12 w-12 place-items-center bg-primary/10 text-primary"
              >
                <ClipboardList class="h-5 w-5" />
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-bold text-foreground">{{ asignacion.curso }}</h3>
                  <Badge
                    v-if="asignacion.obligatorio"
                    variant="outline"
                    class="border-red-200 bg-red-50 text-[10px] text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
                  >
                    Obligatorio
                  </Badge>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ asignacion.destino }}
                </p>
                <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock class="h-3.5 w-3.5" />
                  Vence: {{ asignacion.vence }}
                </p>
              </div>

              <div class="lg:text-right">
                <div class="flex items-center gap-3 lg:justify-end">
                  <Progress
                    :model-value="
                      porcentajeAsignacion(
                        asignacion.completados,
                        asignacion.asignados,
                      )
                    "
                    class="h-2 flex-1 lg:max-w-30"
                  />
                  <strong class="text-sm text-primary">
                    {{
                      porcentajeAsignacion(
                        asignacion.completados,
                        asignacion.asignados,
                      )
                    }}%
                  </strong>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ asignacion.completados }} de {{ asignacion.asignados }} completados
                </p>
              </div>
            </article>
          </div>
        </CardContent>
      </Card>

      <Card class="border-border bg-card shadow-sm">
        <CardContent class="p-5">
          <h2 class="text-lg font-black text-foreground">Actividad reciente</h2>
          <p class="mt-1 text-xs text-muted-foreground">
            Movimientos relevantes de tu organización
          </p>
          <div class="mt-5 space-y-5">
            <div
              v-for="evento in actividadOrganizacion"
              :key="evento.titulo"
              class="relative flex gap-3"
            >
              <span
                class="mt-1.5 h-2.5 w-2.5 shrink-0 bg-emerald-600 ring-4 ring-emerald-500/10 dark:bg-emerald-400"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold text-foreground">{{ evento.titulo }}</p>
                <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {{ evento.detalle }}
                </p>
              </div>
              <span class="shrink-0 text-[10px] text-muted-foreground">
                {{ evento.tiempo }}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
