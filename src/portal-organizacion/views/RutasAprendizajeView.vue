<script setup lang="ts">
import {
  Archive,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  FilterX,
  ImageIcon,
  Plus,
  Route,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  UsersRound,
} from "lucide-vue-next";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import ToggleSwitch from "primevue/toggleswitch";
import { computed, onMounted, reactive, ref, watch } from "vue";

import {
  calcularPrecioConReglas,
} from "@/lib/precio-curso";
import {
  legacyAReglasDescuento,
  politicaPorDefecto,
  reglasALegacyDescuento,
} from "@/lib/descuentos-comerciales";
import {
  etiquetaAlcanceCorto,
  organizacionService,
  type AlcanceCursoOrganizacion,
  type CursoEnRutaOrganizacion,
  type PropuestaCursoOrganizacion,
  type RutaOrganizacion,
} from "@/api/services/organizacion.service";
import EditorDescuentosComerciales from "@/portal-organizacion/components/EditorDescuentosComerciales.vue";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  PoliticaCombinacionDescuentos,
  ReglaDescuentoCurso,
} from "@/types/comercializacion-curso.types";

type EstadoFiltro = "TODOS" | "PUBLICADA" | "BORRADOR" | "ARCHIVADA";
type CertificadoFiltro = "TODOS" | "SI" | "NO";
type Severidad = "success" | "info" | "warn" | "danger" | "secondary";

const IMAGENES_RUTA = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80",
];

const IMAGEN_FALLBACK =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80";

const cargando = ref(true);
const guardando = ref(false);
const rutas = ref<RutaOrganizacion[]>([]);
const catalogo = ref<PropuestaCursoOrganizacion[]>([]);
const nodosInternos = ref<Array<{ label: string; value: string }>>([]);
const modal = ref(false);
const editandoId = ref<string | null>(null);
const mensaje = ref("");
const error = ref("");
const busquedaCursos = ref("");
const buscar = ref("");
const estadoFiltro = ref<EstadoFiltro>("TODOS");
const alcanceFiltro = ref("TODOS");
const certificadoFiltro = ref<CertificadoFiltro>("TODOS");

const formulario = reactive({
  nombre: "",
  descripcion: "",
  imagen: "",
  usuarios: 0,
  certificado: false,
  precio: 0,
  alcance: "TODOS" as AlcanceCursoOrganizacion,
  destinoArea: "",
  politicaDescuentos: politicaPorDefecto() as PoliticaCombinacionDescuentos,
  descuentos: [] as ReglaDescuentoCurso[],
  estado: "BORRADOR" as NonNullable<RutaOrganizacion["estado"]>,
  cursosSeleccionados: [] as CursoEnRutaOrganizacion[],
});

const opcionesAlcance = [
  { label: "Todo el público", value: "TODOS" as const },
  { label: "Toda la organización", value: "ORGANIZACION" as const },
  { label: "Solo un nodo", value: "AREA" as const },
  { label: "Público externo", value: "EXTERNO" as const },
];

const opcionesEstadoForm = [
  { label: "Borrador", value: "BORRADOR" as const },
  { label: "Publicada", value: "PUBLICADA" as const },
  { label: "Archivada", value: "ARCHIVADA" as const },
];

const opcionesEstadoFiltro = [
  { etiqueta: "Todos los estados", valor: "TODOS" as const },
  { etiqueta: "Publicadas", valor: "PUBLICADA" as const },
  { etiqueta: "Borradores", valor: "BORRADOR" as const },
  { etiqueta: "Archivadas", valor: "ARCHIVADA" as const },
];

const opcionesAlcanceFiltro = computed(() => [
  { etiqueta: "Todos los alcances", valor: "TODOS" },
  ...opcionesAlcance.map((item) => ({
    etiqueta: item.label,
    valor: item.value,
  })),
]);

const opcionesCertificadoFiltro = [
  { etiqueta: "Certificado: todos", valor: "TODOS" as const },
  { etiqueta: "Con certificado", valor: "SI" as const },
  { etiqueta: "Sin certificado", valor: "NO" as const },
];

const chipsEstado = [
  { etiqueta: "Todas", valor: "TODOS" as const },
  { etiqueta: "Publicadas", valor: "PUBLICADA" as const },
  { etiqueta: "Borradores", valor: "BORRADOR" as const },
  { etiqueta: "Archivadas", valor: "ARCHIVADA" as const },
];

