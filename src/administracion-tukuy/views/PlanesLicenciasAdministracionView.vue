<script setup lang="ts">
import {
  CalendarClock,
  Check,
  Database,
  Pencil,
  ShieldCheck,
  UsersRound,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Tag from "primevue/tag";
import { onMounted, ref } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  administracionService,
  type PlanAdministrado,
} from "@/api/services/administracion.service";
import {
  type OrganizacionAdministrada,
} from "../data/administracion.mock";

const cargando = ref(true);
const licencias = ref<OrganizacionAdministrada[]>([]);
const planes = ref<PlanAdministrado[]>([]);
const mensaje = ref("");

onMounted(async () => {
  try {
    [licencias.value, planes.value] = await Promise.all([
      administracionService.organizaciones.listar(),
      administracionService.planes.listar(),
    ]);
  } finally {
    cargando.value = false;
  }
});

async function renovar(licencia: OrganizacionAdministrada) {
  licencia.vence = "2027-07-15";
  licencia.estado = "ACTIVA";
  await administracionService.organizaciones.actualizar(licencia.id, {
    vence: licencia.vence,
    estado: licencia.estado,
  });
  mensaje.value = `La licencia de ${licencia.nombre} fue renovada hasta el 15 de julio de 2027.`;
}

function severidad(valor: string) {
  if (valor === "ACTIVA") return "success";
  if (valor === "SUSPENDIDA") return "danger";
  if (valor === "POR_VENCER") return "warn";
  return "info";
}
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div>
      <p class="text-xs font-black uppercase tracking-[.2em] text-violet-700">
        Modelo comercial
      </p>
      <h1 class="mt-2 text-3xl font-black">Planes y licencias</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Define la oferta SaaS y controla límites, consumo y vigencia por
        organización.
      </p>
    </div>

    <div
      v-if="mensaje"
      class="border-l-4 border-l-teal-600 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
    >
      {{ mensaje }}
    </div>

    <div v-if="cargando" class="grid gap-5 xl:grid-cols-3">
      <Skeleton v-for="item in 3" :key="item" class="h-72 w-full" />
    </div>
    <div v-else class="grid gap-5 xl:grid-cols-3">
      <Card
        v-for="plan in planes"
        :key="plan.id"
        class="overflow-hidden border-border bg-card"
      >
        <div class="h-1.5" :style="{ backgroundColor: plan.color }" />
        <CardContent class="p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p
                class="text-xs font-black uppercase tracking-[.16em] text-muted-foreground"
              >
                {{ plan.organizaciones }} organizaciones
              </p>
              <h2 class="mt-2 text-2xl font-black">{{ plan.nombre }}</h2>
            </div>
            <Button
              size="icon"
              variant="outline"
              :aria-label="`Editar plan ${plan.nombre}`"
              @click="
                mensaje = `Abriendo configuración del plan ${plan.nombre}.`
              "
              ><Pencil class="h-4 w-4"
            /></Button>
          </div>
          <div class="mt-5 flex items-end gap-2 border-b border-border pb-5">
            <strong class="text-3xl font-black"
              >S/ {{ plan.precio.toLocaleString("es-PE") }}</strong
            ><span class="pb-1 text-sm text-muted-foreground"
              >/{{ plan.periodo }}</span
            >
          </div>
          <div class="mt-5 grid gap-3 text-sm">
            <p class="flex items-center gap-3">
              <UsersRound class="h-4 w-4 text-violet-700" /><b>{{
                plan.estudiantes.toLocaleString("es-PE")
              }}</b>
              estudiantes
            </p>
            <p class="flex items-center gap-3">
              <ShieldCheck class="h-4 w-4 text-violet-700" /><b>{{
                plan.docentes < 0 ? "Ilimitados" : plan.docentes
              }}</b>
              docentes
            </p>
            <p class="flex items-center gap-3">
              <Check class="h-4 w-4 text-violet-700" /><b>{{
                plan.cursos < 0 ? "Ilimitados" : plan.cursos
              }}</b>
              cursos
            </p>
            <p class="flex items-center gap-3">
              <Database class="h-4 w-4 text-violet-700" /><b
                >{{ plan.almacenamiento }} GB</b
              >
              de almacenamiento
            </p>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div
          class="flex items-center justify-between border-b border-border px-5 py-4"
        >
          <div>
            <h2 class="font-black">Licencias emitidas</h2>
            <p class="text-xs text-muted-foreground">Vigencia y consumo contratado</p>
          </div>
          <span
            class="bg-violet-50 px-3 py-1 text-xs font-black text-violet-800"
            >{{ licencias.length }} licencias</span
          >
        </div>
        <div v-if="cargando" class="space-y-2 p-5">
          <Skeleton v-for="item in 6" :key="item" class="h-12 w-full" />
        </div>
        <DataTable
          v-else
          class="tabla-administracion"
          :value="licencias"
          data-key="id"
          size="small"
          scrollable
          resizable-columns
          column-resize-mode="fit"
          removable-sort
          :paginator="licencias.length > 5"
          :rows="5"
          :rows-per-page-options="[5, 10, 20]"
          paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          current-page-report-template="{first}–{last} de {totalRecords} licencias"
          :always-show-paginator="false"
          table-style="min-width: 76rem"
        >
          <Column
            field="nombre"
            header="Organización"
            sortable
            style="min-width: 17rem"
            ><template #body="{ data }"
              ><strong>{{ data.nombre }}</strong></template
            ></Column
          >
          <Column
            field="plan"
            header="Plan"
            sortable
            style="min-width: 12rem"
          />
          <Column header="Consumo" style="min-width: 14rem"
            ><template #body="{ data }"
              ><div>
                <div class="flex w-40 justify-between text-xs">
                  <b>{{ data.usuarios }}</b
                  ><span>{{ data.limiteUsuarios }} usuarios</span>
                </div>
                <div class="mt-1.5 h-1.5 w-40 bg-muted">
                  <div
                    class="h-full bg-violet-700"
                    :style="{
                      width: `${Math.min((data.usuarios / data.limiteUsuarios) * 100, 100)}%`,
                    }"
                  />
                </div></div></template
          ></Column>
          <Column field="vence" header="Vence" sortable style="min-width: 10rem"
            ><template #body="{ data }"
              ><span class="flex items-center gap-2"
                ><CalendarClock class="h-4 w-4 text-muted-foreground" />{{
                  data.vence
                }}</span
              ></template
            ></Column
          >
          <Column
            field="estado"
            header="Estado"
            sortable
            style="min-width: 10rem"
            ><template #body="{ data }"
              ><Tag
                :severity="severidad(data.estado)"
                :value="data.estado.replace('_', ' ')" /></template
          ></Column>
          <Column header="Acciones" style="min-width: 14rem"
            ><template #body="{ data }"
              ><div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  @click="mensaje = `Abriendo límites de ${data.nombre}.`"
                  >Editar límites</Button
                ><Button
                  size="sm"
                  class="bg-violet-800 hover:bg-violet-900"
                  @click="renovar(data)"
                  >Renovar</Button
                >
              </div></template
            ></Column
          >
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
