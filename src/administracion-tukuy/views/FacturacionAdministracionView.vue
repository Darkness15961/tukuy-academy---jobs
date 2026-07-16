<script setup lang="ts">
import {
  CircleDollarSign,
  Download,
  ReceiptText,
  Search,
  TriangleAlert,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { computed, onMounted, ref } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  administracionService,
  type FacturaAdministrada,
} from "@/api/services/administracion.service";

const cargando = ref(true);
const facturas = ref<FacturaAdministrada[]>([]);
const busqueda = ref("");
const estado = ref("TODOS");
const mensaje = ref("");

onMounted(async () => {
  try {
    facturas.value = await administracionService.facturas.listar();
  } finally {
    cargando.value = false;
  }
});

const filtradas = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  return facturas.value.filter(
    (factura) =>
      (!termino ||
        [factura.id, factura.organizacion, factura.concepto].some((valor) =>
          valor.toLowerCase().includes(termino),
        )) &&
      (estado.value === "TODOS" || factura.estado === estado.value),
  );
});

const resumen = computed(() => ({
  facturado: facturas.value.reduce(
    (total, factura) => total + factura.total,
    0,
  ),
  cobrado: facturas.value
    .filter((factura) => factura.estado === "PAGADA")
    .reduce((total, factura) => total + factura.total, 0),
  pendiente: facturas.value
    .filter((factura) => factura.estado !== "PAGADA")
    .reduce((total, factura) => total + factura.total, 0),
}));

function dinero(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(valor);
}

function severidad(valor: string) {
  if (valor === "PAGADA") return "success";
  if (valor === "VENCIDA") return "danger";
  return "warn";
}

async function marcarPagada(factura: FacturaAdministrada) {
  factura.estado = "PAGADA";
  await administracionService.facturas.actualizar(factura.id, {
    estado: "PAGADA",
  });
  mensaje.value = `${factura.id} fue conciliada como pagada.`;
}
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[.2em] text-violet-700">
          Control financiero
        </p>
        <h1 class="mt-2 text-3xl font-black">Facturación</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Consolida cobros de licencias, vencimientos y conciliación de pagos.
        </p>
      </div>
      <Button
        variant="outline"
        @click="mensaje = 'El reporte financiero fue preparado para descarga.'"
        ><Download class="h-4 w-4" /> Exportar reporte</Button
      >
    </div>

    <div
      v-if="mensaje"
      class="border-l-4 border-l-teal-600 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
    >
      {{ mensaje }}
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <Skeleton
        v-if="cargando"
        v-for="item in 3"
        :key="item"
        class="h-24 w-full"
      />
      <Card
        v-else
        v-for="item in [
          {
            e: 'Facturado en julio',
            v: dinero(resumen.facturado),
            i: ReceiptText,
            c: 'text-blue-700',
            f: 'bg-primary/10',
          },
          {
            e: 'Cobrado',
            v: dinero(resumen.cobrado),
            i: CircleDollarSign,
            c: 'text-teal-700',
            f: 'bg-teal-50',
          },
          {
            e: 'Pendiente de cobro',
            v: dinero(resumen.pendiente),
            i: TriangleAlert,
            c: 'text-amber-700',
            f: 'bg-amber-50',
          },
        ]"
        :key="item.e"
        class="border-border bg-card"
        ><CardContent class="flex items-center gap-4 p-5"
          ><div
            class="grid h-11 w-11 place-items-center"
            :class="[item.f, item.c]"
          >
            <component :is="item.i" class="h-5 w-5" />
          </div>
          <div>
            <strong class="text-2xl font-black">{{ item.v }}</strong>
            <p class="text-xs text-muted-foreground">{{ item.e }}</p>
          </div></CardContent
        ></Card
      >
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div
          class="grid gap-3 border-b border-border p-5 md:grid-cols-[1fr_16rem]"
        >
          <label class="relative"
            ><Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><InputText
              v-model="busqueda"
              class="filtro-control w-full pl-10"
              placeholder="Buscar comprobante, organización o concepto" /></label
          ><Select
            v-model="estado"
            :options="[
              { label: 'Todos los estados', value: 'TODOS' },
              { label: 'Pagada', value: 'PAGADA' },
              { label: 'Pendiente', value: 'PENDIENTE' },
              { label: 'Vencida', value: 'VENCIDA' },
            ]"
            option-label="label"
            option-value="value"
            class="filtro-control w-full"
          />
        </div>
        <div v-if="cargando" class="space-y-2 p-5">
          <Skeleton v-for="item in 5" :key="item" class="h-12 w-full" />
        </div>
        <DataTable
          v-else
          class="tabla-administracion"
          :value="filtradas"
          data-key="id"
          size="small"
          scrollable
          resizable-columns
          column-resize-mode="fit"
          removable-sort
          :paginator="filtradas.length > 5"
          :rows="5"
          :rows-per-page-options="[5, 10, 20]"
          paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          current-page-report-template="{first}–{last} de {totalRecords} comprobantes"
          :always-show-paginator="false"
          table-style="min-width: 78rem"
        >
          <Column
            field="id"
            header="Comprobante"
            sortable
            style="min-width: 12rem"
            ><template #body="{ data }"
              ><strong>{{ data.id }}</strong></template
            ></Column
          >
          <Column
            field="organizacion"
            header="Organización"
            sortable
            style="min-width: 16rem"
          />
          <Column
            field="concepto"
            header="Concepto"
            sortable
            style="min-width: 16rem"
          />
          <Column
            field="fecha"
            header="Emisión"
            sortable
            style="min-width: 9rem"
          />
          <Column
            field="vencimiento"
            header="Vencimiento"
            sortable
            style="min-width: 10rem"
          />
          <Column field="total" header="Total" sortable style="min-width: 9rem"
            ><template #body="{ data }"
              ><strong>{{ dinero(data.total) }}</strong></template
            ></Column
          >
          <Column
            field="estado"
            header="Estado"
            sortable
            style="min-width: 9rem"
            ><template #body="{ data }"
              ><Tag
                :severity="severidad(data.estado)"
                :value="data.estado" /></template
          ></Column>
          <Column header="Acciones" style="min-width: 13rem"
            ><template #body="{ data }"
              ><div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  @click="mensaje = `Preparando ${data.id} para descarga.`"
                  ><Download class="h-4 w-4" /></Button
                ><Button
                  v-if="data.estado !== 'PAGADA'"
                  size="sm"
                  class="bg-teal-700 hover:bg-teal-800"
                  @click="marcarPagada(data)"
                  >Conciliar</Button
                >
              </div></template
            ></Column
          >
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
