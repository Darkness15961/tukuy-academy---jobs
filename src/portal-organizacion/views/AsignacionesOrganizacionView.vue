<script setup lang="ts">
import { CalendarDays, CheckCircle2, Plus, Search, UsersRound } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { computed, onMounted, reactive, ref } from "vue";

import { organizacionService, type AsignacionOrganizacion, type UsuarioOrganizacion } from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { EstructuraOrganizacional, NivelOrganizacional, UnidadOrganizacional, VinculacionUnidad } from "@/portal-organizacion/types/estructura-organizacional.types";

type Asignacion = AsignacionOrganizacion;

const modal = ref(false);
const detalleVisible = ref(false);
const seleccionada = ref<Asignacion>();
const lista = ref<Asignacion[]>([]);
const unidades = ref<UnidadOrganizacional[]>([]);
const estructuras = ref<EstructuraOrganizacional[]>([]);
const niveles = ref<NivelOrganizacional[]>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const buscar = ref("");
const obligatoriedad = ref("TODOS");
const destino = ref("TODOS");
const nuevaAsignacion = reactive({
  curso: "Seguridad y salud en trabajos de obra",
  destinoId: "ENTIDAD",
  vence: "",
  obligatorio: true,
});

const opcionesCursos = [
  "Seguridad y salud en trabajos de obra",
  "Gestión digital de obras con Tukuy",
  "Control de almacén y Kardex",
  "Lectura de planos para personal de campo",
];
const opcionesDestinos = computed(() => [
  { label: "Toda la organización", value: "ENTIDAD" },
  ...unidades.value
    .filter((item) => item.estado === "ACTIVA")
    .map((unidad) => {
      const estructura = estructuras.value.find((item) => item.id === unidad.estructuraId);
      const nivel = niveles.value.find((item) => item.id === unidad.nivelId);
      return {
        label: `${estructura?.nombre ?? "Estructura"} · ${nivel?.nombre ?? "Nivel"} · ${unidad.nombre}`,
        value: unidad.id,
      };
    }),
]);
const opcionesObligatoriedad = [
  { label: "Todas", value: "TODOS" },
  { label: "Obligatorias", value: "OBLIGATORIAS" },
  { label: "Opcionales", value: "OPCIONALES" },
];
const opcionesFiltroDestino = computed(() => [
  { label: "Todos los destinos", value: "TODOS" },
  ...[...new Set(lista.value.map((item) => item.destino))].map((valor) => ({
    label: valor,
    value: valor,
  })),
]);

onMounted(async () => {
  [lista.value, estructuras.value, niveles.value, unidades.value, vinculaciones.value, usuarios.value] =
    await Promise.all([
      organizacionService.asignaciones.listar(),
      organizacionService.estructura.estructuras.listar(),
      organizacionService.estructura.niveles.listar(),
      organizacionService.estructura.unidades.listar(),
      organizacionService.estructura.vinculaciones.listar(),
      organizacionService.usuarios.listar(),
    ]);
});

function cantidadDestino(unidadId: string) {
  if (unidadId === "ENTIDAD") {
    return usuarios.value.filter((item) => item.estado === "ACTIVO").length;
  }
  const ids = new Set([unidadId]);
  let cambio = true;
  while (cambio) {
    cambio = false;
    unidades.value.forEach((unidad) => {
      if (unidad.unidadPadreId && ids.has(unidad.unidadPadreId) && !ids.has(unidad.id)) {
        ids.add(unidad.id);
        cambio = true;
      }
    });
  }
  return new Set(
    vinculaciones.value
      .filter((item) => item.estado === "ACTIVA" && ids.has(item.unidadId))
      .map((item) => item.usuarioId),
  ).size;
}

const visibles = computed(() => {
  const termino = buscar.value.trim().toLocaleLowerCase("es");
  return lista.value.filter((asignacion) => {
    const coincideTexto =
      !termino ||
      [asignacion.curso, asignacion.destino, asignacion.vence].some((valor) =>
        valor.toLocaleLowerCase("es").includes(termino),
      );
    const coincideDestino = destino.value === "TODOS" || asignacion.destino === destino.value;
    const coincideObligatoriedad =
      obligatoriedad.value === "TODOS" ||
      (obligatoriedad.value === "OBLIGATORIAS"
        ? asignacion.obligatorio
        : !asignacion.obligatorio);
    return coincideTexto && coincideDestino && coincideObligatoriedad;
  });
});

