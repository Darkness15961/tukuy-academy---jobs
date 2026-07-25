<script setup lang="ts">
import {
  Building2,
  CheckCircle2,
  Download,
  FilterX,
  GraduationCap,
  Network,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import ProgressBar from "primevue/progressbar";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Skeleton from "primevue/skeleton";
import { computed, onMounted, ref } from "vue";

import {
  organizacionService,
  type MatriculaAlumnoOrganizacion,
} from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import type {
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";

type TipoAlumno = "TODOS" | "INTERNO" | "EXTERNO";
type SeveridadEstado = "success" | "danger" | "info" | "warn";

type FilaAlumno = {
  alumnoId: string;
  nombre: string;
  iniciales: string;
  tipo: "INTERNO" | "EXTERNO";
  nodos: string[];
  nodosResumen: string;
  cursos: number;
  cursosResumen: string;
  progreso: number;
  estado: MatriculaAlumnoOrganizacion["estado"];
  ultimoAcceso: string;
  ultimoAccesoFecha: string;
  fechaInscripcion: string;
  pendientes: number;
  matriculas: MatriculaAlumnoOrganizacion[];
};

const cargando = ref(true);
const matriculas = ref<MatriculaAlumnoOrganizacion[]>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const unidades = ref<UnidadOrganizacional[]>([]);
const busqueda = ref("");
const tipoFiltro = ref<TipoAlumno>("TODOS");
const cursoFiltro = ref("todos");
const nodoFiltro = ref("todos");

const opcionesTipo = [
  { etiqueta: "Todos", valor: "TODOS" as const },
  { etiqueta: "Interno", valor: "INTERNO" as const },
  { etiqueta: "Externo", valor: "EXTERNO" as const },
];

const cursos = computed(() =>
  [...new Set(matriculas.value.map((item) => item.curso))].sort(),
);

const opcionesCursos = computed(() => [
  { etiqueta: "Todos los cursos", valor: "todos" },
  ...cursos.value.map((curso) => ({ etiqueta: curso, valor: curso })),
]);

const unidadesPorId = computed(
  () => new Map(unidades.value.map((unidad) => [unidad.id, unidad])),
);

const vinculacionesActivasPorUsuario = computed(() => {
  const porUsuario = new Map<string, VinculacionUnidad[]>();
  for (const vinculacion of vinculaciones.value) {
    if (vinculacion.estado !== "ACTIVA") continue;
    const lista = porUsuario.get(vinculacion.usuarioId) ?? [];
    lista.push(vinculacion);
    porUsuario.set(vinculacion.usuarioId, lista);
  }
  return porUsuario;
});

const opcionesNodos = computed(() => [
  { etiqueta: "Todos los nodos", valor: "todos" },
  ...unidades.value
    .filter((unidad) => unidad.estado === "ACTIVA")
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((unidad) => ({ etiqueta: unidad.nombre, valor: unidad.id })),
]);

function usuarioIdDesdeAlumno(alumnoId: string) {
  const coincidencia = /^alu-(\d+)$/.exec(alumnoId);
  return coincidencia?.[1] ? String(Number(coincidencia[1])) : null;
}

const alumnos = computed((): FilaAlumno[] => {
  const porPersona = new Map<string, MatriculaAlumnoOrganizacion[]>();
  for (const matricula of matriculas.value) {
    const lista = porPersona.get(matricula.alumnoId) ?? [];
    lista.push(matricula);
    porPersona.set(matricula.alumnoId, lista);
  }

  return [...porPersona.entries()].map(([alumnoId, lista]) => {
    const ordenadas = [...lista].sort((a, b) =>
      b.ultimoAccesoFecha.localeCompare(a.ultimoAccesoFecha),
    );
    const base = ordenadas[0]!;
    const progreso = Math.round(
      lista.reduce((suma, item) => suma + item.progreso, 0) / lista.length,
    );
    const estado =
      lista.find((item) => item.estado === "EN_RIESGO")?.estado ??
      lista.find((item) => item.estado === "PENDIENTE")?.estado ??
      lista.find((item) => item.estado === "ACTIVO")?.estado ??
      lista[0]?.estado ?? "ACTIVO";
    const usuarioId = usuarioIdDesdeAlumno(alumnoId);
    const relaciones = usuarioId
      ? vinculacionesActivasPorUsuario.value.get(usuarioId) ?? []
      : [];
    const nodos = [
      ...new Set(
        relaciones
          .map((relacion) => unidadesPorId.value.get(relacion.unidadId)?.nombre)
          .filter((nombre): nombre is string => Boolean(nombre)),
      ),
    ];
    // La pertenencia se deriva exclusivamente de la estructura vigente.
    // Estar matriculado o tener una solicitud de nodo pendiente no hace interno.
    const tipo: "INTERNO" | "EXTERNO" = nodos.length ? "INTERNO" : "EXTERNO";

    return {
      alumnoId,
      nombre: base.nombre,
      iniciales: base.iniciales,
      tipo,
      nodos,
      nodosResumen: nodos.join(" · ") || "Sin nodo — acceso por curso",
      cursos: lista.length,
      cursosResumen: [...new Set(lista.map((item) => item.curso))].join(" · "),
      progreso,
      estado,
      ultimoAcceso: base.ultimoAcceso,
      ultimoAccesoFecha: base.ultimoAccesoFecha,
      fechaInscripcion: [...lista]
        .map((item) => item.fechaInscripcion)
        .sort()[0] ?? "",
      pendientes: lista.filter((item) => item.estado === "PENDIENTE").length,
      matriculas: lista,
    };
  });
});

const filtrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  return alumnos.value.filter((alumno) => {
    const coincideTipo =
      tipoFiltro.value === "TODOS" || alumno.tipo === tipoFiltro.value;
    const coincideCurso =
      cursoFiltro.value === "todos" ||
      alumno.matriculas.some((item) => item.curso === cursoFiltro.value);
    const coincideNodo =
      nodoFiltro.value === "todos" ||
      alumno.nodos.includes(
        unidadesPorId.value.get(nodoFiltro.value)?.nombre ?? "",
      );
    const coincideBusqueda =
      !termino ||
      [alumno.nombre, alumno.cursosResumen, alumno.nodosResumen].some((valor) =>
        valor.toLowerCase().includes(termino),
      );
    return coincideTipo && coincideCurso && coincideNodo && coincideBusqueda;
  });
});

