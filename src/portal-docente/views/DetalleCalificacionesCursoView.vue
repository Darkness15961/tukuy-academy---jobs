<script setup lang="ts">
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FilterX,
  GraduationCap,
  MessageSquareWarning,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  academicoService,
  type EntregaActividadAcademica,
  type ModuloCursoAcademico,
  type ResumenCursoCalificaciones,
  type ResumenEstudianteCurso,
} from "@/api/services/academico.service";
import { docenteService } from "@/api/services/docente.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Skeleton from "primevue/skeleton";

const route = useRoute();
const router = useRouter();
const cursoId = computed(() => String(route.params.cursoId));
const cargando = ref(true);
const guardando = ref(false);
const pestana = ref<"ENTREGAS" | "RESUMEN">("ENTREGAS");
const curso = ref<ResumenCursoCalificaciones>();
const modulos = ref<ModuloCursoAcademico[]>([]);
const entregas = ref<EntregaActividadAcademica[]>([]);
const resumenEstudiantes = ref<ResumenEstudianteCurso[]>([]);
const busqueda = ref("");
const moduloFiltro = ref("TODOS");
const actividadFiltro = ref("TODAS");
const estadoFiltro = ref("TODOS");
const entregaSeleccionada = ref<EntregaActividadAcademica>();
const nota = ref<number | null>(null);
const retroalimentacion = ref("");
const aviso = ref("");
const pestanas = [
  { id: "ENTREGAS", texto: "Entregas y archivos" },
  { id: "RESUMEN", texto: "Resumen académico" },
] as const;

const opcionesModulos = computed(() => [
  { label: "Todos los módulos", value: "TODOS" },
  ...modulos.value.map((modulo) => ({
    label: modulo.titulo,
    value: modulo.id,
  })),
]);

const opcionesActividades = computed(() => [
  { label: "Todas las actividades", value: "TODAS" },
  ...modulos.value
    .filter(
      (modulo) =>
        moduloFiltro.value === "TODOS" || modulo.id === moduloFiltro.value,
    )
    .flatMap((modulo) => modulo.actividades)
    .map((actividad) => ({
      label: actividad.titulo,
      value: actividad.id,
    })),
]);

const opcionesEstados = [
  { label: "Todos los estados", value: "TODOS" },
  { label: "Por revisar", value: "EN_REVISION" },
  { label: "Calificada", value: "CALIFICADA" },
  { label: "Observada", value: "OBSERVADA" },
  { label: "Sin entregar", value: "SIN_ENTREGAR" },
];

const entregasVisibles = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  return entregas.value.filter((entrega) => {
    const coincideBusqueda =
      !termino ||
      [
        entrega.estudianteNombre,
        entrega.actividadTitulo,
        entrega.moduloTitulo,
        entrega.archivo?.nombre ?? "",
      ].some((valor) => valor.toLowerCase().includes(termino));
    return (
      coincideBusqueda &&
      (moduloFiltro.value === "TODOS" ||
        entrega.moduloId === moduloFiltro.value) &&
      (actividadFiltro.value === "TODAS" ||
        entrega.actividadId === actividadFiltro.value) &&
      (estadoFiltro.value === "TODOS" || entrega.estado === estadoFiltro.value)
    );
  });
});

const indicadores = computed(() => [
  {
    etiqueta: "Estudiantes",
    valor: resumenEstudiantes.value.length,
    icono: UsersRound,
    clase: "border-t-primary",
  },
  {
    etiqueta: "Por revisar",
    valor: entregas.value.filter((entrega) =>
      ["ENTREGADA", "EN_REVISION"].includes(entrega.estado),
    ).length,
    icono: FileText,
    clase: "border-t-accent",
  },
  {
    etiqueta: "Calificadas",
    valor: entregas.value.filter((entrega) => entrega.estado === "CALIFICADA")
      .length,
    icono: CheckCircle2,
    clase: "border-t-emerald-500",
  },
  {
    etiqueta: "Listos para certificar",
    valor: resumenEstudiantes.value.filter(
      (estudiante) => estudiante.estado === "APROBADO",
    ).length,
    icono: Award,
    clase: "border-t-violet-500",
  },
]);

const hayFiltros = computed(
  () =>
    Boolean(busqueda.value) ||
    moduloFiltro.value !== "TODOS" ||
    actividadFiltro.value !== "TODAS" ||
    estadoFiltro.value !== "TODOS",
);

