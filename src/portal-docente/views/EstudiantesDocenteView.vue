<script setup lang="ts">
import {
  Download,
  FilterX,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import ProgressBar from "primevue/progressbar";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { computed, onMounted, ref } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Skeleton from "primevue/skeleton";
import {
  docenteService,
  type CursoDocente,
  type EstudianteDocente,
} from "@/api/services/docente.service";
import { organizacionService } from "@/api/services/organizacion.service";
import { useContextoSesion } from "@/composables/useContextoSesion";
type SeveridadEstado = "success" | "danger" | "info";

const props = withDefaults(
  defineProps<{
    titulo?: string;
    etiqueta?: string;
    descripcion?: string;
    nombreArchivo?: string;
    alcance?: "DOCENTE" | "ORGANIZACION";
  }>(),
  {
    titulo: "Estudiantes",
    etiqueta: "Seguimiento académico",
    descripcion: "",
    nombreArchivo: "estudiantes-filtrados.csv",
    alcance: "DOCENTE",
  },
);

const cargando = ref(true);
const { contextoActivo } = useContextoSesion();
const listado = ref<EstudianteDocente[]>([]);
const listadoCursos = ref<CursoDocente[]>([]);
const busqueda = ref("");
const cursoFiltro = ref("todos");
const organizacionFiltro = ref("todas");
const estadoFiltro = ref("todos");
const progresoFiltro = ref("todos");
const fechaDesde = ref<Date | null>(null);
const fechaHasta = ref<Date | null>(null);

const ambitoActivo = computed(() =>
  contextoActivo.value?.ambitoDocencia === "INDEPENDIENTE" ||
  !contextoActivo.value?.organizacionId
    ? "INDEPENDIENTE"
    : "ORGANIZACION",
);

const nombreAmbito = computed(() =>
  ambitoActivo.value === "INDEPENDIENTE"
    ? "Docencia independiente"
    : contextoActivo.value?.organizacionNombre,
);

const cursosPermitidos = computed(
  () =>
    new Set(
      listadoCursos.value
        .filter((curso) =>
          ambitoActivo.value === "INDEPENDIENTE"
            ? curso.ambito === "INDEPENDIENTE"
            : curso.ambito === "ORGANIZACION" &&
              curso.organizacionId === contextoActivo.value?.organizacionId,
        )
        .map((curso) => curso.id),
    ),
);

const cursos = computed(() =>
  [...new Set(listado.value.map((item) => item.curso))].sort(),
);
const organizaciones = computed(() =>
  [...new Set(listado.value.map((item) => item.organizacion))].sort(),
);

const opcionesCursos = computed(() => [
  { etiqueta: "Todos los cursos", valor: "todos" },
  ...cursos.value.map((curso) => ({ etiqueta: curso, valor: curso })),
]);

const opcionesOrganizaciones = computed(() => [
  { etiqueta: "Todas las organizaciones", valor: "todas" },
  ...organizaciones.value.map((organizacion) => ({
    etiqueta: organizacion,
    valor: organizacion,
  })),
]);

const opcionesEstados = [
  { etiqueta: "Todos los estados", valor: "todos" },
  { etiqueta: "Activo", valor: "ACTIVO" },
  { etiqueta: "Completado", valor: "COMPLETADO" },
  { etiqueta: "En riesgo", valor: "EN_RIESGO" },
];

const opcionesProgreso = [
  { etiqueta: "Cualquier progreso", valor: "todos" },
  { etiqueta: "Menos de 30%", valor: "inicio" },
  { etiqueta: "Entre 30% y 79%", valor: "avance" },
  { etiqueta: "80% o más", valor: "cierre" },
];

const estudiantes = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  const desde = normalizarFecha(fechaDesde.value);
  const hasta = normalizarFecha(fechaHasta.value);

  return listado.value.filter((estudiante) => {
    const coincideBusqueda =
      !termino ||
      [estudiante.nombre, estudiante.curso, estudiante.organizacion].some(
        (valor) => valor.toLowerCase().includes(termino),
      );
    const coincideCurso =
      cursoFiltro.value === "todos" || estudiante.curso === cursoFiltro.value;
    const coincideOrganizacion =
      organizacionFiltro.value === "todas" ||
      estudiante.organizacion === organizacionFiltro.value;
    const coincideEstado =
      estadoFiltro.value === "todos" ||
      estudiante.estado === estadoFiltro.value;
    const coincideProgreso =
      progresoFiltro.value === "todos" ||
      (progresoFiltro.value === "inicio" && estudiante.progreso < 30) ||
      (progresoFiltro.value === "avance" &&
        estudiante.progreso >= 30 &&
        estudiante.progreso < 80) ||
      (progresoFiltro.value === "cierre" && estudiante.progreso >= 80);
    const coincideDesde = !desde || estudiante.fechaInscripcion >= desde;
    const coincideHasta = !hasta || estudiante.fechaInscripcion <= hasta;

    return (
      coincideBusqueda &&
      coincideCurso &&
      coincideOrganizacion &&
      coincideEstado &&
      coincideProgreso &&
      coincideDesde &&
      coincideHasta
    );
  });
});

