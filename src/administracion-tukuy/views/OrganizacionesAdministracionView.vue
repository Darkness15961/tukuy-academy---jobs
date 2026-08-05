<script setup lang="ts">
import { Building2, Database, Search, Settings2, ShieldCheck } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Tag from "primevue/tag";
import ToggleSwitch from "primevue/toggleswitch";
import { onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import {
  organizacionesPrincipalService,
  type OrganizacionPrincipal,
  type ResumenOrganizacionesPrincipal,
} from "@/api/services/organizaciones-principal.service";
import { modulosPrincipalService, type ModuloPrincipal } from "@/api/services/modulos-principal.service";
import { operacionPrincipalService } from "@/api/services/operacion-principal.service";
import { provisionamientoPrincipalService } from "@/api/services/provisionamiento-principal.service";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const cargando = ref(true);
const organizaciones = ref<OrganizacionPrincipal[]>([]);
const busqueda = ref("");
const estado = ref("TODOS");
const plan = ref("TODOS");
const pagina = ref(1);
const porPagina = ref(10);
const totalRegistros = ref(0);
const error = ref("");
const mensaje = ref("");
const dialogoModulos = ref(false);
const organizacionModulos = ref<OrganizacionPrincipal | null>(null);
const modulos = ref<ModuloPrincipal[]>([]);
const cargandoModulos = ref(false);
const dialogoAlta = ref(false);
const guardandoAlta = ref(false);
const alta = reactive({ codigo: "", razonSocial: "", nombreComercial: "", tipoDocumento: "RUC", numeroDocumento: "", paisCodigo: "PE", zonaHoraria: "America/Lima", correoDireccion: "", correoAdministracion: "" });
const dialogoConexion = ref(false);
const guardandoConexion = ref(false);
const verificandoConexion = ref(false);
const conexionOrganizacion = ref<OrganizacionPrincipal | null>(null);
const conexion = reactive({ servidorRef: "", nombreBaseLogico: "", secretoRef: "", region: "south-america-west1", versionEsquema: 1, estado: "SIN CONFIGURAR", verificadaEn: "", ultimoError: "" });
const resumen = ref<ResumenOrganizacionesPrincipal>({
  total: 0,
  habilitadas: 0,
  pendientes: 0,
  suspendidas: 0,
  conSuscripcion: 0,
});
let temporizador: ReturnType<typeof setTimeout> | undefined;

const opcionesEstado = [
  { label: "Todos los estados", value: "TODOS" },
  { label: "Pendiente", value: "PENDIENTE" },
  { label: "Habilitada", value: "HABILITADA" },
  { label: "Suspendida", value: "SUSPENDIDA" },
];

async function cargar() {
  cargando.value = true;
  error.value = "";
  try {
    const respuesta = await organizacionesPrincipalService.listar({
      pagina: pagina.value,
      porPagina: porPagina.value,
      buscar: busqueda.value,
      estado: estado.value,
      plan: plan.value,
    });
    organizaciones.value = respuesta.datos;
    totalRegistros.value = respuesta.total;
    resumen.value = respuesta.resumen;
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : "No se pudieron cargar las organizaciones.";
  } finally {
    cargando.value = false;
  }
}

function cambiarPagina(evento: { first: number; rows: number }) {
  porPagina.value = evento.rows;
  pagina.value = Math.floor(evento.first / evento.rows) + 1;
  void cargar();
}

function severidad(valor: string) {
  if (["ACTIVA", "HABILITADA"].includes(valor)) return "success";
  if (valor === "SUSPENDIDA") return "danger";
  return "warn";
}

function fecha(valor: string | null) {
  if (!valor) return "Sin vigencia";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(valor));
}

function vigencia(organizacion: OrganizacionPrincipal) {
  return organizacion.vigenciaIndefinida ? "Sin vencimiento" : fecha(organizacion.vigenteHasta);
}

function informarProvisionamiento() {
  Object.assign(alta, { codigo: "", razonSocial: "", nombreComercial: "", tipoDocumento: "RUC", numeroDocumento: "", paisCodigo: "PE", zonaHoraria: "America/Lima", correoDireccion: "", correoAdministracion: "" });
  dialogoAlta.value = true;
}

async function crearOrganizacion() {
  guardandoAlta.value = true;
  error.value = "";
  try {
    await operacionPrincipalService.crearOrganizacion({ ...alta });
    dialogoAlta.value = false;
    mensaje.value = "Empresa, tenant, instalación y responsables creados. El aprovisionamiento secundario quedó pendiente.";
    await cargar();
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : "No se pudo crear la organización.";
  } finally {
    guardandoAlta.value = false;
  }
}

