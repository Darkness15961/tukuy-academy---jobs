<script setup lang="ts">
import {
  CreditCard,
  Download,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-vue-next";
import { jsPDF } from "jspdf";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import {
  organizacionService,
  type ComprobanteOrganizacion,
  type FacturacionOrganizacion,
} from "@/api/services/organizacion.service";
import PortadaPanel from "@/components/shared/PortadaPanel.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useContextoSesion } from "@/composables/useContextoSesion";

const router = useRouter();
const { contextoActivo } = useContextoSesion();

const cargando = ref(true);
const facturacion = ref<FacturacionOrganizacion | null>(null);
const comprobantes = ref<ComprobanteOrganizacion[]>([]);
const modalPlan = ref(false);
const modalTarjeta = ref(false);
const mensaje = ref("");
const plan = reactive({
  nombre: "Empresa Pro",
  periodicidad: "MENSUAL" as "MENSUAL" | "ANUAL",
});
const tarjeta = reactive({ marca: "Visa", ultimos4: "", vencimiento: "" });

const planes = [
  {
    label: "Empresa Esencial",
    value: "Empresa Esencial",
    mensual: 1290,
    detalle: "Operación base para equipos pequeños",
  },
  {
    label: "Empresa Pro",
    value: "Empresa Pro",
    mensual: 2490,
    detalle: "Ideal para capítulos y formación continua",
  },
  {
    label: "Empresa Corporativo",
    value: "Empresa Corporativo",
    mensual: 4490,
    detalle: "Máxima capacidad y soporte prioritario",
  },
];

const diapositivasPortada = [
  {
    imagen: "/img/portada-planes-empresariales.png",
    rotulo: "Actualiza tu plan cuando la organización crece",
  },
  {
    imagen: "/img/portal-organizacion.png",
    rotulo: "Mantén al día el método de pago y los cobros programados",
  },
  {
    imagen: "/img/portal-administracion.png",
    rotulo: "Descarga comprobantes y audita la facturación corporativa",
  },
  {
    imagen: "/img/tukuyAcademia.png",
    rotulo: "Suscripción clara: plan, periodicidad e importe en un vistazo",
  },
];

onMounted(cargar);

async function cargar() {
  cargando.value = true;
  try {
    [facturacion.value, comprobantes.value] = await Promise.all([
      organizacionService.obtenerFacturacion(),
      organizacionService.comprobantes.listar(),
    ]);
  } finally {
    cargando.value = false;
  }
}

const nombreOrganizacion = computed(
  () =>
    contextoActivo.value?.organizacionNombre ??
    "COLEGIO DE INGENIEROS CUSCO",
);

const planActualDetalle = computed(
  () =>
    planes.find((item) => item.value === facturacion.value?.plan)?.detalle ??
    "Plan corporativo activo",
);

const comprobantesPagados = computed(
  () => comprobantes.value.filter((item) => item.estado === "PAGADO").length,
);

function moneda(valor: number, codigo: "PEN" | "USD" = "PEN") {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: codigo,
  }).format(valor);
}