const cantidadInternos = computed(
  () => alumnos.value.filter((item) => item.tipo === "INTERNO").length,
);
const cantidadExternos = computed(
  () => alumnos.value.filter((item) => item.tipo === "EXTERNO").length,
);
const nodosConAlumnos = computed(
  () => new Set(alumnos.value.flatMap((item) => item.nodos)).size,
);

const resumen = computed(() => [
  { etiqueta: "Alumnos", valor: alumnos.value.length },
  { etiqueta: "Internos", valor: cantidadInternos.value },
  { etiqueta: "Externos", valor: cantidadExternos.value },
  {
    etiqueta: "Nodos con alumnos",
    valor: nodosConAlumnos.value,
  },
]);

const cantidadFiltrosActivos = computed(
  () =>
    Number(Boolean(busqueda.value)) +
    Number(tipoFiltro.value !== "TODOS") +
    Number(cursoFiltro.value !== "todos") +
    Number(nodoFiltro.value !== "todos"),
);

const hayFiltros = computed(() => cantidadFiltrosActivos.value > 0);

onMounted(async () => {
  try {
    [matriculas.value, vinculaciones.value, unidades.value] = await Promise.all([
      organizacionService.matriculas.listar(),
      organizacionService.estructura.vinculaciones.listar(),
      organizacionService.estructura.unidades.listar(),
    ]);
  } finally {
    cargando.value = false;
  }
});

