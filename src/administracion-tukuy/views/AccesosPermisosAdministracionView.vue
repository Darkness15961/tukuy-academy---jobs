<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { KeyRound, Plus, Search, ShieldCheck, UserRoundCog } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";

import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  accesosPrincipalService,
  type AccesoPrincipal,
  type CatalogoAccesosPrincipal,
  type ResumenAccesosPrincipal,
} from "@/api/services/accesos-principal.service";

const cargando = ref(true);
const route = useRoute();
const guardando = ref(false);
const dialogo = ref(false);
const busqueda = ref("");
const filtroNivel = ref("TODOS");
const mensaje = ref("");
const error = ref("");
const accesos = ref<AccesoPrincipal[]>([]);
const pagina = ref(1);
const porPagina = ref(10);
const totalRegistros = ref(0);
const resumen = ref<ResumenAccesosPrincipal>({
  identidades: 0,
  sinAcceso: 0,
  accesosActivos: 0,
  funcionesPlataforma: 0,
  organizacionesDelegadas: 0,
});
let temporizadorBusqueda: ReturnType<typeof setTimeout> | undefined;
const catalogo = ref<CatalogoAccesosPrincipal>({ perfiles: [], permisos: [], organizaciones: [] });
const formulario = reactive({ correo: "", perfilCodigo: "", instalacionRef: null as string | null });

const perfilSeleccionado = computed(() =>
  catalogo.value.perfiles.find((perfil) => perfil.codigo === formulario.perfilCodigo),
);
const requiereOrganizacion = computed(() => perfilSeleccionado.value?.nivel === "ORGANIZACION");

function organizacionPredeterminada() {
  return catalogo.value.organizaciones.find((organizacion) =>
    organizacion.nombre.trim().toLocaleLowerCase().includes("tukuy academy"),
  ) ?? catalogo.value.organizaciones[0] ?? null;
}

function sincronizarOrganizacionPredeterminada() {
  if (!requiereOrganizacion.value) {
    formulario.instalacionRef = null;
    return;
  }

  if (!formulario.instalacionRef && formulario.correo.trim()) {
    formulario.instalacionRef = organizacionPredeterminada()?.instalacionId ?? null;
  }
}
const perfilesAsignables = computed(() =>
  catalogo.value.perfiles.filter((perfil) => perfil.codigo !== "SUPER_ADMIN"),
);
const permisosPlantilla = computed(() => {
  const codigos = new Set(perfilSeleccionado.value?.permisos ?? []);
  return catalogo.value.permisos.filter((permiso) => codigos.has(permiso.codigo));
});
const formularioValido = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.correo.trim()) &&
  Boolean(formulario.perfilCodigo) && (!requiereOrganizacion.value || Boolean(formulario.instalacionRef)),
);

watch(
  [() => formulario.correo, () => formulario.perfilCodigo, () => catalogo.value.organizaciones.length],
  sincronizarOrganizacionPredeterminada,
);

async function cargar() {
  cargando.value = true;
  error.value = "";
  try {
    const [catalogoRespuesta, paginaRespuesta] = await Promise.all([
      accesosPrincipalService.obtenerCatalogo(),
      accesosPrincipalService.listar({
        pagina: pagina.value,
        porPagina: porPagina.value,
        buscar: busqueda.value,
        nivel: filtroNivel.value,
      }),
    ]);
    catalogo.value = catalogoRespuesta;
    accesos.value = paginaRespuesta.datos;
    totalRegistros.value = paginaRespuesta.total;
    resumen.value = paginaRespuesta.resumen;
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : "No se pudo cargar el centro de accesos.";
  } finally {
    cargando.value = false;
  }
}

async function cargarAccesos() {
  cargando.value = true;
  error.value = "";
  try {
    const respuesta = await accesosPrincipalService.listar({
      pagina: pagina.value,
      porPagina: porPagina.value,
      buscar: busqueda.value,
      nivel: filtroNivel.value,
    });
    accesos.value = respuesta.datos;
    totalRegistros.value = respuesta.total;
    resumen.value = respuesta.resumen;
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : "No se pudo cargar el listado.";
  } finally {
    cargando.value = false;
  }
}

function cambiarPagina(evento: { first: number; rows: number }) {
  porPagina.value = evento.rows;
  pagina.value = Math.floor(evento.first / evento.rows) + 1;
  void cargarAccesos();
}

function abrirAsignacion() {
  Object.assign(formulario, { correo: "", perfilCodigo: "", instalacionRef: null });
  error.value = "";
  dialogo.value = true;
}

