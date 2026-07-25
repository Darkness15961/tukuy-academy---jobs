<script setup lang="ts">
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Building2,
  CircleDollarSign,
  HardDrive,
  ShieldAlert,
  ShoppingBag,
  TrendingUp,
  UsersRound,
  Video,
} from "lucide-vue-next";
import Column from "primevue/column";
import Chart from "primevue/chart";
import DataTable from "primevue/datatable";
import ProgressBar from "primevue/progressbar";
import Tag from "primevue/tag";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import PortadaPanel from "@/components/shared/PortadaPanel.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  administracionService,
  type CursoAdministrado,
  type FacturaAdministrada,
  type ResumenEcosistemaAdmin,
  type UsuarioAdministrado,
} from "@/api/services/administracion.service";
import {
  actividadMensual,
  type OrganizacionAdministrada,
} from "../data/administracion.mock";

const router = useRouter();
const cargando = ref(true);
const organizaciones = ref<OrganizacionAdministrada[]>([]);
const usuarios = ref<UsuarioAdministrado[]>([]);
const cursos = ref<CursoAdministrado[]>([]);
const facturas = ref<FacturaAdministrada[]>([]);
const ecosistema = ref<ResumenEcosistemaAdmin | null>(null);
const imagenesPortadaAdministracion = [
  "/img/portal-administracion.png",
  "/img/portada-planes-empresariales.png",
  "/img/portal-organizacion.png",
];

const formatoMoneda = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

onMounted(async () => {
  try {
    const panel = await administracionService.obtenerPanel();
    organizaciones.value = panel.organizaciones;
    usuarios.value = panel.usuarios;
    cursos.value = panel.cursos;
    facturas.value = panel.facturas;
    ecosistema.value = panel.ecosistema;
  } finally {
    cargando.value = false;
  }
});

const indicadores = computed(() => [
  {
    etiqueta: "Organizaciones activas",
    valor: organizaciones.value.filter((item) => item.estado === "ACTIVA").length,
    variacion: `${organizaciones.value.length} registradas`,
    icono: Building2,
    color: "text-primary",
    fondo: "bg-primary/10",
  },
  {
    etiqueta: "Usuarios activos",
    valor: usuarios.value.filter((item) => item.estado === "ACTIVO").length,
    variacion: `${usuarios.value.length} identidades`,
    icono: UsersRound,
    color: "text-teal-700 dark:text-teal-300",
    fondo: "bg-teal-500/10",
  },
  {
    etiqueta: "Cursos publicados",
    valor: cursos.value.filter((item) => item.estado === "APROBADO").length,
    variacion: `${cursos.value.filter((item) => item.estado !== "APROBADO").length} en revisión`,
    icono: BookOpenCheck,
    color: "text-foreground",
    fondo: "bg-muted",
  },
  {
    etiqueta: "Ingresos SaaS del mes",
    valor: formatoMoneda.format(
      facturas.value
        .filter((item) => item.estado === "PAGADA")
        .reduce((total, item) => total + item.total, 0),
    ),
    variacion: `${facturas.value.length} comprobantes B2B`,
    icono: CircleDollarSign,
    color: "text-amber-800 dark:text-amber-300",
    fondo: "bg-amber-500/10",
  },
]);

const indicadoresEcosistema = computed(() => {
  if (!ecosistema.value) return [];
  const { sesionesEnVivo, certificados, marketplace } = ecosistema.value;
  return [
    {
      etiqueta: "Clases en vivo",
      valor: `${sesionesEnVivo.hoy} hoy`,
      detalle: `${sesionesEnVivo.enVivo} en curso · ${sesionesEnVivo.programadas} programadas`,
      icono: Video,
    },
    {
      etiqueta: "Certificados",
      valor: String(certificados.emitidosMes),
      detalle: `${certificados.pendientesEmision} pendientes · ${certificados.verificacionesPublicas} verificaciones`,
      icono: Award,
    },
    {
      etiqueta: "Marketplace B2C",
      valor: formatoMoneda.format(marketplace.ingresosCursosPen),
      detalle: `${marketplace.ordenesMes} órdenes Izipay · ${marketplace.carritosAbiertos} carritos`,
      icono: ShoppingBag,
    },
  ];
});

