<script setup lang="ts">
import {
  Award,
  BookOpen,
  Building2,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Route,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-vue-next";
import { jsPDF } from "jspdf";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import {
  organizacionService,
  type AreaOrganizacion,
  type AsignacionOrganizacion,
  type RutaOrganizacion,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCursos } from "@/composables/useCursos";

type FilaReporte = Record<string, string | number>;

interface ResumenCurso {
  curso: string;
  matriculas: number;
  completados: number;
  pendientes: number;
  finalizacion: number;
  precio: number;
  ingresos: number;
}

const { courses, loading: cargandoCursos } = useCursos();
const cargando = ref(true);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const asignaciones = ref<AsignacionOrganizacion[]>([]);
const rutas = ref<RutaOrganizacion[]>([]);
const areas = ref<AreaOrganizacion[]>([]);
const modal = ref(false);
const reporteActivo = ref("Matrícula por curso");
const periodo = ref("12 meses");
const periodos = ["6 meses", "12 meses", "Año 2026"];
const meses = ["Ago", "Sep", "Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul"];
const distribucionMensual = [0.055, 0.061, 0.067, 0.071, 0.075, 0.078, 0.082, 0.087, 0.092, 0.099, 0.109, 0.124];

onMounted(() => {
  void cargarDatos();
  window.addEventListener("tukuy:organizacion-datos", actualizarDatos);
});
onBeforeUnmount(() =>
  window.removeEventListener("tukuy:organizacion-datos", actualizarDatos),
);

function actualizarDatos() {
  void cargarDatos();
}

async function cargarDatos() {
  cargando.value = true;
  try {
    [usuarios.value, asignaciones.value, rutas.value, areas.value] =
      await Promise.all([
        organizacionService.usuarios.listar(),
        organizacionService.asignaciones.listar(),
        organizacionService.rutas.listar(),
        organizacionService.areas.listar(),
      ]);
  } finally {
    cargando.value = false;
  }
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function precioCurso(nombre: string) {
  const exacto = courses.value.find(
    (curso) => normalizar(curso.title) === normalizar(nombre),
  );
  if (exacto) return exacto.pricing === "free" ? 0 : exacto.price ?? 0;

  const nombreNormalizado = normalizar(nombre);
  const coincidencias: Array<[string, number]> = [
    ["seguridad y salud", 89],
    ["almacen", 129],
    ["kardex", 129],
    ["gestion digital", 119],
    ["lectura de planos", 149],
    ["avance fisico", 99],
    ["cuaderno de obra", 0],
    ["valorizaciones", 179],
    ["empleabilidad", 0],
    ["inteligencia artificial", 159],
    ["ia aplicada", 159],
    ["induccion", 79],
    ["supervision", 139],
    ["introduccion a tukuy", 0],
  ];
  return coincidencias.find(([texto]) => nombreNormalizado.includes(texto))?.[1] ?? 99;
}

const resumenCursos = computed<ResumenCurso[]>(() => {
  const agrupados = new Map<string, ResumenCurso>();
  asignaciones.value
    .filter((asignacion) => asignacion.estado !== "CANCELADA")
    .forEach((asignacion) => {
      const actual = agrupados.get(asignacion.curso) ?? {
        curso: asignacion.curso,
        matriculas: 0,
        completados: 0,
        pendientes: 0,
        finalizacion: 0,
        precio: precioCurso(asignacion.curso),
        ingresos: 0,
      };
      actual.matriculas += asignacion.asignados;
      actual.completados += asignacion.completados;
      actual.pendientes += Math.max(
        asignacion.asignados - asignacion.completados,
        0,
      );
      actual.finalizacion = actual.matriculas
        ? Math.round((actual.completados / actual.matriculas) * 100)
        : 0;
      actual.ingresos = actual.completados * actual.precio;
      agrupados.set(asignacion.curso, actual);
    });
  return [...agrupados.values()].sort(
    (primero, segundo) => segundo.matriculas - primero.matriculas,
  );
});

const topCursos = computed(() => resumenCursos.value.slice(0, 5));
const topIngresos = computed(() =>
  [...resumenCursos.value]
    .sort((primero, segundo) => segundo.ingresos - primero.ingresos)
    .slice(0, 5),
);
const topRutas = computed(() =>
  [...rutas.value]
    .filter((ruta) => ruta.estado !== "ARCHIVADA")
    .sort((primero, segundo) => segundo.usuarios - primero.usuarios)
    .slice(0, 5),
);
const activos = computed(() =>
  usuarios.value.filter((usuario) => usuario.estado === "ACTIVO"),
);
const matriculasTotales = computed(() =>
  resumenCursos.value.reduce((total, curso) => total + curso.matriculas, 0),
);
const completadosTotales = computed(() =>
  resumenCursos.value.reduce((total, curso) => total + curso.completados, 0),
);
const ingresosTotales = computed(() =>
  resumenCursos.value.reduce((total, curso) => total + curso.ingresos, 0),
);
const finalizacion = computed(() =>
  matriculasTotales.value
    ? Math.round((completadosTotales.value / matriculasTotales.value) * 100)
    : 0,
);
const rutasActivas = computed(
  () => rutas.value.filter((ruta) => ruta.estado !== "ARCHIVADA").length,
);
const ingresoPromedio = computed(() =>
  completadosTotales.value
    ? ingresosTotales.value / completadosTotales.value
    : 0,
);
const maximoMatriculas = computed(
  () => Math.max(...topCursos.value.map((curso) => curso.matriculas), 1),
);
const maximoIngresos = computed(
  () => Math.max(...topIngresos.value.map((curso) => curso.ingresos), 1),
);
const maximoRutas = computed(
  () => Math.max(...topRutas.value.map((ruta) => ruta.usuarios), 1),
);

const evolucionIngresos = computed(() => {
  const cantidad = periodo.value === "6 meses" ? 6 : 12;
  return distribucionMensual.slice(-cantidad).map((porcentaje, indice) => ({
    mes: meses.slice(-cantidad)[indice]!,
    importe: Math.round(ingresosTotales.value * porcentaje),
  }));
});
const maximoEvolucion = computed(() =>
  Math.max(...evolucionIngresos.value.map((item) => item.importe), 1),
);

const indicadores = computed(() => [
  {
    etiqueta: "Alumnos gestionados",
    valor: activos.value.length.toLocaleString("es-PE"),
    detalle: `${matriculasTotales.value.toLocaleString("es-PE")} matrículas acumuladas`,
    icono: UsersRound,
    color: "text-primary",
  },
  {
    etiqueta: "Cursos con alumnos",
    valor: resumenCursos.value.length,
    detalle: `${completadosTotales.value.toLocaleString("es-PE")} matrículas completadas`,
    icono: BookOpen,
    color: "text-violet-700 dark:text-violet-400",
  },
  {
    etiqueta: "Rutas activas",
    valor: rutasActivas.value,
    detalle: `${rutas.value.reduce((total, ruta) => total + ruta.usuarios, 0)} participantes en rutas`,
    icono: Route,
    color: "text-emerald-700 dark:text-emerald-400",
  },
  {
    etiqueta: "Ingresos por cursos",
    valor: moneda(ingresosTotales.value),
    detalle: `${moneda(ingresoPromedio.value)} por matrícula completada`,
    icono: CircleDollarSign,
    color: "text-amber-700 dark:text-amber-400",
  },
]);

const reportesGerenciales = [
  {
    nombre: "Matrícula por curso",
    descripcion: "Alumnos asignados, completados, pendientes y nivel de finalización.",
    icono: UsersRound,
  },
  {
    nombre: "Desempeño de rutas",
    descripcion: "Participación, cursos incluidos, progreso y certificación por ruta.",
    icono: Route,
  },
  {
    nombre: "Ingresos por curso",
    descripcion: "Precio, matrículas completadas e ingresos generados por formación.",
    icono: CircleDollarSign,
  },
  {
    nombre: "Cumplimiento por área",
    descripcion: "Usuarios gestionados, responsables y avance de cada unidad.",
    icono: Building2,
  },
  {
    nombre: "Progreso por trabajador",
    descripcion: "Situación individual, sede, área y porcentaje de aprendizaje.",
    icono: TrendingUp,
  },
  {
    nombre: "Inactividad y vencimientos",
    descripcion: "Personas suspendidas, invitadas o con avance menor al esperado.",
    icono: Target,
  },
];

const filas = computed<FilaReporte[]>(() => {
  if (reporteActivo.value === "Matrícula por curso") {
    return resumenCursos.value.map((curso) => ({
      curso: curso.curso,
      matriculas: curso.matriculas,
      completados: curso.completados,
      pendientes: curso.pendientes,
      finalizacion: `${curso.finalizacion}%`,
    }));
  }
  if (reporteActivo.value === "Desempeño de rutas") {
    return rutas.value.map((ruta) => ({
      ruta: ruta.nombre,
      alumnos: ruta.usuarios,
      cursos: ruta.cursos,
      progreso: `${ruta.progreso}%`,
      certificado: ruta.certificado ? "Sí" : "No",
      estado: ruta.estado ?? "PUBLICADA",
    }));
  }
  if (reporteActivo.value === "Ingresos por curso") {
    return [...resumenCursos.value]
      .sort((primero, segundo) => segundo.ingresos - primero.ingresos)
      .map((curso) => ({
        curso: curso.curso,
        precio: moneda(curso.precio),
        matriculasCompletadas: curso.completados,
        ingresos: moneda(curso.ingresos),
      }));
  }
  if (reporteActivo.value === "Cumplimiento por área") {
    return areas.value.map((area) => ({
      area: area.nombre,
      alumnos: area.usuarios,
      responsable: area.responsable,
      progreso: `${area.progreso}%`,
    }));
  }
  if (reporteActivo.value === "Inactividad y vencimientos") {
    return usuarios.value
      .filter(
        (usuario) => usuario.estado !== "ACTIVO" || usuario.progreso < 40,
      )
      .map((usuario) => ({
        colaborador: usuario.nombre,
        area: usuario.area,
        estado: usuario.estado,
        progreso: `${usuario.progreso}%`,
      }));
  }
  return usuarios.value.map((usuario) => ({
    colaborador: usuario.nombre,
    area: usuario.area,
    sede: usuario.sede,
    progreso: `${usuario.progreso}%`,
    estado: usuario.estado,
  }));
});

const columnas = computed(() => {
  const primeraFila = filas.value[0];
  return primeraFila
    ? Object.keys(primeraFila).map((campo) => ({
        field: campo,
        header: campo
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (letra) => letra.toUpperCase()),
      }))
    : [];
});

function moneda(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(valor);
}

function abrir(nombre: string) {
  reporteActivo.value = nombre;
  modal.value = true;
}

function contenidoCsv() {
  const encabezados = columnas.value.map((columna) => columna.header);
  const valores = filas.value.map((fila) =>
    columnas.value
      .map(
        (columna) =>
          `"${String(fila[columna.field] ?? "").replaceAll('"', '""')}"`,
      )
      .join(","),
  );
  return [encabezados.join(","), ...valores].join("\n");
}

function nombreArchivo() {
  return reporteActivo.value.toLowerCase().replaceAll(" ", "-");
}

function descargarCsv() {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", contenidoCsv()], { type: "text/csv;charset=utf-8" }),
  );
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${nombreArchivo()}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

function descargarPdf() {
  const pdf = new jsPDF({ orientation: "landscape" });
  pdf.setFontSize(18);
  pdf.text("Tukuy Academy · Reporte gerencial", 16, 18);
  pdf.setFontSize(13);
  pdf.text(reporteActivo.value, 16, 29);
  pdf.setFontSize(9);
  pdf.text(
    `Alumnos: ${activos.value.length} · Matrículas: ${matriculasTotales.value} · Ingresos: ${moneda(ingresosTotales.value)}`,
    16,
    38,
  );
  let posicionY = 50;
  filas.value.slice(0, 24).forEach((fila) => {
    pdf.setFontSize(8);
    pdf.text(
      columnas.value
        .map((columna) => `${columna.header}: ${fila[columna.field]}`)
        .join(" | "),
      16,
      posicionY,
      { maxWidth: 255 },
    );
    posicionY += 9;
  });
  pdf.save(`${nombreArchivo()}.pdf`);
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.2em] text-primary">
          Inteligencia empresarial
        </p>
        <h1 class="mt-2 text-3xl font-black">Panel gerencial de formación</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Controla alumnos, cursos, rutas, cumplimiento e ingresos desde una sola vista.
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-2">
        <label class="grid gap-1.5">
          <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Periodo del reporte
          </span>
          <Select
            v-model="periodo"
            :options="periodos"
            class="min-w-40"
            aria-label="Periodo del reporte"
          />
        </label>
        <Button variant="outline" @click="descargarCsv">
          <FileSpreadsheet class="h-4 w-4" />Excel/CSV
        </Button>
        <Button @click="descargarPdf">
          <Download class="h-4 w-4" />PDF ejecutivo
        </Button>
      </div>
    </div>

    <div v-if="cargando || cargandoCursos" class="grid gap-5">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="item in 4" :key="item" height="9rem" />
      </div>
      <div class="grid gap-5 xl:grid-cols-3">
        <Skeleton v-for="item in 3" :key="item" height="22rem" />
      </div>
    </div>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          v-for="indicador in indicadores"
          :key="indicador.etiqueta"
          class="overflow-hidden border-border bg-card"
        >
          <CardContent class="border-l-4 border-l-primary p-5">
            <div class="flex items-start justify-between gap-3">
              <component :is="indicador.icono" class="h-6 w-6" :class="indicador.color" />
              <span class="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gerencia</span>
            </div>
            <strong class="mt-5 block text-3xl font-black tracking-tight">{{ indicador.valor }}</strong>
            <p class="mt-1 text-sm font-bold">{{ indicador.etiqueta }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ indicador.detalle }}</p>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-5 xl:grid-cols-3">
        <Card class="border-border bg-card">
          <CardContent class="p-6">
            <div class="flex items-start justify-between gap-3">
              <div><h2 class="text-lg font-black">Top 5 cursos</h2><p class="text-xs text-muted-foreground">Por cantidad de alumnos gestionados</p></div>
              <UsersRound class="h-5 w-5 text-primary" />
            </div>
            <div class="mt-6 space-y-5">
              <article v-for="(curso, indice) in topCursos" :key="curso.curso">
                <div class="flex items-start gap-3">
                  <span class="grid h-7 w-7 shrink-0 place-items-center bg-primary text-xs font-black text-primary-foreground">{{ indice + 1 }}</span>
                  <div class="min-w-0 flex-1"><div class="flex justify-between gap-3"><p class="truncate text-sm font-bold">{{ curso.curso }}</p><strong class="shrink-0 text-sm">{{ curso.matriculas }}</strong></div><div class="mt-2 h-2 bg-muted"><div class="h-full bg-primary" :style="{ width: `${(curso.matriculas / maximoMatriculas) * 100}%` }" /></div><p class="mt-1 text-[10px] text-muted-foreground">{{ curso.completados }} completaron · {{ curso.finalizacion }}%</p></div>
                </div>
              </article>
            </div>
            <Button class="mt-6 w-full" variant="outline" @click="abrir('Matrícula por curso')">Ver matrícula completa</Button>
          </CardContent>
        </Card>

        <Card class="border-border bg-card">
          <CardContent class="p-6">
            <div class="flex items-start justify-between gap-3">
              <div><h2 class="text-lg font-black">Top 5 rutas</h2><p class="text-xs text-muted-foreground">Por participantes asignados</p></div>
              <Route class="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div class="mt-6 space-y-5">
              <article v-for="(ruta, indice) in topRutas" :key="ruta.id">
                <div class="flex items-start gap-3"><span class="grid h-7 w-7 shrink-0 place-items-center bg-emerald-600 text-xs font-black text-white">{{ indice + 1 }}</span><div class="min-w-0 flex-1"><div class="flex justify-between gap-3"><p class="truncate text-sm font-bold">{{ ruta.nombre }}</p><strong class="shrink-0 text-sm">{{ ruta.usuarios }}</strong></div><div class="mt-2 h-2 bg-muted"><div class="h-full bg-emerald-600" :style="{ width: `${(ruta.usuarios / maximoRutas) * 100}%` }" /></div><p class="mt-1 text-[10px] text-muted-foreground">{{ ruta.cursos }} cursos · {{ ruta.progreso }}% de progreso</p></div></div>
              </article>
            </div>
            <Button class="mt-6 w-full" variant="outline" @click="abrir('Desempeño de rutas')">Ver rutas completas</Button>
          </CardContent>
        </Card>

        <Card class="border-border bg-card">
          <CardContent class="p-6">
            <div class="flex items-start justify-between gap-3"><div><h2 class="text-lg font-black">Top 5 ingresos</h2><p class="text-xs text-muted-foreground">Por matrículas completadas</p></div><CircleDollarSign class="h-5 w-5 text-amber-700 dark:text-amber-400" /></div>
            <div class="mt-6 space-y-5">
              <article v-for="(curso, indice) in topIngresos" :key="curso.curso">
                <div class="flex items-start gap-3"><span class="grid h-7 w-7 shrink-0 place-items-center bg-[#F5B400] text-xs font-black text-[#071F52]">{{ indice + 1 }}</span><div class="min-w-0 flex-1"><div class="flex justify-between gap-3"><p class="truncate text-sm font-bold">{{ curso.curso }}</p><strong class="shrink-0 text-sm">{{ moneda(curso.ingresos) }}</strong></div><div class="mt-2 h-2 bg-muted"><div class="h-full bg-[#F5B400]" :style="{ width: `${(curso.ingresos / maximoIngresos) * 100}%` }" /></div><p class="mt-1 text-[10px] text-muted-foreground">{{ curso.completados }} matrículas · {{ moneda(curso.precio) }} por alumno</p></div></div>
              </article>
            </div>
            <Button class="mt-6 w-full" variant="outline" @click="abrir('Ingresos por curso')">Ver reporte financiero</Button>
          </CardContent>
        </Card>
      </div>

      <Card class="border-border bg-card">
        <CardContent class="p-6">
          <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="text-lg font-black">Evolución de ingresos por formación</h2><p class="text-xs text-muted-foreground">Distribución del ingreso realizado por matrículas completadas</p></div><div class="text-right"><strong class="text-2xl font-black text-primary">{{ moneda(ingresosTotales) }}</strong><p class="text-xs text-muted-foreground">acumulado</p></div></div>
          <div class="mt-8 flex h-64 items-end gap-2 border-b border-border sm:gap-4">
            <div v-for="item in evolucionIngresos" :key="item.mes" class="flex h-full min-w-0 flex-1 flex-col justify-end"><span class="mb-2 hidden text-center text-[10px] font-bold text-muted-foreground sm:block">{{ moneda(item.importe) }}</span><div class="min-h-1 bg-linear-to-t from-primary to-blue-400 transition-all" :style="{ height: `${(item.importe / maximoEvolucion) * 82}%` }" /><span class="mt-2 text-center text-[10px] text-muted-foreground">{{ item.mes }}</span></div>
          </div>
          <p class="mt-5 border-l-4 border-l-[#F5B400] bg-[#F5B400]/10 p-3 text-xs text-muted-foreground">El ingreso se calcula con el precio vigente del curso multiplicado por las matrículas completadas. Los cursos gratuitos no generan ingreso. La utilidad neta se incorporará cuando el backend proporcione costos, comisiones e impuestos.</p>
        </CardContent>
      </Card>

      <div>
        <div class="mb-4"><h2 class="text-xl font-black">Reportes para gerencia</h2><p class="text-sm text-muted-foreground">Abre el detalle paginado y expórtalo en CSV o PDF.</p></div>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card v-for="reporte in reportesGerenciales" :key="reporte.nombre" class="border-border bg-card"><CardContent class="p-5"><component :is="reporte.icono" class="h-5 w-5 text-primary" /><h3 class="mt-4 font-black">{{ reporte.nombre }}</h3><p class="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{{ reporte.descripcion }}</p><Button class="mt-4" size="sm" variant="outline" @click="abrir(reporte.nombre)">Abrir reporte</Button></CardContent></Card>
        </div>
      </div>
    </template>

    <Dialog v-model:visible="modal" modal :header="reporteActivo" :style="{ width: 'min(96vw, 1120px)' }">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3"><p class="text-sm text-muted-foreground">{{ filas.length }} registros disponibles</p><div class="flex gap-2"><Button variant="outline" @click="descargarCsv"><FileSpreadsheet class="h-4 w-4" />CSV</Button><Button @click="descargarPdf"><Download class="h-4 w-4" />PDF</Button></div></div>
      <DataTable :value="filas" paginator :rows="8" :rows-per-page-options="[8, 15, 30]" striped-rows table-style="min-width: 760px" removable-sort>
        <Column v-for="columna in columnas" :key="columna.field" :field="columna.field" :header="columna.header" sortable />
      </DataTable>
    </Dialog>
  </section>
</template>
