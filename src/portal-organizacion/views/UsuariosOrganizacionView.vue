<script setup lang="ts">
import { Download, Mail, Plus, Search, Upload, UserRoundCheck } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import {
  organizacionService,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Skeleton from "primevue/skeleton";

const route = useRoute();
const cargando = ref(true);
const buscar = ref("");
const modal = ref(false);
const mensaje = ref("");
const areaFiltro = ref("TODAS");
const estadoFiltro = ref("TODOS");
const selectorCsv = ref<HTMLInputElement>();
const lista = ref<UsuarioOrganizacion[]>([]);
const nuevoUsuario = reactive({
  nombre: "",
  correo: "",
  area: "Operaciones",
  sede: "Lima",
  rol: "Estudiante",
});

onMounted(async () => {
  try {
    lista.value = await organizacionService.usuarios.listar();
    const areaQuery = String(route.query.area ?? "").trim();
    if (areaQuery) {
      areaFiltro.value = areaQuery;
      mensaje.value = `Mostrando usuarios del área “${areaQuery}”.`;
    }
  } finally {
    cargando.value = false;
  }
});

const visibles = computed(() => {
  const termino = buscar.value.trim().toLowerCase();
  return lista.value.filter((usuario) => {
    const coincideArea =
      areaFiltro.value === "TODAS" || usuario.area === areaFiltro.value;
    const coincideEstado =
      estadoFiltro.value === "TODOS" || usuario.estado === estadoFiltro.value;
    const coincideBusqueda =
      !termino ||
      [usuario.nombre, usuario.correo, usuario.area, usuario.sede, usuario.rol]
        .join(" ")
        .toLowerCase()
        .includes(termino);
    return coincideArea && coincideEstado && coincideBusqueda;
  });
});

const opcionesAreas = computed(() => [
  "TODAS",
  ...new Set(lista.value.map((usuario) => usuario.area)),
]);

function obtenerIniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

async function invitar() {
  if (!nuevoUsuario.nombre.trim() || !nuevoUsuario.correo.trim()) return;

  const usuario: UsuarioOrganizacion = {
    id: Date.now(),
    nombre: nuevoUsuario.nombre.trim(),
    iniciales: obtenerIniciales(nuevoUsuario.nombre) || "NU",
    correo: nuevoUsuario.correo.trim().toLowerCase(),
    area: nuevoUsuario.area,
    sede: nuevoUsuario.sede,
    rol: nuevoUsuario.rol,
    progreso: 0,
    estado: "INVITADO",
  };

  await organizacionService.usuarios.crear(usuario);
  lista.value.unshift(usuario);
  mensaje.value = `Invitación enviada a ${usuario.correo}.`;
  Object.assign(nuevoUsuario, {
    nombre: "",
    correo: "",
    area: "Operaciones",
    sede: "Lima",
    rol: "Estudiante",
  });
  modal.value = false;
}

function exportar() {
  const filas = [
    ["Nombre", "Correo", "Área", "Sede", "Rol", "Estado"],
    ...visibles.value.map((usuario) => [
      usuario.nombre,
      usuario.correo,
      usuario.area,
      usuario.sede,
      usuario.rol,
      usuario.estado,
    ]),
  ];
  const contenido = filas
    .map((fila) =>
      fila.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([contenido], { type: "text/csv;charset=utf-8" }),
  );
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "usuarios-organizacion.csv";
  enlace.click();
  URL.revokeObjectURL(url);
}

async function importarCsv(evento: Event) {
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  if (!archivo) return;
  const lineas = (await archivo.text())
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);
  const encabezados = (lineas.shift() ?? "")
    .split(",")
    .map((campo) => campo.replaceAll('"', "").trim().toLowerCase());
  const indice = (nombre: string) => encabezados.indexOf(nombre);
  if (indice("nombre") < 0 || indice("correo") < 0) {
    mensaje.value = "El CSV debe incluir las columnas Nombre y Correo.";
    return;
  }
  const correos = new Set(lista.value.map((usuario) => usuario.correo));
  let siguienteId = Math.max(0, ...lista.value.map((usuario) => usuario.id)) + 1;
  const nuevos = lineas.flatMap((linea) => {
    const campos = linea.split(",").map((campo) => campo.replaceAll('"', "").trim());
    const nombre = campos[indice("nombre")] ?? "";
    const correo = (campos[indice("correo")] ?? "").toLowerCase();
    if (!nombre || !correo || correos.has(correo)) return [];
    correos.add(correo);
    return [{
      id: siguienteId++,
      nombre,
      iniciales: obtenerIniciales(nombre),
      correo,
      area: campos[indice("área")] || campos[indice("area")] || "Operaciones",
      sede: campos[indice("sede")] || "Lima",
      rol: campos[indice("rol")] || "Estudiante",
      progreso: 0,
      estado: "INVITADO" as const,
    }];
  });
  if (nuevos.length) {
    lista.value = await organizacionService.usuarios.reemplazar([
      ...nuevos,
      ...lista.value,
    ]);
  }
  mensaje.value = `${nuevos.length} usuarios importados; los duplicados fueron omitidos.`;
  if (selectorCsv.value) selectorCsv.value.value = "";
}