const precioConDescuento = computed(() =>
  calcularPrecioConReglas({
    precioBase: formulario.precio,
    reglas: formulario.descuentos,
    politica: formulario.politicaDescuentos,
    perfil: {
      condicion: "INTERNO",
      nodoIds:
        formulario.alcance === "AREA" && formulario.destinoArea
          ? [formulario.destinoArea]
          : [],
    },
    aplicaSobre: "CURSO_COMPLETO",
  }).precioFinal,
);

const nodoIdsAlcanceForm = computed(() =>
  formulario.alcance === "AREA" && formulario.destinoArea
    ? [formulario.destinoArea]
    : [],
);

const cursosDisponibles = computed(() =>
  catalogo.value.filter(
    (curso) => curso.estado === "APROBADO" || curso.estado === "PUBLICADO",
  ),
);

const cursosFiltrados = computed(() => {
  const termino = busquedaCursos.value.trim().toLowerCase();
  return cursosDisponibles.value.filter((curso) => {
    if (formulario.cursosSeleccionados.some((item) => item.id === curso.id)) {
      return false;
    }
    if (!termino) return true;
    return [curso.titulo, curso.docente, curso.categoria].some((valor) =>
      valor.toLowerCase().includes(termino),
    );
  });
});

const sumaPreciosCursos = computed(() =>
  formulario.cursosSeleccionados.reduce((total, item) => {
    const curso = catalogo.value.find((c) => c.id === item.id);
    if (!curso || (curso.precio ?? 0) <= 0) return total;
    return total + (curso.precio ?? 0);
  }, 0),
);

const visibles = computed(() => {
  const termino = buscar.value.trim().toLowerCase();
  return rutas.value.filter((ruta) => {
    const estado = ruta.estado ?? "PUBLICADA";
    const coincideEstado =
      estadoFiltro.value === "TODOS" || estado === estadoFiltro.value;
    const coincideAlcance =
      alcanceFiltro.value === "TODOS" ||
      (ruta.alcance ?? "TODOS") === alcanceFiltro.value;
    const coincideCertificado =
      certificadoFiltro.value === "TODOS" ||
      (certificadoFiltro.value === "SI"
        ? ruta.certificado
        : !ruta.certificado);
    const coincideTexto =
      !termino ||
      [
        ruta.nombre,
        ruta.descripcion ?? "",
        ...(ruta.cursosSeleccionados?.map((c) => c.titulo) ?? []),
      ].some((valor) => valor.toLowerCase().includes(termino));
    return (
      coincideEstado &&
      coincideAlcance &&
      coincideCertificado &&
      coincideTexto
    );
  });
});

const hayFiltros = computed(
  () =>
    Boolean(buscar.value.trim()) ||
    estadoFiltro.value !== "TODOS" ||
    alcanceFiltro.value !== "TODOS" ||
    certificadoFiltro.value !== "TODOS",
);

const cantidadFiltrosActivos = computed(() => {
  let n = 0;
  if (buscar.value.trim()) n += 1;
  if (estadoFiltro.value !== "TODOS") n += 1;
  if (alcanceFiltro.value !== "TODOS") n += 1;
  if (certificadoFiltro.value !== "TODOS") n += 1;
  return n;
});

const indicadores = computed(() => {
  const publicadas = rutas.value.filter(
    (r) => (r.estado ?? "PUBLICADA") === "PUBLICADA",
  ).length;
  const borradores = rutas.value.filter((r) => r.estado === "BORRADOR").length;
  const participantes = rutas.value.reduce((suma, r) => suma + r.usuarios, 0);
  const certificables = rutas.value.filter((r) => r.certificado).length;
  return [
    {
      etiqueta: "Publicadas",
      valor: publicadas,
      icono: Send,
      acento: "primary" as const,
    },
    {
      etiqueta: "Borradores",
      valor: borradores,
      icono: BookOpen,
      acento: "accent" as const,
    },
    {
      etiqueta: "Participantes",
      valor: participantes,
      icono: UsersRound,
      acento: "primary" as const,
    },
    {
      etiqueta: "Certificables",
      valor: certificables,
      icono: Award,
      acento: "accent" as const,
    },
  ];
});

watch(
  () => formulario.alcance,
  (alcance) => {
    if (alcance !== "AREA") {
      formulario.destinoArea = "";
    } else if (!formulario.destinoArea && nodosInternos.value[0]) {
      formulario.destinoArea = nodosInternos.value[0].value;
    }
  },
);