async function abrirConexion(organizacion: OrganizacionPrincipal) {
  conexionOrganizacion.value = organizacion;
  dialogoConexion.value = true;
  error.value = "";
  try {
    const actual = await provisionamientoPrincipalService.obtener(organizacion.id);
    Object.assign(conexion, { servidorRef: actual.servidorRef ?? "", nombreBaseLogico: actual.nombreBaseLogico ?? organizacion.nombre.toLowerCase().replace(/[^a-z0-9]+/g,"_"), secretoRef: actual.secretoRef ?? `SUPABASE_SECONDARY_${organizacion.tenantRef.slice(0,8).toUpperCase()}`, region: actual.region ?? "south-america-west1", versionEsquema: actual.versionEsquema ?? 1, estado: actual.estado ?? "SIN CONFIGURAR", verificadaEn: actual.verificadaEn ?? "", ultimoError: actual.ultimoError ?? "" });
  } catch (causa) { error.value = causa instanceof Error ? causa.message : "No se pudo consultar la conexión."; }
}

async function guardarConexion() {
  if (!conexionOrganizacion.value) return;
  guardandoConexion.value = true; error.value = "";
  try {
    await provisionamientoPrincipalService.configurar({ instalacionId: conexionOrganizacion.value.id, servidorRef: conexion.servidorRef, nombreBaseLogico: conexion.nombreBaseLogico, secretoRef: conexion.secretoRef, region: conexion.region, versionEsquema: conexion.versionEsquema });
    conexion.estado = "PENDIENTE"; mensaje.value = "Conexión secundaria registrada. Falta cargar el secreto y verificarla."; await cargar();
  } catch (causa) { error.value = causa instanceof Error ? causa.message : "No se pudo guardar la conexión."; }
  finally { guardandoConexion.value = false; }
}

async function verificarConexion() {
  verificandoConexion.value = true; error.value = "";
  try {
    const salud = await provisionamientoPrincipalService.verificar();
    conexion.estado = salud.estado;
    conexion.verificadaEn = salud.generadoEn;
    mensaje.value = `Secundaria verificada: ${salud.tablasPublicas} tablas públicas y ${salud.accesosSincronizados} accesos sincronizados.`;
  } catch (causa) { error.value = causa instanceof Error ? causa.message : "No se pudo verificar la secundaria."; }
  finally { verificandoConexion.value = false; }
}

async function abrirModulos(organizacion: OrganizacionPrincipal) {
  organizacionModulos.value = organizacion;
  dialogoModulos.value = true;
  cargandoModulos.value = true;
  try {
    modulos.value = await modulosPrincipalService.listar(organizacion.id);
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : "No se pudieron cargar los módulos.";
  } finally {
    cargandoModulos.value = false;
  }
}

async function cambiarModulo(modulo: ModuloPrincipal) {
  if (!organizacionModulos.value) return;
  try {
    await modulosPrincipalService.guardar(organizacionModulos.value.id, modulo);
    mensaje.value = `${modulo.nombre} fue ${modulo.habilitado ? "habilitado" : "deshabilitado"}.`;
    await cargar();
  } catch (causa) {
    modulo.habilitado = !modulo.habilitado;
    error.value = causa instanceof Error ? causa.message : "No se pudo actualizar el módulo.";
  }
}

watch([busqueda, estado, plan], () => {
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    pagina.value = 1;
    void cargar();
  }, 350);
});

