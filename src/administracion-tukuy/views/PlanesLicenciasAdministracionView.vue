<script setup lang="ts">
import { CalendarClock, Database, Pencil, Plus, Search, UsersRound } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import ToggleSwitch from "primevue/toggleswitch";
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import {
  planesLicenciasPrincipalService,
  type LicenciaPrincipal,
  type PlanPrincipal,
} from "@/api/services/planes-licencias-principal.service";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const cargando = ref(true);
const planes = ref<PlanPrincipal[]>([]);
const licencias = ref<LicenciaPrincipal[]>([]);
const busqueda = ref("");
const estado = ref("TODOS");
const pagina = ref(1);
const porPagina = ref(10);
const total = ref(0);
const error = ref("");
const mensaje = ref("");
const dialogoPlan = ref(false);
const guardando = ref(false);
const dialogoSuscripcion = ref(false);
const formularioPlan = reactive({ id: "", codigo: "", nombre: "", descripcion: "", moneda: "PEN", precio: 0, periodicidad: "MENSUAL", estado: "ACTIVO", usuarios: 0, docentes: 0, cursos: 0, almacenamiento: 0 });
const formularioSuscripcion = reactive({ instalacionId: "", suscripcionId: "", organizacion: "", planId: "", estado: "ACTIVA", vigenteDesde: "", vigenteHasta: "", renovacionAutomatica: false });
let temporizador: ReturnType<typeof setTimeout> | undefined;

const estados = [
  { label: "Todos los estados", value: "TODOS" },
  { label: "Activa", value: "ACTIVA" },
  { label: "Pendiente", value: "PENDIENTE" },
  { label: "Suspendida", value: "SUSPENDIDA" },
  { label: "No aplica", value: "NO_APLICA" },
];

async function cargar() {
  cargando.value = true;
  error.value = "";
  try {
    const respuesta = await planesLicenciasPrincipalService.listar({
      pagina: pagina.value, porPagina: porPagina.value,
      buscar: busqueda.value, estado: estado.value,
    });
    planes.value = respuesta.planes;
    licencias.value = respuesta.licencias;
    total.value = respuesta.total;
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : "No se pudieron cargar los planes y licencias.";
  } finally {
    cargando.value = false;
  }
}

function cambiarPagina(evento: { first: number; rows: number }) {
  porPagina.value = evento.rows;
  pagina.value = Math.floor(evento.first / evento.rows) + 1;
  void cargar();
}

function limite(plan: PlanPrincipal, codigos: string[]) {
  const valor = codigos.map((codigo) => plan.limites[codigo]).find(Boolean);
  return valor ? `${valor.limite.toLocaleString("es-PE")} ${valor.unidad}` : "No definido";
}

function vigencia(licencia: LicenciaPrincipal) {
  if (licencia.vigenciaIndefinida) return "Sin vencimiento";
  if (!licencia.vigenteHasta) return "Sin vigencia";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(licencia.vigenteHasta));
}

function severidad(valor: string | null) {
  if (valor === "ACTIVA") return "success";
  if (valor === "SUSPENDIDA" || valor === "VENCIDA") return "danger";
  if (valor === "NO_APLICA") return "info";
  return "warn";
}

function valorLimite(plan: PlanPrincipal, codigos: string[]) {
  return codigos.map((codigo) => plan.limites[codigo]?.limite).find((valor) => valor !== undefined) ?? 0;
}

function abrirNuevoPlan() {
  Object.assign(formularioPlan, { id: "", codigo: "", nombre: "", descripcion: "", moneda: "PEN", precio: 0, periodicidad: "MENSUAL", estado: "ACTIVO", usuarios: 0, docentes: 0, cursos: 0, almacenamiento: 0 });
  dialogoPlan.value = true;
}

