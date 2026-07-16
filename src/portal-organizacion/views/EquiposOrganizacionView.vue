<script setup lang="ts">
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  UsersRound,
} from "lucide-vue-next";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import {
  organizacionService,
  type AreaOrganizacion,
  type SedeOrganizacion,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const router = useRouter();
const cargando = ref(true);
const guardando = ref(false);
const modal = ref(false);
const areas = ref<AreaOrganizacion[]>([]);
const sedes = ref<SedeOrganizacion[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const areaEditadaId = ref<string>();
const mensaje = ref("");
const formulario = reactive({
  nombre: "",
  responsable: "",
  color: "bg-blue-600",
});
const colores = [
  { label: "Azul", value: "bg-blue-600" },
  { label: "Turquesa", value: "bg-teal-600" },
  { label: "Violeta", value: "bg-violet-600" },
  { label: "Dorado", value: "bg-amber-500" },
];

onMounted(async () => {
  try {
    [areas.value, sedes.value, usuarios.value] = await Promise.all([
      organizacionService.areas.listar(),
      organizacionService.sedes.listar(),
      organizacionService.usuarios.listar(),
    ]);
  } finally {
    cargando.value = false;
  }
});

function abrirNueva() {
  areaEditadaId.value = undefined;
  Object.assign(formulario, {
    nombre: "",
    responsable: "",
    color: "bg-blue-600",
  });
  modal.value = true;
}

function gestionar(area: AreaOrganizacion) {
  areaEditadaId.value = area.id;
  Object.assign(formulario, {
    nombre: area.nombre,
    responsable: area.responsable,
    color: area.color,
  });
  modal.value = true;
}

function irAUsuariosDelArea() {
  const area = formulario.nombre.trim();
  modal.value = false;
  router.push({
    path: "/organizacion/usuarios",
    query: area ? { area } : undefined,
  });
}

function cantidadUsuarios(area: AreaOrganizacion) {
  const miembros = usuarios.value.filter(
    (usuario) =>
      usuario.area === area.nombre && usuario.estado !== "SUSPENDIDO",
  );
  return miembros.length || area.usuarios;
}

async function guardar() {
  if (!formulario.nombre.trim() || !formulario.responsable.trim()) return;
  guardando.value = true;
  try {
    const nombre = formulario.nombre.trim();
    const miembros = usuarios.value.filter(
      (usuario) =>
        usuario.area.toLowerCase() === nombre.toLowerCase() &&
        usuario.estado !== "SUSPENDIDO",
    );
    const datos = {
      nombre,
      responsable: formulario.responsable.trim(),
      usuarios: miembros.length,
      progreso: 0,
      color: formulario.color,
    };
    if (areaEditadaId.value) {
      const actualizada = await organizacionService.areas.actualizar(
        areaEditadaId.value,
        datos,
      );
      const indice = areas.value.findIndex((area) => area.id === actualizada.id);
      if (indice >= 0) areas.value[indice] = actualizada;
      mensaje.value = "El área fue actualizada.";
    } else {
      const creada = await organizacionService.areas.crear({
        id: `area-${Date.now()}`,
        ...datos,
      });
      areas.value.push(creada);
      mensaje.value = "La nueva área fue creada.";
    }
    modal.value = false;
  } finally {
    guardando.value = false;
  }
}

async function eliminar() {
  if (!areaEditadaId.value) return;
  await organizacionService.areas.eliminar(areaEditadaId.value);
  areas.value = areas.value.filter((area) => area.id !== areaEditadaId.value);
  modal.value = false;
  mensaje.value = "El área fue eliminada de la estructura.";
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black">Equipos y áreas</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Organiza personas por sede, área y equipo de trabajo.
        </p>
      </div>
      <Button @click="abrirNueva">
        <Plus class="h-4 w-4" />
        Nueva área
      </Button>
    </div>

    <p
      v-if="mensaje"
      class="border-l-4 border-l-emerald-600 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
    >
      {{ mensaje }}
    </p>

    <div v-if="cargando" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-72 w-full" />
    </div>
    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card v-for="area in areas" :key="area.id" class="border-border bg-card">
        <CardContent class="p-5">
          <div class="flex justify-between">
            <div
              class="grid h-11 w-11 place-items-center text-white"
              :class="area.color"
            >
              <Building2 class="h-5 w-5" />
            </div>
            <Button
              variant="outline"
              size="sm"
              class="border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
              @click="gestionar(area)"
            >
              Gestionar
            </Button>
          </div>
          <h2 class="mt-5 text-lg font-black">{{ area.nombre }}</h2>
          <p class="mt-1 text-xs text-muted-foreground">
            Responsable: {{ area.responsable }}
          </p>
          <div class="mt-5 flex items-center gap-2 text-sm">
            <UsersRound class="h-4 w-4" />
            {{ cantidadUsuarios(area) }} usuarios
          </div>
        </CardContent>
      </Card>
    </div>

    <Card class="border-border bg-card">
      <CardContent class="p-6">
        <h2 class="text-lg font-black">Sedes de la organización</h2>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div
            v-for="sede in sedes"
            :key="sede.id"
            class="flex items-center gap-4 border border-border p-5"
          >
            <MapPin class="h-6 w-6 text-primary" />
            <div>
              <b>{{ sede.nombre }}</b>
              <p class="text-xs text-muted-foreground">
                {{ sede.usuarios }} usuarios · {{ sede.areas }} áreas
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog
      v-model:visible="modal"
      modal
      :header="areaEditadaId ? 'Gestionar área' : 'Nueva área'"
      :style="{ width: 'min(34rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-4">
        <label class="grid gap-2 text-sm font-bold">
          Nombre del área
          <InputText v-model="formulario.nombre" class="filtro-control w-full" />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Responsable
          <InputText
            v-model="formulario.responsable"
            class="filtro-control w-full"
          />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Color identificador
          <Select
            v-model="formulario.color"
            :options="colores"
            option-label="label"
            option-value="value"
            fluid
          />
        </label>
        <Button
          variant="outline"
          :disabled="!formulario.nombre.trim()"
          @click="irAUsuariosDelArea"
        >
          <UsersRound class="h-4 w-4" />
          Gestionar usuarios del área
        </Button>
      </div>
      <template #footer>
        <Button
          v-if="areaEditadaId"
          variant="outline"
          class="mr-auto text-red-600"
          @click="eliminar"
        >
          <Trash2 class="h-4 w-4" />
          Eliminar
        </Button>
        <Button variant="outline" @click="modal = false">Cancelar</Button>
        <Button
          :disabled="guardando || !formulario.nombre || !formulario.responsable"
          @click="guardar"
        >
          {{ guardando ? "Guardando…" : "Guardar área" }}
        </Button>
      </template>
    </Dialog>
  </section>
</template>