onMounted(cargar);

async function cargar() {
  cargando.value = true;
  error.value = "";
  try {
    const [listaRutas, listaCatalogo, estructuras, niveles, nodos] =
      await Promise.all([
        organizacionService.rutas.listar(),
        organizacionService.catalogoCursos.listar(),
        organizacionService.estructura.estructuras.listar(),
        organizacionService.estructura.niveles.listar(),
        organizacionService.estructura.unidades.listar(),
      ]);
    rutas.value = listaRutas;
    catalogo.value = listaCatalogo;
    nodosInternos.value = nodos
      .filter((nodo) => nodo.estado === "ACTIVA")
      .map((nodo) => ({
        label: [
          estructuras.find((item) => item.id === nodo.estructuraId)?.nombre,
          niveles.find((item) => item.id === nodo.nivelId)?.nombre,
          nodo.nombre,
        ]
          .filter(Boolean)
          .join(" · "),
        value: nodo.id,
      }));
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudieron cargar las rutas.";
  } finally {
    cargando.value = false;
  }
}

function limpiarFiltros() {
  buscar.value = "";
  estadoFiltro.value = "TODOS";
  alcanceFiltro.value = "TODOS";
  certificadoFiltro.value = "TODOS";
}

function imagenRuta(ruta: RutaOrganizacion) {
  if (ruta.imagen?.trim()) return ruta.imagen.trim();
  const primero = ruta.cursosSeleccionados?.[0]?.id;
  if (primero) {
    const curso = catalogo.value.find((item) => item.id === primero);
    if (curso?.imagen) return curso.imagen;
  }
  const indice = Math.abs(
    [...ruta.id].reduce((suma, char) => suma + char.charCodeAt(0), 0),
  ) % IMAGENES_RUTA.length;
  return IMAGENES_RUTA[indice] ?? IMAGEN_FALLBACK;
}

function textoPrecioRuta(ruta: RutaOrganizacion) {
  const precio = ruta.precio ?? 0;
  const reglas = legacyAReglasDescuento(ruta);
  if (!reglas.length) {
    return precio <= 0 ? "Gratuita" : `S/ ${precio.toFixed(2)}`;
  }
  const interno = calcularPrecioConReglas({
    precioBase: precio,
    reglas,
    politica: ruta.politicaDescuentos ?? "SOLO_MEJOR",
    perfil: {
      condicion: "INTERNO",
      nodoIds: ruta.destinoArea ? [ruta.destinoArea] : [],
    },
    aplicaSobre: "CURSO_COMPLETO",
  });
  const n = reglas.filter((r) => r.activa !== false).length;
  if (interno.precioFinal <= 0) {
    return `Gratis · ${n} dto.`;
  }
  if (interno.precioFinal < precio) {
    return `S/ ${interno.precioFinal.toFixed(2)} · ${n} dto.`;
  }
  return `S/ ${precio.toFixed(2)} · ${n} dto.`;
}

function nombreNodo(valor?: string | null) {
  if (!valor) return undefined;
  return nodosInternos.value.find((item) => item.value === valor)?.label ?? valor;
}

function textoAlcance(ruta: RutaOrganizacion) {
  if (ruta.alcance === "AREA") {
    return `Nodo · ${nombreNodo(ruta.destinoArea) ?? "interno"}`;
  }
  return etiquetaAlcanceCorto(ruta.alcance);
}

function etiquetaEstado(estado?: RutaOrganizacion["estado"]) {
  if (estado === "BORRADOR") return "Borrador";
  if (estado === "ARCHIVADA") return "Archivada";
  return "Publicada";
}

function severidadEstado(estado?: RutaOrganizacion["estado"]): Severidad {
  if (estado === "BORRADOR") return "warn";
  if (estado === "ARCHIVADA") return "secondary";
  return "success";
}

