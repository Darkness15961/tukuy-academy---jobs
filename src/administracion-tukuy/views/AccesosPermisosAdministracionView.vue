<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  ChevronRight,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCog,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";

import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import EditorPermisosAgrupados, {
  type GrupoPermisosEditor,
} from "@/components/shared/EditorPermisosAgrupados.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
import {
  accesosPrincipalService,
  type AccesoPrincipal,
  type CatalogoAccesosPrincipal,
  type IdentidadAccesosPrincipal,
  type ResumenAccesosPrincipal,
} from "@/api/services/accesos-principal.service";

const cargando = ref(true);
const route = useRoute();
const guardando = ref(false);
const dialogoAsignar = ref(false);
const dialogoIdentidad = ref(false);
const modoFormulario = ref<"asignar" | "editar">("asignar");
const funcionEditandoId = ref<string | null>(null);
const busqueda = ref("");
const filtroNivel = ref("TODOS");
const mensaje = ref("");
const error = ref("");
const errorDialogo = ref("");
const identidades = ref<IdentidadAccesosPrincipal[]>([]);
const identidadSeleccionada = ref<IdentidadAccesosPrincipal | null>(null);
const accesoSeleccionado = ref<AccesoPrincipal | null>(null);
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
const catalogo = ref<CatalogoAccesosPrincipal>({
  perfiles: [],
  permisos: [],
  organizaciones: [],
});
const formulario = reactive({
  correo: "",
  perfilCodigo: "",
  instalacionRef: null as string | null,
});
/** Permisos efectivos en edición del acceso seleccionado. */
const permisosEditando = ref<string[]>([]);
/** Permisos al asignar/cambiar perfil (parte desde la plantilla). */
const permisosFormulario = ref<string[]>([]);
const guardandoPermisos = ref(false);
const vistaDetalleIdentidad = ref<"perfiles" | "permisos">("perfiles");
const mostrarPermisosAvanzadosFormulario = ref(false);
const mostrarPermisosAvanzadosAcceso = ref(false);

const tituloFormulario = computed(() =>
  modoFormulario.value === "editar" ? "Cambiar perfil" : "Añadir perfil",
);
const etiquetaGuardar = computed(() => {
  if (guardando.value) {
    return modoFormulario.value === "editar" ? "Guardando…" : "Asignando…";
  }
  return modoFormulario.value === "editar" ? "Guardar cambios" : "Añadir perfil";
});

const perfilSeleccionado = computed(() =>
  catalogo.value.perfiles.find(
    (perfil) => perfil.codigo === formulario.perfilCodigo,
  ),
);
const requiereOrganizacion = computed(
  () => perfilSeleccionado.value?.nivel === "ORGANIZACION",
);
const perfilesAsignables = computed(() =>
  catalogo.value.perfiles.filter((perfil) => perfil.codigo !== "SUPER_ADMIN"),
);
const gruposPermisosCatalogo = computed((): GrupoPermisosEditor[] => {
  const grupos = new Map<string, typeof catalogo.value.permisos>();
  for (const permiso of catalogo.value.permisos) {
    const clave = permiso.modulo || "General";
    const lista = grupos.get(clave) ?? [];
    lista.push(permiso);
    grupos.set(clave, lista);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([modulo, permisos]) => ({
      id: modulo,
      nombre: modulo,
      permisos: [...permisos]
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        .map((permiso) => ({
          codigo: permiso.codigo,
          etiqueta: permiso.nombre,
          descripcion: permiso.descripcion,
        })),
    }));
});
const gruposPermisosAcceso = computed((): GrupoPermisosEditor[] =>
  gruposPermisosCatalogo.value.map((grupo) => ({
    ...grupo,
    permisos: grupo.permisos.map((permiso) => ({
      ...permiso,
      meta: etiquetaOrigenPermiso(permiso.codigo) || null,
    })),
  })),
);
const basePermisosAcceso = computed(() => {
  const codigo = accesoSeleccionado.value?.perfilCodigo;
  return new Set(
    catalogo.value.perfiles.find((perfil) => perfil.codigo === codigo)
      ?.permisos ?? [],
  );
});
const permisosSucios = computed(() => {
  const actual = new Set(accesoSeleccionado.value?.permisos ?? []);
  const editando = new Set(permisosEditando.value);
  if (actual.size !== editando.size) return true;
  for (const codigo of editando) {
    if (!actual.has(codigo)) return true;
  }
  return false;
});
const puedeEditarPermisosAcceso = computed(
  () =>
    Boolean(accesoSeleccionado.value?.funcionId) &&
    accesoSeleccionado.value?.perfilCodigo !== "SUPER_ADMIN",
);
const formularioValido = computed(
  () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.correo.trim()) &&
    Boolean(formulario.perfilCodigo) &&
    (!requiereOrganizacion.value || Boolean(formulario.instalacionRef)),
);