function editarPlan(plan: PlanPrincipal) {
  Object.assign(formularioPlan, { id: plan.id, codigo: plan.codigo, nombre: plan.nombre, descripcion: plan.descripcion ?? "", moneda: plan.moneda.trim(), precio: plan.precio, periodicidad: plan.periodicidad, estado: plan.estado, usuarios: valorLimite(plan, ["USUARIOS", "ESTUDIANTES"]), docentes: valorLimite(plan, ["DOCENTES"]), cursos: valorLimite(plan, ["CURSOS"]), almacenamiento: valorLimite(plan, ["ALMACENAMIENTO"]) });
  dialogoPlan.value = true;
}

async function guardarPlan() {
  guardando.value = true; error.value = "";
  try {
    await planesLicenciasPrincipalService.guardarPlan({
      id: formularioPlan.id || undefined, codigo: formularioPlan.codigo, nombre: formularioPlan.nombre,
      descripcion: formularioPlan.descripcion, moneda: formularioPlan.moneda, precio: formularioPlan.precio,
      periodicidad: formularioPlan.periodicidad, estado: formularioPlan.estado,
      limites: [
        { codigo: "USUARIOS", limite: formularioPlan.usuarios, unidad: "usuarios" },
        { codigo: "DOCENTES", limite: formularioPlan.docentes, unidad: "docentes" },
        { codigo: "CURSOS", limite: formularioPlan.cursos, unidad: "cursos" },
        { codigo: "ALMACENAMIENTO", limite: formularioPlan.almacenamiento, unidad: "GB" },
      ],
    });
    dialogoPlan.value = false; mensaje.value = "El plan y sus límites fueron guardados."; await cargar();
  } catch (causa) { error.value = causa instanceof Error ? causa.message : "No se pudo guardar el plan."; }
  finally { guardando.value = false; }
}

function gestionarSuscripcion(licencia: LicenciaPrincipal) {
  const planActual = planes.value.find((plan) => plan.nombre === licencia.plan);
  Object.assign(formularioSuscripcion, {
    instalacionId: licencia.id, suscripcionId: licencia.suscripcionId ?? "", organizacion: licencia.nombre,
    planId: planActual?.id ?? planes.value[0]?.id ?? "", estado: licencia.estado && licencia.estado !== "NO_APLICA" ? licencia.estado : "ACTIVA",
    vigenteDesde: licencia.vigenteDesde?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    vigenteHasta: licencia.vigenteHasta?.slice(0, 10) ?? "", renovacionAutomatica: licencia.renovacionAutomatica ?? false,
  });
  dialogoSuscripcion.value = true;
}

async function guardarSuscripcion() {
  guardando.value = true; error.value = "";
  try {
    await planesLicenciasPrincipalService.guardarSuscripcion({ ...formularioSuscripcion, suscripcionId: formularioSuscripcion.suscripcionId || undefined });
    dialogoSuscripcion.value = false; mensaje.value = `La suscripción de ${formularioSuscripcion.organizacion} fue actualizada.`; await cargar();
  } catch (causa) { error.value = causa instanceof Error ? causa.message : "No se pudo guardar la suscripción."; }
  finally { guardando.value = false; }
}

