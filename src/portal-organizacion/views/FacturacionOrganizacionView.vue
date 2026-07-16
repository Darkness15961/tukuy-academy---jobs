<script setup lang="ts">
import { CreditCard, Download } from "lucide-vue-next";
import { jsPDF } from "jspdf";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import { onMounted, reactive, ref } from "vue";
import {
  organizacionService,
  type ComprobanteOrganizacion,
  type FacturacionOrganizacion,
} from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const cargando = ref(true);
const facturacion = ref<FacturacionOrganizacion | null>(null);
const comprobantes = ref<ComprobanteOrganizacion[]>([]);
const modalPlan = ref(false);
const modalTarjeta = ref(false);
const mensaje = ref("");
const plan = reactive({ nombre: "Empresa Pro", periodicidad: "MENSUAL" as "MENSUAL" | "ANUAL" });
const tarjeta = reactive({ marca: "Visa", ultimos4: "", vencimiento: "" });
const planes = [
  { label: "Empresa Esencial", value: "Empresa Esencial", mensual: 1290 },
  { label: "Empresa Pro", value: "Empresa Pro", mensual: 2490 },
  { label: "Empresa Corporativo", value: "Empresa Corporativo", mensual: 4490 },
];

onMounted(cargar);
async function cargar() {
  cargando.value = true;
  try {
    [facturacion.value, comprobantes.value] = await Promise.all([
      organizacionService.obtenerFacturacion(),
      organizacionService.comprobantes.listar(),
    ]);
  } finally { cargando.value = false; }
}
function moneda(valor: number, codigo: "PEN" | "USD" = "PEN") {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: codigo }).format(valor);
}
function fecha(fechaIso: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${fechaIso}T00:00:00Z`));
}
function abrirPlan() {
  if (!facturacion.value) return;
  plan.nombre = facturacion.value.plan;
  plan.periodicidad = facturacion.value.periodicidad;
  modalPlan.value = true;
}
async function guardarPlan() {
  if (!facturacion.value) return;
  const elegido = planes.find((item) => item.value === plan.nombre) ?? planes[1]!;
  const actualizado = { ...facturacion.value, plan: plan.nombre, periodicidad: plan.periodicidad, importe: plan.periodicidad === "ANUAL" ? elegido.mensual * 10 : elegido.mensual };
  await organizacionService.guardarFacturacion(actualizado);
  facturacion.value = actualizado;
  modalPlan.value = false;
  mensaje.value = "Plan actualizado correctamente.";
}
function abrirTarjeta() {
  if (!facturacion.value) return;
  Object.assign(tarjeta, { marca: facturacion.value.tarjetaMarca, ultimos4: facturacion.value.tarjetaUltimos4, vencimiento: facturacion.value.tarjetaVencimiento });
  modalTarjeta.value = true;
}
async function guardarTarjeta() {
  if (!facturacion.value || !/^\d{4}$/.test(tarjeta.ultimos4) || !/^\d{2}\/\d{4}$/.test(tarjeta.vencimiento)) {
    mensaje.value = "Revisa los últimos cuatro dígitos y la fecha MM/AAAA.";
    return;
  }
  const actualizado = { ...facturacion.value, tarjetaMarca: tarjeta.marca, tarjetaUltimos4: tarjeta.ultimos4, tarjetaVencimiento: tarjeta.vencimiento };
  await organizacionService.guardarFacturacion(actualizado);
  facturacion.value = actualizado;
  modalTarjeta.value = false;
  mensaje.value = "Método de pago actualizado.";
}
function descargar(comprobante: ComprobanteOrganizacion) {
  const pdf = new jsPDF();
  pdf.setFontSize(18); pdf.text("Tukuy Academy", 20, 24);
  pdf.setFontSize(12); pdf.text(`Comprobante ${comprobante.numero}`, 20, 38);
  pdf.text(`Fecha: ${fecha(comprobante.fecha)}`, 20, 50);
  pdf.text(`Concepto: ${comprobante.concepto}`, 20, 62);
  pdf.text(`Importe: ${moneda(comprobante.importe, comprobante.moneda)}`, 20, 74);
  pdf.text(`Estado: ${comprobante.estado}`, 20, 86);
  pdf.save(`${comprobante.numero}.pdf`);
}
</script>

<template>
  <section class="mx-auto grid max-w-300 gap-6">
    <div><h1 class="text-2xl font-black">Facturación</h1><p class="mt-1 text-sm text-muted-foreground">Administra tu suscripción, método de pago y comprobantes.</p></div>
    <div v-if="cargando" class="grid gap-5"><div class="grid gap-5 lg:grid-cols-2"><Skeleton height="14rem" /><Skeleton height="14rem" /></div><Skeleton height="20rem" /></div>
    <template v-else-if="facturacion">
      <p v-if="mensaje" class="border-l-4 border-primary bg-primary/10 p-3 text-sm text-primary">{{ mensaje }}</p>
      <div class="grid gap-6 lg:grid-cols-[1fr_.7fr]">
        <Card class="border-border bg-card"><CardContent class="p-6"><p class="text-xs font-bold uppercase text-primary">Suscripción actual</p><h2 class="mt-2 text-2xl font-black">{{ facturacion.plan }}</h2><p class="mt-2 text-sm text-muted-foreground">Facturación {{ facturacion.periodicidad.toLowerCase() }} · Próximo cobro {{ fecha(facturacion.proximoCobro) }}</p><div class="mt-6 flex flex-wrap items-end justify-between gap-4"><div><strong class="text-3xl">{{ moneda(facturacion.importe, facturacion.moneda) }}</strong><span class="text-sm text-muted-foreground"> / {{ facturacion.periodicidad === 'MENSUAL' ? 'mes' : 'año' }}</span></div><Button variant="outline" @click="abrirPlan">Cambiar plan</Button></div></CardContent></Card>
        <Card class="border-border bg-card"><CardContent class="p-6"><CreditCard class="h-7 w-7 text-primary" /><h2 class="mt-4 font-black">Método de pago</h2><p class="mt-3 text-sm">{{ facturacion.tarjetaMarca }} terminada en {{ facturacion.tarjetaUltimos4 }}</p><p class="text-xs text-muted-foreground">Vence {{ facturacion.tarjetaVencimiento }}</p><Button class="mt-5" variant="outline" @click="abrirTarjeta">Actualizar tarjeta</Button></CardContent></Card>
      </div>
      <Card class="border-border bg-card"><CardContent class="p-0"><div class="border-b p-5"><h2 class="text-lg font-black">Comprobantes</h2></div><DataTable :value="comprobantes" paginator :rows="5" :rows-per-page-options="[5, 10, 20]" striped-rows table-style="min-width: 720px"><Column field="numero" header="Comprobante" /><Column field="fecha" header="Fecha"><template #body="{ data }">{{ fecha(data.fecha) }}</template></Column><Column field="concepto" header="Concepto" /><Column field="importe" header="Importe"><template #body="{ data }">{{ moneda(data.importe, data.moneda) }}</template></Column><Column field="estado" header="Estado" /><Column header="Descarga"><template #body="{ data }"><Button variant="ghost" size="icon" title="Descargar PDF" @click="descargar(data)"><Download class="h-4 w-4" /></Button></template></Column></DataTable></CardContent></Card>
    </template>

    <Dialog v-model:visible="modalPlan" modal header="Cambiar plan" :style="{ width: 'min(92vw, 480px)' }"><div class="grid gap-4"><label class="grid gap-2 text-sm font-bold">Plan<Select v-model="plan.nombre" :options="planes" option-label="label" option-value="value" fluid /></label><label class="grid gap-2 text-sm font-bold">Periodicidad<Select v-model="plan.periodicidad" :options="[{ label: 'Mensual', value: 'MENSUAL' }, { label: 'Anual (2 meses de ahorro)', value: 'ANUAL' }]" option-label="label" option-value="value" fluid /></label></div><template #footer><Button variant="outline" @click="modalPlan = false">Cancelar</Button><Button @click="guardarPlan">Confirmar plan</Button></template></Dialog>
    <Dialog v-model:visible="modalTarjeta" modal header="Actualizar método de pago" :style="{ width: 'min(92vw, 480px)' }"><div class="grid gap-4"><label class="grid gap-2 text-sm font-bold">Marca<Input v-model="tarjeta.marca" /></label><label class="grid gap-2 text-sm font-bold">Últimos 4 dígitos<Input v-model="tarjeta.ultimos4" maxlength="4" /></label><label class="grid gap-2 text-sm font-bold">Vencimiento (MM/AAAA)<Input v-model="tarjeta.vencimiento" placeholder="08/2028" /></label></div><template #footer><Button variant="outline" @click="modalTarjeta = false">Cancelar</Button><Button @click="guardarTarjeta">Guardar tarjeta</Button></template></Dialog>
  </section>
</template>