function organizacionPredeterminada() {
  return (
    catalogo.value.organizaciones.find((organizacion) =>
      organizacion.nombre.trim().toLocaleLowerCase().includes("tukuy academy"),
    ) ??
    catalogo.value.organizaciones[0] ??
    null
  );
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

function cargarPermisosPlantillaEnFormulario() {
  permisosFormulario.value = [...(perfilSeleccionado.value?.permisos ?? [])];
}

function seleccionarAcceso(acceso: AccesoPrincipal) {
  accesoSeleccionado.value = acceso;
  permisosEditando.value = [...acceso.permisos];
  mostrarPermisosAvanzadosAcceso.value = false;
  vistaDetalleIdentidad.value = "perfiles";
  errorDialogo.value = "";
}

function overridesDesdeSeleccion(
  seleccionados: string[],
  perfilCodigo: string | null | undefined,
) {
  const base = new Set(
    catalogo.value.perfiles.find((perfil) => perfil.codigo === perfilCodigo)
      ?.permisos ?? [],
  );
  const sel = new Set(seleccionados);
  return {
    permisosConceder: [...sel].filter((codigo) => !base.has(codigo)),
    permisosDenegar: [...base].filter((codigo) => !sel.has(codigo)),
  };
}

function etiquetaOrigenPermiso(codigo: string) {
  const enBase = basePermisosAcceso.value.has(codigo);
  const activo = permisosEditando.value.includes(codigo);
  if (enBase && activo) return "plantilla";
  if (!enBase && activo) return "extra";
  if (enBase && !activo) return "retirado";
  return "";
}

function restaurarPermisosPlantilla() {
  if (!accesoSeleccionado.value) return;
  permisosEditando.value = [
    ...(catalogo.value.perfiles.find(
      (perfil) => perfil.codigo === accesoSeleccionado.value?.perfilCodigo,
    )?.permisos ?? []),
  ];
}

watch(
  [() => formulario.correo, () => formulario.perfilCodigo, () => catalogo.value.organizaciones.length],
  sincronizarOrganizacionPredeterminada,
);

watch(
  () => formulario.perfilCodigo,
  () => {
    if (dialogoAsignar.value) cargarPermisosPlantillaEnFormulario();
  },
);

function espaciosDe(identidad: IdentidadAccesosPrincipal) {
  return [
    ...new Set(
      identidad.accesos
        .map((acceso) => acceso.organizacionNombre)
        .filter((nombre) => Boolean(nombre?.trim())),
    ),
  ];
}

function estadoResumen(identidad: IdentidadAccesosPrincipal) {
  if (!identidad.accesos.length) return "SIN_ACCESO";
  if (identidad.accesos.some((acceso) => acceso.estadoFuncion === "ACTIVA")) {
    return "ACTIVA";
  }
  return "SUSPENDIDA";
}

function etiquetaEstado(estado: string) {
  if (estado === "SIN_ACCESO") return "SIN ACCESO";
  return estado;
}

function severidadEstado(estado: string) {
  if (estado === "ACTIVA") return "success";
  if (estado === "SIN_ACCESO") return "warn";
  return "danger";
}

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
    identidades.value = paginaRespuesta.datos;
    totalRegistros.value = paginaRespuesta.total;
    resumen.value = paginaRespuesta.resumen;
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo cargar el centro de accesos.";
  } finally {
    cargando.value = false;
  }
}