const pendientesRevision = computed(() =>
  cursos.value.filter((curso) => curso.estado !== "APROBADO"),
);
const organizacionesAtencion = computed(() =>
  organizaciones.value.filter(
    (organizacion) =>
      organizacion.estado === "POR_VENCER" ||
      organizacion.estado === "SUSPENDIDA" ||
      organizacion.estado === "PRUEBA",
  ),
);

const consumo = computed(() =>
  [
    { etiqueta: "Almacenamiento", actual: 618, limite: 1000, unidad: "GB" },
    { etiqueta: "Horas de video", actual: 8420, limite: 12000, unidad: "h" },
    {
      etiqueta: "Sesiones en vivo",
      actual: ecosistema.value?.sesionesEnVivo.finalizadasMes ?? 86,
      limite: 200,
      unidad: "mes",
    },
  ].map((item) => ({
    ...item,
    porcentaje: Math.round((item.actual / item.limite) * 100),
  })),
);

const datosGraficoActividad = computed(() => ({
  labels: actividadMensual.map((item) => item.mes),
  datasets: [
    {
      type: "bar",
      label: "Ingresos",
      data: actividadMensual.map((item) => item.ingresos),
      yAxisID: "ingresos",
      backgroundColor: "rgba(11, 58, 120, 0.9)",
      hoverBackgroundColor: "#071F52",
      borderColor: "#0B3A78",
      borderWidth: 0,
      borderRadius: 2,
      borderSkipped: false,
      maxBarThickness: 48,
    },
    {
      type: "line",
      label: "Usuarios activos",
      data: actividadMensual.map((item) => item.usuarios),
      yAxisID: "usuarios",
      borderColor: "#F5B400",
      backgroundColor: "#F5B400",
      pointBackgroundColor: "#FFFFFF",
      pointBorderColor: "#F5B400",
      pointBorderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.38,
    },
  ],
}));

