<script setup lang="ts">
import { Search, UserRoundCheck, UsersRound } from "lucide-vue-next";
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
  type UsuarioAdministrado,
} from "@/api/services/administracion.service";

const cargando = ref(true);
const usuarios = ref<UsuarioAdministrado[]>([]);
const busqueda = ref("");
const estado = ref("TODOS");
const mensaje = ref("");

onMounted(async () => {
  try {
    usuarios.value = await administracionService.usuarios.listar();
  } finally {
    cargando.value = false;
  }
});

const filtrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  return usuarios.value.filter(
    (usuario) =>
      (!termino ||
        [
          usuario.nombre,
          usuario.correo,
          usuario.organizacion,
          ...usuario.perfiles,
        ].some((valor) => valor.toLowerCase().includes(termino))) &&
      (estado.value === "TODOS" || usuario.estado === estado.value),
  );
});

async function cambiarEstado(usuario: UsuarioAdministrado) {
  usuario.estado = usuario.estado === "SUSPENDIDO" ? "ACTIVO" : "SUSPENDIDO";
  await administracionService.usuarios.actualizar(usuario.id, {
    estado: usuario.estado,
  });
  mensaje.value = `${usuario.nombre} ahora se encuentra ${usuario.estado.toLowerCase()}.`;
}

function severidad(valor: string) {
  if (valor === "ACTIVO") return "success";
  if (valor === "SUSPENDIDO") return "danger";
  return "info";
}
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div>
      <p class="text-xs font-black uppercase tracking-[.2em] text-violet-700">
        Identidad multiempresa
      </p>
      <h1 class="mt-2 text-3xl font-black">Usuarios globales</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Consulta perfiles, organizaciones y estados sin duplicar la identidad de
        una persona.
      </p>
    </div>

    <div
      v-if="mensaje"
      class="border-l-4 border-l-teal-600 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
    >
      {{ mensaje }}
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <Skeleton
        v-if="cargando"
        v-for="item in 3"
        :key="item"
        class="h-24 w-full"
      />
      <Card
        v-else
        v-for="item in [
          { e: 'Usuarios registrados', v: '3,942' },
          { e: 'Activos este mes', v: '3,786' },
          { e: 'Con más de un perfil', v: '618' },
        ]"
        :key="item.e"
        class="border-border bg-card"
        ><CardContent class="flex items-center gap-4 p-5"
          ><div
            class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"
          >
            <UsersRound class="h-5 w-5" />
          </div>
          <div>
            <strong class="text-2xl font-black">{{ item.v }}</strong>
            <p class="text-xs text-muted-foreground">{{ item.e }}</p>
          </div></CardContent
        ></Card
      >
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div
          class="grid gap-3 border-b border-border p-5 md:grid-cols-[1fr_16rem]"
        >
          <label>
            <span class="filtro-label">Buscar usuarios</span>
            <span class="relative block">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <InputText
                v-model="busqueda"
                class="filtro-control w-full pl-10"
                placeholder="Usuario, correo, organización o perfil"
              />
            </span>
          </label>
          <label>
            <span class="filtro-label">Estado de acceso</span>
            <Select
              v-model="estado"
              :options="[
                { label: 'Todos los estados', value: 'TODOS' },
                { label: 'Activo', value: 'ACTIVO' },
                { label: 'Invitado', value: 'INVITADO' },
                { label: 'Suspendido', value: 'SUSPENDIDO' },
              ]"
              option-label="label"
              option-value="value"
              class="filtro-control w-full"
            />
          </label>
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
          current-page-report-template="{first}–{last} de {totalRecords} usuarios"
          :always-show-paginator="false"
          table-style="min-width: 76rem"
        >
          <template #empty
            ><div class="py-12 text-center text-sm text-muted-foreground">
              No se encontraron usuarios.
            </div></template
          >
          <Column
            field="nombre"
            header="Usuario"
            sortable
            style="min-width: 17rem"
            ><template #body="{ data }"
              ><div class="flex items-center gap-3">
                <span
                  class="grid h-9 w-9 place-items-center bg-primary/10 text-xs font-black text-primary"
                  >{{
                    data.nombre
                      .split(" ")
                      .slice(0, 2)
                      .map((parte: string) => parte[0])
                      .join("")
                  }}</span
                >
                <div>
                  <strong>{{ data.nombre }}</strong>
                  <p class="text-xs text-muted-foreground">{{ data.correo }}</p>
                </div>
              </div></template
            ></Column
          >
          <Column
            field="organizacion"
            header="Organización"
            sortable
            style="min-width: 14rem"
          />
          <Column header="Perfiles" style="min-width: 17rem"
            ><template #body="{ data }"
              ><div class="flex flex-wrap gap-1">
                <Tag
                  v-for="perfil in data.perfiles"
                  :key="perfil"
                  severity="secondary"
                  :value="perfil"
                /></div></template
          ></Column>
          <Column
            field="ultimoAcceso"
            header="Último acceso"
            sortable
            style="min-width: 10rem"
          />
          <Column
            field="estado"
            header="Estado"
            sortable
            style="min-width: 9rem"
            ><template #body="{ data }"
              ><Tag
                :severity="severidad(data.estado)"
                :value="data.estado" /></template
          ></Column>
          <Column header="Acciones" style="min-width: 14rem"
            ><template #body="{ data }"
              ><div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  @click="mensaje = `Consultando membresías de ${data.nombre}.`"
                  ><UserRoundCheck class="h-4 w-4" /> Perfiles</Button
                ><Button
                  size="sm"
                  variant="outline"
                  @click="cambiarEstado(data)"
                  >{{
                    data.estado === "SUSPENDIDO" ? "Reactivar" : "Suspender"
                  }}</Button
                >
              </div></template
            ></Column
          >
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
