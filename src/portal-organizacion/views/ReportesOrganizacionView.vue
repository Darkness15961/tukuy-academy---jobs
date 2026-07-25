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
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { jsPDF } from "jspdf";
import Chart from "primevue/chart";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Skeleton from "primevue/skeleton";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import {
  organizacionService,
  type AsignacionOrganizacion,
  type PropuestaCursoOrganizacion,
  type RutaOrganizacion,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  EstructuraOrganizacional,
  NivelOrganizacional,
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";
import type { CertificadoEmitidoDocente } from "@/portal-docente/types/docente.types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  ArcElement,
  DoughnutController,
  Filler,
  Tooltip,
  Legend,
);

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

const COLOR_PRIMARY = "#0B3A78";
const COLOR_ACCENT = "#F5B400";
const COLOR_EMERALD = "#059669";
const COLOR_VIOLET = "#6D28D9";
const COLOR_SLATE = "#64748B";

const cargando = ref(true);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const asignaciones = ref<AsignacionOrganizacion[]>([]);
const rutas = ref<RutaOrganizacion[]>([]);
const catalogo = ref<PropuestaCursoOrganizacion[]>([]);
const certificados = ref<CertificadoEmitidoDocente[]>([]);
const estructuras = ref<EstructuraOrganizacional[]>([]);
const niveles = ref<NivelOrganizacional[]>([]);
const unidades = ref<UnidadOrganizacional[]>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const modal = ref(false);
const reporteActivo = ref("Matrícula por curso");
const periodo = ref("12 meses");
const periodos = ["6 meses", "12 meses", "Año 2026"];
const meses = [
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
];
const distribucionMensual = [
  0.055, 0.061, 0.067, 0.071, 0.075, 0.078, 0.082, 0.087, 0.092, 0.099, 0.109,
  0.124,
];

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
    [
      usuarios.value,
      asignaciones.value,
      rutas.value,
      catalogo.value,
      certificados.value,
      estructuras.value,
      niveles.value,
      unidades.value,
      vinculaciones.value,
    ] = await Promise.all([
      organizacionService.usuarios.listar(),
      organizacionService.asignaciones.listar(),
      organizacionService.rutas.listar(),
      organizacionService.catalogoCursos.listar(),
      organizacionService.certificados.listar(),
      organizacionService.estructura.estructuras.listar(),
      organizacionService.estructura.niveles.listar(),
      organizacionService.estructura.unidades.listar(),
      organizacionService.estructura.vinculaciones.listar(),
    ]);
  } finally {
    cargando.value = false;
  }
}

function moneda(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(valor);
}

function normalizar(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function pertenenciaPrincipal(usuario: UsuarioOrganizacion) {
  const vinculacion = vinculaciones.value.find(
    (item) =>
      item.usuarioId === String(usuario.id) &&
      item.tipo === "PRINCIPAL" &&
      item.estado === "ACTIVA",
  );
  const unidad = unidades.value.find(
    (item) => item.id === (vinculacion?.unidadId ?? usuario.unidadPrincipalId),
  );
  if (!unidad) return "Sin nodo asignado";
  const estructura = estructuras.value.find(
    (item) => item.id === unidad.estructuraId,
  );
  const nivel = niveles.value.find((item) => item.id === unidad.nivelId);
  return `${estructura?.nombre ?? "Estructura"} · ${nivel?.nombre ?? "Nivel"} · ${unidad.nombre}`;
}

function precioCurso(nombre: string) {
  const delCatalogo = catalogo.value.find(
    (curso) => normalizar(curso.titulo) === normalizar(nombre),
  );
  if (delCatalogo) {
    if (delCatalogo.gratuito || (delCatalogo.precio ?? 0) <= 0) return 0;
    return delCatalogo.precio ?? 0;
  }
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
    ["supervision", 139],
    ["ia aplicada", 159],
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
    (primero, segundo) => segundo.ingresos - primero.ingresos,
  );
});

