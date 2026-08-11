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
import type { DataTablePageEvent } from "primevue/datatable";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Skeleton from "primevue/skeleton";
import { computed, onMounted, ref, watch } from "vue";

import { organizacionService } from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import type { AlumnoResumenSecundaria } from "@/lib/contrato-secundaria";
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
  estado: string;
  ultimoAcceso: string;
  ultimoAccesoFecha: string;
  fechaInscripcion: string;
  pendientes: number;
  matriculasPendientes: AlumnoResumenSecundaria["matriculasPendientes"];
};

const cargando = ref(true);
const cargandoTabla = ref(false);
const alumnos = ref<FilaAlumno[]>([]);
const totalServidor = ref(0);
const cursosCatalogo = ref<Array<{ id: string; titulo: string }>>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const unidades = ref<UnidadOrganizacional[]>([]);
const busqueda = ref("");
const tipoFiltro = ref<TipoAlumno>("TODOS");
const cursoFiltro = ref("todos");
const nodoFiltro = ref("todos");
const limite = ref(24);
const offset = ref(0);
const first = ref(0);

const opcionesTipo = [
  { etiqueta: "Todos", valor: "TODOS" as const },
  { etiqueta: "Interno", valor: "INTERNO" as const },
  { etiqueta: "Externo", valor: "EXTERNO" as const },
];