function asignarA(acceso: AccesoPrincipal) {
  abrirAsignacion();
  formulario.correo = acceso.correo;
}

async function asignar() {
  if (!formularioValido.value) return;
  guardando.value = true;
  error.value = "";
  try {
    await accesosPrincipalService.asignar(formulario);
    dialogo.value = false;
    mensaje.value = `Acceso ${perfilSeleccionado.value?.nombre ?? ""} asignado correctamente.`;
    pagina.value = 1;
    await cargarAccesos();
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : "No se pudo asignar el acceso.";
  } finally {
    guardando.value = false;
  }
}

async function alternarEstado(acceso: AccesoPrincipal) {
  if (!acceso.funcionId || acceso.estadoFuncion === "SIN_ACCESO") return;
  const estado = acceso.estadoFuncion === "ACTIVA" ? "SUSPENDIDA" : "ACTIVA";
  try {
    await accesosPrincipalService.cambiarEstado(acceso.funcionId, estado);
    acceso.estadoFuncion = estado;
    mensaje.value = `${acceso.nombre}: acceso ${estado === "ACTIVA" ? "reactivado" : "suspendido"}.`;
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : "No se pudo modificar el acceso.";
  }
}

onMounted(() => {
  if (typeof route.query.buscar === "string") busqueda.value = route.query.buscar;
  void cargar();
});

watch([busqueda, filtroNivel], () => {
  if (temporizadorBusqueda) clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(() => {
    pagina.value = 1;
    void cargarAccesos();
  }, 350);
});