function limpiarFiltros() {
  busqueda.value = "";
  tipoFiltro.value = "TODOS";
  cursoFiltro.value = "todos";
  nodoFiltro.value = "todos";
}

function severidadEstado(estado: string): SeveridadEstado {
  if (estado === "COMPLETADO") return "success";
  if (estado === "EN_RIESGO") return "danger";
  if (estado === "PENDIENTE") return "warn";
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

async function aprobarPendientes(alumno: FilaAlumno) {
  const pendientes = alumno.matriculas.filter((item) => item.estado === "PENDIENTE");
  for (const matricula of pendientes) {
    const actualizada = await organizacionService.aprobarSolicitudMatricula(
      matricula.id,
    );
    const indice = matriculas.value.findIndex((item) => item.id === actualizada.id);
    if (indice >= 0) matriculas.value[indice] = actualizada;
  }
}

function exportarResultados() {
  const encabezados = [
    "Alumno",
    "Tipo",
    "Nodo de la estructura",
    "Cursos",
    "Progreso promedio",
    "Primera inscripción",
    "Estado",
  ];
  const filas = filtrados.value.map((item) => [
    item.nombre,
    item.tipo === "INTERNO" ? "Interno" : "Externo",
    item.nodosResumen,
    item.cursosResumen,
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
  enlace.download = "alumnos-organizacion.csv";
  enlace.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <TituloConAyuda
          eyebrow="Seguimiento institucional"
          titulo="Alumnos"
          ayuda="Personas matriculadas en uno o más cursos. Son internas con vínculo activo a un nodo; si estudian sin pertenecer a un nodo, son externas."
        />
      </div>
      <Button
        variant="outline"
        :disabled="cargando || !filtrados.length"
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
          idx === 1 || idx === 2
            ? 'border-t-4 border-t-accent'
            : 'border-t-4 border-t-primary'
        "
      >
        <CardContent class="flex items-center gap-4 p-5">
          <div
            class="grid h-11 w-11 place-items-center"
            :class="
              idx === 1 || idx === 2
                ? 'bg-accent/20 text-[#B87A00] dark:text-accent'
                : 'bg-primary/10 text-primary'
            "
          >
            <component
              :is="idx === 0 ? GraduationCap : idx === 3 ? Network : UsersRound"
              class="h-5 w-5"
            />
          </div>
          <div>
            <strong class="text-2xl text-foreground">{{ item.valor }}</strong>
            <p class="text-xs text-muted-foreground">{{ item.etiqueta }}</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        v-for="opcion in opcionesTipo"
        :key="opcion.valor"
        size="sm"
        :variant="tipoFiltro === opcion.valor ? 'default' : 'outline'"
        @click="tipoFiltro = opcion.valor"
      >
        {{ opcion.etiqueta }}
        <span
          v-if="opcion.valor !== 'TODOS'"
          class="rounded-sm bg-white/20 px-1.5 text-[10px] font-black"
        >
          {{ opcion.valor === "INTERNO" ? cantidadInternos : cantidadExternos }}
        </span>
      </Button>
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
            <h2 id="titulo-filtros" class="text-sm font-black">Filtros</h2>
            <p class="text-xs text-muted-foreground">
              Busca por persona, curso o nodo. La clasificación se actualiza
              desde la estructura organizacional.
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
              placeholder="Nombre, curso o nodo"
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
          <span class="filtro-label">Nodo interno</span>
          <Select
            v-model="nodoFiltro"
            class="filtro-control"
            :options="opcionesNodos"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
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
            Mostrando {{ filtrados.length }} de {{ alumnos.length }} alumnos
          </p>
        </div>
      </div>

      <div v-if="cargando" class="grid gap-1 p-4" aria-busy="true">
        <div
          v-for="fila in 6"
          :key="fila"
          class="grid grid-cols-6 gap-4 border-b border-border py-4"
        >
          <Skeleton v-for="celda in 6" :key="celda" class="h-8 w-full" />
        </div>
      </div>

      <DataTable
        v-else
        class="tabla-estudiantes"
        :value="filtrados"
        data-key="alumnoId"
        size="small"
        scrollable
        removable-sort
        :paginator="filtrados.length > 8"
        :rows="8"
        :rows-per-page-options="[8, 16, 24]"
        paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        current-page-report-template="{first}–{last} de {totalRecords} alumnos"
        :always-show-paginator="false"
        table-style="min-width: 84rem"
      >
        <template #empty>
          <div class="px-4 py-12 text-center">
            <GraduationCap class="mx-auto h-10 w-10 text-primary" />
            <h3 class="mt-4 text-lg font-black">No hay alumnos con estos filtros</h3>
            <p class="mt-2 text-sm text-muted-foreground">
              Prueba con Interno, Externo o limpia la búsqueda.
            </p>
            <Button class="mt-5" variant="outline" @click="limpiarFiltros">
              Limpiar filtros
            </Button>
          </div>
        </template>

        <Column field="nombre" header="Alumno" sortable style="min-width: 15rem">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <span
                class="grid h-9 w-9 shrink-0 place-items-center bg-primary/10 text-xs font-black text-primary"
              >
                {{ data.iniciales }}
              </span>
              <div>
                <strong class="text-foreground">{{ data.nombre }}</strong>
                <p class="text-xs text-muted-foreground">
                  {{ data.cursos }}
                  {{ data.cursos === 1 ? "curso" : "cursos" }}
                </p>
              </div>
            </div>
          </template>
        </Column>

        <Column field="tipo" header="Tipo" sortable style="min-width: 8rem">
          <template #body="{ data }">
            <div class="grid gap-1.5">
              <Tag
                class="w-fit"
                :severity="data.tipo === 'INTERNO' ? 'info' : 'secondary'"
                :value="data.tipo === 'INTERNO' ? 'Interno' : 'Externo'"
              />
              <span class="text-[11px] text-muted-foreground">
                {{ data.tipo === "INTERNO" ? "Pertenece a la entidad" : "Solo acceso académico" }}
              </span>
            </div>
          </template>
        </Column>

        <Column
          field="nodosResumen"
          header="Vinculación estructural"
          sortable
          style="min-width: 16rem"
        >
          <template #body="{ data }">
            <div class="flex items-start gap-2">
              <Building2
                class="mt-0.5 h-4 w-4 shrink-0"
                :class="data.tipo === 'INTERNO' ? 'text-primary' : 'text-muted-foreground'"
              />
              <span
                class="text-sm"
                :class="data.tipo === 'INTERNO' ? 'text-foreground' : 'text-muted-foreground'"
              >
                {{ data.nodosResumen }}
              </span>
            </div>
          </template>
        </Column>

        <Column
          field="cursosResumen"
          header="Cursos"
          sortable
          style="min-width: 16rem"
        >
          <template #body="{ data }">
            <span class="text-sm text-muted-foreground">{{ data.cursosResumen }}</span>
          </template>
        </Column>

        <Column field="progreso" header="Progreso" sortable style="min-width: 12rem">
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <ProgressBar
                :value="data.progreso"
                :show-value="false"
                class="h-1.5 min-w-28 flex-1"
              />
              <strong class="w-9 text-right text-xs">{{ data.progreso }}%</strong>
            </div>
          </template>
        </Column>

        <Column
          field="fechaInscripcion"
          header="Desde"
          sortable
          style="min-width: 9rem"
        >
          <template #body="{ data }">
            <span class="text-muted-foreground">{{
              formatoFecha(data.fechaInscripcion)
            }}</span>
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

        <Column header="Acción" style="min-width: 11rem">
          <template #body="{ data }">
            <Button
              v-if="data.pendientes"
              size="sm"
              variant="outline"
              @click="aprobarPendientes(data)"
            >
              <CheckCircle2 class="h-4 w-4" />
              Aprobar ({{ data.pendientes }})
            </Button>
          </template>
        </Column>
      </DataTable>
    </section>
  </section>
</template>