async function cargar() {
  cargando.value = true;
  try {
    const [resumenCursos, listaModulos, listaEntregas, estudiantes] =
      await Promise.all([
        academicoService.listarResumenCursos(),
        academicoService.listarModulos(cursoId.value),
        academicoService.listarEntregasCurso(cursoId.value),
        academicoService.obtenerResumenEstudiantes(cursoId.value),
      ]);
    curso.value = resumenCursos.find((item) => item.cursoId === cursoId.value);
    modulos.value = listaModulos;
    entregas.value = listaEntregas;
    resumenEstudiantes.value = estudiantes;
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);

function limpiarFiltros() {
  busqueda.value = "";
  moduloFiltro.value = "TODOS";
  actividadFiltro.value = "TODAS";
  estadoFiltro.value = "TODOS";
}

function abrirRevision(entrega: EntregaActividadAcademica) {
  entregaSeleccionada.value = entrega;
  nota.value = entrega.nota ?? 14;
  retroalimentacion.value = entrega.retroalimentacion ?? "";
}

async function guardarCalificacion() {
  if (
    !entregaSeleccionada.value ||
    nota.value === null ||
    nota.value < 0 ||
    nota.value > 20
  ) {
    return;
  }
  guardando.value = true;
  try {
    await academicoService.calificarEntrega(
      entregaSeleccionada.value.id,
      nota.value,
      retroalimentacion.value.trim(),
    );
    await docenteService.sincronizarCertificadosElegibles(cursoId.value);
    entregaSeleccionada.value = undefined;
    aviso.value =
      "La entrega fue calificada y el resultado académico se actualizó.";
    await cargar();
  } finally {
    guardando.value = false;
  }
}

async function solicitarCorreccion() {
  if (!entregaSeleccionada.value || !retroalimentacion.value.trim()) return;
  guardando.value = true;
  try {
    await academicoService.solicitarCorreccion(
      entregaSeleccionada.value.id,
      retroalimentacion.value.trim(),
    );
    entregaSeleccionada.value = undefined;
    aviso.value = "Se solicitó una nueva versión al estudiante.";
    await cargar();
  } finally {
    guardando.value = false;
  }
}

function severidadEntrega(estado: string) {
  if (estado === "CALIFICADA") return "success";
  if (estado === "EN_REVISION" || estado === "ENTREGADA") return "warn";
  if (estado === "OBSERVADA" || estado === "ATRASADA") return "danger";
  return "secondary";
}

function severidadEstudiante(estado: string) {
  if (estado === "APROBADO") return "success";
  if (estado === "EN_RIESGO") return "danger";
  return "warn";
}

function fecha(fechaIso: string | null) {
  if (!fechaIso) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(fechaIso));
}
</script>

