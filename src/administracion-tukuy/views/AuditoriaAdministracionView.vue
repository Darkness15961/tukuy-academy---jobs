<script setup lang="ts">
import { Download, Search, ShieldCheck } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { configuracionAuditoriaPrincipalService, type AuditoriaPrincipal } from "@/api/services/configuracion-auditoria-principal.service";

const cargando = ref(true);
const busqueda = ref("");
const nivel = ref("TODOS");
const mensaje = ref("");
const eventos = ref<AuditoriaPrincipal[]>([]);
const pagina = ref(1);
const porPagina = ref(10);
const total = ref(0);
const error = ref("");
let temporizador: ReturnType<typeof setTimeout> | undefined;

async function cargar() {
  cargando.value = true;
  error.value = "";
  try {
    const respuesta = await configuracionAuditoriaPrincipalService.listarAuditoria({ pagina: pagina.value, porPagina: porPagina.value, buscar: busqueda.value, nivel: nivel.value });
    eventos.value = respuesta.datos;
    total.value = respuesta.total;
  } catch (causa) {
    error.value = causa instanceof Error ? causa.message : "No se pudo cargar la auditoría.";
  } finally {
    cargando.value = false;
  }
}

function cambiarPagina(evento: { first: number; rows: number }) { porPagina.value = evento.rows; pagina.value = Math.floor(evento.first / evento.rows) + 1; void cargar(); }

watch([busqueda, nivel], () => { if (temporizador) clearTimeout(temporizador); temporizador = setTimeout(() => { pagina.value = 1; void cargar(); }, 350); });
onMounted(() => void cargar());
onBeforeUnmount(() => { if (temporizador) clearTimeout(temporizador); });

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
        <TituloConAyuda
          clase-eyebrow="text-primary"
          eyebrow="Trazabilidad global"
          titulo="Auditoría"
          ayuda="Consulta acciones administrativas, automatizaciones y accesos de soporte."
        />
      </div>
      <Button
        variant="outline"
        @click="
          mensaje = 'El registro de auditoría fue preparado para exportación.'
        "
        ><Download class="h-4 w-4" /> Exportar registro</Button
      >
    </div>

    <div class="border-l-4 border-l-primary bg-primary/10 p-4">
      <div class="flex gap-3">
        <ShieldCheck class="h-5 w-5 shrink-0 text-primary" />
        <div>
          <p class="text-sm font-black text-foreground">Registro protegido</p>
          <p class="mt-1 text-xs leading-5 text-primary">
            Los eventos mostrados son inmutables y conservan autor, fecha,
            origen y contexto afectado.
          </p>
        </div>
      </div>
    </div>
    <div
      v-if="error"
      class="border-l-4 border-l-red-500 bg-red-500/10 px-4 py-3 text-sm font-semibold"
    >{{ error }}</div>
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
          :value="eventos"
          data-key="id"
          lazy
          size="small"
          scrollable
          resizable-columns
          column-resize-mode="fit"
          removable-sort
          paginator
          :first="(pagina - 1) * porPagina"
          :rows="porPagina"
          :total-records="total"
          :rows-per-page-options="[10, 20, 50]"
          paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          current-page-report-template="{first}–{last} de {totalRecords} eventos"
          table-style="min-width: 78rem"
          @page="cambiarPagina"
        >
          <Column
            field="fecha"
            header="Fecha y hora"
            sortable
            style="min-width: 12rem"
            ><template #body="{ data }"
              ><span class="font-mono text-xs">{{ new Date(data.fecha).toLocaleString('es-PE') }}</span></template
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