onBeforeUnmount(() => {
  if (temporizadorBusqueda) clearTimeout(temporizadorBusqueda);
});
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <TituloConAyuda
        clase-eyebrow="text-primary"
        eyebrow="Gobierno de identidades"
        titulo="Accesos y permisos"
        ayuda="Delega funciones de plataforma u organización sin duplicar usuarios y manteniendo un único origen de identidad."
      />
      <Button class="bg-primary hover:bg-primary/90" @click="abrirAsignacion">
        <Plus class="h-4 w-4" /> Asignar acceso
      </Button>
    </div>

    <div v-if="mensaje" class="border-l-4 border-l-teal-500 bg-teal-500/10 px-4 py-3 text-sm font-semibold text-teal-800 dark:text-teal-200">{{ mensaje }}</div>
    <div v-if="error && !dialogo" class="border-l-4 border-l-red-500 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200">{{ error }}</div>

    <div class="grid gap-4 md:grid-cols-3">
      <Skeleton v-if="cargando" v-for="item in 3" :key="item" class="h-28" />
      <Card v-else v-for="item in [
        { etiqueta: 'Identidades registradas', valor: resumen.identidades, icono: UserRoundCog },
        { etiqueta: 'Accesos activos', valor: resumen.accesosActivos, icono: ShieldCheck },
        { etiqueta: 'Sin acceso asignado', valor: resumen.sinAcceso, icono: KeyRound },
      ]" :key="item.etiqueta" class="border-border bg-card">
        <CardContent class="flex items-center gap-4 p-5">
          <span class="grid h-12 w-12 place-items-center bg-primary/10 text-primary"><component :is="item.icono" class="h-6 w-6" /></span>
          <div><strong class="text-3xl font-black">{{ item.valor }}</strong><p class="text-xs text-muted-foreground">{{ item.etiqueta }}</p></div>
        </CardContent>
      </Card>
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div class="grid gap-3 border-b border-border p-5 md:grid-cols-[1fr_16rem]">
          <label class="relative block">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <InputText v-model="busqueda" class="filtro-control w-full pl-10" placeholder="Persona, correo, perfil u organización" />
          </label>
          <Select v-model="filtroNivel" :options="[
            { label: 'Todos los alcances', value: 'TODOS' },
            { label: 'Plataforma', value: 'PLATAFORMA' },
            { label: 'Sin acceso asignado', value: 'SIN_ACCESO' },
            { label: 'Organización', value: 'ORGANIZACION' },
          ]" option-label="label" option-value="value" class="filtro-control w-full" />
        </div>
        <div v-if="cargando" class="space-y-2 p-5"><Skeleton v-for="item in 5" :key="item" class="h-14" /></div>
        <DataTable
          v-else
          :value="accesos"
          :data-key="(data: AccesoPrincipal) => data.funcionId ?? data.identidadId"
          lazy
          paginator
          :first="(pagina - 1) * porPagina"
          :rows="porPagina"
          :total-records="totalRegistros"
          :rows-per-page-options="[10, 20, 50]"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          current-page-report-template="{first}–{last} de {totalRecords} identidades y accesos"
          size="small"
          scrollable
          table-style="min-width: 74rem"
          class="tabla-administracion"
          @page="cambiarPagina"
        >
          <template #empty><div class="py-12 text-center text-sm text-muted-foreground">No hay accesos con estos filtros.</div></template>
          <Column header="Identidad" style="min-width:18rem"><template #body="{ data }"><div class="flex items-center gap-3"><img v-if="data.avatarUrl" :src="data.avatarUrl" class="h-10 w-10 rounded-full object-cover" alt="" referrerpolicy="no-referrer" /><span v-else class="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary">{{ data.nombre.slice(0, 2).toUpperCase() }}</span><div><strong>{{ data.nombre }}</strong><p class="text-xs text-muted-foreground">{{ data.correo }}</p></div></div></template></Column>
          <Column field="perfilNombre" header="Perfil" style="min-width:14rem"><template #body="{ data }"><strong>{{ data.perfilNombre ?? 'Sin perfil' }}</strong><p class="text-xs text-muted-foreground">{{ data.portal ? `${data.portal} · ${data.permisos.length} permisos` : 'Pendiente de asignación' }}</p></template></Column>
          <Column field="organizacionNombre" header="Espacio" style="min-width:15rem" />
          <Column field="estadoFuncion" header="Estado" style="min-width:9rem"><template #body="{ data }"><Tag :severity="data.estadoFuncion === 'ACTIVA' ? 'success' : data.estadoFuncion === 'SIN_ACCESO' ? 'warn' : 'danger'" :value="data.estadoFuncion === 'SIN_ACCESO' ? 'SIN ACCESO' : data.estadoFuncion" /></template></Column>
          <Column header="Acciones" style="min-width:12rem"><template #body="{ data }"><Button v-if="data.estadoFuncion === 'SIN_ACCESO'" size="sm" @click="asignarA(data)">Asignar acceso</Button><Button v-else-if="data.perfilCodigo !== 'SUPER_ADMIN'" size="sm" variant="outline" @click="alternarEstado(data)">{{ data.estadoFuncion === 'ACTIVA' ? 'Suspender' : 'Reactivar' }}</Button><span v-else class="text-xs font-bold text-muted-foreground">Acceso raíz protegido</span></template></Column>
        </DataTable>
      </CardContent>
    </Card>

    <Dialog v-model:visible="dialogo" modal header="Asignar acceso" :style="{ width: 'min(94vw, 46rem)' }">
      <div class="grid gap-5">
        <div class="border-l-4 border-l-primary bg-primary/8 p-4 text-sm">
          La persona debe haber iniciado sesión o haber sido invitada previamente mediante Supabase Auth. Aquí se asigna su función de negocio, no se duplica su identidad.
        </div>
        <label><span class="filtro-label">Correo de la identidad</span><InputText v-model="formulario.correo" type="email" class="filtro-control w-full" placeholder="persona@organizacion.com" /></label>
        <label><span class="filtro-label">Perfil a delegar</span><Select v-model="formulario.perfilCodigo" :options="perfilesAsignables" option-label="nombre" option-value="codigo" class="filtro-control w-full" placeholder="Selecciona un perfil" @change="sincronizarOrganizacionPredeterminada" /></label>
        <label v-if="requiereOrganizacion"><span class="filtro-label">Organización</span><Select v-model="formulario.instalacionRef" :options="catalogo.organizaciones" option-label="nombre" option-value="instalacionId" class="filtro-control w-full" placeholder="Selecciona la organización" /><small class="mt-1 block text-muted-foreground">Tukuy Academy se selecciona por defecto. Podrás cambiarla cuando existan otras organizaciones.</small></label>
        <div v-if="perfilSeleccionado" class="border border-border p-4">
          <p class="font-black">{{ perfilSeleccionado.nombre }}</p>
          <p class="mt-1 text-sm text-muted-foreground">{{ perfilSeleccionado.descripcion }}</p>
          <div class="mt-3 flex flex-wrap gap-1.5"><Tag v-for="permiso in permisosPlantilla" :key="permiso.id" severity="secondary" :value="permiso.nombre" /></div>
        </div>
        <div v-if="error" class="border-l-4 border-l-red-500 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200">{{ error }}</div>
      </div>
      <template #footer><Button variant="outline" @click="dialogo = false">Cancelar</Button><Button :disabled="!formularioValido || guardando" class="bg-primary hover:bg-primary/90" @click="asignar">{{ guardando ? 'Asignando…' : 'Asignar perfil' }}</Button></template>
    </Dialog>
  </section>
</template>