async function cargarIdentidades() {
  cargando.value = true;
  error.value = "";
  try {
    const respuesta = await accesosPrincipalService.listar({
      pagina: pagina.value,
      porPagina: porPagina.value,
      buscar: busqueda.value,
      nivel: filtroNivel.value,
    });
    identidades.value = respuesta.datos;
    totalRegistros.value = respuesta.total;
    resumen.value = respuesta.resumen;
    if (identidadSeleccionada.value) {
      const actualizada = respuesta.datos.find(
        (item) => item.identidadId === identidadSeleccionada.value?.identidadId,
      );
      if (actualizada) {
        identidadSeleccionada.value = actualizada;
        if (accesoSeleccionado.value?.funcionId) {
          const acceso =
            actualizada.accesos.find(
              (item) => item.funcionId === accesoSeleccionado.value?.funcionId,
            ) ?? null;
          if (acceso) seleccionarAcceso(acceso);
          else {
            accesoSeleccionado.value = null;
            permisosEditando.value = [];
          }
        } else if (actualizada.accesos[0]) {
          seleccionarAcceso(actualizada.accesos[0]);
        }
      }
    }
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudo cargar el listado.";
  } finally {
    cargando.value = false;
  }
}

function cambiarPagina(evento: { first: number; rows: number }) {
  porPagina.value = evento.rows;
  pagina.value = Math.floor(evento.first / evento.rows) + 1;
  void cargarIdentidades();
}

function abrirAsignacionNueva() {
  modoFormulario.value = "asignar";
  funcionEditandoId.value = null;
  Object.assign(formulario, {
    correo: "",
    perfilCodigo: "",
    instalacionRef: null,
  });
  permisosFormulario.value = [];
  mostrarPermisosAvanzadosFormulario.value = false;
  errorDialogo.value = "";
  dialogoAsignar.value = true;
}

function abrirIdentidad(identidad: IdentidadAccesosPrincipal) {
  identidadSeleccionada.value = identidad;
  const primero = identidad.accesos[0] ?? null;
  if (primero) seleccionarAcceso(primero);
  else {
    accesoSeleccionado.value = null;
    permisosEditando.value = [];
  }
  errorDialogo.value = "";
  dialogoIdentidad.value = true;
}

function anadirPerfilAIdentidad() {
  if (!identidadSeleccionada.value) return;
  modoFormulario.value = "asignar";
  funcionEditandoId.value = null;
  Object.assign(formulario, {
    correo: identidadSeleccionada.value.correo,
    perfilCodigo: "",
    instalacionRef: null,
  });
  permisosFormulario.value = [];
  mostrarPermisosAvanzadosFormulario.value = false;
  errorDialogo.value = "";
  dialogoAsignar.value = true;
  sincronizarOrganizacionPredeterminada();
}

function editarAcceso(acceso: AccesoPrincipal) {
  if (!acceso.funcionId || acceso.perfilCodigo === "SUPER_ADMIN") return;
  modoFormulario.value = "editar";
  funcionEditandoId.value = acceso.funcionId;
  Object.assign(formulario, {
    correo: acceso.correo,
    perfilCodigo: acceso.perfilCodigo ?? "",
    instalacionRef: acceso.instalacionRef,
  });
  permisosFormulario.value = [...acceso.permisos];
  mostrarPermisosAvanzadosFormulario.value = false;
  errorDialogo.value = "";
  dialogoAsignar.value = true;
  sincronizarOrganizacionPredeterminada();
}

async function guardarAcceso() {
  if (!formularioValido.value) return;
  guardando.value = true;
  errorDialogo.value = "";
  try {
    const overrides = overridesDesdeSeleccion(
      permisosFormulario.value,
      formulario.perfilCodigo,
    );
    if (modoFormulario.value === "editar" && funcionEditandoId.value) {
      await accesosPrincipalService.actualizar({
        funcionId: funcionEditandoId.value,
        perfilCodigo: formulario.perfilCodigo,
        instalacionRef: formulario.instalacionRef,
        ...overrides,
      });
      toast.success(`Perfil de ${formulario.correo} actualizado a ${perfilSeleccionado.value?.nombre ?? ""}.`);
    } else {
      await accesosPrincipalService.asignar({
        ...formulario,
        ...overrides,
      });
      toast.success(`Perfil ${perfilSeleccionado.value?.nombre ?? ""} asignado a ${formulario.correo}.`);
      if (!identidadSeleccionada.value) pagina.value = 1;
    }
    dialogoAsignar.value = false;
    await cargarIdentidades();
  } catch (causa) {
    errorDialogo.value =
      causa instanceof Error
        ? causa.message
        : modoFormulario.value === "editar"
          ? "No se pudo actualizar el perfil."
          : "No se pudo asignar el perfil.";
  } finally {
    guardando.value = false;
  }
}

