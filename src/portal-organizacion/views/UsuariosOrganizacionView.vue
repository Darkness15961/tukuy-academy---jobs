<script setup lang="ts">
import { Download, Mail, Plus, Search, Upload, UserRoundCheck } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import TreeSelect from "primevue/treeselect";
import type { TreeNode } from "primevue/treenode";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  organizacionService,
  type SedeOrganizacion,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Skeleton from "primevue/skeleton";
import type {
  PerfilEntidad,
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";

const route = useRoute();
const router = useRouter();
const cargando = ref(true);
const buscar = ref("");
const modal = ref(false);
const mensaje = ref("");
const unidadFiltro = ref<string | Record<string, boolean> | null>(null);
const alcanceUnidad = ref<"SOLO" | "DESCENDIENTES">("DESCENDIENTES");
const estadoFiltro = ref("TODOS");
const perfilFiltro = ref("TODOS");
const sedeFiltro = ref("TODAS");
const selectorCsv = ref<HTMLInputElement>();
const lista = ref<UsuarioOrganizacion[]>([]);
const unidades = ref<UnidadOrganizacional[]>([]);
const sedes = ref<SedeOrganizacion[]>([]);
const perfiles = ref<PerfilEntidad[]>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const nuevoUsuario = reactive({
  nombre: "",
  correo: "",
  unidadId: null as string | Record<string, boolean> | null,
  sedeId: "",
  perfilId: "",
  especialidad: "Ingeniería Civil",
});

onMounted(async () => {
  try {
    [lista.value, unidades.value, sedes.value, perfiles.value, vinculaciones.value] =
      await Promise.all([
        organizacionService.usuarios.listar(),
        organizacionService.estructura.unidades.listar(),
        organizacionService.sedes.listar(),
        organizacionService.estructura.perfiles.listar(),
        organizacionService.estructura.vinculaciones.listar(),
      ]);
    nuevoUsuario.unidadId = unidades.value[0]?.id ?? null;
    nuevoUsuario.sedeId = sedes.value[0]?.id ?? "";
    nuevoUsuario.perfilId =
      perfiles.value.find((perfil) => perfil.plantilla === "APRENDIZAJE")?.id ??
      perfiles.value[0]?.id ??
      "";
    const unidadQuery = String(route.query.unidad ?? "").trim();
    if (unidadQuery && unidades.value.some((unidad) => unidad.id === unidadQuery)) {
      unidadFiltro.value = { [unidadQuery]: true };
      alcanceUnidad.value = route.query.descendientes === "false" ? "SOLO" : "DESCENDIENTES";
      mensaje.value = `Mostrando usuarios de “${unidades.value.find((unidad) => unidad.id === unidadQuery)?.nombre}”.`;
    }
  } finally {
    cargando.value = false;
  }
});

const unidadesPorId = computed(
  () => new Map(unidades.value.map((unidad) => [unidad.id, unidad])),
);

const unidadSeleccionadaId = computed(() => {
  return claveSeleccionArbol(unidadFiltro.value);
});

function claveSeleccionArbol(
  seleccion: string | Record<string, boolean> | null,
) {
  if (typeof seleccion === "string") return seleccion;
  return Object.keys(seleccion ?? {}).find(
    (clave) => seleccion?.[clave],
  ) ?? null;
}

const nodosUnidades = computed(() => {
  const construir = (padreId: string | null): TreeNode[] =>
    unidades.value
      .filter((unidad) => unidad.unidadPadreId === padreId && unidad.estado === "ACTIVA")
      .sort((a, b) => a.orden - b.orden)
      .map((unidad) => {
        const children = construir(unidad.id);
        return {
          key: unidad.id,
          label: unidad.nombre,
          ...(children.length ? { children } : {}),
        };
      });
  return construir(null);
});

function idsDescendientes(unidadId: string) {
  const resultado = new Set([unidadId]);
  let cambio = true;
  while (cambio) {
    cambio = false;
    unidades.value.forEach((unidad) => {
      if (unidad.unidadPadreId && resultado.has(unidad.unidadPadreId) && !resultado.has(unidad.id)) {
        resultado.add(unidad.id);
        cambio = true;
      }
    });
  }
  return resultado;
}

function unidadPrincipalDe(usuario: UsuarioOrganizacion) {
  const vinculacion = vinculaciones.value.find(
    (item) => item.usuarioId === String(usuario.id) && item.tipo === "PRINCIPAL" && item.estado === "ACTIVA",
  );
  return vinculacion?.unidadId ?? usuario.unidadPrincipalId ?? null;
}

function rutaUnidad(unidadId: string | null) {
  if (!unidadId) return "Sin unidad asignada";
  const nombres: string[] = [];
  const visitados = new Set<string>();
  let actual = unidadesPorId.value.get(unidadId);
  while (actual && !visitados.has(actual.id)) {
    visitados.add(actual.id);
    nombres.unshift(actual.nombre);
    actual = actual.unidadPadreId
      ? unidadesPorId.value.get(actual.unidadPadreId)
      : undefined;
  }
  return nombres.join(" › ");
}

function nombreUnidadUsuario(usuario: UsuarioOrganizacion) {
  const unidadId = unidadPrincipalDe(usuario);
  return (unidadId ? unidadesPorId.value.get(unidadId)?.nombre : undefined) ?? usuario.area;
}

const visibles = computed(() => {
  const termino = buscar.value.trim().toLowerCase();
  return lista.value.filter((usuario) => {
    const unidadId = unidadPrincipalDe(usuario);
    const idsPermitidos = unidadSeleccionadaId.value
      ? alcanceUnidad.value === "DESCENDIENTES"
        ? idsDescendientes(unidadSeleccionadaId.value)
        : new Set([unidadSeleccionadaId.value])
      : null;
    const coincideUnidad = !idsPermitidos || (unidadId ? idsPermitidos.has(unidadId) : false);
    const coincideEstado =
      estadoFiltro.value === "TODOS" || usuario.estado === estadoFiltro.value;
    const coincidePerfil = perfilFiltro.value === "TODOS" || usuario.rol === perfilFiltro.value;
    const coincideSede = sedeFiltro.value === "TODAS" || usuario.sede === sedeFiltro.value;
    const coincideBusqueda =
      !termino ||
      [usuario.nombre, usuario.correo, usuario.area, usuario.sede, usuario.rol]
        .join(" ")
        .toLowerCase()
        .includes(termino);
    return coincideUnidad && coincideEstado && coincidePerfil && coincideSede && coincideBusqueda;
  });
});

const opcionesPerfiles = computed(() => ["TODOS", ...new Set(lista.value.map((usuario) => usuario.rol))]);
const opcionesSedes = computed(() => ["TODAS", ...new Set(lista.value.map((usuario) => usuario.sede))]);

function limpiarFiltros() {
  buscar.value = "";
  unidadFiltro.value = null;
  alcanceUnidad.value = "DESCENDIENTES";
  estadoFiltro.value = "TODOS";
  perfilFiltro.value = "TODOS";
  sedeFiltro.value = "TODAS";
}

watch([unidadSeleccionadaId, alcanceUnidad], ([unidadId, alcance]) => {
  const query = { ...route.query };
  if (unidadId) {
    query.unidad = unidadId;
    query.descendientes = String(alcance === "DESCENDIENTES");
  } else {
    delete query.unidad;
    delete query.descendientes;
  }
  void router.replace({ query });
});

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

  const unidadId = claveSeleccionArbol(nuevoUsuario.unidadId);
  const unidad = unidades.value.find((item) => item.id === unidadId);
  const sede = sedes.value.find((item) => item.id === nuevoUsuario.sedeId);
  const perfil = perfiles.value.find((item) => item.id === nuevoUsuario.perfilId);
  const id = Date.now();

  const usuario: UsuarioOrganizacion = {
    id,
    nombre: nuevoUsuario.nombre.trim(),
    iniciales: obtenerIniciales(nuevoUsuario.nombre) || "NU",
    correo: nuevoUsuario.correo.trim().toLowerCase(),
    area: unidad?.nombre ?? "Pendiente de incorporación",
    sede: sede?.ciudad ?? sede?.nombre ?? "Sin sede",
    rol: perfil?.nombre ?? "Colegiado",
    progreso: 0,
    estado: "INVITADO",
    especialidad: nuevoUsuario.especialidad.trim() || undefined,
    colegiaturaActiva: false,
    unidadPrincipalId: unidad?.id,
    sedeId: sede?.id,
  };

  await organizacionService.usuarios.crear(usuario);
  if (unidad) {
    await organizacionService.estructura.vinculaciones.crear({
      id: `vin-invitacion-${id}`,
      usuarioId: String(id),
      unidadId: unidad.id,
      sedeId: sede?.id,
      tipo: "PRINCIPAL",
      origen: "ASIGNACION_ADMINISTRATIVA",
      estado: "PENDIENTE",
    });
  }
  if (perfil) {
    await organizacionService.estructura.asignacionesPerfil.crear({
      id: `apu-invitacion-${id}`,
      usuarioId: String(id),
      perfilId: perfil.id,
      unidadIds: unidad ? [unidad.id] : [],
      sedeIds: sede ? [sede.id] : [],
      incluirDescendientes: false,
      esPrincipal: true,
      estado: "INACTIVA",
    });
  }
  lista.value.unshift(usuario);
  mensaje.value = `Invitación enviada a ${usuario.correo}.`;
  Object.assign(nuevoUsuario, {
    nombre: "",
    correo: "",
    unidadId: unidades.value[0]?.id ?? null,
    sedeId: sedes.value[0]?.id ?? "",
    perfilId:
      perfiles.value.find((item) => item.plantilla === "APRENDIZAJE")?.id ?? "",
    especialidad: "Ingeniería Civil",
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
      area:
        campos[indice("unidad")] ||
        campos[indice("área")] ||
        campos[indice("area")] ||
        "Pendiente de incorporación",
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
          class="grid gap-3 border-b border-border p-4 md:grid-cols-2 xl:grid-cols-4"
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
                placeholder="Nombre, correo, unidad, sede o perfil"
              />
            </span>
          </label>
          <label class="grid gap-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Unidad organizacional
            </span>
            <TreeSelect
              v-model="unidadFiltro"
              :options="nodosUnidades"
              class="filtro-control w-full"
              placeholder="Toda la organización"
              filter
              show-clear
              aria-label="Filtrar por unidad organizacional"
            />
          </label>
          <label class="grid gap-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Alcance de la unidad
            </span>
            <Select
              v-model="alcanceUnidad"
              :options="[
                { label: 'Esta unidad y subniveles', value: 'DESCENDIENTES' },
                { label: 'Solo esta unidad', value: 'SOLO' },
              ]"
              option-label="label"
              option-value="value"
              class="filtro-control w-full"
              :disabled="!unidadSeleccionadaId"
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
          <label class="grid gap-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Perfil institucional</span>
            <Select v-model="perfilFiltro" :options="opcionesPerfiles" class="filtro-control w-full" />
          </label>
          <label class="grid gap-1.5">
            <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Sede</span>
            <Select v-model="sedeFiltro" :options="opcionesSedes" class="filtro-control w-full" />
          </label>
          <div class="flex items-end gap-2 xl:col-span-2">
            <Button class="flex-1" variant="outline" @click="limpiarFiltros">Limpiar filtros</Button>
            <Button class="flex-1" variant="outline" @click="exportar">
              <Download class="h-4 w-4" /> Exportar resultados
            </Button>
          </div>
        </div>

        <div v-if="unidadSeleccionadaId" class="flex flex-wrap items-center gap-2 border-b border-border bg-primary/5 px-4 py-3 text-xs">
          <span class="font-black uppercase tracking-wider text-primary">Estructura aplicada</span>
          <Tag :value="rutaUnidad(unidadSeleccionadaId)" severity="info" />
          <span class="text-muted-foreground">
            {{ alcanceUnidad === 'DESCENDIENTES' ? 'Incluye todos sus subniveles' : 'Solo miembros directos' }}
          </span>
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
          table-style="min-width: 70rem"
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
          <Column header="Unidad principal" style="min-width: 22rem">
            <template #body="{ data }">
              <span class="font-semibold">{{ nombreUnidadUsuario(data) }}</span>
              <p class="mt-1 max-w-sm text-xs text-muted-foreground">{{ rutaUnidad(unidadPrincipalDe(data)) }}</p>
            </template>
          </Column>
          <Column field="rol" header="Perfil" sortable style="min-width: 12rem" />
          <Column field="sede" header="Sede" sortable style="min-width: 9rem" />
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
            Perfil institucional
            <Select
              v-model="nuevoUsuario.perfilId"
              :options="perfiles"
              option-label="nombre"
              option-value="id"
              class="filtro-control w-full"
              panel-class="tukuy-filtro-panel"
            />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Unidad principal
            <TreeSelect
              v-model="nuevoUsuario.unidadId"
              :options="nodosUnidades"
              class="filtro-control w-full"
              panel-class="tukuy-filtro-panel"
              filter
              placeholder="Selecciona dentro del organigrama"
            />
          </label>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="grid gap-2 text-sm font-bold">
            Sede
            <Select
              v-model="nuevoUsuario.sedeId"
              :options="sedes"
              option-label="nombre"
              option-value="id"
              class="filtro-control w-full"
              panel-class="tukuy-filtro-panel"
            />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Especialidad profesional
            <InputText
              v-model="nuevoUsuario.especialidad"
              class="filtro-control w-full"
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