const cantidadAlumnos = computed(
  () =>
    new Set(listado.value.map((item) => item.alumnoId ?? item.nombre)).size,
);

const resumen = computed(() => {
  const comunes = [
    { etiqueta: "Cursos con alumnos", valor: cursos.value.length },
    {
      etiqueta: "Requieren atención",
      valor: listado.value.filter((item) => item.estado === "EN_RIESGO").length,
    },
  ];

  if (props.alcance === "ORGANIZACION") {
    return [
      { etiqueta: "Alumnos gestionados", valor: cantidadAlumnos.value },
      { etiqueta: "Matrículas por curso", valor: listado.value.length },
      ...comunes,
    ];
  }

  return [
    { etiqueta: "Estudiantes asignados", valor: cantidadAlumnos.value },
    ...comunes,
  ];
});

const cantidadFiltrosActivos = computed(
  () =>
    Number(Boolean(busqueda.value)) +
    Number(cursoFiltro.value !== "todos") +
    Number(organizacionFiltro.value !== "todas") +
    Number(estadoFiltro.value !== "todos") +
    Number(progresoFiltro.value !== "todos") +
    Number(Boolean(fechaDesde.value)) +
    Number(Boolean(fechaHasta.value)),
);

const hayFiltros = computed(() => cantidadFiltrosActivos.value > 0);

onMounted(async () => {
  try {
    if (props.alcance === "ORGANIZACION") {
      listado.value = await organizacionService.matriculas.listar();
      return;
    }

    const [estudiantesGuardados, cursosGuardados] = await Promise.all([
      docenteService.estudiantes.listar(),
      docenteService.cursos.listar(),
    ]);
    listadoCursos.value = cursosGuardados;
    listado.value = estudiantesGuardados.filter((estudiante) =>
      cursosPermitidos.value.has(estudiante.cursoId),
    );
  } finally {
    cargando.value = false;
  }
});

