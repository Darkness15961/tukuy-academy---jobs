<script setup lang="ts">
import { Download, Search, ShieldCheck } from "lucide-vue-next";
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
  type EventoAuditoria,
} from "@/api/services/administracion.service";

const cargando = ref(true);
const busqueda = ref("");
const nivel = ref("TODOS");
const mensaje = ref("");
const eventos = ref<EventoAuditoria[]>([]);

onMounted(async () => {
  try {
    eventos.value = await administracionService.auditoria.listar();
  } finally {
    cargando.value = false;
  }
});

const filtrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  return eventos.value.filter(
    (evento) =>
      (!termino ||
        [evento.usuario, evento.accion, evento.modulo, evento.origen].some(
          (valor) => valor.toLowerCase().includes(termino),
        )) &&
      (nivel.value === "TODOS" || evento.nivel === nivel.value),
  );
});

function severidad(valor: string) {
  if (valor === "ALERTA") return "danger";
  if (valor === "SEGURIDAD") return "warn";
  if (valor === "CAMBIO") return "info";
  return "secondary";
}
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[.2em] text-violet-700">
          Trazabilidad global
        </p>
        <h1 class="mt-2 text-3xl font-black">Auditoría</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Consulta acciones administrativas, automatizaciones y accesos de
          soporte.
        </p>
      </div>
      <Button
        variant="outline"
        @click="
          mensaje = 'El registro de auditoría fue preparado para exportación.'
        "
        ><Download class="h-4 w-4" /> Exportar registro</Button
      >
    </div>

    <div class="border-l-4 border-l-violet-700 bg-violet-50 p-4">
      <div class="flex gap-3">
        <ShieldCheck class="h-5 w-5 shrink-0 text-violet-700" />
        <div>
          <p class="text-sm font-black text-violet-950">Registro protegido</p>
          <p class="mt-1 text-xs leading-5 text-violet-900">
            Los eventos mostrados son inmutables y conservan autor, fecha,
            origen y contexto afectado.
          </p>
        </div>
      </div>
    </div>
    <div
      v-if="mensaje"
      class="border-l-4 border-l-teal-600 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
    >
      {{ mensaje }}
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
              placeholder="Buscar usuario, acción, módulo u origen" /></label
          ><Select
            v-model="nivel"
            :options="[
              { label: 'Todos los niveles', value: 'TODOS' },
              { label: 'Información', value: 'INFORMACION' },
              { label: 'Cambio', value: 'CAMBIO' },
              { label: 'Seguridad', value: 'SEGURIDAD' },
              { label: 'Alerta', value: 'ALERTA' },
            ]"
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
          :value="filtrados"
          data-key="id"
          size="small"
          scrollable
          resizable-columns
          column-resize-mode="fit"
          removable-sort
          :paginator="filtrados.length > 5"
          :rows="5"
          :rows-per-page-options="[5, 10, 20]"
          paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          current-page-report-template="{first}–{last} de {totalRecords} eventos"
          :always-show-paginator="false"
          table-style="min-width: 78rem"
        >
          <Column
            field="fecha"
            header="Fecha y hora"
            sortable
            style="min-width: 12rem"
            ><template #body="{ data }"
              ><span class="font-mono text-xs">{{ data.fecha }}</span></template
            ></Column
          >
          <Column
            field="usuario"
            header="Responsable"
            sortable
            style="min-width: 13rem"
            ><template #body="{ data }"
              ><strong>{{ data.usuario }}</strong></template
            ></Column
          >
          <Column
            field="accion"
            header="Acción"
            sortable
            style="min-width: 24rem"
          />
          <Column
            field="modulo"
            header="Módulo"
            sortable
            style="min-width: 12rem"
          />
          <Column
            field="origen"
            header="Origen"
            sortable
            style="min-width: 10rem"
            ><template #body="{ data }"
              ><span class="font-mono text-xs text-muted-foreground">{{
                data.origen
              }}</span></template
            ></Column
          >
          <Column field="nivel" header="Nivel" sortable style="min-width: 10rem"
            ><template #body="{ data }"
              ><Tag
                :severity="severidad(data.nivel)"
                :value="data.nivel" /></template
          ></Column>
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