async function guardarPermisosAcceso() {
  const acceso = accesoSeleccionado.value;
  const funcionId = acceso?.funcionId;
  const perfilCodigo = acceso?.perfilCodigo;
  if (!acceso || !funcionId || !perfilCodigo || perfilCodigo === "SUPER_ADMIN") {
    return;
  }
  guardandoPermisos.value = true;
  errorDialogo.value = "";
  try {
    const overrides = overridesDesdeSeleccion(
      permisosEditando.value,
      perfilCodigo,
    );
    await accesosPrincipalService.actualizar({
      funcionId,
      perfilCodigo,
      instalacionRef: acceso.instalacionRef,
      ...overrides,
    });
    toast.success(`Permisos de ${acceso.perfilNombre} actualizados.`);
    await cargarIdentidades();
  } catch (causa) {
    errorDialogo.value =
      causa instanceof Error
        ? causa.message
        : "No se pudieron guardar los permisos.";
  } finally {
    guardandoPermisos.value = false;
  }
}

async function alternarEstado(acceso: AccesoPrincipal) {
  if (!acceso.funcionId || acceso.perfilCodigo === "SUPER_ADMIN") return;
  const estado = acceso.estadoFuncion === "ACTIVA" ? "SUSPENDIDA" : "ACTIVA";
  try {
    await accesosPrincipalService.cambiarEstado(acceso.funcionId, estado);
    toast.success(`${acceso.perfilNombre}: ${estado === "ACTIVA" ? "reactivado" : "suspendido"}.`);
    await cargarIdentidades();
  } catch (causa) {
    errorDialogo.value =
      causa instanceof Error ? causa.message : "No se pudo modificar el acceso.";
  }
}