function abrir(ruta?: RutaOrganizacion) {
  editandoId.value = ruta?.id ?? null;
  busquedaCursos.value = "";
  const imagenNueva =
    IMAGENES_RUTA[rutas.value.length % IMAGENES_RUTA.length] ?? IMAGEN_FALLBACK;
  Object.assign(formulario, {
    nombre: ruta?.nombre ?? "",
    descripcion: ruta?.descripcion ?? "",
    imagen: ruta?.imagen ?? (ruta ? imagenRuta(ruta) : imagenNueva),
    usuarios: ruta?.usuarios ?? 0,
    certificado: ruta?.certificado ?? false,
    precio: Math.max(ruta?.precio ?? 0, 0) || (ruta ? 0 : 100),
    alcance: ruta?.alcance ?? "TODOS",
    destinoArea: ruta?.destinoArea ?? nodosInternos.value[0]?.value ?? "",
    politicaDescuentos: ruta?.politicaDescuentos ?? politicaPorDefecto(),
    descuentos: legacyAReglasDescuento(ruta ?? {}),
    estado: ruta?.estado ?? "BORRADOR",
    cursosSeleccionados: [...(ruta?.cursosSeleccionados ?? [])].sort(
      (a, b) => a.orden - b.orden,
    ),
  });
  modal.value = true;
}

function estaSeleccionado(id: string) {
  return formulario.cursosSeleccionados.some((item) => item.id === id);
}

function agregarCurso(curso: PropuestaCursoOrganizacion) {
  if (estaSeleccionado(curso.id)) return;
  formulario.cursosSeleccionados.push({
    id: curso.id,
    titulo: curso.titulo,
    docente: curso.docente,
    orden: formulario.cursosSeleccionados.length + 1,
  });
}

function quitarCurso(id: string) {
  formulario.cursosSeleccionados = formulario.cursosSeleccionados
    .filter((item) => item.id !== id)
    .map((item, indice) => ({ ...item, orden: indice + 1 }));
}

function moverCurso(indice: number, direccion: -1 | 1) {
  const destino = indice + direccion;
  if (destino < 0 || destino >= formulario.cursosSeleccionados.length) return;
  const copia = [...formulario.cursosSeleccionados];
  const actual = copia[indice]!;
  copia[indice] = copia[destino]!;
  copia[destino] = actual;
  formulario.cursosSeleccionados = copia.map((item, i) => ({
    ...item,
    orden: i + 1,
  }));
}

function usarSugerido() {
  formulario.precio = Math.max(sumaPreciosCursos.value, 1);
  if (!formulario.descuentos.length) {
    formulario.descuentos = legacyAReglasDescuento({
      descuentoAplicaA: "ORGANIZACION",
      descuentoInterno: 15,
    });
  } else {
    const primera = formulario.descuentos.find(
      (regla) => (regla.modo ?? "AUTOMATICO") === "AUTOMATICO",
    );
    if (primera) primera.valor = 15;
  }
}

function formularioValido() {
  if (!formulario.nombre.trim()) return false;
  if (!formulario.cursosSeleccionados.length) return false;
  if (formulario.precio < 0) return false;
  if (formulario.alcance === "AREA" && !formulario.destinoArea) return false;
  for (const regla of formulario.descuentos) {
    if (regla.activa === false) continue;
    if (regla.valor <= 0) return false;
    if ((regla.modo ?? "AUTOMATICO") === "CODIGO" && !regla.codigo?.trim()) {
      return false;
    }
    if (regla.beneficiario === "NODOS" && !regla.nodoIds.length) return false;
    if (regla.beneficiario === "PERSONAS" && !regla.usuarioIds.length) {
      return false;
    }
  }
  return true;
}

async function guardar() {
  if (!formularioValido()) return;
  guardando.value = true;
  error.value = "";
  try {
    const legado = reglasALegacyDescuento(formulario.descuentos);
    const precioConDto = precioConDescuento.value;
    const datos = {
      nombre: formulario.nombre.trim(),
      descripcion: formulario.descripcion.trim(),
      imagen: formulario.imagen.trim() || IMAGEN_FALLBACK,
      cursos: formulario.cursosSeleccionados.length,
      cursosSeleccionados: formulario.cursosSeleccionados.map((item, i) => ({
        ...item,
        orden: i + 1,
      })),
      usuarios: formulario.usuarios,
      certificado: formulario.certificado,
      gratuito: precioConDto <= 0 && legado.descuentoAplicaA !== "NINGUNO",
      precio: formulario.precio,
      moneda: "PEN" as const,
      alcance: formulario.alcance,
      destinoArea:
        formulario.alcance === "AREA" ? formulario.destinoArea : null,
      descuentoInterno: legado.descuentoInterno,
      descuentoAplicaA: legado.descuentoAplicaA,
      descuentoArea: legado.descuentoArea,
      politicaDescuentos: formulario.politicaDescuentos,
      descuentos: formulario.descuentos.map((regla) => ({ ...regla })),
      estado: formulario.estado,
    };
    if (editandoId.value) {
      await organizacionService.rutas.actualizar(editandoId.value, datos);
      mensaje.value = "Ruta actualizada.";
    } else {
      await organizacionService.rutas.crear({
        id: `ruta-${Date.now()}`,
        ...datos,
        progreso: 0,
      });
      mensaje.value =
        formulario.estado === "PUBLICADA"
          ? "Ruta creada y publicada."
          : "Ruta creada como borrador.";
    }
    modal.value = false;
    await cargar();
    setTimeout(() => {
      mensaje.value = "";
    }, 2800);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo guardar la ruta.";
  } finally {
    guardando.value = false;
  }
}