watch([busqueda, estado], () => {
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => { pagina.value = 1; void cargar(); }, 350);
});
onMounted(() => void cargar());
onBeforeUnmount(() => { if (temporizador) clearTimeout(temporizador); });
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4"><TituloConAyuda clase-eyebrow="text-primary" eyebrow="Modelo comercial" titulo="Planes y licencias" ayuda="Consulta la oferta SaaS, sus límites y las licencias reales de cada organización." /><Button @click="abrirNuevoPlan"><Plus class="h-4 w-4" />Nuevo plan</Button></div>

    <div v-if="error" class="border-l-4 border-l-red-500 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">{{ error }}</div>
    <div v-if="mensaje" class="border-l-4 border-l-teal-600 bg-teal-500/10 px-4 py-3 text-sm font-semibold">{{ mensaje }}</div>

    <div v-if="cargando" class="grid gap-5 xl:grid-cols-3"><Skeleton v-for="item in 3" :key="item" class="h-60" /></div>
    <div v-else-if="planes.length" class="grid gap-5 xl:grid-cols-3">
      <Card v-for="plan in planes" :key="plan.id" class="border-border bg-card">
        <CardContent class="p-6">
          <p class="text-xs font-black uppercase tracking-wider text-muted-foreground">{{ plan.organizaciones }} organizaciones · {{ plan.estado }}</p>
          <div class="flex items-center justify-between gap-3"><h2 class="mt-2 text-2xl font-black">{{ plan.nombre }}</h2><Button size="icon" variant="outline" :aria-label="`Editar ${plan.nombre}`" @click="editarPlan(plan)"><Pencil class="h-4 w-4" /></Button></div>
          <p class="mt-2 min-h-10 text-sm text-muted-foreground">{{ plan.descripcion || 'Sin descripción comercial.' }}</p>
          <div class="mt-5 border-y border-border py-4"><strong class="text-3xl font-black">{{ plan.moneda }} {{ plan.precio.toLocaleString('es-PE') }}</strong><span class="text-sm text-muted-foreground"> / {{ plan.periodicidad.toLowerCase() }}</span></div>
          <div class="mt-4 grid gap-3 text-sm">
            <p class="flex gap-2"><UsersRound class="h-4 w-4 text-primary" />Usuarios: <b>{{ limite(plan, ['USUARIOS', 'ESTUDIANTES']) }}</b></p>
            <p class="flex gap-2"><Database class="h-4 w-4 text-primary" />Almacenamiento: <b>{{ limite(plan, ['ALMACENAMIENTO']) }}</b></p>
          </div>
        </CardContent>
      </Card>
    </div>
    <div v-else-if="!cargando" class="border border-border bg-card p-6 text-sm text-muted-foreground">Todavía no existen planes activos en la base principal.</div>

    <Card class="overflow-hidden border-border bg-card"><CardContent class="p-0">
      <div class="grid gap-3 border-b border-border p-5 lg:grid-cols-[1fr_15rem]">
        <label class="relative"><Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><InputText v-model="busqueda" class="filtro-control w-full pl-10" placeholder="Organización o plan" /></label>
        <Select v-model="estado" :options="estados" option-label="label" option-value="value" class="filtro-control w-full" />
      </div>
      <div v-if="cargando" class="space-y-2 p-5"><Skeleton v-for="item in 5" :key="item" class="h-12" /></div>
      <DataTable v-else :value="licencias" data-key="id" lazy paginator :first="(pagina - 1) * porPagina" :rows="porPagina" :total-records="total" :rows-per-page-options="[10, 20, 50]" current-page-report-template="{first}–{last} de {totalRecords} licencias" paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport" size="small" scrollable table-style="min-width:70rem" class="tabla-administracion" @page="cambiarPagina">
        <template #empty><div class="py-10 text-center text-sm text-muted-foreground">No existen licencias con estos filtros.</div></template>
        <Column field="nombre" header="Organización" style="min-width:17rem"><template #body="{ data }"><strong>{{ data.nombre }}</strong><p class="text-xs text-muted-foreground">{{ data.clasificacion }} · {{ data.facturable ? 'Facturable' : 'No facturable' }}</p></template></Column>
        <Column field="plan" header="Plan" style="min-width:13rem" />
        <Column header="Consumo" style="min-width:12rem"><template #body="{ data }">{{ data.usuarios }}<span v-if="data.limiteUsuarios"> / {{ data.limiteUsuarios }}</span> usuarios</template></Column>
        <Column header="Vigencia" style="min-width:12rem"><template #body="{ data }"><span class="flex gap-2"><CalendarClock class="h-4 w-4 text-muted-foreground" />{{ vigencia(data) }}</span></template></Column>
        <Column header="Suscripción" style="min-width:11rem"><template #body="{ data }"><Tag :severity="severidad(data.estado)" :value="data.estado || 'SIN PLAN'" /></template></Column>
        <Column field="estadoInstalacion" header="Instalación" style="min-width:11rem" />
        <Column header="Acciones" style="min-width:12rem"><template #body="{ data }"><Button size="sm" variant="outline" :disabled="data.clasificacion === 'INTERNA' || !planes.length" @click="gestionarSuscripcion(data)">{{ data.suscripcionId ? 'Editar licencia' : 'Asignar plan' }}</Button></template></Column>
      </DataTable>
    </CardContent></Card>

    <Dialog v-model:visible="dialogoPlan" modal :header="formularioPlan.id ? 'Editar plan' : 'Nuevo plan'" :style="{ width: 'min(42rem, calc(100vw - 2rem))' }">
      <div class="grid gap-4 sm:grid-cols-2">
        <label><span class="filtro-label">Código</span><InputText v-model="formularioPlan.codigo" class="filtro-control w-full" placeholder="EMPRESA_PRO" /></label>
        <label><span class="filtro-label">Nombre</span><InputText v-model="formularioPlan.nombre" class="filtro-control w-full" /></label>
        <label class="sm:col-span-2"><span class="filtro-label">Descripción</span><InputText v-model="formularioPlan.descripcion" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Precio</span><InputNumber v-model="formularioPlan.precio" :min="0" :min-fraction-digits="2" :max-fraction-digits="2" class="w-full" input-class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Moneda</span><Select v-model="formularioPlan.moneda" :options="['PEN','USD']" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Periodicidad</span><Select v-model="formularioPlan.periodicidad" :options="['MENSUAL','ANUAL']" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Estado</span><Select v-model="formularioPlan.estado" :options="['ACTIVO','INACTIVO']" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Usuarios</span><InputNumber v-model="formularioPlan.usuarios" :min="0" class="w-full" input-class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Docentes</span><InputNumber v-model="formularioPlan.docentes" :min="0" class="w-full" input-class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Cursos</span><InputNumber v-model="formularioPlan.cursos" :min="0" class="w-full" input-class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Almacenamiento GB</span><InputNumber v-model="formularioPlan.almacenamiento" :min="0" class="w-full" input-class="filtro-control w-full" /></label>
      </div>
      <template #footer><Button variant="outline" @click="dialogoPlan = false">Cancelar</Button><Button :disabled="guardando || !formularioPlan.codigo.trim() || !formularioPlan.nombre.trim()" @click="guardarPlan">{{ guardando ? 'Guardando…' : 'Guardar plan' }}</Button></template>
    </Dialog>
    <Dialog v-model:visible="dialogoSuscripcion" modal :header="`Suscripción · ${formularioSuscripcion.organizacion}`" :style="{ width: 'min(36rem, calc(100vw - 2rem))' }">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="sm:col-span-2"><span class="filtro-label">Plan</span><Select v-model="formularioSuscripcion.planId" :options="planes" option-label="nombre" option-value="id" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Estado</span><Select v-model="formularioSuscripcion.estado" :options="['ACTIVA','SUSPENDIDA','CANCELADA']" class="filtro-control w-full" /></label>
        <label class="flex items-center justify-between gap-3 border border-border p-3"><span class="text-sm font-bold">Renovación automática</span><ToggleSwitch v-model="formularioSuscripcion.renovacionAutomatica" /></label>
        <label><span class="filtro-label">Vigente desde</span><InputText v-model="formularioSuscripcion.vigenteDesde" type="date" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Vigente hasta</span><InputText v-model="formularioSuscripcion.vigenteHasta" type="date" class="filtro-control w-full" /></label>
      </div>
      <template #footer><Button variant="outline" @click="dialogoSuscripcion = false">Cancelar</Button><Button :disabled="guardando || !formularioSuscripcion.planId || !formularioSuscripcion.vigenteDesde" @click="guardarSuscripcion">{{ guardando ? 'Guardando…' : 'Guardar suscripción' }}</Button></template>
    </Dialog>
  </section>
</template>
