<script setup lang="ts">
import { Building2, Mail, Plus, Search, UserCog } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { computed, onMounted, reactive, ref } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { administracionService } from "@/api/services/administracion.service";
import type { OrganizacionAdministrada } from "../data/administracion.mock";

const cargando = ref(true);
const organizaciones = ref<OrganizacionAdministrada[]>([]);
const busqueda = ref("");
const estado = ref("TODOS");
const plan = ref("TODOS");
const dialogoAbierto = ref(false);
const mensaje = ref("");
const errorRegistro = ref("");

const nuevaOrganizacion = reactive({
  nombre: "",
  ruc: "",
  tipo: "Empresa",
  plan: "Empresa Básica",
  limiteUsuarios: 200,
  directorNombre: "",
  directorCorreo: "",
  administradorNombre: "",
  administradorCorreo: "",
});

const correoValido = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
const formularioValido = computed(
  () =>
    nuevaOrganizacion.nombre.trim() &&
    /^\d{11}$/.test(nuevaOrganizacion.ruc.trim()) &&
    nuevaOrganizacion.directorNombre.trim() &&
    correoValido(nuevaOrganizacion.directorCorreo) &&
    nuevaOrganizacion.administradorNombre.trim() &&
    correoValido(nuevaOrganizacion.administradorCorreo) &&
    nuevaOrganizacion.directorCorreo.trim().toLowerCase() !==
      nuevaOrganizacion.administradorCorreo.trim().toLowerCase(),
);

const opcionesEstado = [
  { label: "Todos los estados", value: "TODOS" },
  { label: "Activa", value: "ACTIVA" },
  { label: "En prueba", value: "PRUEBA" },
  { label: "Por vencer", value: "POR_VENCER" },
  { label: "Suspendida", value: "SUSPENDIDA" },
];
const opcionesPlan = [
  { label: "Todos los planes", value: "TODOS" },
  { label: "Individual", value: "Individual" },
  { label: "Empresa Básica", value: "Empresa Básica" },
  { label: "Empresa Pro", value: "Empresa Pro" },
  { label: "Prueba empresarial", value: "Prueba empresarial" },
];

onMounted(async () => {
  try {
    organizaciones.value = await administracionService.organizaciones.listar();
  } finally {
    cargando.value = false;
  }
});

const filtradas = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  return organizaciones.value.filter(
    (item) =>
      (!termino ||
        [item.nombre, item.ruc, item.tipo].some((valor) =>
          valor.toLowerCase().includes(termino),
        )) &&
      (estado.value === "TODOS" || item.estado === estado.value) &&
      (plan.value === "TODOS" || item.plan === plan.value),
  );
});

const resumen = computed(() => ({
  total: organizaciones.value.length,
  activas: organizaciones.value.filter((item) => item.estado === "ACTIVA")
    .length,
  atencion: organizaciones.value.filter((item) => item.estado === "POR_VENCER")
    .length,
  usuarios: organizaciones.value.reduce(
    (total, item) => total + item.usuarios,
    0,
  ),
}));

function severidad(estadoOrganizacion: string) {
  if (estadoOrganizacion === "ACTIVA") return "success";
  if (estadoOrganizacion === "SUSPENDIDA") return "danger";
  if (estadoOrganizacion === "POR_VENCER") return "warn";
  return "info";
}

function textoEstado(estadoOrganizacion: string) {
  return estadoOrganizacion.replace("_", " ");
}

async function alternarEstado(organizacion: OrganizacionAdministrada) {
  organizacion.estado =
    organizacion.estado === "SUSPENDIDA" ? "ACTIVA" : "SUSPENDIDA";
  await administracionService.organizaciones.actualizar(organizacion.id, {
    estado: organizacion.estado,
  });
  mensaje.value = `${organizacion.nombre}: estado actualizado a ${textoEstado(organizacion.estado).toLowerCase()}.`;
}

