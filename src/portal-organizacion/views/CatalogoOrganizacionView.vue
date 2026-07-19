<script setup lang="ts">
import {
  BookOpen,
  Check,
  CircleUserRound,
  Clock3,
  MessageSquareWarning,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-vue-next";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";

import {
  calcularPrecioConDescuento,
  calcularPrecioParaComprador,
  etiquetaAlcanceCorto,
  etiquetaDescuentoAplicaA,
  organizacionService,
  type AlcanceCursoOrganizacion,
  type AsignacionOrganizacion,
  type DestinatarioDescuento,
  type PropuestaCursoOrganizacion,
} from "@/api/services/organizacion.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useContextoSesion } from "@/composables/useContextoSesion";

type Pestaña = "REVISION" | "CATALOGO";
type ModoModal = "APROBAR" | "REASIGNAR";

const router = useRouter();
const { tienePermiso } = useContextoSesion();

function crearCursoInstitucional() {
  void router.push({
    path: "/organizacion/cursos/nuevo",
    query: { borrador: `curso-institucional-${Date.now()}` },
  });
}

const buscar = ref("");
const pestana = ref<Pestaña>("REVISION");
const cargando = ref(true);
const procesando = ref(false);
const propuestas = ref<PropuestaCursoOrganizacion[]>([]);
const asignaciones = ref<AsignacionOrganizacion[]>([]);
const areasInternas = ref<
  Array<{ label: string; value: string; usuarios: number }>
>([]);
const mensaje = ref("");
const modalConfigurar = ref(false);
const modalObservar = ref(false);
const modoModal = ref<ModoModal>("APROBAR");
const cursoSeleccionado = ref<PropuestaCursoOrganizacion | null>(null);
const observacion = ref("");
const totalColaboradores = ref(0);

const formulario = reactive({
  precio: 0,
  alcance: "TODOS" as AlcanceCursoOrganizacion,
  destinoArea: "",
  descuentoAplicaA: "NINGUNO" as DestinatarioDescuento,
  descuentoArea: "",
  descuentoInterno: 0,
  obligatorio: false,
  vence: "",
});

const precioConDescuento = computed(() =>
  calcularPrecioConDescuento(
    formulario.precio,
    formulario.descuentoInterno,
    formulario.descuentoAplicaA,
  ),
);

const precioExternoReferencia = computed(() =>
  calcularPrecioParaComprador(
    formulario.precio,
    formulario.descuentoInterno,
    formulario.descuentoAplicaA,
    formulario.descuentoArea,
    "EXTERNO",
  ),
);

const opcionesAlcance = [
  { label: "Todo el público", value: "TODOS" as const },
  { label: "Toda la organización", value: "ORGANIZACION" as const },
  { label: "Solo un área", value: "AREA" as const },
  { label: "Público externo", value: "EXTERNO" as const },
];

const opcionesDescuento = [
  { label: "Sin descuento", value: "NINGUNO" as const },
  { label: "Todos los colaboradores", value: "ORGANIZACION" as const },
  { label: "Solo un área", value: "AREA" as const },
  { label: "Público externo", value: "EXTERNO" as const },
];

const cursosAsignados = computed(
  () =>
    new Set(
      asignaciones.value
        .filter((item) => item.estado !== "CANCELADA")
        .map((item) => item.curso),
    ),
);

const filtradas = computed(() => {
  const termino = buscar.value.trim().toLowerCase();
  return propuestas.value.filter((curso) => {
    if (
      termino &&
      ![curso.titulo, curso.docente, curso.categoria].some((valor) =>
        valor.toLowerCase().includes(termino),
      )
    ) {
      return false;
    }
    if (pestana.value === "REVISION") {
      return curso.estado === "EN_REVISION" || curso.estado === "OBSERVADO";
    }
    return curso.estado === "APROBADO" || curso.estado === "PUBLICADO";
  });
});

const pendientesRevision = computed(
  () =>
    propuestas.value.filter((curso) => curso.estado === "EN_REVISION").length,
);

const tituloModal = computed(() =>
  modoModal.value === "APROBAR"
    ? "Aprobar curso"
    : "Precio y destino del curso",
);

watch(
  () => formulario.alcance,
  (alcance) => {
    if (alcance !== "AREA") {
      formulario.destinoArea = "";
    } else if (!formulario.destinoArea && areasInternas.value[0]) {
      formulario.destinoArea = areasInternas.value[0].value;
    }
  },
);

watch(
  () => formulario.descuentoAplicaA,
  (aplicaA) => {
    if (aplicaA === "NINGUNO") {
      formulario.descuentoInterno = 0;
      formulario.descuentoArea = "";
    } else if (aplicaA === "AREA" && !formulario.descuentoArea) {
      formulario.descuentoArea =
        formulario.destinoArea || areasInternas.value[0]?.value || "";
    }
  },
);

onMounted(async () => {
  try {
    await Promise.all([recargarPropuestas(), recargarAsignaciones()]);
    const [listaAreas, usuarios] = await Promise.all([
      organizacionService.areas.listar(),
      organizacionService.usuarios.listar(),
    ]);
    totalColaboradores.value = usuarios.length;
    areasInternas.value = listaAreas.map((area) => ({
      label: `Área ${area.nombre}`,
      value: area.nombre,
      usuarios: area.usuarios,
    }));
  } finally {
    cargando.value = false;
  }
});

async function recargarPropuestas() {
  propuestas.value = await organizacionService.catalogoCursos.listar();
}

async function recargarAsignaciones() {
  asignaciones.value = await organizacionService.asignaciones.listar();
}

function estaAsignado(titulo: string) {
  return cursosAsignados.value.has(titulo);
}

function claseEstado(estado: PropuestaCursoOrganizacion["estado"]) {
  if (estado === "PUBLICADO") return "border-transparent bg-emerald-600 text-white";
  if (estado === "APROBADO") return "border-transparent bg-sky-600 text-white";
  if (estado === "OBSERVADO") return "border-transparent bg-orange-500 text-white";
  return "border-transparent bg-amber-500 text-slate-950";
}

function etiquetaEstado(estado: PropuestaCursoOrganizacion["estado"]) {
  return {
    EN_REVISION: "Por revisar",
    APROBADO: "Aprobado",
    OBSERVADO: "Observado",
    PUBLICADO: "Publicado",
  }[estado];
}

function textoPrecio(curso: PropuestaCursoOrganizacion) {
  const aplicaA = curso.descuentoAplicaA ?? "NINGUNO";
  const dto = curso.descuentoInterno ?? 0;
  const conDto = calcularPrecioConDescuento(curso.precio ?? 0, dto, aplicaA);
  const base = curso.precio ?? 0;
  if (aplicaA === "NINGUNO" || dto <= 0) {
    return base <= 0 ? "Gratuito" : `S/ ${base.toFixed(2)}`;
  }
  if (conDto <= 0) {
    return `Gratis · ${etiquetaDescuentoAplicaA(aplicaA, curso.descuentoArea)}`;
  }
  return `S/ ${conDto.toFixed(2)} · ${etiquetaDescuentoAplicaA(aplicaA, curso.descuentoArea)} (-${dto}%)`;
}

function textoAlcance(curso: PropuestaCursoOrganizacion) {
  if (!curso.alcance) return "Pendiente de definir";
  if (curso.alcance === "AREA") {
    return `Solo área ${curso.destinoArea ?? "interna"}`;
  }
  return etiquetaAlcanceCorto(curso.alcance);
}

function etiquetaDestino(curso: PropuestaCursoOrganizacion) {
  if (curso.estado === "EN_REVISION" || curso.estado === "OBSERVADO") {
    return null;
  }
  if (curso.alcance === "AREA" && curso.destinoArea) {
    return `Área ${curso.destinoArea}`;
  }
  return etiquetaAlcanceCorto(curso.alcance);
}

function abrirConfiguracion(curso: PropuestaCursoOrganizacion, modo: ModoModal) {
  cursoSeleccionado.value = curso;
  modoModal.value = modo;
  formulario.precio = Math.max(curso.precio ?? 0, 0) || 100;
  formulario.alcance = curso.alcance ?? "TODOS";
  formulario.destinoArea =
    curso.destinoArea ?? areasInternas.value[0]?.value ?? "";
  formulario.descuentoAplicaA = curso.descuentoAplicaA ?? "NINGUNO";
  formulario.descuentoArea =
    curso.descuentoArea ??
    curso.destinoArea ??
    areasInternas.value[0]?.value ??
    "";
  formulario.descuentoInterno = curso.descuentoInterno ?? 0;
  formulario.obligatorio = false;
  formulario.vence = "";
  modalConfigurar.value = true;
}

function abrirAprobar(curso: PropuestaCursoOrganizacion) {
  abrirConfiguracion(curso, "APROBAR");
}

function abrirReasignar(curso: PropuestaCursoOrganizacion) {
  abrirConfiguracion(curso, "REASIGNAR");
}

function abrirObservacion(curso: PropuestaCursoOrganizacion) {
  cursoSeleccionado.value = curso;
  observacion.value = "";
  modalObservar.value = true;
}

function configuracionValida() {
  if (formulario.precio < 0) return false;
  if (formulario.alcance === "AREA" && !formulario.destinoArea) return false;
  if (
    formulario.descuentoAplicaA !== "NINGUNO" &&
    formulario.descuentoInterno <= 0
  ) {
    return false;
  }
  if (
    formulario.descuentoAplicaA === "AREA" &&
    !formulario.descuentoArea
  ) {
    return false;
  }
  return true;
}

async function confirmarConfiguracion() {
  if (!cursoSeleccionado.value || !configuracionValida()) return;
  const curso = cursoSeleccionado.value;
  const area = areasInternas.value.find(
    (item) => item.value === formulario.destinoArea,
  );
  const destinoLabel =
    formulario.alcance === "AREA"
      ? (area?.label ?? `Área ${formulario.destinoArea}`)
      : etiquetaAlcanceCorto(formulario.alcance);
  const asignados =
    formulario.alcance === "AREA"
      ? (area?.usuarios ?? 0)
      : formulario.alcance === "ORGANIZACION" || formulario.alcance === "TODOS"
        ? totalColaboradores.value
        : 0;

  procesando.value = true;
  try {
    const payload = {
      precio: formulario.precio,
      moneda: "PEN" as const,
      alcance: formulario.alcance,
      destinoArea:
        formulario.alcance === "AREA" ? formulario.destinoArea : null,
      descuentoInterno:
        formulario.descuentoAplicaA === "NINGUNO"
          ? 0
          : formulario.descuentoInterno,
      descuentoAplicaA: formulario.descuentoAplicaA,
      descuentoArea:
        formulario.descuentoAplicaA === "AREA"
          ? formulario.descuentoArea
          : null,
      obligatorio: formulario.obligatorio,
      vence: formulario.vence,
      publicar: true,
    };

    if (modoModal.value === "APROBAR") {
      await organizacionService.catalogoCursos.aprobar(curso.id, payload);
    } else {
      await organizacionService.catalogoCursos.publicar(curso.id, payload);
    }

    const activas = asignaciones.value.filter(
      (item) => item.curso === curso.titulo && item.estado !== "CANCELADA",
    );
    await Promise.all(
      activas.map((item) =>
        organizacionService.asignaciones.actualizar(item.id, {
          estado: "CANCELADA",
        }),
      ),
    );

    await organizacionService.asignaciones.crear({
      id: `asig-${Date.now()}`,
      curso: curso.titulo,
      destino: destinoLabel,
      asignados,
      completados: 0,
      vence: formulario.vence
        ? new Intl.DateTimeFormat("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${formulario.vence}T00:00:00Z`))
        : "Sin fecha límite",
      obligatorio: formulario.obligatorio,
      estado: "ACTIVA",
      creadaEn: new Date().toISOString().slice(0, 10),
    });

    await Promise.all([recargarPropuestas(), recargarAsignaciones()]);
    modalConfigurar.value = false;
    pestana.value = "CATALOGO";
    const resumenDto =
      payload.descuentoAplicaA === "NINGUNO"
        ? `S/ ${payload.precio.toFixed(2)}`
        : `${textoPrecio({
            ...curso,
            precio: payload.precio,
            descuentoInterno: payload.descuentoInterno,
            descuentoAplicaA: payload.descuentoAplicaA,
            descuentoArea: payload.descuentoArea,
          })}`;
    mensaje.value = `“${curso.titulo}” publicado · ${resumenDto} · ${destinoLabel}.`;
  } finally {
    procesando.value = false;
  }
}

async function confirmarObservacion() {
  if (!cursoSeleccionado.value || !observacion.value.trim()) return;
  procesando.value = true;
  try {
    await organizacionService.catalogoCursos.observar(
      cursoSeleccionado.value.id,
      observacion.value.trim(),
    );
    await recargarPropuestas();
    mensaje.value = `Se enviaron observaciones a ${cursoSeleccionado.value.docente}.`;
    modalObservar.value = false;
  } finally {
    procesando.value = false;
  }
}

async function quitarAsignacion(titulo: string) {
  procesando.value = true;
  try {
    const activas = asignaciones.value.filter(
      (item) => item.curso === titulo && item.estado !== "CANCELADA",
    );
    await Promise.all(
      activas.map((item) =>
        organizacionService.asignaciones.actualizar(item.id, {
          estado: "CANCELADA",
        }),
      ),
    );
    await recargarAsignaciones();
    mensaje.value = `Se quitó la asignación de “${titulo}”.`;
  } finally {
    procesando.value = false;
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black">Catálogo empresarial</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Primero defines quién puede acceder; luego a quién le das descuento
          (colaboradores, un área o externos).
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Badge
          v-if="pendientesRevision"
          class="border-transparent bg-amber-500 text-slate-950"
        >
          {{ pendientesRevision }} por revisar
        </Badge>
        <Button v-if="tienePermiso('cursos.crear')" @click="crearCursoInstitucional">
          <Plus class="h-4 w-4" />Crear curso institucional
        </Button>
      </div>
    </div>

    <Card class="border-border bg-card">
      <CardContent class="flex flex-wrap gap-3 p-4">
        <div class="relative min-w-64 flex-1">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="buscar"
            class="pl-10"
            placeholder="Buscar por curso, docente o categoría..."
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            :variant="pestana === 'REVISION' ? 'default' : 'outline'"
            @click="pestana = 'REVISION'"
          >
            <Clock3 class="h-4 w-4" />
            Por revisar
            <span
              v-if="pendientesRevision"
              class="rounded-sm bg-white/20 px-1.5 text-[10px] font-black"
            >
              {{ pendientesRevision }}
            </span>
          </Button>
          <Button
            size="sm"
            :variant="pestana === 'CATALOGO' ? 'default' : 'outline'"
            @click="pestana = 'CATALOGO'"
          >
            <BookOpen class="h-4 w-4" />
            Aprobados / publicados
          </Button>
        </div>
      </CardContent>
    </Card>

    <p
      v-if="mensaje"
      class="border-l-4 border-l-emerald-600 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
    >
      {{ mensaje }}
    </p>

    <div v-if="cargando" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Skeleton v-for="item in 6" :key="item" class="h-80 w-full" />
    </div>

    <div
      v-else-if="!filtradas.length"
      class="border border-dashed border-border bg-muted/30 px-6 py-16 text-center"
    >
      <p class="text-sm font-semibold text-muted-foreground">
        {{
          pestana === "REVISION"
            ? "No hay propuestas pendientes de revisión."
            : "Aún no hay cursos aprobados en el catálogo."
        }}
      </p>
    </div>

    <div v-else class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Card
        v-for="curso in filtradas"
        :key="curso.id"
        class="overflow-hidden border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div class="relative h-40">
          <img
            :src="curso.imagen"
            :alt="curso.titulo"
            class="h-full w-full object-cover"
          />
          <Badge
            class="absolute left-3 top-3 font-bold shadow-md"
            :class="claseEstado(curso.estado)"
          >
            {{ etiquetaEstado(curso.estado) }}
          </Badge>
        </div>
        <CardContent class="p-5">
          <Badge
            v-if="etiquetaDestino(curso)"
            class="bg-primary/10 text-primary"
          >
            {{ etiquetaDestino(curso) }}
          </Badge>
          <Badge
            v-else-if="curso.estado === 'EN_REVISION' || curso.estado === 'OBSERVADO'"
            class="bg-muted text-muted-foreground"
          >
            Sin destino asignado
          </Badge>
          <h2 class="mt-3 min-h-12 font-black">{{ curso.titulo }}</h2>
          <p
            class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
          >
            <CircleUserRound class="h-3.5 w-3.5 shrink-0 text-primary" />
            Propuesto por
            <span class="text-foreground">{{ curso.docente }}</span>
          </p>
          <p
            v-if="curso.origenCarga === 'ADMINISTRACION' && curso.cargadoPor"
            class="mt-1 text-xs text-muted-foreground"
          >
            Material cargado por <strong class="text-foreground">{{ curso.cargadoPor }}</strong>
          </p>
          <div class="mt-3 grid gap-1 text-xs text-muted-foreground">
            <span>{{ curso.lecciones }} lecciones · {{ curso.duracion }}</span>
            <span v-if="curso.estado !== 'EN_REVISION'">
              Precio: <strong class="text-foreground">{{ textoPrecio(curso) }}</strong>
            </span>
            <span v-if="curso.estado !== 'EN_REVISION'">
              Alcance: <strong class="text-foreground">{{ textoAlcance(curso) }}</strong>
            </span>
          </div>
          <p
            v-if="curso.estado === 'OBSERVADO' && curso.observacion"
            class="mt-3 border border-orange-500/30 bg-orange-500/10 p-2 text-xs text-orange-700 dark:text-orange-300"
          >
            Observación: {{ curso.observacion }}
          </p>

          <div class="mt-5 grid gap-2">
            <template v-if="pestana === 'REVISION'">
              <Button
                class="w-full"
                :disabled="procesando"
                @click="abrirAprobar(curso)"
              >
                <Check class="h-4 w-4" />
                Aprobar · precio y destino
              </Button>
              <Button
                variant="outline"
                class="w-full"
                :disabled="procesando"
                @click="abrirObservacion(curso)"
              >
                <MessageSquareWarning class="h-4 w-4" />
                Observar
              </Button>
            </template>
            <template v-else>
              <Button
                class="w-full"
                :variant="estaAsignado(curso.titulo) ? 'outline' : 'default'"
                :disabled="procesando"
                @click="abrirReasignar(curso)"
              >
                <UsersRound class="h-4 w-4" />
                {{
                  estaAsignado(curso.titulo)
                    ? "Editar precio / destino"
                    : "Definir precio / destino"
                }}
              </Button>
              <Button
                v-if="estaAsignado(curso.titulo)"
                variant="outline"
                class="w-full text-red-600"
                :disabled="procesando"
                @click="quitarAsignacion(curso.titulo)"
              >
                <Trash2 class="h-4 w-4" />
                Quitar asignación
              </Button>
            </template>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog
      v-model:visible="modalConfigurar"
      modal
      :header="tituloModal"
      :style="{ width: 'min(92vw, 560px)' }"
    >
      <div class="grid gap-4">
        <p v-if="cursoSeleccionado" class="text-sm text-muted-foreground">
          <strong class="text-foreground">{{ cursoSeleccionado.titulo }}</strong>
          · docente {{ cursoSeleccionado.docente }}
        </p>

        <div class="grid gap-3 border border-border p-3">
          <p class="text-sm font-black">Precio base</p>
          <label class="grid gap-2 text-sm font-bold">
            Precio (S/)
            <InputNumber
              v-model="formulario.precio"
              :min="0"
              :max-fraction-digits="2"
              mode="currency"
              currency="PEN"
              locale="es-PE"
              fluid
            />
          </label>
        </div>

        <div class="grid gap-3 border border-border p-3">
          <p class="text-sm font-black">1. ¿Quién puede acceder?</p>
          <label class="grid gap-2 text-sm font-bold">
            Alcance
            <Select
              v-model="formulario.alcance"
              :options="opcionesAlcance"
              option-label="label"
              option-value="value"
              fluid
            />
          </label>
          <label
            v-if="formulario.alcance === 'AREA'"
            class="grid gap-2 text-sm font-bold"
          >
            Área con acceso
            <Select
              v-model="formulario.destinoArea"
              :options="areasInternas"
              option-label="label"
              option-value="value"
              fluid
            />
          </label>
          <p class="text-xs text-muted-foreground">
            Define quién puede tomar el curso. “Todo el público” incluye
            colaboradores y externos.
          </p>
        </div>

        <div class="grid gap-3 border border-border p-3">
          <p class="text-sm font-black">2. ¿A quién le das descuento?</p>
          <label class="grid gap-2 text-sm font-bold">
            Beneficiarios del descuento
            <Select
              v-model="formulario.descuentoAplicaA"
              :options="opcionesDescuento"
              option-label="label"
              option-value="value"
              fluid
            />
          </label>
          <label
            v-if="formulario.descuentoAplicaA === 'AREA'"
            class="grid gap-2 text-sm font-bold"
          >
            Área con descuento
            <Select
              v-model="formulario.descuentoArea"
              :options="areasInternas"
              option-label="label"
              option-value="value"
              fluid
            />
          </label>
          <label
            v-if="formulario.descuentoAplicaA !== 'NINGUNO'"
            class="grid gap-2 text-sm font-bold"
          >
            Descuento (%)
            <InputNumber
              v-model="formulario.descuentoInterno"
              :min="1"
              :max="100"
              suffix="%"
              fluid
            />
          </label>
          <div
            v-if="formulario.descuentoAplicaA !== 'NINGUNO' && formulario.descuentoInterno > 0"
            class="grid gap-1 border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs"
          >
            <p class="font-semibold text-emerald-700 dark:text-emerald-300">
              {{
                etiquetaDescuentoAplicaA(
                  formulario.descuentoAplicaA,
                  formulario.descuentoArea,
                )
              }}:
              S/ {{ precioConDescuento.toFixed(2) }}
            </p>
            <p
              v-if="formulario.descuentoAplicaA !== 'EXTERNO'"
              class="text-muted-foreground"
            >
              Externos (sin ese descuento): S/
              {{ precioExternoReferencia.toFixed(2) }}
            </p>
          </div>
          <p class="text-xs text-muted-foreground">
            Ejemplo: acceso para todo el público, pero descuento solo a
            colaboradores o a un área. Los demás pagan el precio base.
          </p>
        </div>

        <label class="grid gap-2 text-sm font-bold">
          Fecha límite (opcional)
          <input
            v-model="formulario.vence"
            type="date"
            class="h-10 border border-input bg-background px-3 font-normal"
          />
        </label>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalConfigurar = false">
          Cancelar
        </Button>
        <Button
          :disabled="procesando || !configuracionValida()"
          @click="confirmarConfiguracion"
        >
          {{
            modoModal === "APROBAR"
              ? "Aprobar y publicar"
              : "Guardar precio y destino"
          }}
        </Button>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="modalObservar"
      modal
      header="Observar propuesta"
      :style="{ width: 'min(92vw, 520px)' }"
    >
      <div class="grid gap-4">
        <p v-if="cursoSeleccionado" class="text-sm text-muted-foreground">
          Se devolverá a
          <strong class="text-foreground">{{ cursoSeleccionado.docente }}</strong>
          para correcciones.
        </p>
        <label class="grid gap-2 text-sm font-bold">
          Comentario
          <Textarea
            v-model="observacion"
            rows="4"
            placeholder="Indica qué debe corregir o completar el docente..."
            class="w-full"
          />
        </label>
      </div>
      <template #footer>
        <Button variant="outline" @click="modalObservar = false">Cancelar</Button>
        <Button
          :disabled="procesando || !observacion.trim()"
          @click="confirmarObservacion"
        >
          Enviar observación
        </Button>
      </template>
    </Dialog>
  </section>
</template>