const topCursosIngresos = computed(() =>
  resumenCursos.value.filter((curso) => curso.ingresos > 0).slice(0, 5),
);
const topCursosAlumnos = computed(() =>
  [...resumenCursos.value]
    .sort((a, b) => b.matriculas - a.matriculas)
    .slice(0, 6),
);
const topRutas = computed(() =>
  [...rutas.value]
    .filter((ruta) => ruta.estado !== "ARCHIVADA")
    .sort((a, b) => b.usuarios - a.usuarios)
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
const cursosPublicados = computed(
  () =>
    catalogo.value.filter(
      (curso) =>
        curso.estado === "PUBLICADO" || curso.estado === "APROBADO",
    ).length,
);

const evolucionIngresos = computed(() => {
  const cantidad = periodo.value === "6 meses" ? 6 : 12;
  return distribucionMensual.slice(-cantidad).map((porcentaje, indice) => ({
    mes: meses.slice(-cantidad)[indice]!,
    importe: Math.round(ingresosTotales.value * porcentaje),
    matriculas: Math.round(matriculasTotales.value * porcentaje),
    alumnos: Math.round(activos.value.length * porcentaje * 1.15),
  }));
});

const crecimientoAlumnado = computed(() => {
  const serie = evolucionIngresos.value;
  if (serie.length < 2) return 0;
  const inicio = serie[0]!.alumnos || 1;
  const fin = serie[serie.length - 1]!.alumnos;
  return Math.round(((fin - inicio) / inicio) * 100);
});

const crecimientoIngresos = computed(() => {
  const serie = evolucionIngresos.value;
  if (serie.length < 2) return 0;
  const inicio = serie[0]!.importe || 1;
  const fin = serie[serie.length - 1]!.importe;
  return Math.round(((fin - inicio) / inicio) * 100);
});

const cumplimientoNodos = computed(() =>
  unidades.value
    .filter((unidad) => unidad.estado === "ACTIVA" && !unidad.esSistema)
    .map((unidad) => {
      const idsUsuarios = new Set(
        vinculaciones.value
          .filter(
            (item) => item.unidadId === unidad.id && item.estado === "ACTIVA",
          )
          .map((item) => item.usuarioId),
      );
      const personas = usuarios.value.filter((item) =>
        idsUsuarios.has(String(item.id)),
      );
      const progreso = personas.length
        ? Math.round(
            personas.reduce((total, item) => total + item.progreso, 0) /
              personas.length,
          )
        : 0;
      return {
        nodo: unidad.nombre,
        personas: personas.length,
        progreso,
      };
    })
    .sort((a, b) => b.personas - a.personas)
    .slice(0, 8),
);

const indicadores = computed(() => [
  {
    etiqueta: "Ingresos formación",
    valor: moneda(ingresosTotales.value),
    detalle: `+${crecimientoIngresos.value}% en el periodo`,
    icono: CircleDollarSign,
    acento: "accent" as const,
  },
  {
    etiqueta: "Alumnos activos",
    valor: activos.value.length.toLocaleString("es-PE"),
    detalle: `+${crecimientoAlumnado.value}% crecimiento · ${matriculasTotales.value} matrículas`,
    icono: UsersRound,
    acento: "primary" as const,
  },
  {
    etiqueta: "Top curso",
    valor: topCursosIngresos.value[0]
      ? moneda(topCursosIngresos.value[0].ingresos)
      : "—",
    detalle: topCursosIngresos.value[0]?.curso ?? "Sin ingresos aún",
    icono: Target,
    acento: "accent" as const,
  },
  {
    etiqueta: "Cursos en oferta",
    valor: cursosPublicados.value,
    detalle: `${completadosTotales.value} completados · ${finalizacion.value}% avance`,
    icono: BookOpen,
    acento: "primary" as const,
  },
]);

const opcionesBase = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: COLOR_SLATE,
        usePointStyle: true,
        pointStyle: "rect",
        boxWidth: 8,
        padding: 16,
        font: { size: 11, weight: 700 as const },
      },
    },
    tooltip: {
      backgroundColor: "#07152B",
      titleColor: "#FFFFFF",
      bodyColor: "#FFFFFF",
      padding: 12,
    },
  },
};

const datosEvolucion = computed(() => ({
  labels: evolucionIngresos.value.map((item) => item.mes),
  datasets: [
    {
      type: "line" as const,
      label: "Ingresos (S/)",
      data: evolucionIngresos.value.map((item) => item.importe),
      borderColor: COLOR_PRIMARY,
      backgroundColor: "rgba(11, 58, 120, 0.14)",
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: COLOR_PRIMARY,
      borderWidth: 2.5,
    },
  ],
}));