async function quitarAcceso(acceso: AccesoPrincipal) {
  if (!acceso.funcionId || acceso.perfilCodigo === "SUPER_ADMIN") return;
  try {
    await accesosPrincipalService.cambiarEstado(acceso.funcionId, "REVOCADA");
    toast.success(`${acceso.perfilNombre} retirado de ${acceso.nombre}.`);
    if (accesoSeleccionado.value?.funcionId === acceso.funcionId) {
      accesoSeleccionado.value = null;
    }
    await cargarIdentidades();
  } catch (causa) {
    errorDialogo.value =
      causa instanceof Error ? causa.message : "No se pudo quitar el perfil.";
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
    void cargarIdentidades();
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
        eyebrow="Usuarios y accesos"
        titulo="Accesos y permisos"
        ayuda="Lista simple de personas. Entra al detalle para asignar perfiles; los permisos finos son opcionales."
      />
      <Button class="bg-primary hover:bg-primary/90" @click="abrirAsignacionNueva">
        <Plus class="h-4 w-4" /> Asignar acceso
      </Button>
    </div>

    <div
      v-if="mensaje"
      class="border-l-4 border-l-teal-500 bg-teal-500/10 px-4 py-3 text-sm font-semibold text-teal-800 dark:text-teal-200"
    >
      {{ mensaje }}
    </div>
    <div
      v-if="error && !dialogoAsignar && !dialogoIdentidad"
      class="border-l-4 border-l-red-500 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-200"
    >
      {{ error }}
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <Skeleton v-if="cargando" v-for="item in 2" :key="item" class="h-28" />
      <Card
        v-else
        v-for="item in [
          { etiqueta: 'Personas registradas', valor: resumen.identidades, icono: UserRoundCog },
          { etiqueta: 'Con acceso activo', valor: resumen.accesosActivos, icono: ShieldCheck },
        ]"
        :key="item.etiqueta"
        class="border-border bg-card"
      >
        <CardContent class="flex items-center gap-4 p-5">
          <span class="grid h-12 w-12 place-items-center bg-primary/10 text-primary">
            <component :is="item.icono" class="h-6 w-6" />
          </span>
          <div>
            <strong class="text-3xl font-black">{{ item.valor }}</strong>
            <p class="text-xs text-muted-foreground">{{ item.etiqueta }}</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div class="grid gap-3 border-b border-border p-5 md:grid-cols-[1fr_16rem]">
          <label class="relative block">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <InputText
              v-model="busqueda"
              class="filtro-control w-full pl-10"
              placeholder="Buscar por nombre, correo o perfil"
            />
          </label>
          <Select
            v-model="filtroNivel"
            :options="[
              { label: 'Todos los alcances', value: 'TODOS' },
              { label: 'Plataforma', value: 'PLATAFORMA' },
              { label: 'Sin acceso asignado', value: 'SIN_ACCESO' },
              { label: 'Organización', value: 'ORGANIZACION' },
            ]"
            option-label="label"
            option-value="value"
            class="filtro-control w-full"
          />
        </div>

        <div v-if="cargando" class="space-y-2 p-5">
          <Skeleton v-for="item in 5" :key="item" class="h-14" />
        </div>

        <DataTable
          v-else
          :value="identidades"
          data-key="identidadId"
          lazy
          paginator
          :first="(pagina - 1) * porPagina"
          :rows="porPagina"
          :total-records="totalRegistros"
          :rows-per-page-options="[10, 20, 50]"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
          current-page-report-template="{first}–{last} de {totalRecords} identidades"
          size="small"
          scrollable
          table-style="min-width: 42rem"
          class="tabla-administracion"
          row-hover
          @page="cambiarPagina"
          @row-click="abrirIdentidad(($event.data as IdentidadAccesosPrincipal))"
        >
          <template #empty>
            <div class="py-12 text-center text-sm text-muted-foreground">
              No hay identidades con estos filtros.
            </div>
          </template>

          <Column header="Persona" style="min-width: 16rem">
            <template #body="{ data }">
              <div class="flex items-center gap-3">
                <img
                  v-if="data.avatarUrl"
                  :src="data.avatarUrl"
                  class="h-10 w-10 rounded-full object-cover"
                  alt=""
                  referrerpolicy="no-referrer"
                />
                <span
                  v-else
                  class="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary"
                >
                  {{ data.nombre.slice(0, 2).toUpperCase() }}
                </span>
                <div>
                  <strong>{{ data.nombre }}</strong>
                  <p class="text-xs text-muted-foreground">{{ data.correo }}</p>
                  <Tag
                    v-if="estadoResumen(data) === 'SIN_ACCESO'"
                    class="mt-1"
                    severity="warn"
                    value="Sin acceso"
                  />
                </div>
              </div>
            </template>
          </Column>

          <Column header="Perfiles asignados" style="min-width: 18rem">
            <template #body="{ data }">
              <div v-if="data.accesos.length" class="flex flex-wrap gap-1.5">
                <Tag
                  v-for="acceso in data.accesos"
                  :key="acceso.funcionId ?? acceso.perfilCodigo ?? acceso.identidadId"
                  :severity="acceso.estadoFuncion === 'ACTIVA' ? 'info' : 'secondary'"
                  :value="acceso.perfilNombre ?? 'Perfil'"
                />
              </div>
              <span v-else class="text-xs text-muted-foreground">Sin perfiles</span>
            </template>
          </Column>

          <Column header="" style="min-width: 8rem">
            <template #body="{ data }">
              <Button
                size="sm"
                variant="outline"
                @click.stop="abrirIdentidad(data)"
              >
                Gestionar
                <ChevronRight class="h-4 w-4" />
              </Button>
            </template>
          </Column>
        </DataTable>
      </CardContent>
    </Card>

    <!-- Detalle por identidad -->
    <Dialog
      v-model:visible="dialogoIdentidad"
      modal
      :header="identidadSeleccionada ? identidadSeleccionada.nombre : 'Identidad'"
      :style="{ width: 'min(96vw, 72rem)' }"
    >
      <div v-if="identidadSeleccionada" class="grid gap-5">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div class="flex items-center gap-3">
            <img
              v-if="identidadSeleccionada.avatarUrl"
              :src="identidadSeleccionada.avatarUrl"
              class="h-12 w-12 rounded-full object-cover"
              alt=""
              referrerpolicy="no-referrer"
            />
            <span
              v-else
              class="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-sm font-black text-primary"
            >
              {{ identidadSeleccionada.nombre.slice(0, 2).toUpperCase() }}
            </span>
            <div>
              <p class="font-black">{{ identidadSeleccionada.nombre }}</p>
              <p class="text-sm text-muted-foreground">
                {{ identidadSeleccionada.correo }}
              </p>
            </div>
          </div>
          <Button size="sm" class="bg-primary hover:bg-primary/90" @click="anadirPerfilAIdentidad">
            <Plus class="h-4 w-4" /> Añadir perfil
          </Button>
        </div>

        <div class="flex flex-wrap gap-2 border-b border-border pb-4">
          <Button
            size="sm"
            :variant="vistaDetalleIdentidad === 'perfiles' ? 'default' : 'outline'"
            @click="vistaDetalleIdentidad = 'perfiles'"
          >
            Perfiles
          </Button>
          <Button
            size="sm"
            :variant="vistaDetalleIdentidad === 'permisos' ? 'default' : 'outline'"
            :disabled="!accesoSeleccionado"
            @click="vistaDetalleIdentidad = 'permisos'"
          >
            Permisos del perfil
          </Button>
        </div>

        <div v-if="vistaDetalleIdentidad === 'perfiles'" class="grid gap-2">
          <p class="text-xs font-black uppercase tracking-wide text-muted-foreground">
            Perfiles de esta persona
          </p>
          <div
            v-if="!identidadSeleccionada.accesos.length"
            class="border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
          >
            Esta persona aún no tiene perfiles. Añade el primero.
          </div>
          <div
            v-for="(acceso, indiceAcceso) in identidadSeleccionada.accesos"
            :key="acceso.funcionId ?? acceso.perfilCodigo ?? `acceso-${indiceAcceso}`"
            role="button"
            tabindex="0"
            class="grid cursor-pointer gap-2 border border-border p-4 text-left transition hover:border-primary/40"
            :class="
              accesoSeleccionado?.funcionId === acceso.funcionId
                ? 'border-primary bg-primary/5'
                : 'bg-card'
            "
            @click="seleccionarAcceso(acceso)"
            @keydown.enter="seleccionarAcceso(acceso)"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <strong>{{ acceso.perfilNombre }}</strong>
                <p class="text-xs text-muted-foreground">
                  {{ acceso.organizacionNombre || acceso.portal }}
                </p>
              </div>
              <Tag
                :severity="severidadEstado(acceso.estadoFuncion)"
                :value="etiquetaEstado(acceso.estadoFuncion)"
              />
            </div>
            <div class="flex flex-wrap gap-2" @click.stop>
              <template v-if="acceso.perfilCodigo !== 'SUPER_ADMIN'">
                <Button size="sm" variant="outline" @click="editarAcceso(acceso)">
                  <Pencil class="h-3.5 w-3.5" /> Cambiar
                </Button>
                <Button size="sm" variant="outline" @click="alternarEstado(acceso)">
                  {{ acceso.estadoFuncion === "ACTIVA" ? "Suspender" : "Reactivar" }}
                </Button>
                <Button size="sm" variant="outline" @click="quitarAcceso(acceso)">
                  <Trash2 class="h-3.5 w-3.5" /> Quitar
                </Button>
              </template>
              <span v-else class="text-xs font-bold text-muted-foreground">
                Acceso raíz protegido
              </span>
            </div>
          </div>
        </div>

        <div v-else class="grid gap-4">
          <template v-if="accesoSeleccionado">
            <div>
              <p class="font-black">{{ accesoSeleccionado.perfilNombre }}</p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ permisosEditando.length }} capacidades activas
              </p>
            </div>
            <div
              v-if="accesoSeleccionado.perfilCodigo === 'SUPER_ADMIN'"
              class="text-sm text-muted-foreground"
            >
              El acceso raíz no admite edición desde el panel.
            </div>
            <template v-else>
              <Button
                v-if="!mostrarPermisosAvanzadosAcceso"
                size="sm"
                variant="outline"
                @click="mostrarPermisosAvanzadosAcceso = true"
              >
                Personalizar permisos
              </Button>
              <div v-else class="grid gap-3">
                <div class="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" @click="restaurarPermisosPlantilla">
                    Restaurar plantilla
                  </Button>
                  <Button
                    size="sm"
                    class="bg-primary hover:bg-primary/90"
                    :disabled="!permisosSucios || guardandoPermisos"
                    @click="guardarPermisosAcceso"
                  >
                    {{ guardandoPermisos ? "Guardando…" : "Guardar permisos" }}
                  </Button>
                </div>
                <EditorPermisosAgrupados
                  v-if="puedeEditarPermisosAcceso"
                  :key="`acceso-${accesoSeleccionado.funcionId}`"
                  v-model="permisosEditando"
                  :grupos="gruposPermisosAcceso"
                  modo-modulo
                  ayuda="Activa áreas del portal. Usa «Afinar» solo si necesitas ajustes puntuales."
                />
              </div>
            </template>
          </template>
          <p v-else class="text-sm text-muted-foreground">
            Selecciona un perfil en la pestaña anterior.
          </p>
        </div>

        <div
          v-if="errorDialogo && !dialogoAsignar"
          class="border-l-4 border-l-red-500 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200"
        >
          {{ errorDialogo }}
        </div>
      </div>
      <template #footer>
        <Button variant="outline" @click="dialogoIdentidad = false">Cerrar</Button>
      </template>
    </Dialog>

    <!-- Asignar / cambiar perfil -->
    <Dialog
      v-model:visible="dialogoAsignar"
      modal
      :header="tituloFormulario"
      :style="{ width: 'min(94vw, 52rem)' }"
    >
      <div class="grid gap-5">
        <div class="border-l-4 border-l-primary bg-primary/8 p-4 text-sm">
          <template v-if="modoFormulario === 'editar'">
            Cambia el perfil o la organización. Puedes ajustar permisos antes de guardar.
          </template>
          <template v-else>
            La persona debe existir en Auth. Elige el perfil y, si hace falta, ajusta
            permisos sobre la plantilla.
          </template>
        </div>
        <label>
          <span class="filtro-label">Correo de la identidad</span>
          <InputText
            v-model="formulario.correo"
            type="email"
            class="filtro-control w-full"
            placeholder="persona@organizacion.com"
            :disabled="Boolean(identidadSeleccionada) || modoFormulario === 'editar'"
          />
        </label>
        <label>
          <span class="filtro-label">Perfil a delegar</span>
          <Select
            v-model="formulario.perfilCodigo"
            :options="perfilesAsignables"
            option-label="nombre"
            option-value="codigo"
            class="filtro-control w-full"
            placeholder="Selecciona un perfil"
            @change="sincronizarOrganizacionPredeterminada"
          />
        </label>
        <label v-if="requiereOrganizacion">
          <span class="filtro-label">Organización</span>
          <Select
            v-model="formulario.instalacionRef"
            :options="catalogo.organizaciones"
            option-label="nombre"
            option-value="instalacionId"
            class="filtro-control w-full"
            placeholder="Selecciona la organización"
          />
        </label>
        <div v-if="perfilSeleccionado" class="border border-border p-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-black">{{ perfilSeleccionado.nombre }}</p>
              <p class="mt-1 text-sm text-muted-foreground">
                {{ perfilSeleccionado.descripcion }}
              </p>
              <p class="mt-2 text-xs text-muted-foreground">
                Se usarán los permisos estándar del perfil.
              </p>
            </div>
          </div>
          <Button
            class="mt-4"
            size="sm"
            variant="outline"
            @click="mostrarPermisosAvanzadosFormulario = !mostrarPermisosAvanzadosFormulario"
          >
            {{
              mostrarPermisosAvanzadosFormulario
                ? "Ocultar personalización"
                : "Personalizar permisos (opcional)"
            }}
          </Button>
          <div v-if="mostrarPermisosAvanzadosFormulario" class="mt-4 grid gap-3">
            <Button size="sm" variant="outline" @click="cargarPermisosPlantillaEnFormulario">
              Restaurar plantilla
            </Button>
            <EditorPermisosAgrupados
              :key="`form-${formulario.perfilCodigo}`"
              v-model="permisosFormulario"
              :grupos="gruposPermisosCatalogo"
              modo-modulo
              ayuda="Opcional: ajusta áreas antes de asignar el perfil."
            />
          </div>
        </div>
        <div
          v-if="errorDialogo"
          class="border-l-4 border-l-red-500 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-200"
        >
          {{ errorDialogo }}
        </div>
      </div>
      <template #footer>
        <Button variant="outline" @click="dialogoAsignar = false">Cancelar</Button>
        <Button
          :disabled="!formularioValido || guardando"
          class="bg-primary hover:bg-primary/90"
          @click="guardarAcceso"
        >
          {{ etiquetaGuardar }}
        </Button>
      </template>
    </Dialog>
  </section>
</template>