<template>
  <section class="mx-auto grid min-w-0 w-full max-w-375 gap-4 sm:gap-5">
    <div v-if="cargando" class="grid gap-4">
      <Skeleton class="h-28 w-full" />
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="item in 4" :key="item" class="h-20 w-full" />
      </div>
      <Skeleton class="h-80 w-full" />
    </div>

    <template v-else>
      <div
        class="relative min-h-28 overflow-hidden border border-border bg-slate-950 text-white sm:min-h-32"
      >
        <img
          v-if="curso?.imagen"
          :src="curso.imagen"
          :alt="curso.titulo"
          class="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div
          class="absolute inset-0 bg-linear-to-r from-[#071F52] via-[#071F52]/95 to-[#071F52]/55"
        />
        <div
          class="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div class="flex min-w-0 items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              class="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20"
              @click="router.push('/docente/calificaciones')"
            >
              <ArrowLeft class="h-4 w-4" />
            </Button>
            <div class="min-w-0">
              <p
                class="text-[0.65rem] font-black uppercase tracking-[.18em] text-accent sm:text-xs"
              >
                Libro del curso
              </p>
              <h1 class="mt-1 line-clamp-2 text-xl font-black sm:text-2xl">
                {{ curso?.titulo ?? "Curso" }}
              </h1>
              <p class="mt-1 text-xs text-blue-100 sm:text-sm">
                {{ curso?.contexto }} · {{ modulos.length }} módulos ·
                {{ curso?.actividades }} actividades
              </p>
            </div>
          </div>
          <Button
            class="w-full shrink-0 bg-accent text-slate-950 hover:bg-accent/90 sm:w-auto"
            @click="pestana = 'RESUMEN'"
          >
            <Award class="h-4 w-4" />
            Ver elegibilidad
          </Button>
        </div>
      </div>

      <p
        v-if="aviso"
        class="border-l-4 border-l-emerald-600 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
      >
        {{ aviso }}
      </p>

      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card
          v-for="indicador in indicadores"
          :key="indicador.etiqueta"
          class="overflow-hidden border-border border-t-4 bg-card"
          :class="indicador.clase"
        >
          <CardContent class="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <span
              class="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-primary sm:h-10 sm:w-10"
            >
              <component :is="indicador.icono" class="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div class="min-w-0">
              <strong class="text-xl sm:text-2xl">{{ indicador.valor }}</strong>
              <p
                class="truncate text-[0.65rem] text-muted-foreground sm:text-xs"
              >
                {{ indicador.etiqueta }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="-mx-1 overflow-x-auto px-1">
        <div class="flex min-w-max border-b border-border">
          <button
            v-for="opcion in pestanas"
            :key="opcion.id"
            class="border-b-[3px] px-4 py-2.5 text-sm font-black whitespace-nowrap sm:px-5"
            :class="
              pestana === opcion.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            "
            @click="pestana = opcion.id"
          >
            {{ opcion.texto }}
          </button>
        </div>
      </div>

      <template v-if="pestana === 'ENTREGAS'">
        <section
          class="min-w-0 overflow-hidden border border-border border-t-4 border-t-accent bg-card"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5"
          >
            <div class="flex items-center gap-3">
              <span
                class="grid h-8 w-8 place-items-center bg-primary/10 text-primary"
              >
                <SlidersHorizontal class="h-4 w-4" />
              </span>
              <div>
                <h2 class="text-sm font-black">Filtros de entregas</h2>
                <p class="text-xs text-muted-foreground">
                  {{ entregasVisibles.length }} de
                  {{ entregas.length }} registros visibles
                </p>
              </div>
            </div>
            <Button
              v-if="hayFiltros"
              variant="ghost"
              size="sm"
              @click="limpiarFiltros"
            >
              <FilterX class="h-4 w-4" />
              Limpiar filtros
            </Button>
          </div>

          <div
            class="grid gap-3 p-4 sm:gap-4 sm:p-5 md:grid-cols-2 xl:grid-cols-4"
          >
            <label class="md:col-span-2 xl:col-span-2">
              <span class="filtro-label">Buscar</span>
              <span class="relative block">
                <Search
                  class="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <InputText
                  v-model="busqueda"
                  class="filtro-control w-full pl-10"
                  placeholder="Estudiante, tarea o archivo PDF"
                />
              </span>
            </label>

            <label>
              <span class="filtro-label">Módulo</span>
              <Select
                v-model="moduloFiltro"
                class="filtro-control"
                :options="opcionesModulos"
                option-label="label"
                option-value="value"
                panel-class="tukuy-filtro-panel"
                fluid
                @update:model-value="actividadFiltro = 'TODAS'"
              />
            </label>

            <label>
              <span class="filtro-label">Actividad</span>
              <Select
                v-model="actividadFiltro"
                class="filtro-control"
                :options="opcionesActividades"
                option-label="label"
                option-value="value"
                panel-class="tukuy-filtro-panel"
                fluid
              />
            </label>

            <label class="md:col-span-2 xl:col-span-1">
              <span class="filtro-label">Estado</span>
              <Select
                v-model="estadoFiltro"
                class="filtro-control"
                :options="opcionesEstados"
                option-label="label"
                option-value="value"
                panel-class="tukuy-filtro-panel"
                fluid
              />
            </label>
          </div>

          <div class="min-w-0 overflow-x-auto border-t border-border">
            <DataTable
              :value="entregasVisibles"
              data-key="id"
              class="tabla-administracion"
              size="small"
              removable-sort
              :paginator="entregasVisibles.length > 10"
              :rows="10"
              :rows-per-page-options="[10, 20, 40]"
              paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
              current-page-report-template="{first}–{last} de {totalRecords}"
              table-style="min-width: 58rem"
            >
              <template #empty>
                <div class="py-10 text-center text-sm text-muted-foreground">
                  No existen entregas para los filtros seleccionados.
                </div>
              </template>

              <Column
                field="estudianteNombre"
                header="Estudiante"
                sortable
                style="min-width: 11rem"
              >
                <template #body="{ data }">
                  <div class="flex items-center gap-2">
                    <span
                      class="grid h-8 w-8 shrink-0 place-items-center bg-primary/10 text-[0.65rem] font-black text-primary"
                    >
                      {{ data.estudianteIniciales }}
                    </span>
                    <strong class="line-clamp-2 text-sm leading-tight">
                      {{ data.estudianteNombre }}
                    </strong>
                  </div>
                </template>
              </Column>

              <Column
                field="actividadTitulo"
                header="Actividad"
                sortable
                style="min-width: 14rem"
              >
                <template #body="{ data }">
                  <div class="min-w-0">
                    <p class="line-clamp-2 text-sm font-semibold leading-tight">
                      {{ data.actividadTitulo }}
                    </p>
                    <p class="mt-0.5 truncate text-xs text-muted-foreground">
                      {{ data.moduloTitulo }}
                    </p>
                  </div>
                </template>
              </Column>

              <Column header="Archivo" style="min-width: 9rem">
                <template #body="{ data }">
                  <div
                    v-if="data.archivo"
                    class="flex min-w-0 items-center gap-1.5"
                    :title="data.archivo.nombre"
                  >
                    <FileText class="h-4 w-4 shrink-0 text-red-600" />
                    <span class="truncate text-xs font-semibold">
                      {{ data.archivo.nombre }}
                    </span>
                  </div>
                  <span v-else class="text-xs text-muted-foreground"
                    >Sin archivo</span
                  >
                </template>
              </Column>

              <Column
                field="entregadaEn"
                header="Entrega"
                sortable
                style="min-width: 8rem"
              >
                <template #body="{ data }">
                  <span class="text-xs text-muted-foreground whitespace-nowrap">
                    {{ fecha(data.entregadaEn) }}
                  </span>
                </template>
              </Column>

              <Column
                field="estado"
                header="Estado"
                sortable
                style="min-width: 7.5rem"
              >
                <template #body="{ data }">
                  <Tag
                    :severity="severidadEntrega(data.estado)"
                    :value="data.estado.replace('_', ' ')"
                  />
                </template>
              </Column>

              <Column
                field="nota"
                header="Nota"
                sortable
                style="min-width: 5rem"
              >
                <template #body="{ data }">
                  <strong v-if="data.nota !== undefined" class="text-sm">
                    {{ data.nota }}
                  </strong>
                  <span v-else>—</span>
                </template>
              </Column>

              <Column header="Acciones" style="min-width: 9rem">
                <template #body="{ data }">
                  <div class="flex flex-wrap items-center gap-1">
                    <Button
                      v-if="data.archivo"
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      aria-label="Ver PDF"
                      @click="academicoService.abrirArchivo(data)"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                    <Button
                      v-if="data.archivo"
                      variant="ghost"
                      size="icon"
                      class="h-8 w-8"
                      aria-label="Descargar PDF"
                      @click="academicoService.descargarArchivo(data)"
                    >
                      <Download class="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      class="h-8 px-2 text-xs"
                      :disabled="!data.archivo"
                      @click="abrirRevision(data)"
                    >
                      {{
                        data.estado === "CALIFICADA" ? "Editar" : "Calificar"
                      }}
                    </Button>
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </section>
      </template>

      <section
        v-else
        class="min-w-0 overflow-hidden border border-border bg-card"
      >
        <div class="border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <h2 class="text-sm font-black sm:text-base">
            Resultado consolidado por estudiante
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">
            Certificación: todas las actividades calificadas, nota mínima 14 y
            horas completas.
          </p>
        </div>

        <div class="min-w-0 overflow-x-auto">
          <DataTable
            :value="resumenEstudiantes"
            data-key="estudianteId"
            class="tabla-administracion"
            size="small"
            :paginator="resumenEstudiantes.length > 10"
            :rows="10"
            :rows-per-page-options="[10, 20, 40]"
            paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            current-page-report-template="{first}–{last} de {totalRecords}"
            table-style="min-width: 48rem"
          >
            <Column
              field="estudianteNombre"
              header="Estudiante"
              sortable
              style="min-width: 12rem"
            >
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <span
                    class="grid h-8 w-8 shrink-0 place-items-center bg-primary/10 text-[0.65rem] font-black text-primary"
                  >
                    {{ data.iniciales }}
                  </span>
                  <strong class="line-clamp-2 text-sm leading-tight">
                    {{ data.estudianteNombre }}
                  </strong>
                </div>
              </template>
            </Column>

            <Column header="Actividades" style="min-width: 7rem">
              <template #body="{ data }">
                <strong>{{ data.actividadesCalificadas }}</strong>
                / {{ data.actividadesRequeridas }}
              </template>
            </Column>

            <Column
              field="notaFinal"
              header="Nota"
              sortable
              style="min-width: 5rem"
            >
              <template #body="{ data }">
                <strong class="text-sm">
                  {{ data.notaFinal || "—" }}
                  <span v-if="data.notaFinal" class="text-muted-foreground"
                    >/20</span
                  >
                </strong>
              </template>
            </Column>

            <Column header="Horas" style="min-width: 7rem">
              <template #body="{ data }">
                <strong>{{ data.horasCumplidas }}</strong>
                / {{ data.horasRequeridas }} h
              </template>
            </Column>

            <Column
              field="estado"
              header="Condición"
              sortable
              style="min-width: 8rem"
            >
              <template #body="{ data }">
                <Tag
                  :severity="severidadEstudiante(data.estado)"
                  :value="data.estado.replace('_', ' ')"
                />
              </template>
            </Column>

            <Column header="Certificación" style="min-width: 10rem">
              <template #body="{ data }">
                <span
                  v-if="data.estado === 'APROBADO'"
                  class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 sm:text-sm"
                >
                  <Award class="h-4 w-4 shrink-0" />
                  Habilitado
                </span>
                <span v-else class="text-xs text-muted-foreground">
                  No cumple requisitos
                </span>
              </template>
            </Column>
          </DataTable>
        </div>
      </section>
    </template>

    <div
      v-if="entregaSeleccionada"
      class="fixed inset-0 z-[80] grid place-items-end bg-slate-950/70 p-0 sm:place-items-center sm:p-4"
      @click.self="entregaSeleccionada = undefined"
    >
      <Card
        class="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-none border-border bg-card shadow-2xl sm:rounded-xl"
      >
        <CardContent class="p-4 sm:p-6">
          <p class="text-xs font-black uppercase tracking-[.18em] text-primary">
            Revisión de evidencia
          </p>
          <h2 class="mt-2 text-lg font-black sm:text-xl">
            {{ entregaSeleccionada.actividadTitulo }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ entregaSeleccionada.estudianteNombre }} ·
            {{ entregaSeleccionada.moduloTitulo }}
          </p>

          <div
            class="mt-4 flex flex-col gap-3 border border-border bg-muted/40 p-3 sm:flex-row sm:items-center sm:p-4"
          >
            <FileText class="h-7 w-7 shrink-0 text-red-600" />
            <div class="min-w-0 flex-1">
              <strong class="block truncate text-sm">
                {{ entregaSeleccionada.archivo?.nombre }}
              </strong>
              <span class="text-xs text-muted-foreground">
                Intento {{ entregaSeleccionada.intento }} ·
                {{ fecha(entregaSeleccionada.entregadaEn) }}
              </span>
            </div>
            <div class="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                @click="academicoService.abrirArchivo(entregaSeleccionada)"
              >
                <Eye class="h-4 w-4" />
                Ver
              </Button>
              <Button
                variant="outline"
                size="sm"
                @click="academicoService.descargarArchivo(entregaSeleccionada)"
              >
                <Download class="h-4 w-4" />
                Descargar
              </Button>
            </div>
          </div>

          <label class="mt-4 grid gap-2 text-sm font-bold">
            Nota sobre 20
            <InputNumber
              v-model="nota"
              :min="0"
              :max="20"
              :use-grouping="false"
              class="filtro-control w-full"
            />
          </label>

          <label class="mt-4 grid gap-2 text-sm font-bold">
            Retroalimentación
            <textarea
              v-model="retroalimentacion"
              class="min-h-28 border border-border bg-background p-3 text-sm font-normal"
              placeholder="Registra fortalezas, observaciones y mejoras necesarias"
            />
          </label>

          <div
            class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end"
          >
            <Button
              variant="outline"
              class="w-full sm:w-auto"
              @click="entregaSeleccionada = undefined"
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              class="w-full text-amber-700 sm:w-auto"
              :disabled="guardando || !retroalimentacion.trim()"
              @click="solicitarCorreccion"
            >
              <MessageSquareWarning class="h-4 w-4" />
              Solicitar corrección
            </Button>
            <Button
              class="w-full sm:w-auto"
              :disabled="guardando || nota === null || nota < 0 || nota > 20"
              @click="guardarCalificacion"
            >
              <GraduationCap class="h-4 w-4" />
              {{ guardando ? "Guardando..." : "Guardar calificación" }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