const opcionesCursos = computed(() => [
  { etiqueta: "Todos los cursos", valor: "todos" },
  ...cursosCatalogo.value.map((curso) => ({
    etiqueta: curso.titulo,
    valor: curso.id,
  })),
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

function enriquecerConEstructura(item: AlumnoResumenSecundaria): FilaAlumno {
  const relaciones =
    vinculacionesActivasPorUsuario.value.get(String(item.alumnoId)) ?? [];
  const nodos = [
    ...new Set(
      relaciones
        .map((relacion) => unidadesPorId.value.get(relacion.unidadId)?.nombre)
        .filter((nombre): nombre is string => Boolean(nombre)),
    ),
  ];
  const tipo: "INTERNO" | "EXTERNO" = nodos.length ? "INTERNO" : "EXTERNO";
  return {
    alumnoId: String(item.alumnoId),
    nombre: item.nombre,
    iniciales: item.iniciales,
    tipo,
    nodos,
    nodosResumen: nodos.join(" · ") || "Sin nodo — acceso por curso",
    cursos: item.cursos,
    cursosResumen: item.cursosResumen,
    progreso: Number(item.progreso ?? 0),
    estado: item.estado,
    ultimoAcceso: item.ultimoAcceso,
    ultimoAccesoFecha: item.ultimoAccesoFecha,
    fechaInscripcion: item.fechaInscripcion,
    pendientes: Number(item.pendientes ?? 0),
    matriculasPendientes: item.matriculasPendientes ?? [],
  };
}

const filtrados = computed(() => {
  return alumnos.value.filter((alumno) => {
    const coincideTipo =
      tipoFiltro.value === "TODOS" || alumno.tipo === tipoFiltro.value;
    const coincideNodo =
      nodoFiltro.value === "todos" ||
      alumno.nodos.includes(
        unidadesPorId.value.get(nodoFiltro.value)?.nombre ?? "",
      );
    return coincideTipo && coincideNodo;
  });
});

const cantidadInternos = computed(
  () => filtrados.value.filter((item) => item.tipo === "INTERNO").length,
);
const cantidadExternos = computed(
  () => filtrados.value.filter((item) => item.tipo === "EXTERNO").length,
);
const nodosConAlumnos = computed(
  () => new Set(filtrados.value.flatMap((item) => item.nodos)).size,
);

const resumen = computed(() => [
  { etiqueta: "Alumnos", valor: totalServidor.value },
  { etiqueta: "En esta página · internos", valor: cantidadInternos.value },
  { etiqueta: "En esta página · externos", valor: cantidadExternos.value },
  { etiqueta: "Nodos (página)", valor: nodosConAlumnos.value },
]);

const cantidadFiltrosActivos = computed(
  () =>
    Number(Boolean(busqueda.value.trim())) +
    Number(tipoFiltro.value !== "TODOS") +
    Number(cursoFiltro.value !== "todos") +
    Number(nodoFiltro.value !== "todos"),
);

const hayFiltros = computed(() => cantidadFiltrosActivos.value > 0);

let debounceBusqueda: ReturnType<typeof setTimeout> | null = null;

async function cargarPagina(mostrarSkeleton = false) {
  if (mostrarSkeleton) cargando.value = true;
  else cargandoTabla.value = true;
  try {
    const resultado = await organizacionService.matriculas.listarResumen({
      busqueda: busqueda.value.trim() || undefined,
      cursoId: cursoFiltro.value === "todos" ? null : cursoFiltro.value,
      limite: limite.value,
      offset: offset.value,
    });
    totalServidor.value = resultado.total;
    cursosCatalogo.value = resultado.cursos ?? [];
    alumnos.value = (resultado.alumnos ?? []).map(enriquecerConEstructura);
  } catch {
    alumnos.value = [];
    totalServidor.value = 0;
  } finally {
    cargando.value = false;
    cargandoTabla.value = false;
  }
}

function onPage(event: DataTablePageEvent) {
  first.value = event.first;
  offset.value = event.first;
  limite.value = event.rows;
  void cargarPagina();
}

function reiniciarYCargar() {
  first.value = 0;
  offset.value = 0;
  void cargarPagina();
}

onMounted(async () => {
  await cargarPagina(true);
  try {
    const snap = await organizacionService.estructura.obtenerSnapshot();
    vinculaciones.value = snap.vinculaciones;
    unidades.value = snap.unidades;
    // Re-enriquecer con nodos cuando llega la estructura.
    alumnos.value = alumnos.value.map((fila) => {
      const relaciones =
        vinculacionesActivasPorUsuario.value.get(fila.alumnoId) ?? [];
      const nodos = [
        ...new Set(
          relaciones
            .map((r) => unidadesPorId.value.get(r.unidadId)?.nombre)
            .filter((n): n is string => Boolean(n)),
        ),
      ];
      return {
        ...fila,
        nodos,
        nodosResumen: nodos.join(" · ") || "Sin nodo — acceso por curso",
        tipo: nodos.length ? "INTERNO" : "EXTERNO",
      };
    });
  } catch {
    // estructura local opcional
  }
});

watch(busqueda, () => {
  if (debounceBusqueda) clearTimeout(debounceBusqueda);
  debounceBusqueda = setTimeout(() => reiniciarYCargar(), 300);
});

watch(cursoFiltro, () => reiniciarYCargar());

function limpiarFiltros() {
  busqueda.value = "";
  tipoFiltro.value = "TODOS";
  cursoFiltro.value = "todos";
  nodoFiltro.value = "todos";
  reiniciarYCargar();
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

const formateadorFecha = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatoFecha(fecha: string | null | undefined) {
  if (!fecha) return "—";
  const bruto = String(fecha).trim();
  const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(bruto)
    ? `${bruto}T00:00:00Z`
    : bruto;
  const fechaObj = new Date(soloDia);
  if (Number.isNaN(fechaObj.getTime())) return "—";
  return formateadorFecha.format(fechaObj);
}

async function aprobarPendientes(alumno: FilaAlumno) {
  for (const matricula of alumno.matriculasPendientes) {
    await organizacionService.aprobarSolicitudMatricula(matricula.id);
  }
  await cargarPagina();
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
  const csv = [encabezados, ...filas]
    .map((fila) =>
      fila.map((celda) => `"${String(celda).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
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
            Mostrando {{ filtrados.length }} de {{ totalServidor }} alumnos
            <span v-if="cargandoTabla"> · actualizando…</span>
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
        lazy
        :value="filtrados"
        :total-records="totalServidor"
        data-key="alumnoId"
        size="small"
        scrollable
        removable-sort
        paginator
        :rows="limite"
        :first="first"
        :rows-per-page-options="[12, 24, 48]"
        paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        current-page-report-template="{first}–{last} de {totalRecords} alumnos"
        table-style="min-width: 84rem"
        @page="onPage"
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
              <div
                class="h-1.5 min-w-28 flex-1 overflow-hidden bg-muted"
                role="progressbar"
                :aria-valuenow="data.progreso"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  class="h-full bg-primary transition-[width]"
                  :style="{ width: `${Math.min(100, Math.max(0, data.progreso))}%` }"
                />
              </div>
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