function normalizarFecha(fecha: Date | null) {
  if (!fecha) return "";

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function limpiarFiltros() {
  busqueda.value = "";
  cursoFiltro.value = "todos";
  organizacionFiltro.value = "todas";
  estadoFiltro.value = "todos";
  progresoFiltro.value = "todos";
  fechaDesde.value = null;
  fechaHasta.value = null;
}

function severidadEstado(estado: string): SeveridadEstado {
  if (estado === "COMPLETADO") return "success";
  if (estado === "EN_RIESGO") return "danger";
  return "info";
}

function formatoEstado(estado: string) {
  return estado.replace("_", " ");
}

function formatoFecha(fecha: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${fecha}T00:00:00Z`));
}

function exportarResultados() {
  const encabezados = [
    "Estudiante",
    "Curso",
    "Organización",
    "Progreso",
    "Fecha de inscripción",
    "Estado",
  ];
  const filas = estudiantes.value.map((item) => [
    item.nombre,
    item.curso,
    item.organizacion,
    `${item.progreso}%`,
    item.fechaInscripcion,
    item.estado,
  ]);
  const contenido = [encabezados, ...filas]
    .map((fila) => fila.map((celda) => `"${celda}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([contenido], { type: "text/csv;charset=utf-8" }),
  );
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = props.nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[.2em] text-primary">
          {{ props.etiqueta }}
        </p>
        <h1 class="mt-2 text-3xl font-black">{{ props.titulo }}</h1>
        <p class="mt-2 text-sm text-muted-foreground">
          <template v-if="props.descripcion">{{ props.descripcion }}</template>
          <template v-else>
            Participantes de <strong>{{ nombreAmbito }}</strong>. Los estudiantes
            de otros ámbitos permanecen separados.
          </template>
        </p>
      </div>
      <Button
        variant="outline"
        :disabled="cargando || !estudiantes.length"
        @click="exportarResultados"
      >
        <Download class="h-4 w-4" />
        Exportar resultados
      </Button>
    </div>

    <div
      v-if="cargando"
      class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-busy="true"
    >
      <Skeleton v-for="item in 4" :key="item" class="h-24 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="(item, idx) in resumen"
        :key="item.etiqueta"
        class="overflow-hidden border-border bg-card"
        :class="
          idx === 1
            ? 'border-t-4 border-t-accent'
            : 'border-t-4 border-t-primary'
        "
      >
        <CardContent class="flex items-center gap-4 p-5">
          <div
            class="grid h-11 w-11 place-items-center"
            :class="
              idx === 1
                ? 'bg-accent/20 text-[#B87A00] dark:text-accent'
                : 'bg-primary/10 text-primary'
            "
          >
            <UsersRound class="h-5 w-5" />
          </div>
          <div>
            <strong class="text-2xl text-foreground">{{ item.valor }}</strong>
            <p class="text-xs text-muted-foreground">{{ item.etiqueta }}</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <section
      class="overflow-hidden border border-border border-t-4 border-t-accent bg-card"
      aria-labelledby="titulo-filtros"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
      >
        <div class="flex items-center gap-3">
          <span
            class="grid h-9 w-9 place-items-center bg-primary/10 text-primary"
          >
            <SlidersHorizontal class="h-4 w-4" />
          </span>
          <div>
            <h2 id="titulo-filtros" class="text-sm font-black">
              Filtros de estudiantes
            </h2>
            <p class="text-xs text-muted-foreground">
              Combina uno o varios criterios para precisar los resultados.
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
          Limpiar {{ cantidadFiltrosActivos }}
          {{ cantidadFiltrosActivos === 1 ? "filtro" : "filtros" }}
        </Button>
      </div>

      <div class="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <label class="xl:col-span-2">
          <span class="filtro-label">Buscar</span>
          <span class="relative block">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <InputText
              v-model="busqueda"
              class="filtro-control w-full pl-10"
              placeholder="Nombre, curso u organización"
            />
          </span>
        </label>

        <label>
          <span class="filtro-label">Curso</span>
          <Select
            v-model="cursoFiltro"
            class="filtro-control"
            :options="opcionesCursos"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>

        <label>
          <span class="filtro-label">Organización</span>
          <Select
            v-model="organizacionFiltro"
            class="filtro-control"
            :options="opcionesOrganizaciones"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>

        <label>
          <span class="filtro-label">Estado académico</span>
          <Select
            v-model="estadoFiltro"
            class="filtro-control"
            :options="opcionesEstados"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>

        <label>
          <span class="filtro-label">Nivel de progreso</span>
          <Select
            v-model="progresoFiltro"
            class="filtro-control"
            :options="opcionesProgreso"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>

        <label>
          <span class="filtro-label">Inscrito desde</span>
          <DatePicker
            v-model="fechaDesde"
            class="filtro-control"
            date-format="dd/mm/yy"
            placeholder="Seleccionar fecha"
            :max-date="fechaHasta ?? undefined"
            :manual-input="false"
            panel-class="tukuy-calendario-panel"
            show-icon
            icon-display="input"
            fluid
          />
        </label>

        <label>
          <span class="filtro-label">Inscrito hasta</span>
          <DatePicker
            v-model="fechaHasta"
            class="filtro-control"
            date-format="dd/mm/yy"
            placeholder="Seleccionar fecha"
            :min-date="fechaDesde ?? undefined"
            :manual-input="false"
            panel-class="tukuy-calendario-panel"
            show-icon
            icon-display="input"
            fluid
          />
        </label>
      </div>
    </section>

    <section
      class="overflow-hidden border border-border bg-card"
      aria-labelledby="titulo-resultados"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
      >
        <div>
          <h2 id="titulo-resultados" class="text-sm font-black">Resultados</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Mostrando {{ estudiantes.length }} de {{ listado.length }}
            {{ props.alcance === "ORGANIZACION" ? "matrículas" : "estudiantes" }}
          </p>
        </div>
        <span
          v-if="hayFiltros"
          class="bg-accent/20 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#B87A00] dark:text-accent"
        >
          {{ cantidadFiltrosActivos }}
          {{
            cantidadFiltrosActivos === 1 ? "filtro activo" : "filtros activos"
          }}
        </span>
      </div>

      <div v-if="cargando" class="grid gap-1 p-4" aria-busy="true">
        <div
          v-for="fila in 6"
          :key="fila"
          class="grid grid-cols-7 gap-4 border-b border-border py-4"
        >
          <Skeleton v-for="celda in 7" :key="celda" class="h-8 w-full" />
        </div>
      </div>

      <DataTable
        v-else
        class="tabla-estudiantes"
        :value="estudiantes"
        data-key="id"
        size="small"
        scrollable
        resizable-columns
        column-resize-mode="fit"
        removable-sort
        :paginator="estudiantes.length > 6"
        :rows="6"
        :rows-per-page-options="[6, 10, 20]"
        paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        :current-page-report-template="
          props.alcance === 'ORGANIZACION'
            ? '{first}–{last} de {totalRecords} matrículas'
            : '{first}–{last} de {totalRecords} estudiantes'
        "
        :always-show-paginator="false"
        table-style="min-width: 78rem"
      >
        <template #empty>
          <div class="px-4 py-12 text-center">
            <UsersRound class="mx-auto h-10 w-10 text-primary" />
            <h3 class="mt-4 text-lg font-black">
              No hay estudiantes con estos filtros
            </h3>
            <p class="mt-2 text-sm text-muted-foreground">
              Ajusta el curso, las fechas o el estado para ampliar los
              resultados.
            </p>
            <Button class="mt-5" variant="outline" @click="limpiarFiltros">
              Limpiar filtros
            </Button>
          </div>
        </template>

        <Column
          field="nombre"
          header="Estudiante"
          sortable
          style="min-width: 15rem"
        >
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <span
                class="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-xs font-black text-primary"
              >
                {{ data.iniciales }}
              </span>
              <strong class="text-foreground">{{ data.nombre }}</strong>
            </div>
          </template>
        </Column>

        <Column
          field="curso"
          header="Curso"
          sortable
          style="min-width: 15rem"
        />

        <Column
          field="organizacion"
          header="Organización"
          sortable
          style="min-width: 13rem"
        >
          <template #body="{ data }">
            <span class="text-muted-foreground">{{ data.organizacion }}</span>
          </template>
        </Column>

        <Column
          field="progreso"
          header="Progreso"
          sortable
          style="min-width: 12rem"
        >
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <ProgressBar
                :value="data.progreso"
                :show-value="false"
                class="h-1.5 min-w-28 flex-1"
              />
              <strong class="w-9 text-right text-xs"
                >{{ data.progreso }}%</strong
              >
            </div>
          </template>
        </Column>

        <Column
          field="fechaInscripcion"
          header="Inscripción"
          sortable
          style="min-width: 10rem"
        >
          <template #body="{ data }">
            <span class="text-muted-foreground">{{
              formatoFecha(data.fechaInscripcion)
            }}</span>
          </template>
        </Column>

        <Column
          field="ultimoAccesoFecha"
          header="Último acceso"
          sortable
          style="min-width: 9rem"
        >
          <template #body="{ data }">
            <span class="text-muted-foreground">{{ data.ultimoAcceso }}</span>
          </template>
        </Column>

        <Column field="estado" header="Estado" sortable style="min-width: 9rem">
          <template #body="{ data }">
            <Tag
              class="etiqueta-estado"
              :severity="severidadEstado(data.estado)"
              :value="formatoEstado(data.estado)"
            />
          </template>
        </Column>
      </DataTable>
    </section>
  </section>
</template>