const opcionesEvolucion = computed(() => ({
  ...opcionesBase,
  interaction: { mode: "index" as const, intersect: false },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: COLOR_SLATE, font: { size: 11, weight: 700 as const } },
    },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(203, 213, 225, 0.45)" },
      ticks: {
        color: COLOR_PRIMARY,
        callback(valor: string | number) {
          return `S/ ${Math.round(Number(valor) / 1000)}k`;
        },
      },
    },
  },
}));

const datosCrecimientoAlumnos = computed(() => ({
  labels: evolucionIngresos.value.map((item) => item.mes),
  datasets: [
    {
      type: "line" as const,
      label: "Alumnos",
      data: evolucionIngresos.value.map((item) => item.alumnos),
      borderColor: COLOR_EMERALD,
      backgroundColor: "rgba(5, 150, 105, 0.12)",
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: COLOR_EMERALD,
      borderWidth: 2.5,
      yAxisID: "y",
    },
    {
      type: "bar" as const,
      label: "Matrículas",
      data: evolucionIngresos.value.map((item) => item.matriculas),
      backgroundColor: COLOR_ACCENT,
      borderRadius: 0,
      yAxisID: "y1",
    },
  ],
}));

const opcionesCrecimientoAlumnos = computed(() => ({
  ...opcionesBase,
  interaction: { mode: "index" as const, intersect: false },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: COLOR_SLATE, font: { size: 11, weight: 700 as const } },
    },
    y: {
      position: "left" as const,
      beginAtZero: true,
      grid: { color: "rgba(203, 213, 225, 0.45)" },
      ticks: { color: COLOR_EMERALD },
    },
    y1: {
      position: "right" as const,
      beginAtZero: true,
      grid: { drawOnChartArea: false },
      ticks: { color: "#A16F00" },
    },
  },
}));

const datosTopIngresos = computed(() => ({
  labels: topCursosIngresos.value.map((curso) =>
    curso.curso.length > 32 ? `${curso.curso.slice(0, 32)}…` : curso.curso,
  ),
  datasets: [
    {
      label: "Ingresos (S/)",
      data: topCursosIngresos.value.map((curso) => curso.ingresos),
      backgroundColor: [
        COLOR_ACCENT,
        COLOR_PRIMARY,
        COLOR_EMERALD,
        COLOR_VIOLET,
        COLOR_SLATE,
      ].slice(0, topCursosIngresos.value.length),
      borderRadius: 0,
      borderSkipped: false,
    },
  ],
}));

const opcionesTopIngresos = {
  ...opcionesBase,
  indexAxis: "y" as const,
  plugins: {
    ...opcionesBase.plugins,
    legend: { display: false },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: "rgba(203, 213, 225, 0.45)" },
      ticks: {
        color: COLOR_SLATE,
        callback(valor: string | number) {
          return `S/ ${Math.round(Number(valor) / 1000)}k`;
        },
      },
    },
    y: {
      grid: { display: false },
      ticks: { color: COLOR_SLATE, font: { size: 11, weight: 700 as const } },
    },
  },
};

const datosCursos = computed(() => ({
  labels: topCursosAlumnos.value.map((curso) =>
    curso.curso.length > 28 ? `${curso.curso.slice(0, 28)}…` : curso.curso,
  ),
  datasets: [
    {
      label: "Asignados",
      data: topCursosAlumnos.value.map((curso) => curso.matriculas),
      backgroundColor: COLOR_PRIMARY,
      borderRadius: 0,
    },
    {
      label: "Completados",
      data: topCursosAlumnos.value.map((curso) => curso.completados),
      backgroundColor: COLOR_EMERALD,
      borderRadius: 0,
    },
  ],
}));

const opcionesCursos = {
  ...opcionesBase,
  indexAxis: "y" as const,
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: "rgba(203, 213, 225, 0.45)" },
      ticks: { color: COLOR_SLATE },
    },
    y: {
      grid: { display: false },
      ticks: { color: COLOR_SLATE, font: { size: 10, weight: 700 as const } },
    },
  },
};