async function cambiarEstado(usuario: UsuarioOrganizacion) {
  const estado = usuario.estado === "SUSPENDIDO" ? "ACTIVO" : "SUSPENDIDO";
  const actualizado = await organizacionService.usuarios.actualizar(usuario.id, {
    estado,
  });
  const posicion = lista.value.findIndex((item) => item.id === usuario.id);
  if (posicion >= 0) lista.value[posicion] = actualizado;
  mensaje.value = `${actualizado.nombre}: acceso ${estado === "ACTIVO" ? "habilitado" : "suspendido"}.`;
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black">Usuarios</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Administra colaboradores, roles y acceso a capacitación.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <input ref="selectorCsv" class="hidden" type="file" accept=".csv,text/csv" @change="importarCsv" />
        <Button variant="outline" @click="selectorCsv?.click()">
          <Upload class="h-4 w-4" /> Importar CSV
        </Button>
        <Button @click="modal = true">
          <Plus class="h-4 w-4" /> Invitar usuario
        </Button>
      </div>
    </div>

    <div
      v-if="mensaje"
      class="border-l-4 border-l-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400"
    >
      {{ mensaje }}
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div
          class="grid gap-3 border-b border-border p-4 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_14rem_12rem_auto]"
        >
          <label class="grid gap-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Buscar usuarios
            </span>
            <span class="relative block">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <InputText
                v-model="buscar"
                class="filtro-control w-full pl-10"
                placeholder="Nombre, correo, área, sede o rol"
              />
            </span>
          </label>
          <label class="grid gap-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Área
            </span>
            <Select
              v-model="areaFiltro"
              :options="opcionesAreas"
              class="filtro-control w-full"
              aria-label="Filtrar por área"
            />
          </label>
          <label class="grid gap-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Estado de acceso
            </span>
            <Select
              v-model="estadoFiltro"
              :options="['TODOS', 'ACTIVO', 'INVITADO', 'SUSPENDIDO']"
              class="filtro-control w-full"
              aria-label="Filtrar por estado"
            />
          </label>
          <Button class="self-end" variant="outline" @click="exportar">
            <Download class="h-4 w-4" /> Exportar
          </Button>
        </div>

        <div v-if="cargando" class="space-y-2 p-5">
          <Skeleton v-for="item in 6" :key="item" class="h-12 w-full" />
        </div>

        <DataTable
          v-else
          class="tabla-administracion"
          :value="visibles"
          data-key="id"
          size="small"
          scrollable
          resizable-columns
          column-resize-mode="fit"
          removable-sort
          :paginator="visibles.length > 5"
          :rows="5"
          :rows-per-page-options="[5, 10, 20]"
          paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          current-page-report-template="{first}–{last} de {totalRecords} usuarios"
          :always-show-paginator="false"
          table-style="min-width: 55rem"
        >
          <template #empty>
            <div class="py-12 text-center text-sm text-muted-foreground">
              No se encontraron usuarios con estos filtros.
            </div>
          </template>
          <Column field="nombre" header="Usuario" sortable style="min-width: 18rem">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <span
                  class="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-xs font-black text-primary"
                >
                  {{ data.iniciales }}
                </span>
                <div>
                  <strong>{{ data.nombre }}</strong>
                  <p class="text-xs text-muted-foreground">{{ data.correo }}</p>
                </div>
              </div>
            </template>
          </Column>
          <Column field="area" header="Área / sede" sortable style="min-width: 12rem">
            <template #body="{ data }">
              <span>{{ data.area }}</span>
              <p class="text-xs text-muted-foreground">{{ data.sede }}</p>
            </template>
          </Column>
          <Column field="rol" header="Rol" sortable style="min-width: 12rem" />
          <Column field="estado" header="Estado" sortable style="min-width: 9rem">
            <template #body="{ data }">
              <Tag
                :severity="data.estado === 'ACTIVO' ? 'success' : data.estado === 'SUSPENDIDO' ? 'danger' : 'warn'"
                :value="data.estado"
              />
            </template>
          </Column>
          <Column header="Acciones" style="min-width: 10rem">
            <template #body="{ data }">
              <Button size="sm" variant="outline" @click="cambiarEstado(data)">
                <UserRoundCheck class="h-4 w-4" />
                {{ data.estado === "SUSPENDIDO" ? "Activar" : "Suspender" }}
              </Button>
            </template>
          </Column>
        </DataTable>
      </CardContent>
    </Card>

    <Dialog
      v-model:visible="modal"
      modal
      header="Invitar usuario"
      :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-4">
        <div class="border-l-4 border-l-primary bg-primary/10 p-4">
          <Mail class="h-6 w-6 text-primary" />
          <p class="mt-2 text-sm text-muted-foreground">
            La persona recibirá un enlace para activar su membresía.
          </p>
        </div>
        <label class="grid gap-2 text-sm font-bold">
          Nombre completo
          <InputText v-model="nuevoUsuario.nombre" class="filtro-control w-full" />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Correo corporativo
          <InputText
            v-model="nuevoUsuario.correo"
            type="email"
            class="filtro-control w-full"
          />
        </label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-2 text-sm font-bold">
            Rol
            <Select
              v-model="nuevoUsuario.rol"
              :options="['Estudiante', 'Supervisor', 'Gestor de capacitación']"
              class="filtro-control w-full"
              panel-class="tukuy-filtro-panel"
            />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Área
            <Select
              v-model="nuevoUsuario.area"
              :options="['Operaciones', 'Logística', 'Oficina técnica', 'Administración']"
              class="filtro-control w-full"
              panel-class="tukuy-filtro-panel"
            />
          </label>
        </div>
      </div>
      <template #footer>
        <Button variant="outline" @click="modal = false">Cancelar</Button>
        <Button @click="invitar">Enviar invitación</Button>
      </template>
    </Dialog>
  </section>
</template>