function porcentaje(asignacion: Asignacion) {
  if (!asignacion.asignados) return 0;
  return Math.round((asignacion.completados / asignacion.asignados) * 100);
}

async function crear() {
  const fecha = nuevaAsignacion.vence
    ? new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${nuevaAsignacion.vence}T00:00:00Z`))
    : "Sin fecha límite";
  const creada = await organizacionService.asignaciones.crear({
    id: `asig-${Date.now()}`,
    curso: nuevaAsignacion.curso,
    destino:
      nuevaAsignacion.destinoId === "ENTIDAD"
        ? "Toda la organización"
        : opcionesDestinos.value.find((item) => item.value === nuevaAsignacion.destinoId)?.label ?? "Nodo no disponible",
    destinoUnidadId: nuevaAsignacion.destinoId === "ENTIDAD" ? undefined : nuevaAsignacion.destinoId,
    incluirDescendientes: true,
    asignados: cantidadDestino(nuevaAsignacion.destinoId),
    completados: 0,
    vence: fecha,
    obligatorio: nuevaAsignacion.obligatorio,
  });
  lista.value.unshift(creada);
  modal.value = false;
}

function verProgreso(asignacion: Asignacion) {
  seleccionada.value = asignacion;
  detalleVisible.value = true;
}

function limpiarFiltros() {
  buscar.value = "";
  obligatoriedad.value = "TODOS";
  destino.value = "TODOS";
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap justify-between gap-4">
      <div>
        <TituloConAyuda
          titulo="Asignaciones"
          clase-titulo="text-2xl font-black"
          ayuda="Asigna cursos a personas, estructuras, nodos o toda la organización."
        />
      </div>
      <Button @click="modal = true"><Plus class="h-4 w-4" />Nueva asignación</Button>
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div class="grid gap-3 border-b border-border p-4 md:grid-cols-2 xl:grid-cols-4">
          <label class="grid gap-1.5 xl:col-span-2">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Buscar asignaciones</span>
            <span class="relative block">
              <Search class="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <InputText v-model="buscar" class="filtro-control w-full pl-10" placeholder="Curso, destino o fecha límite" />
            </span>
          </label>
          <label class="grid gap-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Destino</span>
            <Select v-model="destino" :options="opcionesFiltroDestino" option-label="label" option-value="value" class="filtro-control w-full" />
          </label>
          <label class="grid gap-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Modalidad</span>
            <Select v-model="obligatoriedad" :options="opcionesObligatoriedad" option-label="label" option-value="value" class="filtro-control w-full" />
          </label>
          <div class="md:col-span-2 xl:col-span-4 flex justify-end">
            <Button variant="outline" @click="limpiarFiltros">Limpiar filtros</Button>
          </div>
        </div>

        <DataTable
          class="tabla-estudiantes tabla-asignaciones"
          :value="visibles"
          data-key="id"
          size="small"
          scrollable
          scroll-height="calc(100dvh - 21rem)"
          removable-sort
          :paginator="visibles.length > 5"
          :rows="5"
          :rows-per-page-options="[5, 10, 20]"
          paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          current-page-report-template="{first}–{last} de {totalRecords} asignaciones"
          :always-show-paginator="false"
          table-style="min-width: 54rem; width: 100%"
        >
          <template #empty>
            <div class="py-12 text-center text-sm text-muted-foreground">
              No se encontraron asignaciones con estos filtros.
            </div>
          </template>

          <Column field="curso" header="Curso" sortable style="min-width: 12rem; max-width: 16rem">
            <template #body="{ data }">
              <strong class="line-clamp-2 leading-snug">{{ data.curso }}</strong>
              <p class="mt-0.5 text-[11px] text-muted-foreground">ID {{ data.id }}</p>
            </template>
          </Column>

          <Column field="destino" header="Destino" sortable style="min-width: 11rem; max-width: 15rem">
            <template #body="{ data }">
              <div class="flex items-start gap-2">
                <UsersRound class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span class="line-clamp-2 text-xs font-semibold leading-snug">
                  {{ data.destino }}
                </span>
              </div>
            </template>
          </Column>

          <Column
            field="asignados"
            header="Asignados"
            sortable
            style="min-width: 5.5rem; width: 5.5rem"
          >
            <template #body="{ data }">
              <span class="font-black tabular-nums">{{ data.asignados }}</span>
            </template>
          </Column>

          <Column
            header="Progreso"
            sortable
            sort-field="completados"
            style="min-width: 9rem; max-width: 11rem"
          >
            <template #body="{ data }">
              <div class="flex justify-between gap-2 text-[11px]">
                <span class="text-muted-foreground">
                  {{ data.completados }} listos
                </span>
                <b class="tabular-nums">{{ porcentaje(data) }}%</b>
              </div>
              <Progress :model-value="porcentaje(data)" class="mt-1.5 h-1.5" />
            </template>
          </Column>

          <Column
            field="vence"
            header="Límite"
            sortable
            style="min-width: 7.5rem; width: 8.5rem"
          >
            <template #body="{ data }">
              <div class="flex items-center gap-1.5 text-xs">
                <CalendarDays class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span class="truncate">{{ data.vence }}</span>
              </div>
            </template>
          </Column>

          <Column
            field="obligatorio"
            header="Tipo"
            sortable
            style="min-width: 6.5rem; width: 7rem"
          >
            <template #body="{ data }">
              <Tag
                :value="data.obligatorio ? 'Obligatorio' : 'Opcional'"
                :severity="data.obligatorio ? 'danger' : 'info'"
              />
            </template>
          </Column>

          <Column
            header=""
            style="min-width: 6.5rem; width: 7rem"
            :exportable="false"
          >
            <template #body="{ data }">
              <Button size="sm" variant="outline" @click="verProgreso(data)">
                Ver
              </Button>
            </template>
          </Column>
        </DataTable>
      </CardContent>
    </Card>

    <Dialog v-model:visible="modal" modal header="Nueva asignación" :style="{ width: 'min(36rem, calc(100vw - 2rem))' }">
      <div class="grid gap-4">
        <label><span class="filtro-label">Curso</span><Select v-model="nuevaAsignacion.curso" :options="opcionesCursos" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Destino estructural</span><Select v-model="nuevaAsignacion.destinoId" :options="opcionesDestinos" option-label="label" option-value="value" class="filtro-control w-full" /></label>
        <label><span class="filtro-label">Fecha límite</span><InputText v-model="nuevaAsignacion.vence" type="date" class="filtro-control w-full" /></label>
        <label class="flex items-center gap-2 text-sm"><input v-model="nuevaAsignacion.obligatorio" type="checkbox" />Curso obligatorio</label>
      </div>
      <template #footer><Button variant="outline" @click="modal = false">Cancelar</Button><Button @click="crear"><CheckCircle2 class="h-4 w-4" />Asignar curso</Button></template>
    </Dialog>

    <Dialog v-model:visible="detalleVisible" modal header="Progreso de la asignación" :style="{ width: 'min(34rem, calc(100vw - 2rem))' }">
      <div v-if="seleccionada" class="grid gap-4">
        <div><p class="text-xs font-black uppercase tracking-wider text-muted-foreground">Curso</p><h3 class="mt-1 font-black">{{ seleccionada.curso }}</h3></div>
        <div class="border border-border p-4"><div class="flex justify-between text-sm"><span>{{ seleccionada.completados }} de {{ seleccionada.asignados }} personas</span><b>{{ porcentaje(seleccionada) }}%</b></div><Progress :model-value="porcentaje(seleccionada)" class="mt-3" /></div>
        <p class="text-sm text-muted-foreground">Destino: {{ seleccionada.destino }}</p>
      </div>
    </Dialog>
  </section>
</template>