async function publicar(ruta: RutaOrganizacion) {
  await organizacionService.rutas.actualizar(ruta.id, { estado: "PUBLICADA" });
  mensaje.value = `“${ruta.nombre}” publicada.`;
  await cargar();
  setTimeout(() => {
    mensaje.value = "";
  }, 2500);
}

async function archivar(ruta: RutaOrganizacion) {
  if (!window.confirm(`¿Archivar la ruta “${ruta.nombre}”?`)) return;
  await organizacionService.rutas.actualizar(ruta.id, { estado: "ARCHIVADA" });
  mensaje.value = `“${ruta.nombre}” archivada.`;
  await cargar();
  setTimeout(() => {
    mensaje.value = "";
  }, 2500);
}

async function eliminar(ruta: RutaOrganizacion) {
  if (!window.confirm(`¿Eliminar permanentemente “${ruta.nombre}”?`)) return;
  await organizacionService.rutas.eliminar(ruta.id);
  mensaje.value = `Se eliminó “${ruta.nombre}”.`;
  await cargar();
  setTimeout(() => {
    mensaje.value = "";
  }, 2500);
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <TituloConAyuda
        eyebrow="Oferta formativa"
        titulo="Rutas de aprendizaje"
        clase-titulo="text-2xl font-black"
        ayuda="Agrupa cursos aprobados en itinerarios ordenados, define alcance, precio y descuentos como en el catálogo."
      />
      <Button @click="abrir()">
        <Plus class="h-4 w-4" />
        Crear ruta
      </Button>
    </header>

    <div
      v-if="mensaje"
      class="border border-emerald-500/30 border-l-4 border-l-emerald-600 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
    >
      {{ mensaje }}
    </div>
    <div
      v-if="error"
      class="border border-red-500/30 border-l-4 border-l-red-600 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
    >
      {{ error }}
    </div>

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-24 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="item in indicadores"
        :key="item.etiqueta"
        class="overflow-hidden border-border bg-card"
        :class="
          item.acento === 'accent'
            ? 'border-t-4 border-t-accent'
            : 'border-t-4 border-t-primary'
        "
      >
        <CardContent class="flex items-center gap-4 p-5">
          <div
            class="grid h-11 w-11 place-items-center"
            :class="
              item.acento === 'accent'
                ? 'bg-accent/20 text-[#B87A00] dark:text-accent'
                : 'bg-primary/10 text-primary'
            "
          >
            <component :is="item.icono" class="h-5 w-5" />
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
        v-for="chip in chipsEstado"
        :key="chip.valor"
        size="sm"
        :variant="estadoFiltro === chip.valor ? 'default' : 'outline'"
        @click="estadoFiltro = chip.valor"
      >
        {{ chip.etiqueta }}
      </Button>
    </div>

    <section
      class="overflow-hidden border border-border border-t-4 border-t-accent bg-card"
      aria-labelledby="titulo-filtros-rutas"
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
            <h2 id="titulo-filtros-rutas" class="text-sm font-black">Filtros</h2>
            <p class="text-xs text-muted-foreground">
              Busca por nombre, curso, alcance o certificado.
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
              v-model="buscar"
              class="filtro-control w-full pl-10"
              placeholder="Ruta, descripción o curso"
            />
          </span>
        </label>
        <label>
          <span class="filtro-label">Estado</span>
          <Select
            v-model="estadoFiltro"
            class="filtro-control"
            :options="opcionesEstadoFiltro"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>
        <label>
          <span class="filtro-label">Alcance</span>
          <Select
            v-model="alcanceFiltro"
            class="filtro-control"
            :options="opcionesAlcanceFiltro"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>
        <label>
          <span class="filtro-label">Certificado</span>
          <Select
            v-model="certificadoFiltro"
            class="filtro-control"
            :options="opcionesCertificadoFiltro"
            option-label="etiqueta"
            option-value="valor"
            panel-class="tukuy-filtro-panel"
            fluid
          />
        </label>
      </div>
    </section>

    <section aria-labelledby="titulo-resultados-rutas">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-resultados-rutas" class="text-sm font-black">
            Resultados
          </h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Mostrando {{ visibles.length }} de {{ rutas.length }} rutas
          </p>
        </div>
      </div>

      <div
        v-if="cargando"
        class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        aria-busy="true"
      >
        <Skeleton v-for="item in 6" :key="item" class="h-80 w-full" />
      </div>

      <div
        v-else-if="visibles.length"
        class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      >
        <article
          v-for="ruta in visibles"
          :key="ruta.id"
          class="group flex flex-col overflow-hidden border border-border border-t-4 border-t-primary bg-card transition hover:border-primary/40"
        >
          <div class="relative aspect-[16/10] overflow-hidden bg-muted">
            <img
              :src="imagenRuta(ruta)"
              :alt="`Portada de ${ruta.nombre}`"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div
              class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10"
            >
              <div class="flex flex-wrap gap-2">
                <Tag
                  :value="etiquetaEstado(ruta.estado)"
                  :severity="severidadEstado(ruta.estado)"
                />
                <Tag
                  v-if="ruta.certificado"
                  value="Certificable"
                  severity="warn"
                />
              </div>
            </div>
          </div>

          <div class="flex flex-1 flex-col gap-4 p-5">
            <div>
              <h3 class="text-lg font-black leading-snug text-foreground">
                {{ ruta.nombre }}
              </h3>
              <p class="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {{
                  ruta.descripcion ||
                  "Ruta empresarial configurada para el equipo."
                }}
              </p>
            </div>

            <div class="grid gap-1 text-xs text-muted-foreground">
              <span>
                {{ ruta.cursosSeleccionados?.length ?? ruta.cursos }} cursos ·
                <strong class="text-foreground">{{
                  textoPrecioRuta(ruta)
                }}</strong>
              </span>
              <span class="flex items-center gap-1.5">
                <UsersRound class="h-3.5 w-3.5" />
                {{ ruta.usuarios }} participantes · {{ textoAlcance(ruta) }}
              </span>
            </div>

            <ul
              v-if="ruta.cursosSeleccionados?.length"
              class="grid gap-1 border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground"
            >
              <li
                v-for="curso in ruta.cursosSeleccionados
                  .slice()
                  .sort((a, b) => a.orden - b.orden)
                  .slice(0, 3)"
                :key="curso.id"
                class="truncate"
              >
                {{ curso.orden }}. {{ curso.titulo }}
              </li>
              <li v-if="ruta.cursosSeleccionados.length > 3">
                +{{ ruta.cursosSeleccionados.length - 3 }} más
              </li>
            </ul>

            <div>
              <div class="flex justify-between text-[11px]">
                <span class="text-muted-foreground">Progreso general</span>
                <b class="tabular-nums">{{ ruta.progreso }}%</b>
              </div>
              <Progress :model-value="ruta.progreso" class="mt-2 h-1.5" />
            </div>

            <div class="mt-auto grid grid-cols-[1fr_auto_auto_auto] gap-2">
              <Button variant="outline" @click="abrir(ruta)">Editar</Button>
              <Button
                v-if="(ruta.estado ?? 'PUBLICADA') !== 'PUBLICADA'"
                size="icon"
                variant="ghost"
                title="Publicar"
                @click="publicar(ruta)"
              >
                <Send class="h-4 w-4" />
              </Button>
              <Button
                v-if="ruta.estado !== 'ARCHIVADA'"
                size="icon"
                variant="ghost"
                title="Archivar"
                @click="archivar(ruta)"
              >
                <Archive class="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                class="text-red-600"
                title="Eliminar"
                @click="eliminar(ruta)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </article>
      </div>

      <div
        v-else
        class="border border-dashed border-border bg-card px-4 py-14 text-center"
      >
        <Route class="mx-auto h-10 w-10 text-primary" />
        <h3 class="mt-4 text-lg font-black">No hay rutas con estos filtros</h3>
        <p class="mt-2 text-sm text-muted-foreground">
          Crea una ruta o limpia los filtros para ver el catálogo completo.
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <Button v-if="hayFiltros" variant="outline" @click="limpiarFiltros">
            Limpiar filtros
          </Button>
          <Button @click="abrir()">
            <Plus class="h-4 w-4" />
            Crear ruta
          </Button>
        </div>
      </div>
    </section>

    <Dialog
      v-model:visible="modal"
      modal
      :header="editandoId ? 'Editar ruta' : 'Nueva ruta'"
      :style="{ width: 'min(96vw, 44rem)' }"
      :pt="{
        root: { class: 'rounded-none' },
        header: { class: 'rounded-none border-b border-border' },
        content: { class: 'rounded-none' },
        footer: { class: 'rounded-none border-t border-border' },
      }"
    >
      <div class="grid max-h-[70vh] gap-5 overflow-y-auto pr-1">
        <label class="grid gap-2">
          <span class="filtro-label">Nombre</span>
          <InputText
            v-model="formulario.nombre"
            class="filtro-control w-full"
            placeholder="Ej. Liderazgo de obra"
          />
        </label>
        <label class="grid gap-2">
          <span class="filtro-label">Descripción</span>
          <textarea
            v-model="formulario.descripcion"
            class="filtro-control min-h-20 w-full border border-input bg-background px-3 py-2 text-sm"
            placeholder="Objetivo del itinerario para el equipo"
          />
        </label>

        <div class="grid gap-3 border border-border p-4">
          <div class="flex items-center gap-2">
            <ImageIcon class="h-4 w-4 text-primary" />
            <p class="filtro-label mb-0">Imagen de portada</p>
          </div>
          <div class="aspect-[16/9] overflow-hidden border border-border bg-muted">
            <img
              v-if="formulario.imagen"
              :src="formulario.imagen"
              alt="Vista previa de la portada"
              class="h-full w-full object-cover"
            />
            <div
              v-else
              class="grid h-full place-items-center text-xs text-muted-foreground"
            >
              Sin imagen
            </div>
          </div>
          <label class="grid gap-2">
            <span class="filtro-label">URL de la imagen</span>
            <InputText
              v-model="formulario.imagen"
              class="filtro-control w-full"
              placeholder="https://…"
            />
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(url, indice) in IMAGENES_RUTA"
              :key="url"
              type="button"
              class="h-12 w-16 overflow-hidden border border-border transition hover:border-primary"
              :class="
                formulario.imagen === url
                  ? 'border-primary ring-2 ring-primary/30'
                  : ''
              "
              :title="`Portada ${indice + 1}`"
              @click="formulario.imagen = url"
            >
              <img
                :src="url"
                alt=""
                class="h-full w-full object-cover"
              />
            </button>
          </div>
        </div>

        <div class="grid gap-3 border border-border border-l-4 border-l-primary p-4">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p class="filtro-label mb-0">Cursos de la ruta</p>
              <p class="text-xs text-muted-foreground">
                Solo cursos aprobados o publicados. Ordena la secuencia.
              </p>
            </div>
            <Tag
              :value="`${formulario.cursosSeleccionados.length} seleccionados`"
              severity="info"
            />
          </div>

          <div v-if="formulario.cursosSeleccionados.length" class="grid gap-2">
            <div
              v-for="(curso, indice) in formulario.cursosSeleccionados"
              :key="curso.id"
              class="flex items-center gap-2 border border-border bg-card p-2"
            >
              <span
                class="grid h-7 w-7 shrink-0 place-items-center bg-primary text-xs font-black text-primary-foreground"
              >
                {{ curso.orden }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold">{{ curso.titulo }}</p>
                <p class="truncate text-[11px] text-muted-foreground">
                  {{ curso.docente || "Docente" }}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                :disabled="indice === 0"
                @click="moverCurso(indice, -1)"
              >
                <ChevronUp class="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                :disabled="indice === formulario.cursosSeleccionados.length - 1"
                @click="moverCurso(indice, 1)"
              >
                <ChevronDown class="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                class="text-red-600"
                @click="quitarCurso(curso.id)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p
            v-else
            class="border border-dashed border-border p-3 text-xs text-muted-foreground"
          >
            Aún no agregaste cursos. Selecciónalos abajo.
          </p>

          <label class="grid gap-2">
            <span class="filtro-label">Buscar en catálogo</span>
            <InputText
              v-model="busquedaCursos"
              class="filtro-control w-full"
              placeholder="Título, docente o categoría"
            />
          </label>
          <div class="max-h-40 overflow-y-auto border border-border">
            <button
              v-for="curso in cursosFiltrados"
              :key="curso.id"
              type="button"
              class="flex w-full items-start justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
              @click="agregarCurso(curso)"
            >
              <span>
                <span class="block text-sm font-bold">{{ curso.titulo }}</span>
                <span class="block text-[11px] text-muted-foreground">
                  {{ curso.docente }} ·
                  {{
                    (curso.precio ?? 0) <= 0
                      ? "Sin precio"
                      : `S/ ${(curso.precio ?? 0).toFixed(2)}`
                  }}
                </span>
              </span>
              <Plus class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            </button>
            <p
              v-if="!cursosFiltrados.length"
              class="p-3 text-xs text-muted-foreground"
            >
              No hay más cursos disponibles para agregar.
            </p>
          </div>
        </div>

        <div class="grid gap-3 border border-border p-4">
          <p class="filtro-label mb-0">Precio de la ruta</p>
          <p class="text-xs text-muted-foreground">
            Suma referencial de cursos:
            <strong class="text-foreground">
              {{
                sumaPreciosCursos <= 0
                  ? "S/ 0.00"
                  : `S/ ${sumaPreciosCursos.toFixed(2)}`
              }}
            </strong>
          </p>
          <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label class="grid gap-2">
              <span class="filtro-label">Precio base (S/)</span>
              <InputNumber
                v-model="formulario.precio"
                class="filtro-control w-full"
                :min="0"
                :max-fraction-digits="2"
                mode="currency"
                currency="PEN"
                locale="es-PE"
                fluid
              />
            </label>
            <Button
              variant="outline"
              class="self-end"
              :disabled="sumaPreciosCursos <= 0"
              @click="usarSugerido"
            >
              Sugerir −15%
            </Button>
          </div>
        </div>

        <div class="grid gap-3 border border-border p-4 sm:grid-cols-2">
          <label class="grid gap-2 sm:col-span-2">
            <span class="filtro-label">Alcance</span>
            <Select
              v-model="formulario.alcance"
              class="filtro-control w-full"
              :options="opcionesAlcance"
              option-label="label"
              option-value="value"
              panel-class="tukuy-filtro-panel"
              fluid
            />
          </label>
          <label
            v-if="formulario.alcance === 'AREA'"
            class="grid gap-2 sm:col-span-2"
          >
            <span class="filtro-label">Nodo con acceso</span>
            <Select
              v-model="formulario.destinoArea"
              class="filtro-control w-full"
              :options="nodosInternos"
              option-label="label"
              option-value="value"
              panel-class="tukuy-filtro-panel"
              fluid
            />
          </label>
        </div>

        <EditorDescuentosComerciales
          v-model:descuentos="formulario.descuentos"
          v-model:politica="formulario.politicaDescuentos"
          :precio-base="formulario.precio"
          :nodos="nodosInternos"
          :nodo-ids-alcance="nodoIdsAlcanceForm"
        />

        <div class="grid gap-4 sm:grid-cols-3">
          <label class="grid gap-2">
            <span class="filtro-label">Participantes</span>
            <InputNumber
              v-model="formulario.usuarios"
              class="filtro-control w-full"
              :min="0"
              fluid
            />
          </label>
          <label class="grid gap-2">
            <span class="filtro-label">Estado</span>
            <Select
              v-model="formulario.estado"
              class="filtro-control w-full"
              :options="opcionesEstadoForm"
              option-label="label"
              option-value="value"
              panel-class="tukuy-filtro-panel"
              fluid
            />
          </label>
          <label
            class="flex items-center justify-between gap-3 border border-border px-3 py-2 text-sm font-bold"
          >
            Certificado
            <ToggleSwitch v-model="formulario.certificado" />
          </label>
        </div>
      </div>
      <template #footer>
        <Button variant="outline" @click="modal = false">Cancelar</Button>
        <Button
          :disabled="guardando || !formularioValido()"
          @click="guardar"
        >
          {{ guardando ? "Guardando…" : "Guardar ruta" }}
        </Button>
      </template>
    </Dialog>
  </section>
</template>
