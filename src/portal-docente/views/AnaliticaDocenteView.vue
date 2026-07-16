<script setup lang="ts">
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  CalendarRange,
  Clock3,
  Download,
  Star,
  TrendingUp,
  UsersRound,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Skeleton from "primevue/skeleton";
import { docenteService, type AnaliticaDocente } from "@/api/services/docente.service";
import { analiticaDocente } from "../data/docente.mock";

const router = useRouter();
const periodo = ref("30d");
const cargando = ref(true);
const analitica = reactive<AnaliticaDocente>(
  JSON.parse(JSON.stringify(analiticaDocente)) as AnaliticaDocente,
);

onMounted(async () => {
  try {
    Object.assign(
      analitica,
      await docenteService.obtenerAnalitica(periodo.value),
    );
  } finally {
    cargando.value = false;
  }
});

watch(periodo, async (nuevoPeriodo) => {
  cargando.value = true;
  try {
    Object.assign(
      analitica,
      await docenteService.obtenerAnalitica(nuevoPeriodo),
    );
  } finally {
    cargando.value = false;
  }
});

const iconosKpi: Record<string, typeof UsersRound> = {
  estudiantes: UsersRound,
  finalizacion: TrendingUp,
  horas: Clock3,
  certificados: Award,
  satisfaccion: Star,
  riesgo: AlertTriangle,
};