async function registrarOrganizacion() {
  errorRegistro.value = "";
  if (!formularioValido.value) {
    errorRegistro.value = "Completa los datos requeridos. Dirección y Administración deben usar correos válidos y diferentes.";
    return;
  }
  const registrada: OrganizacionAdministrada = {
    id: `org-${Date.now()}`,
    nombre: nuevaOrganizacion.nombre.trim(),
    ruc: nuevaOrganizacion.ruc.trim(),
    tipo: nuevaOrganizacion.tipo,
    plan: nuevaOrganizacion.plan,
    usuarios: 2,
    limiteUsuarios: nuevaOrganizacion.limiteUsuarios,
    cursos: 0,
    vence: "2027-07-15",
    estado: "PRUEBA",
  };
  let resultado;
  try {
    resultado = await administracionService.registrarOrganizacionConResponsables({
      organizacion: registrada,
      direccion: {
        nombre: nuevaOrganizacion.directorNombre.trim(),
        correo: nuevaOrganizacion.directorCorreo.trim().toLowerCase(),
      },
      administracion: {
        nombre: nuevaOrganizacion.administradorNombre.trim(),
        correo: nuevaOrganizacion.administradorCorreo.trim().toLowerCase(),
      },
    });
  } catch (error) {
    errorRegistro.value = error instanceof Error ? error.message : "No se pudo registrar la organización.";
    return;
  }
  organizaciones.value.unshift(resultado.organizacion);
  mensaje.value = `${nuevaOrganizacion.nombre} fue registrada. Se enviaron ${resultado.invitacionesEnviadas} correos con accesos temporales.`;
  Object.assign(nuevaOrganizacion, {
    nombre: "",
    ruc: "",
    tipo: "Empresa",
    plan: "Empresa Básica",
    limiteUsuarios: 200,
    directorNombre: "",
    directorCorreo: "",
    administradorNombre: "",
    administradorCorreo: "",
  });
  dialogoAbierto.value = false;
}
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[.2em] text-violet-700">
          Clientes SaaS
        </p>
        <h1 class="mt-2 text-3xl font-black">Organizaciones</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Administra altas, planes, vigencias, consumo y suspensión de cada
          entidad.
        </p>
      </div>
      <Button
        class="bg-violet-800 hover:bg-violet-900"
        @click="dialogoAbierto = true"
      >
        <Plus class="h-4 w-4" /> Nueva organización
      </Button>
    </div>

    <div
      v-if="mensaje"
      class="border-l-4 border-l-teal-600 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
    >
      {{ mensaje }}
    </div>

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-24 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="item in [
          { etiqueta: 'Organizaciones', valor: resumen.total },
          { etiqueta: 'Licencias activas', valor: resumen.activas },
          { etiqueta: 'Requieren atención', valor: resumen.atencion },
          {
            etiqueta: 'Usuarios gestionados',
            valor: resumen.usuarios.toLocaleString('es-PE'),
          },
        ]"
        :key="item.etiqueta"
        class="border-border bg-card"
      >
        <CardContent class="flex items-center gap-4 p-5">
          <div
            class="grid h-11 w-11 place-items-center bg-violet-50 text-violet-700"
          >
            <Building2 class="h-5 w-5" />
          </div>
          <div>
            <strong class="text-2xl font-black">{{ item.valor }}</strong>
            <p class="text-xs text-muted-foreground">{{ item.etiqueta }}</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div
          class="grid gap-3 border-b border-border p-5 lg:grid-cols-[minmax(18rem,1fr)_15rem_15rem]"
        >
          <label class="relative block">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <InputText
              v-model="busqueda"
              class="filtro-control w-full pl-10"
              placeholder="Buscar organización, RUC o tipo"
            />
          </label>
          <Select
            v-model="estado"
            :options="opcionesEstado"
            option-label="label"
            option-value="value"
            class="filtro-control w-full"
          />
          <Select
            v-model="plan"
            :options="opcionesPlan"
            option-label="label"
            option-value="value"
            class="filtro-control w-full"
          />
        </div>

        <div v-if="cargando" class="space-y-2 p-5">
          <Skeleton v-for="item in 6" :key="item" class="h-12 w-full" />
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
          current-page-report-template="{first}–{last} de {totalRecords} organizaciones"
          :always-show-paginator="false"
          table-style="min-width: 82rem"
        >
          <template #empty
            ><div class="py-12 text-center text-sm text-muted-foreground">
              No existen organizaciones con estos filtros.
            </div></template
          >
          <Column
            field="nombre"
            header="Organización"
            sortable
            style="min-width: 17rem"
          >
            <template #body="{ data }"
              ><div>
                <strong>{{ data.nombre }}</strong>
                <p class="text-xs text-muted-foreground">
                  RUC {{ data.ruc }} · {{ data.tipo }}
                </p>
              </div></template
            >
          </Column>
          <Column
            field="plan"
            header="Plan"
            sortable
            style="min-width: 11rem"
          />
          <Column
            field="usuarios"
            header="Usuarios"
            sortable
            style="min-width: 11rem"
          >
            <template #body="{ data }"
              ><div class="w-32">
                <div class="flex justify-between text-xs">
                  <b>{{ data.usuarios }}</b
                  ><span>/ {{ data.limiteUsuarios }}</span>
                </div>
                <div class="mt-1.5 h-1.5 bg-muted">
                  <div
                    class="h-full bg-violet-700"
                    :style="{
                      width: `${Math.min((data.usuarios / data.limiteUsuarios) * 100, 100)}%`,
                    }"
                  />
                </div></div
            ></template>
          </Column>
          <Column
            field="cursos"
            header="Cursos"
            sortable
            style="min-width: 7rem"
          />
          <Column
            field="vence"
            header="Vigencia"
            sortable
            style="min-width: 10rem"
          />
          <Column
            field="estado"
            header="Estado"
            sortable
            style="min-width: 10rem"
          >
            <template #body="{ data }"
              ><Tag
                :severity="severidad(data.estado)"
                :value="textoEstado(data.estado)"
            /></template>
          </Column>
          <Column header="Acciones" style="min-width: 15rem">
            <template #body="{ data }"
              ><div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  @click="
                    mensaje = `Abriendo ficha operativa de ${data.nombre}.`
                  "
                  >Ver detalle</Button
                ><Button
                  size="sm"
                  :variant="
                    data.estado === 'SUSPENDIDA' ? 'default' : 'outline'
                  "
                  @click="alternarEstado(data)"
                  >{{
                    data.estado === "SUSPENDIDA" ? "Reactivar" : "Suspender"
                  }}</Button
                >
              </div></template
            >
          </Column>
        </DataTable>
      </CardContent>
    </Card>

    <Dialog
      v-model:visible="dialogoAbierto"
      modal
      header="Registrar organización"
      :style="{ width: 'min(92vw, 52rem)' }"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="sm:col-span-2"
          ><span
            class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
            >Nombre legal</span
          ><InputText
            v-model="nuevaOrganizacion.nombre"
            class="filtro-control w-full"
            placeholder="Nombre de la organización"
        /></label>
        <label
          ><span
            class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
            >RUC</span
          ><InputText
            v-model="nuevaOrganizacion.ruc"
            class="filtro-control w-full"
            maxlength="11"
            placeholder="20123456789"
        /></label>
        <label
          ><span
            class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
            >Tipo</span
          ><Select
            v-model="nuevaOrganizacion.tipo"
            :options="[
              'Empresa',
              'Academia',
              'Instituto',
              'Universidad',
              'ONG',
              'Entidad pública',
            ]"
            class="filtro-control w-full"
        /></label>
        <label
          ><span
            class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
            >Plan inicial</span
          ><Select
            v-model="nuevaOrganizacion.plan"
            :options="['Individual', 'Empresa Básica', 'Empresa Pro']"
            class="filtro-control w-full"
        /></label>
        <label
          ><span
            class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
            >Límite de usuarios</span
          ><InputNumber
            v-model="nuevaOrganizacion.limiteUsuarios"
            :min="1"
            :use-grouping="false"
            class="filtro-control w-full"
            input-class="w-full"
        /></label>
      </div>
      <div class="mt-6 border-t border-border pt-5">
        <div class="flex items-start gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center bg-violet-100 text-violet-800">
            <UserCog class="h-5 w-5" />
          </span>
          <div>
            <h3 class="font-black">Responsables iniciales</h3>
            <p class="mt-1 text-xs text-muted-foreground">
              Se crearán las cuentas obligatorias de Dirección y Administración. Cada persona recibirá por correo una contraseña temporal que deberá cambiar en su primer ingreso.
            </p>
          </div>
        </div>

        <div class="mt-5 grid gap-5 md:grid-cols-2">
          <div class="border border-border p-4">
            <p class="text-xs font-black uppercase tracking-[.16em] text-violet-800">Dirección</p>
            <p class="mt-1 text-xs text-muted-foreground">Máxima autoridad de la entidad.</p>
            <label class="mt-4 block">
              <span class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground">Nombre completo *</span>
              <InputText v-model="nuevaOrganizacion.directorNombre" class="filtro-control w-full" placeholder="Nombre del director o directora" />
            </label>
            <label class="mt-4 block">
              <span class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground">Correo de acceso *</span>
              <InputText v-model="nuevaOrganizacion.directorCorreo" type="email" class="filtro-control w-full" placeholder="direccion@organizacion.com" />
            </label>
          </div>

          <div class="border border-border p-4">
            <p class="text-xs font-black uppercase tracking-[.16em] text-violet-800">Administración</p>
            <p class="mt-1 text-xs text-muted-foreground">Gestionará estructura, personas y cursos.</p>
            <label class="mt-4 block">
              <span class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground">Nombre completo *</span>
              <InputText v-model="nuevaOrganizacion.administradorNombre" class="filtro-control w-full" placeholder="Nombre del administrador o administradora" />
            </label>
            <label class="mt-4 block">
              <span class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground">Correo de acceso *</span>
              <InputText v-model="nuevaOrganizacion.administradorCorreo" type="email" class="filtro-control w-full" placeholder="administracion@organizacion.com" />
            </label>
          </div>
        </div>
      </div>
      <div
        class="mt-5 flex gap-3 border-l-4 border-l-violet-700 bg-violet-50 p-4 text-xs text-violet-950"
      >
        <Mail class="h-5 w-5 shrink-0" />
        <p>
          La organización iniciará en prueba. Por seguridad, las contraseñas temporales no se muestran en este panel y solo se entregan a los correos registrados.
        </p>
      </div>
      <div v-if="errorRegistro" class="mt-4 border-l-4 border-l-red-600 bg-red-50 p-3 text-xs font-semibold text-red-800">
        {{ errorRegistro }}
      </div>
      <template #footer
        ><Button variant="outline" @click="dialogoAbierto = false"
          >Cancelar</Button
        ><Button
          class="bg-violet-800 hover:bg-violet-900"
          :disabled="!formularioValido"
          @click="registrarOrganizacion"
          >Registrar organización</Button
        ></template
      >
    </Dialog>
  </section>
</template>
