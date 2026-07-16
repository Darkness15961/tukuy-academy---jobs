<script setup lang="ts">
import {
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Download,
  Wallet,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Skeleton from "primevue/skeleton";
import { useContextoSesion } from "@/composables/useContextoSesion";
import {
  docenteService,
  type MovimientoIngresoDocente,
} from "@/api/services/docente.service";

const { contextoActivo } = useContextoSesion();
const esIndependiente = computed(
  () =>
    contextoActivo.value?.ambitoDocencia === "INDEPENDIENTE" ||
    !contextoActivo.value?.organizacionId,
);
const cargando = ref(true);
const movimientos = ref<MovimientoIngresoDocente[]>([]);
const estado = ref("TODOS");
const movimientosVisibles = computed(() =>
  movimientos.value.filter(
    (movimiento) =>
      estado.value === "TODOS" || movimiento.estado === estado.value,
  ),
);
const total = computed(() =>
  movimientos.value.reduce((suma, movimiento) => suma + movimiento.importe, 0),
);
const disponible = computed(() =>
  movimientos.value
    .filter((movimiento) => movimiento.estado === "DISPONIBLE")
    .reduce((suma, movimiento) => suma + movimiento.importe, 0),
);
const porLiquidar = computed(() =>
  movimientos.value
    .filter((movimiento) => movimiento.estado === "POR_LIQUIDAR")
    .reduce((suma, movimiento) => suma + movimiento.importe, 0),
);

onMounted(async () => {
  try {
    movimientos.value = await docenteService.ingresos.listar();
  } finally {
    cargando.value = false;
  }
});

const moneda = (valor: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    valor,
  );

const indicadores = computed(() =>
  esIndependiente.value
    ? [
        { l: "Ventas registradas", v: moneda(total.value), ico: DollarSign },
        { l: "Saldo disponible", v: moneda(disponible.value), ico: Wallet },
        {
          l: "Operaciones",
          v: String(movimientos.value.length),
          ico: CreditCard,
        },
      ]
    : [
        {
          l: "Honorarios registrados",
          v: moneda(total.value),
          ico: DollarSign,
        },
        { l: "Por liquidar", v: moneda(porLiquidar.value), ico: Wallet },
        {
          l: "Liquidaciones",
          v: String(movimientos.value.length),
          ico: CreditCard,
        },
      ],
);

function descargarReporte() {
  const filas = [
    ["Fecha", "Curso", "Concepto", "Importe", "Estado"],
    ...movimientosVisibles.value.map((movimiento) => [
      movimiento.fecha,
      movimiento.curso,
      movimiento.concepto,
      movimiento.importe,
      movimiento.estado,
    ]),
  ];
  const csv = filas
    .map((fila) => fila.map((dato) => `"${dato}"`).join(","))
    .join("\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  enlace.download = "ingresos-docente.csv";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}
</script>
<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex justify-between">
      <div>
        <h1 class="text-2xl font-black">Ingresos</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {{
            esIndependiente
              ? "Ventas directas de tus cursos propios."
              : `Honorarios y liquidaciones de ${contextoActivo?.organizacionNombre}.`
          }}
        </p>
      </div>
      <Button variant="outline" @click="descargarReporte"
        ><Download class="h-4 w-4" />Descargar reporte</Button
      >
    </div>
    <div v-if="cargando" class="grid gap-4 md:grid-cols-3">
      <Skeleton v-for="item in 3" :key="item" class="h-36 w-full" />
    </div>
    <div v-else class="grid gap-4 md:grid-cols-3">
      <Card
        v-for="(i, idx) in indicadores"
        :key="i.l"
        class="overflow-hidden border-border bg-card"
        :class="
          idx === 1
            ? 'border-t-4 border-t-accent'
            : 'border-t-4 border-t-primary'
        "
        ><CardContent class="p-5"
          ><div class="flex justify-between">
            <component
              :is="i.ico"
              class="h-6 w-6"
              :class="idx === 1 ? 'text-accent' : 'text-primary'"
            /><span
              class="flex items-center text-xs text-emerald-600 dark:text-emerald-400"
              ><ArrowUpRight class="h-4 w-4" />12%</span
            >
          </div>
          <strong class="mt-5 block text-2xl text-foreground">{{ i.v }}</strong>
          <p class="text-xs text-muted-foreground">{{ i.l }}</p></CardContent
        ></Card
      >
    </div>
    <Card class="border-border bg-card"
      ><CardContent class="p-6"
        ><div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-black text-foreground">
            Últimos movimientos
          </h2>
          <select
            v-model="estado"
            class="h-10 border border-border bg-card px-3 text-sm"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="POR_LIQUIDAR">Por liquidar</option>
            <option value="PAGADO">Pagado</option>
          </select>
        </div>
        <div class="mt-5 divide-y divide-border">
          <div
            v-for="m in movimientosVisibles"
            :key="m.id"
            class="flex items-center justify-between py-4"
          >
            <div>
              <b class="text-sm">{{ m.curso }}</b>
              <p class="text-xs text-muted-foreground">
                {{ m.fecha }} · {{ m.concepto }} ·
                {{ m.estado.replace("_", " ") }}
              </p>
            </div>
            <strong class="text-emerald-700 dark:text-emerald-400"
              >+ {{ moneda(m.importe) }}</strong
            >
          </div>
        </div></CardContent
      ></Card
    >
  </section>
</template>