onMounted(() => void cargar());
onBeforeUnmount(() => {
  if (temporizador) clearTimeout(temporizador);
});
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <TituloConAyuda
        clase-eyebrow="text-primary"
        eyebrow="Clientes SaaS"
        titulo="Organizaciones"
        ayuda="Consulta empresas, tenants, instalaciones y suscripciones registradas en la base principal."
      />
      <Button variant="outline" @click="informarProvisionamiento">
        Nueva organización
      </Button>
    </div>

    <div v-if="mensaje" class="border-l-4 border-l-amber-500 bg-amber-500/10 px-4 py-3 text-sm font-semibold">
      {{ mensaje }}
    </div>
    <div v-if="error" class="border-l-4 border-l-red-500 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">
      {{ error }}
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-if="cargando" v-for="item in 4" :key="item" class="h-24" />
      <Card v-else v-for="item in [
        { etiqueta: 'Instalaciones', valor: resumen.total, icono: Building2 },
        { etiqueta: 'Habilitadas', valor: resumen.habilitadas, icono: ShieldCheck },
        { etiqueta: 'Pendientes', valor: resumen.pendientes, icono: Database },
        { etiqueta: 'Con suscripción', valor: resumen.conSuscripcion, icono: Building2 },
      ]" :key="item.etiqueta" class="border-border bg-card">
        <CardContent class="flex items-center gap-4 p-5">
          <span class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"><component :is="item.icono" class="h-5 w-5" /></span>
          <div><strong class="text-2xl font-black">{{ item.valor }}</strong><p class="text-xs text-muted-foreground">{{ item.etiqueta }}</p></div>
        </CardContent>
      </Card>
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div class="grid gap-3 border-b border-border p-5 lg:grid-cols-[minmax(18rem,1fr)_15rem_15rem]">
          <label class="relative block">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <InputText v-model="busqueda" class="filtro-control w-full pl-10" placeholder="Nombre, documento o tipo" />
          </label>
          <Select v-model="estado" :options="opcionesEstado" option-label="label" option-value="value" class="filtro-control w-full" />
          <InputText v-model="plan" class="filtro-control w-full" placeholder="Plan o TODOS" />
        </div>

        <div v-if="cargando" class="space-y-2 p-5"><Skeleton v-for="item in 6" :key="item" class="h-12" /></div>
        <DataTable
          v-else
          :value="organizaciones"
          data-key="id"
          lazy
          paginator
          :first="(pagina - 1) * porPagina"
          :rows="porPagina"
          :total-records="totalRegistros"
          :rows-per-page-options="[10, 20, 50]"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          current-page-report-template="{first}–{last} de {totalRecords} organizaciones"
          size="small"
          scrollable
          table-style="min-width: 78rem"
          class="tabla-administracion"
          @page="cambiarPagina"
        >
          <template #empty><div class="py-12 text-center text-sm text-muted-foreground">No existen organizaciones con estos filtros.</div></template>
          <Column field="nombre" header="Organización" style="min-width:17rem"><template #body="{ data }"><strong>{{ data.nombre }}</strong><p class="text-xs text-muted-foreground">{{ data.ruc }} · {{ data.tipo }}</p></template></Column>
          <Column field="plan" header="Plan" style="min-width:12rem"><template #body="{ data }"><strong>{{ data.plan }}</strong><p class="text-xs text-muted-foreground">{{ data.estadoSuscripcion ?? 'Sin suscripción' }}</p></template></Column>
          <Column field="usuarios" header="Accesos" style="min-width:9rem"><template #body="{ data }">{{ data.usuarios }}<span v-if="data.limiteUsuarios" class="text-muted-foreground"> / {{ data.limiteUsuarios }}</span></template></Column>
          <Column field="cursos" header="Cursos catálogo" style="min-width:9rem" />
          <Column field="modulos" header="Módulos" style="min-width:8rem" />
          <Column header="Vigencia" style="min-width:11rem"><template #body="{ data }">{{ vigencia(data) }}</template></Column>
          <Column field="estado" header="Instalación" style="min-width:10rem"><template #body="{ data }"><Tag :severity="severidad(data.estado)" :value="data.estado" /></template></Column>
          <Column header="Detalle" style="min-width:13rem"><template #body="{ data }"><div class="text-xs"><p>{{ data.clasificacion }} · {{ data.facturable ? 'Facturable' : 'No facturable' }}</p><p class="mt-1">Zona: {{ data.zonaHoraria }}</p><p class="mt-1 text-muted-foreground">Tenant {{ data.tenantRef.slice(0, 8) }}…</p></div></template></Column>
          <Column header="Acciones" style="min-width:18rem"><template #body="{ data }"><div class="flex gap-2"><Button size="sm" variant="outline" @click="abrirModulos(data)"><Settings2 class="h-4 w-4" />Módulos</Button><Button size="sm" variant="outline" @click="abrirConexion(data)"><Database class="h-4 w-4" />Conexión</Button></div></template></Column>
        </DataTable>
      </CardContent>
    </Card>
    <Dialog v-model:visible="dialogoAlta" modal header="Nueva organización" :style="{ width: 'min(44rem, calc(100vw - 2rem))' }">
      <div class="mb-4 border-l-4 border-l-amber-500 bg-amber-500/10 p-4 text-sm">Los responsables deben haber iniciado sesión previamente con Google. La base secundaria quedará en estado pendiente.</div>
      <div class="grid gap-4 sm:grid-cols-2">
        <label><span class="filtro-label">Código</span><InputText v-model="alta.codigo" class="filtro-control w-full" placeholder="EMPRESA_ABC" /></label>
        <label><span class="filtro-label">RUC</span><InputText v-model="alta.numeroDocumento" class="filtro-control w-full" /></label>
        <label class="sm:col-span-2"><span class="filtro-label">Razón social</span><InputText v-model="alta.razonSocial" class="filtro-control w-full" /></label>
        <label class="sm:col-span-2"><span class="filtro-label">Nombre comercial</span><InputText v-model="alta.nombreComercial" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Correo de Dirección</span><InputText v-model="alta.correoDireccion" type="email" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Correo de Administración</span><InputText v-model="alta.correoAdministracion" type="email" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">País</span><Select v-model="alta.paisCodigo" :options="['PE']" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Zona horaria</span><Select v-model="alta.zonaHoraria" :options="['America/Lima','America/Bogota','America/Santiago']" class="filtro-control w-full" /></label>
      </div>
      <template #footer><Button variant="outline" @click="dialogoAlta = false">Cancelar</Button><Button :disabled="guardandoAlta || !alta.codigo.trim() || !alta.razonSocial.trim() || !alta.numeroDocumento.trim() || !alta.correoDireccion.trim() || !alta.correoAdministracion.trim()" @click="crearOrganizacion">{{ guardandoAlta ? 'Creando…' : 'Crear organización' }}</Button></template>
    </Dialog>
    <Dialog v-model:visible="dialogoConexion" modal :header="`Base secundaria · ${conexionOrganizacion?.nombre ?? ''}`" :style="{ width: 'min(42rem, calc(100vw - 2rem))' }">
      <div class="mb-4 border-l-4 border-l-primary bg-primary/10 p-4 text-sm">Aquí solo se registra la referencia. No ingreses URL, contraseña, anon key ni service_role.</div>
      <div class="grid gap-4 sm:grid-cols-2">
        <label><span class="filtro-label">Project ref Supabase</span><InputText v-model="conexion.servidorRef" class="filtro-control w-full" placeholder="abcdefghijklmno" /></label>
        <label><span class="filtro-label">Nombre lógico</span><InputText v-model="conexion.nombreBaseLogico" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Nombre del secreto</span><InputText v-model="conexion.secretoRef" class="filtro-control w-full" placeholder="SUPABASE_SECONDARY_..." /></label>
        <label><span class="filtro-label">Región</span><InputText v-model="conexion.region" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Versión de esquema</span><InputNumber v-model="conexion.versionEsquema" :min="1" class="w-full" input-class="filtro-control w-full" /></label>
        <div class="border border-border p-3 text-sm"><b>Estado: {{ conexion.estado }}</b><p v-if="conexion.verificadaEn" class="mt-1 text-xs">Verificada: {{ fecha(conexion.verificadaEn) }}</p><p v-if="conexion.ultimoError" class="mt-1 text-xs text-red-600">{{ conexion.ultimoError }}</p></div>
      </div>
      <template #footer><Button variant="outline" @click="dialogoConexion=false">Cerrar</Button><Button variant="outline" :disabled="verificandoConexion || conexion.estado === 'SIN CONFIGURAR'" @click="verificarConexion">{{ verificandoConexion ? 'Verificando…' : 'Verificar conexión' }}</Button><Button :disabled="guardandoConexion || !conexion.servidorRef.trim() || !conexion.nombreBaseLogico.trim() || !conexion.secretoRef.trim()" @click="guardarConexion">{{ guardandoConexion ? 'Guardando…' : 'Guardar referencia' }}</Button></template>
    </Dialog>
    <Dialog v-model:visible="dialogoModulos" modal :header="`Módulos · ${organizacionModulos?.nombre ?? ''}`" :style="{ width: 'min(44rem, calc(100vw - 2rem))' }">
      <div v-if="cargandoModulos" class="space-y-2"><Skeleton v-for="item in 6" :key="item" class="h-16" /></div>
      <div v-else class="grid gap-3">
        <article v-for="modulo in modulos" :key="modulo.id" class="flex items-center gap-4 border border-border p-4">
          <div class="flex-1"><p class="font-black">{{ modulo.nombre }}</p><p class="mt-1 text-xs text-muted-foreground">{{ modulo.descripcion }} · {{ modulo.portal }}</p></div>
          <ToggleSwitch v-model="modulo.habilitado" :aria-label="`Habilitar ${modulo.nombre}`" @change="cambiarModulo(modulo)" />
        </article>
        <p v-if="!modulos.length" class="py-8 text-center text-sm text-muted-foreground">No existe un catálogo de módulos activo.</p>
      </div>
    </Dialog>
  </section>
</template>