const datosFinalizacion = computed(() => ({
  labels: ["Completados", "Pendientes"],
  datasets: [
    {
      data: [
        completadosTotales.value,
        Math.max(matriculasTotales.value - completadosTotales.value, 0),
      ],
      backgroundColor: [COLOR_EMERALD, "rgba(100, 116, 139, 0.35)"],
      borderWidth: 0,
      hoverOffset: 6,
    },
  ],
}));

const opcionesDona = {
  ...opcionesBase,
  cutout: "62%",
  plugins: {
    ...opcionesBase.plugins,
    legend: {
      position: "bottom" as const,
      labels: opcionesBase.plugins.legend.labels,
    },
  },
};

const datosNodos = computed(() => ({
  labels: cumplimientoNodos.value.map((item) =>
    item.nodo.length > 22 ? `${item.nodo.slice(0, 22)}…` : item.nodo,
  ),
  datasets: [
    {
      label: "Personas",
      data: cumplimientoNodos.value.map((item) => item.personas),
      backgroundColor: COLOR_VIOLET,
      borderRadius: 0,
    },
    {
      label: "Progreso %",
      data: cumplimientoNodos.value.map((item) => item.progreso),
      backgroundColor: COLOR_ACCENT,
      borderRadius: 0,
    },
  ],
}));

const opcionesNodos = {
  ...opcionesBase,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: COLOR_SLATE, maxRotation: 45, minRotation: 0, font: { size: 10 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(203, 213, 225, 0.45)" },
      ticks: { color: COLOR_SLATE },
    },
  },
};

const datosRutas = computed(() => {
  const publicadas = rutas.value.filter(
    (r) => (r.estado ?? "PUBLICADA") === "PUBLICADA",
  ).length;
  const borradores = rutas.value.filter((r) => r.estado === "BORRADOR").length;
  const archivadas = rutas.value.filter((r) => r.estado === "ARCHIVADA").length;
  return {
    labels: ["Publicadas", "Borradores", "Archivadas"],
    datasets: [
      {
        data: [publicadas, borradores, archivadas],
        backgroundColor: [COLOR_PRIMARY, COLOR_ACCENT, COLOR_SLATE],
        borderWidth: 0,
      },
    ],
  };
});