const fondosKpi: Record<string, string> = {
  estudiantes: "bg-primary/10 text-primary",
  finalizacion: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  horas: "bg-accent/15 text-[#B87A00] dark:text-accent",
  certificados: "bg-violet-50 text-violet-700",
  satisfaccion: "bg-accent/20 text-[#B87A00] dark:text-accent",
  riesgo: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const maxActividad = computed(() =>
  Math.max(...analitica.actividadSemanal.map((d) => d.activos)),
);

const totalEstados = computed(() =>
  analitica.distribucionEstados.reduce((t, e) => t + e.cantidad, 0),
);

const conicGradient = computed(() => {
  let acumulado = 0;
  const segmentos = analitica.distribucionEstados.map((item) => {
    const inicio = acumulado;
    const porcentaje = (item.cantidad / totalEstados.value) * 100;
    acumulado += porcentaje;
    return `${item.color} ${inicio}% ${acumulado}%`;
  });
  return `conic-gradient(${segmentos.join(", ")})`;
});

const puntosTendencia = computed(() => {
  const datos = analitica.tendenciaMensual;
  const max = Math.max(
    ...datos.flatMap((d) => [d.inscripciones, d.finalizaciones]),
  );
  const ancho = 520;
  const alto = 180;
  const padding = 24;
  const paso = (ancho - padding * 2) / (datos.length - 1);

  const inscripciones = datos
    .map((d, i) => {
      const x = padding + i * paso;
      const y = alto - padding - (d.inscripciones / max) * (alto - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const finalizaciones = datos
    .map((d, i) => {
      const x = padding + i * paso;
      const y =
        alto - padding - (d.finalizaciones / max) * (alto - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return { inscripciones, finalizaciones, ancho, alto, datos, max };
});

function formatoEstado(estado: string) {
  return estado.replace("_", " ");
}

function exportarReporte() {
  const filas = [
    ["Indicador", "Valor", "Variación"],
    ...analitica.kpis.map((k) => [k.etiqueta, k.valor, k.variacion]),
  ];
  const csv = filas.map((f) => f.join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "analitica-academica.csv";
  enlace.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div v-if="cargando" class="grid gap-5">
      <Skeleton class="h-28 w-full" />
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton v-for="item in 6" :key="item" class="h-32 w-full" />
      </div>
      <Skeleton class="h-96 w-full" />
    </div>
    <template v-else>
      <div
        class="flex flex-wrap items-end justify-between gap-4 border-t-4 border-[#F5B400] bg-linear-to-r from-[#071F52] to-[#0B3A78] p-6 text-white sm:p-8"
      >
        <div>
          <p class="text-xs font-black uppercase tracking-[.2em] text-accent">
            Panel de desempeño
          </p>
          <h1 class="mt-2 text-2xl font-black sm:text-3xl">
            Analítica académica
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
            Monitorea participación, finalización, certificación y estudiantes
            que necesitan seguimiento en todos tus cursos publicados.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <div
            class="flex items-center gap-2 border border-white/20 bg-card/10 px-3 py-2 text-sm"
          >
            <CalendarRange class="h-4 w-4 text-accent" />
            <select
              v-model="periodo"
              class="bg-transparent font-bold outline-none"
            >
              <option value="7d" class="text-foreground">Últimos 7 días</option>
              <option value="30d" class="text-foreground">
                Últimos 30 días
              </option>
              <option value="90d" class="text-foreground">
                Últimos 90 días
              </option>
              <option value="anio" class="text-foreground">Este año</option>
            </select>
          </div>
          <Button
            class="h-11 rounded-none bg-card text-primary hover:bg-primary/10"
            @click="exportarReporte"
          >
            <Download class="h-4 w-4" />
            Exportar reporte
          </Button>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Card
          v-for="kpi in analitica.kpis"
          :key="kpi.id"
          class="border-border bg-card shadow-sm"
        >
          <CardContent class="p-5">
            <div class="flex items-start justify-between gap-3">
              <span
                class="grid h-10 w-10 place-items-center"
                :class="fondosKpi[kpi.id]"
              >
                <component :is="iconosKpi[kpi.id]" class="h-5 w-5" />
              </span>
              <span
                class="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600"
              >
                <ArrowUpRight
                  v-if="kpi.tendencia === 'sube'"
                  class="h-3.5 w-3.5"
                />
                <ArrowDownRight v-else class="h-3.5 w-3.5" />
                {{ kpi.variacion }}
              </span>
            </div>
            <strong class="mt-4 block text-2xl font-black text-foreground">
              {{ kpi.valor }}
            </strong>
            <p class="mt-1 text-xs font-bold text-muted-foreground">
              {{ kpi.etiqueta }}
            </p>
            <p class="mt-2 text-[11px] leading-4 text-muted-foreground">
              {{ kpi.detalle }}
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Card class="border-border bg-card shadow-sm">
          <CardContent class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-lg font-black">Actividad semanal</h2>
                <p class="mt-1 text-xs text-muted-foreground">
                  Estudiantes activos y sesiones por día
                </p>
              </div>
              <Badge
                variant="outline"
                class="rounded-none border-border text-primary"
              >
                {{ analitica.periodo }}
              </Badge>
            </div>

            <div class="mt-8 flex h-56 items-end gap-2 sm:gap-3">
              <div
                v-for="dia in analitica.actividadSemanal"
                :key="dia.dia"
                class="group flex flex-1 flex-col items-center"
              >
                <span class="mb-2 text-[10px] font-bold text-primary">
                  {{ dia.activos }}%
                </span>
                <div class="relative flex h-40 w-full items-end justify-center">
                  <div
                    class="w-full max-w-10 bg-border transition-all group-hover:opacity-80"
                    :style="{ height: `${(dia.sesiones / 30) * 100}%` }"
                  />
                  <div
                    class="absolute bottom-0 w-full max-w-10 bg-linear-to-t from-primary to-blue-500"
                    :style="{
                      height: `${(dia.activos / maxActividad) * 100}%`,
                    }"
                  />
                </div>
                <span class="mt-2 text-xs font-bold text-muted-foreground">
                  {{ dia.dia }}
                </span>
                <span class="text-[10px] text-muted-foreground">
                  {{ dia.sesiones }} ses.
                </span>
              </div>
            </div>

            <div
              class="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-xs"
            >
              <span class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 bg-primary" />
                Estudiantes activos
              </span>
              <span class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 bg-border" />
                Sesiones en vivo
              </span>
            </div>
          </CardContent>
        </Card>

        <Card class="border-border bg-card shadow-sm">
          <CardContent class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-lg font-black">Tendencia de inscripciones</h2>
                <p class="mt-1 text-xs text-muted-foreground">
                  Inscripciones vs. finalizaciones por mes
                </p>
              </div>
              <BarChart3 class="h-5 w-5 text-primary" />
            </div>

            <div class="mt-4 overflow-x-auto">
              <svg
                :viewBox="`0 0 ${puntosTendencia.ancho} ${puntosTendencia.alto}`"
                class="w-full min-w-[320px]"
                role="img"
                aria-label="Gráfico de tendencia mensual"
              >
                <line
                  :x1="24"
                  :y1="puntosTendencia.alto - 24"
                  :x2="puntosTendencia.ancho - 24"
                  :y2="puntosTendencia.alto - 24"
                  stroke="#E2E8F0"
                  stroke-width="1"
                />
                <polyline
                  :points="puntosTendencia.inscripciones"
                  fill="none"
                  stroke="#0B3A78"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
                <polyline
                  :points="puntosTendencia.finalizaciones"
                  fill="none"
                  stroke="#F5B400"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </svg>
            </div>

            <div
              class="mt-2 flex justify-between gap-2 px-1 text-[10px] font-bold text-muted-foreground"
            >
              <span
                v-for="mes in puntosTendencia.datos"
                :key="mes.mes"
                class="flex-1 text-center"
              >
                {{ mes.mes }}
              </span>
            </div>

            <div
              class="mt-4 flex flex-wrap gap-4 border-t border-border pt-4 text-xs"
            >
              <span class="flex items-center gap-2">
                <span class="h-0.5 w-5 bg-primary" />
                Inscripciones
              </span>
              <span class="flex items-center gap-2">
                <span class="h-0.5 w-5 bg-accent" />
                Finalizaciones
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card class="border-border bg-card shadow-sm">
          <CardContent class="p-5 sm:p-6">
            <h2 class="text-lg font-black">Embudo de aprendizaje</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Conversión desde inscripción hasta certificación
            </p>

            <div class="mt-6 grid gap-3">
              <div
                v-for="etapa in analitica.embudoAprendizaje"
                :key="etapa.etapa"
                class="grid gap-2"
              >
                <div class="flex items-center justify-between gap-3 text-sm">
                  <span class="font-bold text-foreground">{{
                    etapa.etapa
                  }}</span>
                  <span class="text-xs text-muted-foreground">
                    <strong class="text-primary">{{ etapa.valor }}</strong>
                    · {{ etapa.porcentaje }}%
                  </span>
                </div>
                <div class="h-2 overflow-hidden bg-border">
                  <div
                    class="h-full bg-linear-to-r from-primary to-blue-500 transition-all"
                    :style="{ width: `${etapa.porcentaje}%` }"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="border-border bg-card shadow-sm">
          <CardContent class="p-5 sm:p-6">
            <h2 class="text-lg font-black">Estado de estudiantes</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Distribución actual del cohorte
            </p>

            <div
              class="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start"
            >
              <div
                class="relative grid h-36 w-36 shrink-0 place-items-center"
                :style="{ background: conicGradient }"
              >
                <div
                  class="grid h-24 w-24 place-items-center bg-card text-center"
                >
                  <strong class="text-2xl font-black text-foreground">
                    {{ totalEstados }}
                  </strong>
                  <span class="text-[10px] font-bold text-muted-foreground"
                    >total</span
                  >
                </div>
              </div>

              <div class="grid w-full flex-1 gap-3">
                <div
                  v-for="item in analitica.distribucionEstados"
                  :key="item.estado"
                  class="flex items-center justify-between gap-3 border border-border p-3"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="h-2.5 w-2.5 shrink-0"
                      :style="{ background: item.color }"
                    />
                    <span class="text-sm font-bold">
                      {{ formatoEstado(item.estado) }}
                    </span>
                  </div>
                  <div class="text-right">
                    <strong class="text-sm">{{ item.cantidad }}</strong>
                    <p class="text-[10px] text-muted-foreground">
                      {{ Math.round((item.cantidad / totalEstados) * 100) }}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card class="border-border bg-card shadow-sm">
        <CardContent class="p-0">
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:p-6"
          >
            <div>
              <h2 class="text-lg font-black">Rendimiento por curso</h2>
              <p class="mt-1 text-xs text-muted-foreground">
                Comparativa de finalización, progreso y certificación
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="text-primary"
              @click="router.push('/docente/cursos')"
            >
              Ver cursos
            </Button>
          </div>

          <DataTable
            class="tabla-administracion"
            :value="analitica.rendimientoCursos"
            data-key="id"
            size="small"
            scrollable
            resizable-columns
            column-resize-mode="fit"
            removable-sort
            :paginator="analitica.rendimientoCursos.length > 5"
            :rows="5"
            :rows-per-page-options="[5, 10, 20]"
            paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            current-page-report-template="{first}–{last} de {totalRecords} cursos"
            :always-show-paginator="false"
            table-style="min-width: 68rem"
          >
            <Column
              field="nombre"
              header="Curso"
              sortable
              style="min-width: 18rem"
            >
              <template #body="{ data: curso }">
                <div class="flex items-center gap-3">
                  <span
                    class="grid h-9 w-9 place-items-center bg-primary/10 text-primary"
                  >
                    <BookOpen class="h-4 w-4" />
                  </span>
                  <strong class="max-w-xs leading-snug">{{
                    curso.nombre
                  }}</strong>
                </div>
              </template>
            </Column>
            <Column
              field="estudiantes"
              header="Estudiantes"
              sortable
              style="min-width: 9rem"
            />
            <Column
              field="progresoMedio"
              header="Progreso medio"
              sortable
              style="min-width: 13rem"
            >
              <template #body="{ data: curso }">
                <div class="flex min-w-28 items-center gap-2">
                  <Progress
                    :model-value="curso.progresoMedio"
                    class="h-1.5 flex-1"
                  />
                  <span class="text-xs font-bold"
                    >{{ curso.progresoMedio }}%</span
                  >
                </div>
              </template>
            </Column>
            <Column
              field="finalizacion"
              header="Finalización"
              sortable
              style="min-width: 10rem"
            >
              <template #body="{ data: curso }">
                <Badge
                  variant="outline"
                  class="rounded-none border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                >
                  {{ curso.finalizacion }}%
                </Badge>
              </template>
            </Column>
            <Column
              field="horas"
              header="Horas"
              sortable
              style="min-width: 7rem"
            >
              <template #body="{ data: curso }">{{ curso.horas }} h</template>
            </Column>
            <Column
              field="certificados"
              header="Certificados"
              sortable
              style="min-width: 9rem"
            />
            <Column
              field="valoracion"
              header="Valoración"
              sortable
              style="min-width: 9rem"
            >
              <template #body="{ data: curso }">
                <span
                  class="inline-flex items-center gap-1 font-bold text-[#B87A00] dark:text-accent"
                >
                  <Star class="h-3.5 w-3.5 fill-current" />
                  {{ curso.valoracion }}
                </span>
              </template>
            </Column>
          </DataTable>
        </CardContent>
      </Card>

      <div class="grid gap-6 xl:grid-cols-3">
        <Card class="border-border bg-card shadow-sm">
          <CardContent class="p-5 sm:p-6">
            <h2 class="text-lg font-black">Por organización</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Desempeño por empresa o institución
            </p>
            <div class="mt-5 grid gap-4">
              <div
                v-for="org in analitica.organizaciones"
                :key="org.nombre"
                class="border border-border p-4"
              >
                <div class="flex items-start justify-between gap-2">
                  <strong class="text-sm leading-snug">{{ org.nombre }}</strong>
                  <span class="text-xs font-bold text-primary">
                    {{ org.finalizacion }}%
                  </span>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ org.estudiantes }} estudiantes
                </p>
                <div class="mt-3 h-1.5 bg-border">
                  <div
                    class="h-full bg-primary"
                    :style="{ width: `${org.finalizacion}%` }"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="border-border bg-card shadow-sm">
          <CardContent class="p-5 sm:p-6">
            <h2 class="text-lg font-black">Horas pico de estudio</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Franjas con mayor actividad de aprendizaje
            </p>
            <div class="mt-6 grid gap-3">
              <div
                v-for="franja in analitica.horasPico"
                :key="franja.franja"
                class="grid grid-cols-[56px_1fr_40px] items-center gap-3"
              >
                <span class="text-xs font-bold text-muted-foreground">
                  {{ franja.franja }}
                </span>
                <div class="h-2 bg-border">
                  <div
                    class="h-full"
                    :class="
                      franja.porcentaje >= 24 ? 'bg-accent' : 'bg-primary'
                    "
                    :style="{ width: `${franja.porcentaje * 3}%` }"
                  />
                </div>
                <span class="text-right text-xs font-bold"
                  >{{ franja.porcentaje }}%</span
                >
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="border-border bg-card shadow-sm">
          <CardContent class="p-5 sm:p-6">
            <h2 class="text-lg font-black">Módulos con mayor avance</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Completitud y tiempo medio por módulo
            </p>
            <div class="mt-5 grid gap-4">
              <div
                v-for="modulo in analitica.modulosDestacados"
                :key="modulo.modulo"
              >
                <div class="flex items-center justify-between gap-2 text-sm">
                  <span class="font-bold leading-snug">{{
                    modulo.modulo
                  }}</span>
                  <span class="text-xs font-bold text-primary">
                    {{ modulo.completado }}%
                  </span>
                </div>
                <div class="mt-2 h-1.5 bg-border">
                  <div
                    class="h-full bg-linear-to-r from-primary to-accent"
                    :style="{ width: `${modulo.completado}%` }"
                  />
                </div>
                <p class="mt-1 text-[10px] text-muted-foreground">
                  Tiempo medio: {{ modulo.tiempoMedio }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card class="border-border border-l-4 border-l-red-500 bg-card shadow-sm">
        <CardContent class="p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-black">
                Estudiantes que requieren atención
              </h2>
              <p class="mt-1 text-xs text-muted-foreground">
                Seguimiento prioritario por baja actividad o progreso estancado
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="rounded-none"
              @click="router.push('/docente/estudiantes')"
            >
              Ver todos los estudiantes
            </Button>
          </div>

          <div class="mt-5 grid gap-3 lg:grid-cols-3">
            <article
              v-for="estudiante in analitica.estudiantesEnRiesgo"
              :key="estudiante.nombre"
              class="flex items-start gap-4 border border-red-500/30 bg-red-500/10 p-4"
            >
              <span
                class="grid h-10 w-10 shrink-0 place-items-center bg-red-100 text-xs font-black text-red-700 dark:text-red-400"
              >
                {{ estudiante.iniciales }}
              </span>
              <div class="min-w-0 flex-1">
                <strong class="block truncate">{{ estudiante.nombre }}</strong>
                <p class="mt-0.5 truncate text-xs text-muted-foreground">
                  {{ estudiante.curso }}
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    class="rounded-none border-red-200 bg-card text-red-700 dark:text-red-400"
                  >
                    {{ estudiante.progreso }}% progreso
                  </Badge>
                  <span class="text-[10px] text-muted-foreground">
                    {{ estudiante.ultimoAcceso }}
                  </span>
                </div>
                <p
                  class="mt-2 text-[11px] font-bold text-red-700 dark:text-red-400"
                >
                  {{ estudiante.motivo }}
                </p>
              </div>
            </article>
          </div>
        </CardContent>
      </Card>
    </template>
  </section>
</template>