function fecha(fechaIso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${fechaIso}T00:00:00Z`));
}

function abrirPlan() {
  if (!facturacion.value) return;
  plan.nombre = facturacion.value.plan;
  plan.periodicidad = facturacion.value.periodicidad;
  modalPlan.value = true;
}

async function guardarPlan() {
  if (!facturacion.value) return;
  const elegido =
    planes.find((item) => item.value === plan.nombre) ?? planes[1]!;
  const actualizado = {
    ...facturacion.value,
    plan: plan.nombre,
    periodicidad: plan.periodicidad,
    importe:
      plan.periodicidad === "ANUAL" ? elegido.mensual * 10 : elegido.mensual,
  };
  await organizacionService.guardarFacturacion(actualizado);
  facturacion.value = actualizado;
  modalPlan.value = false;
  mensaje.value = "Plan actualizado correctamente.";
}

function abrirTarjeta() {
  if (!facturacion.value) return;
  Object.assign(tarjeta, {
    marca: facturacion.value.tarjetaMarca,
    ultimos4: facturacion.value.tarjetaUltimos4,
    vencimiento: facturacion.value.tarjetaVencimiento,
  });
  modalTarjeta.value = true;
}

async function guardarTarjeta() {
  if (
    !facturacion.value ||
    !/^\d{4}$/.test(tarjeta.ultimos4) ||
    !/^\d{2}\/\d{4}$/.test(tarjeta.vencimiento)
  ) {
    mensaje.value =
      "Revisa los últimos cuatro dígitos y la fecha MM/AAAA.";
    return;
  }
  const actualizado = {
    ...facturacion.value,
    tarjetaMarca: tarjeta.marca,
    tarjetaUltimos4: tarjeta.ultimos4,
    tarjetaVencimiento: tarjeta.vencimiento,
  };
  await organizacionService.guardarFacturacion(actualizado);
  facturacion.value = actualizado;
  modalTarjeta.value = false;
  mensaje.value = "Método de pago actualizado.";
}

function descargar(comprobante: ComprobanteOrganizacion) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text("Tukuy Academy", 20, 24);
  pdf.setFontSize(12);
  pdf.text(`Comprobante ${comprobante.numero}`, 20, 38);
  pdf.text(`Fecha: ${fecha(comprobante.fecha)}`, 20, 50);
  pdf.text(`Concepto: ${comprobante.concepto}`, 20, 62);
  pdf.text(
    `Importe: ${moneda(comprobante.importe, comprobante.moneda)}`,
    20,
    74,
  );
  pdf.text(`Estado: ${comprobante.estado}`, 20, 86);
  pdf.save(`${comprobante.numero}.pdf`);
}

function claseEstado(estado: ComprobanteOrganizacion["estado"]) {
  if (estado === "PAGADO") {
    return "border-emerald-300 bg-emerald-500/10 text-emerald-700";
  }
  if (estado === "PENDIENTE") {
    return "border-amber-300 bg-amber-500/10 text-amber-800";
  }
  return "border-red-300 bg-red-500/10 text-red-700";
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <PortadaPanel
      :diapositivas="diapositivasPortada"
      :etiqueta="nombreOrganizacion"
      titulo="Facturación y actualización"
      descripcion="Cambia de plan, actualiza el método de pago y descarga comprobantes de tu suscripción corporativa."
      texto-accion="Actualizar plan"
      texto-accion-secundaria="Licencia"
      :icono-accion="Sparkles"
      :icono-accion-secundaria="ShieldCheck"
      etiqueta-accesible="Portada de facturación y actualización de plan"
      @accion="abrirPlan"
      @accion-secundaria="router.push('/organizacion/licencia')"
    />

    <div v-if="cargando" class="grid gap-5">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
      </div>
      <div class="grid gap-5 lg:grid-cols-2">
        <Skeleton class="h-48 w-full" />
        <Skeleton class="h-48 w-full" />
      </div>
      <Skeleton class="h-64 w-full" />
    </div>

    <template v-else-if="facturacion">
      <p
        v-if="mensaje"
        class="border border-border border-l-4 border-l-primary bg-primary/10 p-3 text-sm text-primary"
      >
        {{ mensaje }}
      </p>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card class="border-border border-t-4 border-t-accent bg-card">
          <CardContent class="p-5">
            <p class="text-xs font-bold text-muted-foreground">Plan</p>
            <strong class="mt-1 block text-xl font-black">{{
              facturacion.plan
            }}</strong>
            <p class="mt-1 text-[11px] text-muted-foreground">
              {{ planActualDetalle }}
            </p>
          </CardContent>
        </Card>
        <Card class="border-border border-t-4 border-t-primary bg-card">
          <CardContent class="p-5">
            <p class="text-xs font-bold text-muted-foreground">Importe</p>
            <strong class="mt-1 block text-2xl font-black">
              {{ moneda(facturacion.importe, facturacion.moneda) }}
            </strong>
            <p class="text-[11px] text-muted-foreground">
              / {{ facturacion.periodicidad === "MENSUAL" ? "mes" : "año" }}
            </p>
          </CardContent>
        </Card>
        <Card class="border-border border-t-4 border-t-primary bg-card">
          <CardContent class="p-5">
            <p class="text-xs font-bold text-muted-foreground">Próximo cobro</p>
            <strong class="mt-1 block text-lg font-black">
              {{ fecha(facturacion.proximoCobro) }}
            </strong>
            <p class="text-[11px] text-muted-foreground">
              Facturación {{ facturacion.periodicidad.toLowerCase() }}
            </p>
          </CardContent>
        </Card>
        <Card class="border-border border-t-4 border-t-accent bg-card">
          <CardContent class="p-5">
            <p class="text-xs font-bold text-muted-foreground">Comprobantes</p>
            <strong class="mt-1 block text-2xl font-black">
              {{ comprobantes.length }}
            </strong>
            <p class="text-[11px] text-muted-foreground">
              {{ comprobantesPagados }} pagados
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <Card class="border-border border-t-4 border-t-accent bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p
                  class="text-[11px] font-bold uppercase tracking-wide text-[#B87A00]"
                >
                  Suscripción
                </p>
                <h2 class="text-lg font-black">Actualizar plan</h2>
                <p class="mt-1 text-xs text-muted-foreground">
                  Cambia de nivel o pasa a facturación anual
                </p>
              </div>
              <Sparkles class="h-5 w-5 text-[#B87A00]" />
            </div>
            <div class="mt-5 border border-border bg-muted/30 p-4">
              <p class="text-xs font-bold text-muted-foreground">Plan vigente</p>
              <strong class="mt-1 block text-2xl font-black">{{
                facturacion.plan
              }}</strong>
              <p class="mt-2 text-sm text-muted-foreground">
                {{ moneda(facturacion.importe, facturacion.moneda) }} /
                {{ facturacion.periodicidad === "MENSUAL" ? "mes" : "año" }}
              </p>
            </div>
            <div class="mt-4 grid gap-2">
              <button
                v-for="opcion in planes"
                :key="opcion.value"
                type="button"
                class="flex items-center justify-between gap-3 border border-border px-3 py-2.5 text-left transition hover:border-primary hover:bg-muted/40"
                :class="
                  opcion.value === facturacion.plan
                    ? 'border-l-4 border-l-accent bg-accent/10'
                    : 'border-l-4 border-l-transparent'
                "
                @click="
                  plan.nombre = opcion.value;
                  modalPlan = true;
                "
              >
                <span>
                  <span class="block text-sm font-bold">{{ opcion.label }}</span>
                  <span class="text-[11px] text-muted-foreground">{{
                    opcion.detalle
                  }}</span>
                </span>
                <span class="shrink-0 text-xs font-black text-primary">
                  {{ moneda(opcion.mensual) }}
                </span>
              </button>
            </div>
            <Button class="mt-4 w-full" @click="abrirPlan">
              <RefreshCw class="h-4 w-4" />
              Confirmar actualización de plan
            </Button>
          </CardContent>
        </Card>

        <Card class="border-border border-t-4 border-t-primary bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p
                  class="text-[11px] font-bold uppercase tracking-wide text-primary"
                >
                  Pago
                </p>
                <h2 class="text-lg font-black">Método de pago</h2>
                <p class="mt-1 text-xs text-muted-foreground">
                  Actualiza tarjeta para evitar cortes de servicio
                </p>
              </div>
              <CreditCard class="h-5 w-5 text-primary" />
            </div>
            <div
              class="mt-5 flex items-center gap-4 border border-border bg-muted/30 p-4"
            >
              <div
                class="grid h-14 w-14 place-items-center bg-primary/10 text-primary"
              >
                <CreditCard class="h-7 w-7" />
              </div>
              <div>
                <strong class="block text-lg font-black">
                  {{ facturacion.tarjetaMarca }} ····
                  {{ facturacion.tarjetaUltimos4 }}
                </strong>
                <p class="text-xs text-muted-foreground">
                  Vence {{ facturacion.tarjetaVencimiento }}
                </p>
              </div>
            </div>
            <Button class="mt-5 w-full" variant="outline" @click="abrirTarjeta">
              Actualizar tarjeta
            </Button>
            <Button
              class="mt-2 w-full"
              variant="ghost"
              @click="router.push('/organizacion/licencia')"
            >
              Ver consumo de licencia
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card class="border-border bg-card">
        <CardContent class="p-0">
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
          >
            <div>
              <h2 class="text-lg font-black">Comprobantes</h2>
              <p class="text-xs text-muted-foreground">
                Historial de cobros de la organización
              </p>
            </div>
          </div>
          <DataTable
            class="tabla-estudiantes"
            :value="comprobantes"
            paginator
            :rows="5"
            :rows-per-page-options="[5, 10, 20]"
            size="small"
            table-style="min-width: 44rem"
          >
            <Column field="numero" header="Comprobante" sortable />
            <Column field="fecha" header="Fecha" sortable>
              <template #body="{ data }">{{ fecha(data.fecha) }}</template>
            </Column>
            <Column field="concepto" header="Concepto" />
            <Column field="importe" header="Importe" sortable>
              <template #body="{ data }">
                {{ moneda(data.importe, data.moneda) }}
              </template>
            </Column>
            <Column field="estado" header="Estado">
              <template #body="{ data }">
                <Badge
                  variant="outline"
                  class="text-[10px]"
                  :class="claseEstado(data.estado)"
                >
                  {{ data.estado }}
                </Badge>
              </template>
            </Column>
            <Column header="">
              <template #body="{ data }">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Descargar PDF"
                  @click="descargar(data)"
                >
                  <Download class="h-4 w-4" />
                </Button>
              </template>
            </Column>
            <template #empty>
              <div class="py-10 text-center text-sm text-muted-foreground">
                No hay comprobantes registrados.
              </div>
            </template>
          </DataTable>
        </CardContent>
      </Card>
    </template>

    <Dialog
      v-model:visible="modalPlan"
      modal
      header="Actualizar plan"
      :style="{ width: 'min(92vw, 480px)' }"
      :pt="{
        root: { class: 'rounded-none' },
        header: { class: 'rounded-none border-b border-border' },
        content: { class: 'rounded-none' },
      }"
    >
      <div class="grid gap-4">
        <label class="grid gap-2 text-sm font-bold">
          Plan
          <Select
            v-model="plan.nombre"
            :options="planes"
            option-label="label"
            option-value="value"
            fluid
          />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Periodicidad
          <Select
            v-model="plan.periodicidad"
            :options="[
              { label: 'Mensual', value: 'MENSUAL' },
              { label: 'Anual (2 meses de ahorro)', value: 'ANUAL' },
            ]"
            option-label="label"
            option-value="value"
            fluid
          />
        </label>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalPlan = false">Cancelar</Button>
        <Button @click="guardarPlan">Confirmar plan</Button>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="modalTarjeta"
      modal
      header="Actualizar método de pago"
      :style="{ width: 'min(92vw, 480px)' }"
      :pt="{
        root: { class: 'rounded-none' },
        header: { class: 'rounded-none border-b border-border' },
        content: { class: 'rounded-none' },
      }"
    >
      <div class="grid gap-4">
        <label class="grid gap-2 text-sm font-bold">
          Marca
          <Input v-model="tarjeta.marca" />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Últimos 4 dígitos
          <Input v-model="tarjeta.ultimos4" maxlength="4" />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Vencimiento (MM/AAAA)
          <Input v-model="tarjeta.vencimiento" placeholder="08/2028" />
        </label>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalTarjeta = false">
          Cancelar
        </Button>
        <Button @click="guardarTarjeta">Guardar tarjeta</Button>
      </template>
    </Dialog>
  </section>
</template>