const reportesGerenciales = [
  {
    nombre: "Ingresos por curso",
    descripcion: "Top cursos por ingresos, precio y completados.",
    icono: CircleDollarSign,
  },
  {
    nombre: "Matrícula por curso",
    descripcion: "Asignados, completados, pendientes y finalización.",
    icono: UsersRound,
  },
  {
    nombre: "Desempeño de rutas",
    descripcion: "Participantes, cursos, progreso, precio y estado.",
    icono: Route,
  },
  {
    nombre: "Cumplimiento por nodo",
    descripcion: "Personas y avance por nodo de la estructura.",
    icono: Building2,
  },
  {
    nombre: "Progreso por trabajador",
    descripcion: "Situación individual y pertenencia estructural.",
    icono: TrendingUp,
  },
  {
    nombre: "Inactividad y vencimientos",
    descripcion: "Personas en riesgo o con bajo avance.",
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
      precio: moneda(ruta.precio ?? 0),
      descuentos: ruta.descuentos?.length ?? (ruta.descuentoInterno ? 1 : 0),
      certificado: ruta.certificado ? "Sí" : "No",
      estado: ruta.estado ?? "PUBLICADA",
    }));
  }
  if (reporteActivo.value === "Ingresos por curso") {
    return [...resumenCursos.value]
      .sort((a, b) => b.ingresos - a.ingresos)
      .map((curso) => ({
        curso: curso.curso,
        precio: moneda(curso.precio),
        matriculasCompletadas: curso.completados,
        ingresos: moneda(curso.ingresos),
      }));
  }
  if (reporteActivo.value === "Cumplimiento por nodo") {
    return unidades.value
      .filter((unidad) => unidad.estado === "ACTIVA" && !unidad.esSistema)
      .map((unidad) => {
        const idsUsuarios = new Set(
          vinculaciones.value
            .filter(
              (item) => item.unidadId === unidad.id && item.estado === "ACTIVA",
            )
            .map((item) => item.usuarioId),
        );
        const personas = usuarios.value.filter((item) =>
          idsUsuarios.has(String(item.id)),
        );
        const estructura = estructuras.value.find(
          (item) => item.id === unidad.estructuraId,
        );
        const nivel = niveles.value.find((item) => item.id === unidad.nivelId);
        return {
          estructura: estructura?.nombre ?? "Sin estructura",
          nivel: nivel?.nombre ?? "Sin nivel",
          nodo: unidad.nombre,
          personas: personas.length,
          progreso: `${
            personas.length
              ? Math.round(
                  personas.reduce((total, item) => total + item.progreso, 0) /
                    personas.length,
                )
              : 0
          }%`,
        };
      });
  }
  if (reporteActivo.value === "Inactividad y vencimientos") {
    return usuarios.value
      .filter(
        (usuario) => usuario.estado !== "ACTIVO" || usuario.progreso < 40,
      )
      .map((usuario) => ({
        colaborador: usuario.nombre,
        pertenencia: pertenenciaPrincipal(usuario),
        estado: usuario.estado,
        progreso: `${usuario.progreso}%`,
      }));
  }
  return usuarios.value.map((usuario) => ({
    colaborador: usuario.nombre,
    pertenencia: pertenenciaPrincipal(usuario),
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
    `Alumnos: ${activos.value.length} · Matrículas: ${matriculasTotales.value} · Ingresos: ${moneda(ingresosTotales.value)} · Certificados: ${certificados.value.length}`,
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
    <header class="flex flex-wrap items-end justify-between gap-4">
      <TituloConAyuda
        eyebrow="Inteligencia empresarial"
        titulo="Reportes de formación"
        ayuda="Primero ingresos y crecimiento de alumnado; el reporte clave es el top 5 de cursos por ingresos."
      />
      <div class="flex flex-wrap items-end gap-2">
        <label class="grid gap-1.5">
          <span class="filtro-label mb-0">Periodo</span>
          <Select
            v-model="periodo"
            :options="periodos"
            class="filtro-control min-w-40"
            panel-class="tukuy-filtro-panel"
            aria-label="Periodo del reporte"
          />
        </label>
        <Button variant="outline" @click="descargarCsv">
          <FileSpreadsheet class="h-4 w-4" />
          CSV
        </Button>
        <Button @click="descargarPdf">
          <Download class="h-4 w-4" />
          PDF
        </Button>
      </div>
    </header>

    <div v-if="cargando" class="grid gap-5">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
      </div>
      <div class="grid gap-5 xl:grid-cols-3">
        <Skeleton class="h-80 xl:col-span-2" />
        <Skeleton class="h-80" />
      </div>
    </div>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          v-for="indicador in indicadores"
          :key="indicador.etiqueta"
          class="overflow-hidden border-border bg-card"
          :class="
            indicador.acento === 'accent'
              ? 'border-t-4 border-t-accent'
              : 'border-t-4 border-t-primary'
          "
        >
          <CardContent class="flex items-center gap-4 p-5">
            <div
              class="grid h-11 w-11 place-items-center"
              :class="
                indicador.acento === 'accent'
                  ? 'bg-accent/20 text-[#B87A00]'
                  : 'bg-primary/10 text-primary'
              "
            >
              <component :is="indicador.icono" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <strong class="block text-2xl font-black tracking-tight">{{
                indicador.valor
              }}</strong>
              <p class="text-xs font-bold">{{ indicador.etiqueta }}</p>
              <p class="truncate text-[11px] text-muted-foreground">
                {{ indicador.detalle }}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 1. Ingresos -->
      <Card class="border-border border-t-4 border-t-accent bg-card">
        <CardContent class="p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wide text-[#B87A00]">
                Prioridad comercial
              </p>
              <h2 class="text-lg font-black">Evolución de ingresos</h2>
              <p class="text-xs text-muted-foreground">
                Ingresos por formación en el periodo seleccionado
              </p>
            </div>
            <div class="text-right">
              <strong class="text-2xl font-black text-primary">{{
                moneda(ingresosTotales)
              }}</strong>
              <p class="text-[11px] font-bold text-emerald-700">
                +{{ crecimientoIngresos }}% vs inicio del periodo
              </p>
            </div>
          </div>
          <div class="mt-4 h-72 w-full">
            <Chart
              type="line"
              :data="datosEvolucion"
              :options="opcionesEvolucion"
              class="h-full w-full"
              :canvas-props="{
                role: 'img',
                'aria-label': 'Evolución mensual de ingresos',
              }"
            />
          </div>
        </CardContent>
      </Card>

      <!-- 2. Crecimiento alumnado + Top 5 ingresos -->
      <div class="grid gap-5 xl:grid-cols-2">
        <Card class="border-border border-t-4 border-t-primary bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-black">Crecimiento de alumnado</h2>
                <p class="text-xs text-muted-foreground">
                  Alumnos activos y matrículas mes a mes
                </p>
              </div>
              <div class="text-right">
                <strong class="text-xl font-black">{{
                  activos.length.toLocaleString("es-PE")
                }}</strong>
                <p class="text-[11px] font-bold text-emerald-700">
                  +{{ crecimientoAlumnado }}% en el periodo
                </p>
              </div>
            </div>
            <div class="mt-4 h-64 w-full">
              <Chart
                type="bar"
                :data="datosCrecimientoAlumnos"
                :options="opcionesCrecimientoAlumnos"
                class="h-full w-full"
                :canvas-props="{
                  role: 'img',
                  'aria-label': 'Crecimiento de alumnos y matrículas',
                }"
              />
            </div>
          </CardContent>
        </Card>

        <Card class="border-border border-t-4 border-t-accent bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wide text-[#B87A00]">
                  Reporte clave
                </p>
                <h2 class="text-lg font-black">Top 5 cursos por ingresos</h2>
                <p class="text-xs text-muted-foreground">
                  Cursos que más dinero generaron
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                @click="abrir('Ingresos por curso')"
              >
                Ver detalle
              </Button>
            </div>
            <div
              v-if="topCursosIngresos.length"
              class="h-64 w-full"
            >
              <Chart
                type="bar"
                :data="datosTopIngresos"
                :options="opcionesTopIngresos"
                class="h-full w-full"
                :canvas-props="{
                  role: 'img',
                  'aria-label': 'Top 5 cursos con más ingresos',
                }"
              />
            </div>
            <p
              v-else
              class="grid h-64 place-items-center text-sm text-muted-foreground"
            >
              Aún no hay cursos con ingresos en el periodo.
            </p>
            <ul
              v-if="topCursosIngresos.length"
              class="mt-4 grid gap-2"
            >
              <li
                v-for="(curso, indice) in topCursosIngresos"
                :key="curso.curso"
                class="flex items-center justify-between gap-3 border border-border px-3 py-2 text-sm"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span
                    class="grid h-6 w-6 shrink-0 place-items-center text-xs font-black"
                    :class="
                      indice === 0
                        ? 'bg-accent text-[#7A5600]'
                        : 'bg-muted text-muted-foreground'
                    "
                  >
                    {{ indice + 1 }}
                  </span>
                  <span class="truncate font-bold">{{ curso.curso }}</span>
                </span>
                <span class="shrink-0 font-black text-primary">
                  {{ moneda(curso.ingresos) }}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <!-- 3. Resto de reportes -->
      <div class="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card class="border-border bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-black">Finalización</h2>
                <p class="text-xs text-muted-foreground">
                  Completados vs pendientes
                </p>
              </div>
              <Award class="h-5 w-5 text-[#B87A00]" />
            </div>
            <div class="relative mt-4 h-56 w-full">
              <Chart
                type="doughnut"
                :data="datosFinalizacion"
                :options="opcionesDona"
                class="h-full w-full"
                :canvas-props="{
                  role: 'img',
                  'aria-label': 'Distribución de matrículas completadas y pendientes',
                }"
              />
              <div
                class="pointer-events-none absolute inset-0 grid place-items-center pt-2"
              >
                <div class="text-center">
                  <strong class="block text-3xl font-black">{{
                    finalizacion
                  }}%</strong>
                  <span
                    class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
                    >avance</span
                  >
                </div>
              </div>
            </div>
            <p class="mt-3 text-center text-xs text-muted-foreground">
              {{ completadosTotales }} de {{ matriculasTotales }} matrículas
            </p>
          </CardContent>
        </Card>

        <Card class="border-border bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-black">Cursos con más alumnos</h2>
                <p class="text-xs text-muted-foreground">
                  Asignados vs completados
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                @click="abrir('Matrícula por curso')"
              >
                Ver detalle
              </Button>
            </div>
            <div class="h-64 w-full">
              <Chart
                type="bar"
                :data="datosCursos"
                :options="opcionesCursos"
                class="h-full w-full"
                :canvas-props="{
                  role: 'img',
                  'aria-label': 'Comparativa de alumnos asignados y completados por curso',
                }"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="grid gap-5 xl:grid-cols-2">
        <Card class="border-border bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-black">Cumplimiento por nodo</h2>
                <p class="text-xs text-muted-foreground">
                  Personas y progreso medio
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                @click="abrir('Cumplimiento por nodo')"
              >
                Ver detalle
              </Button>
            </div>
            <div class="h-72 w-full">
              <Chart
                type="bar"
                :data="datosNodos"
                :options="opcionesNodos"
                class="h-full w-full"
                :canvas-props="{
                  role: 'img',
                  'aria-label': 'Personas y progreso por nodo organizacional',
                }"
              />
            </div>
          </CardContent>
        </Card>

        <Card class="border-border bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-black">Estado de rutas</h2>
                <p class="text-xs text-muted-foreground">
                  Publicadas, borradores y archivadas
                </p>
              </div>
              <Route class="h-5 w-5 text-primary" />
            </div>
            <div class="h-56 w-full">
              <Chart
                type="doughnut"
                :data="datosRutas"
                :options="opcionesDona"
                class="h-full w-full"
                :canvas-props="{
                  role: 'img',
                  'aria-label': 'Distribución de rutas por estado',
                }"
              />
            </div>
            <ul class="mt-3 grid gap-2">
              <li
                v-for="ruta in topRutas"
                :key="ruta.id"
                class="flex items-center justify-between gap-2 border border-border px-3 py-2 text-sm"
              >
                <span class="truncate font-bold">{{ ruta.nombre }}</span>
                <span class="shrink-0 text-xs text-muted-foreground">
                  {{ ruta.usuarios }} · {{ ruta.progreso }}%
                </span>
              </li>
            </ul>
            <Button
              class="mt-4 w-full"
              variant="outline"
              @click="abrir('Desempeño de rutas')"
            >
              Ver rutas
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card class="border-border bg-card">
        <CardContent class="p-5 sm:p-6">
          <div class="mb-4">
            <h2 class="text-lg font-black">Más reportes</h2>
            <p class="text-xs text-muted-foreground">
              Abre el detalle paginado y expórtalo en CSV o PDF.
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <button
              v-for="reporte in reportesGerenciales"
              :key="reporte.nombre"
              type="button"
              class="border border-border border-l-4 border-l-transparent p-4 text-left transition hover:border-l-primary hover:bg-muted/40"
              @click="abrir(reporte.nombre)"
            >
              <component :is="reporte.icono" class="h-5 w-5 text-primary" />
              <h3 class="mt-3 text-sm font-black">{{ reporte.nombre }}</h3>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">
                {{ reporte.descripcion }}
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      <p
        class="border border-border border-l-4 border-l-accent bg-muted/20 p-3 text-xs text-muted-foreground"
      >
        Los ingresos se estiman con el precio del catálogo × matrículas
        completadas. Cursos gratuitos no generan ingreso. La utilidad neta
        requerirá costos e impuestos del backend.
      </p>
    </template>

    <Dialog
      v-model:visible="modal"
      modal
      :header="reporteActivo"
      :style="{ width: 'min(96vw, 70rem)' }"
      :pt="{
        root: { class: 'rounded-none' },
        header: { class: 'rounded-none border-b border-border' },
        content: { class: 'rounded-none' },
      }"
    >
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">
          {{ filas.length }} registros
        </p>
        <div class="flex gap-2">
          <Button variant="outline" @click="descargarCsv">
            <FileSpreadsheet class="h-4 w-4" />
            CSV
          </Button>
          <Button @click="descargarPdf">
            <Download class="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>
      <DataTable
        class="tabla-estudiantes"
        :value="filas"
        paginator
        :rows="8"
        :rows-per-page-options="[8, 15, 30]"
        removable-sort
        size="small"
        table-style="min-width: 48rem"
      >
        <Column
          v-for="columna in columnas"
          :key="columna.field"
          :field="columna.field"
          :header="columna.header"
          sortable
        />
        <template #empty>
          <div class="py-10 text-center text-sm text-muted-foreground">
            No hay datos para este reporte.
          </div>
        </template>
      </DataTable>
    </Dialog>
  </section>
</template>