const opcionesGraficoActividad = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  animation: { duration: 750 },
  plugins: {
    legend: {
      position: "top",
      align: "end",
      labels: {
        color: "#52657A",
        usePointStyle: true,
        pointStyle: "rect",
        boxWidth: 8,
        boxHeight: 8,
        padding: 18,
        font: { size: 11, weight: 700 },
      },
    },
    tooltip: {
      backgroundColor: "#07152B",
      titleColor: "#FFFFFF",
      bodyColor: "#FFFFFF",
      padding: 12,
      displayColors: true,
      callbacks: {
        label(contexto: { dataset: { yAxisID?: string; label?: string }; raw: unknown }) {
          return contexto.dataset.yAxisID === "ingresos"
            ? `${contexto.dataset.label}: ${formatoMoneda.format(Number(contexto.raw))}`
            : `${contexto.dataset.label}: ${Number(contexto.raw).toLocaleString("es-PE")}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: "#64748B", font: { size: 11, weight: 700 } },
    },
    ingresos: {
      position: "left",
      beginAtZero: true,
      grid: { color: "rgba(203, 213, 225, 0.5)" },
      border: { display: false },
      ticks: {
        color: "#64748B",
        callback(valor: string | number) {
          return `S/ ${Math.round(Number(valor) / 1000)} mil`;
        },
      },
    },
    usuarios: {
      position: "right",
      beginAtZero: true,
      grid: { drawOnChartArea: false },
      border: { display: false },
      ticks: {
        color: "#A16F00",
        callback(valor: string | number) {
          return Number(valor).toLocaleString("es-PE");
        },
      },
    },
  },
};

function severidadEstado(estado: string) {
  if (estado === "SUSPENDIDA") return "danger";
  if (estado === "POR_VENCER") return "warn";
  return "info";
}

function textoModalidad(modalidad: string) {
  return {
    VIRTUAL: "Virtual",
    EN_VIVO: "En vivo",
    HIBRIDA: "Híbrida",
    MIXTO: "Mixto",
  }[modalidad] ?? modalidad;
}
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <PortadaPanel
      :imagenes="imagenesPortadaAdministracion"
      etiqueta="Operación global"
      titulo="Tukuy Academy en tiempo real"
      descripcion="Supervisa SaaS B2B, marketplace B2C, clases en vivo, certificados y el resto del ecosistema desde un único centro de control."
      texto-accion="Ver ecosistema"
      :icono-accion="ArrowRight"
      etiqueta-accesible="Resumen de la administración global"
      @accion="router.push('/admin/ecosistema')"
    />

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="indicador in indicadores"
        :key="indicador.etiqueta"
        class="border-border bg-card"
      >
        <CardContent class="flex items-center gap-4 p-5">
          <div
            class="grid h-12 w-12 shrink-0 place-items-center"
            :class="[indicador.fondo, indicador.color]"
          >
            <component :is="indicador.icono" class="h-6 w-6" />
          </div>
          <div class="min-w-0">
            <strong class="block text-2xl font-black">{{
              indicador.valor
            }}</strong>
            <p class="truncate text-xs text-muted-foreground">
              {{ indicador.etiqueta }}
            </p>
            <p
              class="mt-1 flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-300"
            >
              <TrendingUp class="h-3 w-3" /> {{ indicador.variacion }}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card class="border-border bg-card">
      <CardContent class="p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-black">Pulso del ecosistema</h2>
            <p class="mt-1 text-xs text-muted-foreground">
              Clases en vivo, certificados verificables y compras individuales
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            @click="router.push('/admin/ecosistema')"
          >
            Abrir operación
          </Button>
        </div>
        <div v-if="cargando" class="mt-5 grid gap-3 md:grid-cols-3">
          <Skeleton v-for="item in 3" :key="item" class="h-24 w-full" />
        </div>
        <div v-else class="mt-5 grid gap-3 md:grid-cols-3">
          <div
            v-for="item in indicadoresEcosistema"
            :key="item.etiqueta"
            class="border border-border bg-muted/30 p-4"
          >
            <div class="flex items-center gap-2 text-primary">
              <component :is="item.icono" class="h-4 w-4" />
              <span class="text-xs font-bold uppercase tracking-wide">{{
                item.etiqueta
              }}</span>
            </div>
            <strong class="mt-2 block text-xl font-black">{{ item.valor }}</strong>
            <p class="mt-1 text-xs text-muted-foreground">{{ item.detalle }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <Card class="border-border bg-card">
        <CardContent class="p-5 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-black">Crecimiento de ingresos</h2>
              <p class="mt-1 text-xs text-muted-foreground">
                Facturación SaaS mensual consolidada
              </p>
            </div>
            <span
              class="bg-teal-500/10 px-3 py-1 text-xs font-black text-teal-800 dark:text-teal-300"
              >+49.9% en 6 meses</span
            >
          </div>
          <div v-if="cargando" class="mt-6">
            <Skeleton class="h-72 w-full" />
          </div>
          <div v-else class="mt-5 h-72 w-full">
            <Chart
              type="bar"
              :data="datosGraficoActividad"
              :options="opcionesGraficoActividad"
              class="h-full w-full"
              :canvas-props="{
                role: 'img',
                'aria-label':
                  'Evolución mensual de ingresos y usuarios activos de Tukuy Academy',
              }"
            />
          </div>
        </CardContent>
      </Card>

      <Card class="border-border bg-card">
        <CardContent class="p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <HardDrive class="h-5 w-5 text-primary" />
            <div>
              <h2 class="text-lg font-black">Capacidad de plataforma</h2>
              <p class="text-xs text-muted-foreground">Consumo global del mes</p>
            </div>
          </div>
          <div v-if="cargando" class="mt-6 space-y-5">
            <Skeleton v-for="item in 3" :key="item" class="h-14 w-full" />
          </div>
          <div v-else class="mt-6 space-y-6">
            <div v-for="item in consumo" :key="item.etiqueta">
              <div class="flex items-end justify-between gap-3 text-sm">
                <span class="font-bold">{{ item.etiqueta }}</span>
                <span class="flex items-center gap-3 text-xs text-muted-foreground">
                  {{ item.actual.toLocaleString("es-PE") }} /
                  {{ item.limite.toLocaleString("es-PE") }} {{ item.unidad }}
                  <strong class="bg-primary/10 px-2 py-1 text-primary">
                    {{ item.porcentaje }}%
                  </strong>
                </span>
              </div>
              <ProgressBar
                :value="item.porcentaje"
                :show-value="false"
                class="mt-2 h-2"
              />
            </div>
          </div>
          <div
            class="mt-7 border-l-4 border-l-amber-500 bg-amber-500/10 p-4 dark:border-l-amber-400"
          >
            <div class="flex gap-3">
              <ShieldAlert class="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <p class="text-xs leading-5 text-amber-950 dark:text-amber-100">
                Dos licencias requieren atención antes de finalizar julio. El
                marketplace B2C reporta
                {{ ecosistema?.marketplace.pagosIzipayFallidos ?? 0 }} pagos
                fallidos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 2xl:grid-cols-2">
      <Card class="overflow-hidden border-border bg-card">
        <CardContent class="p-0">
          <div
            class="flex items-center justify-between border-b border-border px-5 py-4"
          >
            <div>
              <h2 class="font-black">Cursos pendientes de revisión</h2>
              <p class="text-xs text-muted-foreground">
                Cola editorial · modalidad, precio y certificado
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              @click="router.push('/admin/cursos')"
              >Ver cola</Button
            >
          </div>
          <div v-if="cargando" class="space-y-2 p-4">
            <Skeleton v-for="item in 3" :key="item" class="h-12 w-full" />
          </div>
          <DataTable
            v-else
            class="tabla-administracion"
            :value="pendientesRevision"
            size="small"
            data-key="id"
            scrollable
            resizable-columns
            column-resize-mode="fit"
            removable-sort
            table-style="min-width: 42rem"
          >
            <Column field="titulo" header="Curso" style="min-width: 15rem">
              <template #body="{ data }"
                ><strong>{{ data.titulo }}</strong>
                <p class="text-xs text-muted-foreground">
                  {{ textoModalidad(data.modalidad) }}
                  <span v-if="data.certificado"> · Certificado</span>
                </p>
              </template>
            </Column>
            <Column field="docente" header="Docente" style="min-width: 10rem" />
            <Column field="estado" header="Estado" style="min-width: 8rem">
              <template #body="{ data }"
                ><Tag
                  :severity="data.estado === 'OBSERVADO' ? 'warn' : 'info'"
                  :value="
                    data.estado === 'OBSERVADO' ? 'Observado' : 'En revisión'
                  "
              /></template>
            </Column>
          </DataTable>
        </CardContent>
      </Card>

      <Card class="overflow-hidden border-border bg-card">
        <CardContent class="p-0">
          <div
            class="flex items-center justify-between border-b border-border px-5 py-4"
          >
            <div>
              <h2 class="font-black">Organizaciones que requieren atención</h2>
              <p class="text-xs text-muted-foreground">
                Pruebas, vencimientos y suspensiones
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              @click="router.push('/admin/organizaciones')"
              >Gestionar</Button
            >
          </div>
          <div v-if="cargando" class="space-y-2 p-4">
            <Skeleton v-for="item in 3" :key="item" class="h-12 w-full" />
          </div>
          <DataTable
            v-else
            class="tabla-administracion"
            :value="organizacionesAtencion"
            size="small"
            data-key="id"
            scrollable
            resizable-columns
            column-resize-mode="fit"
            removable-sort
            table-style="min-width: 36rem"
          >
            <Column
              field="nombre"
              header="Organización"
              style="min-width: 15rem"
            >
              <template #body="{ data }"
                ><strong>{{ data.nombre }}</strong></template
              >
            </Column>
            <Column field="plan" header="Plan" style="min-width: 10rem" />
            <Column field="estado" header="Estado" style="min-width: 8rem">
              <template #body="{ data }"
                ><Tag
                  :severity="severidadEstado(data.estado)"
                  :value="data.estado.replace('_', ' ')"
              /></template>
            </Column>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
