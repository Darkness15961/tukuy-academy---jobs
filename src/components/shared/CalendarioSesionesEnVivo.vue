<script setup lang="ts">
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Link2,
  Plus,
  Search,
  UsersRound,
  Video,
  X,
} from "lucide-vue-next";
import Skeleton from "primevue/skeleton";
import { computed, ref, watch } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import IconoAyuda from "@/components/shared/IconoAyuda.vue";
import type {
  EstadoSesionEnVivo,
  SesionEnVivoOrganizacion,
} from "@/portal-organizacion/types/sesiones-en-vivo.types";

export type CursoCalendarioOpcion = { id: string; titulo: string };

const props = withDefaults(
  defineProps<{
    titulo?: string;
    /** Texto del tooltip de ayuda (icono ?). */
    descripcion?: string;
    cargando?: boolean;
    sesiones: SesionEnVivoOrganizacion[];
    cursos: CursoCalendarioOpcion[];
    puedeProgramar?: boolean;
    cursoInicial?: string;
    /** Compensa el padding del layout (docente/organización). En portal alumno: false. */
    sangrado?: boolean;
  }>(),
  {
    titulo: "Calendario de sesiones",
    descripcion:
      "Solo clases en vivo (Meet). El contenido virtual asíncrono no aparece en este calendario.",
    cargando: false,
    puedeProgramar: false,
    cursoInicial: "TODOS",
    sangrado: true,
  },
);

const emit = defineEmits<{
  programar: [cursoId: string];
  detalle: [sesion: SesionEnVivoOrganizacion];
  unirse: [sesion: SesionEnVivoOrganizacion];
}>();

const mesVisible = ref(new Date());
const diaSeleccionado = ref(claveDia(new Date()));
const cursoFiltro = ref(props.cursoInicial || "TODOS");
const estadoFiltro = ref<"TODOS" | EstadoSesionEnVivo>("TODOS");
const busqueda = ref("");

watch(
  () => props.cursoInicial,
  (valor) => {
    if (valor) cursoFiltro.value = valor;
  },
);

function claveDia(fecha: Date) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseClave(clave: string) {
  const [y, m, d] = clave.split("-").map(Number);
  return new Date(y!, m! - 1, d);
}

const etiquetaMes = computed(() =>
  new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
  }).format(mesVisible.value),
);

const sesionesFiltradas = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  return props.sesiones.filter((sesion) => {
    if (cursoFiltro.value !== "TODOS" && sesion.cursoId !== cursoFiltro.value) {
      return false;
    }
    if (estadoFiltro.value !== "TODOS" && sesion.estado !== estadoFiltro.value) {
      return false;
    }
    if (!termino) return true;
    return (
      sesion.titulo.toLowerCase().includes(termino) ||
      sesion.cursoTitulo.toLowerCase().includes(termino) ||
      sesion.docenteNombre.toLowerCase().includes(termino)
    );
  });
});

function sesionesDelDia(clave: string) {
  return sesionesFiltradas.value.filter(
    (sesion) => claveDia(new Date(sesion.fechaHoraInicio)) === clave,
  );
}

const celdas = computed(() => {
  const anio = mesVisible.value.getFullYear();
  const mes = mesVisible.value.getMonth();
  const primero = new Date(anio, mes, 1);
  const inicio = (primero.getDay() + 6) % 7;
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const lista: Array<{
    clave: string;
    dia: number;
    fuera: boolean;
    sesiones: SesionEnVivoOrganizacion[];
  }> = [];

  for (let i = 0; i < inicio; i++) {
    const fecha = new Date(anio, mes, -inicio + i + 1);
    const clave = claveDia(fecha);
    lista.push({
      clave,
      dia: fecha.getDate(),
      fuera: true,
      sesiones: sesionesDelDia(clave),
    });
  }
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const clave = claveDia(new Date(anio, mes, dia));
    lista.push({
      clave,
      dia,
      fuera: false,
      sesiones: sesionesDelDia(clave),
    });
  }
  while (lista.length % 7 !== 0) {
    const ultimo = parseClave(lista[lista.length - 1]!.clave);
    ultimo.setDate(ultimo.getDate() + 1);
    const clave = claveDia(ultimo);
    lista.push({
      clave,
      dia: ultimo.getDate(),
      fuera: true,
      sesiones: sesionesDelDia(clave),
    });
  }
  return lista;
});

const delDia = computed(() => sesionesDelDia(diaSeleccionado.value));

const listadoCurso = computed(() => {
  if (cursoFiltro.value === "TODOS") return sesionesFiltradas.value;
  return sesionesFiltradas.value.filter(
    (sesion) => sesion.cursoId === cursoFiltro.value,
  );
});

const cursoSeleccionadoTitulo = computed(() => {
  if (cursoFiltro.value === "TODOS") return "Todos los cursos";
  return (
    props.cursos.find((curso) => curso.id === cursoFiltro.value)?.titulo ??
    "Curso"
  );
});

const opcionesEstado: Array<{ valor: "TODOS" | EstadoSesionEnVivo; etiqueta: string }> =
  [
    { valor: "TODOS", etiqueta: "Todos los estados" },
    { valor: "PROGRAMADA", etiqueta: "Programada" },
    { valor: "HOY", etiqueta: "Hoy" },
    { valor: "EN_VIVO", etiqueta: "En vivo" },
    { valor: "FINALIZADA", etiqueta: "Finalizada" },
    { valor: "CANCELADA", etiqueta: "Cancelada" },
  ];

function formatoHora(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatoFechaCorta(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

function formatoDiaSeleccionado() {
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseClave(diaSeleccionado.value));
}

function etiquetaEstado(estado: EstadoSesionEnVivo) {
  return (
    {
      PROGRAMADA: "Programada",
      HOY: "Hoy",
      EN_VIVO: "En vivo",
      FINALIZADA: "Finalizada",
      CANCELADA: "Cancelada",
    }[estado] ?? estado
  );
}

function claseEstado(estado: EstadoSesionEnVivo) {
  if (estado === "EN_VIVO" || estado === "HOY") {
    return "border-transparent bg-red-600 text-white";
  }
  if (estado === "FINALIZADA") {
    return "border-transparent bg-emerald-600 text-white";
  }
  if (estado === "CANCELADA") {
    return "border-transparent bg-slate-500 text-white";
  }
  return "border-transparent bg-sky-600 text-white";
}

function limpiarFiltros() {
  cursoFiltro.value = "TODOS";
  estadoFiltro.value = "TODOS";
  busqueda.value = "";
}

function pedirProgramar() {
  const cursoId =
    cursoFiltro.value !== "TODOS"
      ? cursoFiltro.value
      : (props.cursos[0]?.id ?? "");
  emit("programar", cursoId);
}
</script>

<template>
  <section
    class="flex w-full max-w-full min-w-0 flex-col overflow-hidden bg-background"
    :class="
      sangrado
        ? '-mx-4 -mb-8 h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-6.5rem)] sm:-mx-7 xl:-mx-8'
        : 'h-full max-h-full'
    "
  >
    <div
      class="flex shrink-0 flex-wrap items-end justify-between gap-2 border-b border-border bg-card px-4 py-2.5 sm:px-6 lg:px-7"
    >
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <CalendarDays class="h-5 w-5 shrink-0 text-primary" />
          <h1 class="truncate text-lg font-black sm:text-xl">{{ titulo }}</h1>
          <IconoAyuda
            v-if="descripcion"
            :texto="descripcion"
            lado="abajo"
          />
        </div>
      </div>
      <Button
        v-if="puedeProgramar"
        class="shrink-0 bg-primary"
        size="sm"
        @click="pedirProgramar"
      >
        <Plus class="h-4 w-4" />
        Programar sesión
      </Button>
    </div>

    <div
      class="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2 sm:px-6 lg:px-7"
    >
      <Filter class="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
      <select
        v-model="cursoFiltro"
        class="h-9 w-full min-w-0 rounded-md border border-border bg-card px-3 text-sm sm:w-auto sm:min-w-44 sm:max-w-xs"
      >
        <option value="TODOS">Todos los cursos</option>
        <option v-for="curso in cursos" :key="curso.id" :value="curso.id">
          {{ curso.titulo }}
        </option>
      </select>
      <select
        v-model="estadoFiltro"
        class="h-9 w-full min-w-0 rounded-md border border-border bg-card px-3 text-sm sm:w-auto sm:min-w-40"
      >
        <option
          v-for="opcion in opcionesEstado"
          :key="opcion.valor"
          :value="opcion.valor"
        >
          {{ opcion.etiqueta }}
        </option>
      </select>
      <div class="relative min-w-0 flex-1 basis-full sm:basis-48">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          v-model="busqueda"
          class="h-9 w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm"
          placeholder="Buscar sesión, curso o docente…"
        />
      </div>
      <Button variant="outline" size="sm" class="shrink-0" @click="limpiarFiltros">
        <X class="h-3.5 w-3.5" />
        Limpiar
      </Button>
      <Badge variant="outline" class="shrink-0 text-[10px]">
        {{ sesionesFiltradas.length }} sesión(es)
      </Badge>
    </div>

    <div
      v-if="cargando"
      class="grid min-h-0 w-full flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)]"
    >
      <Skeleton class="h-full min-h-0 w-full rounded-none" />
      <Skeleton class="hidden h-full min-h-0 w-full rounded-none lg:block" />
    </div>

    <div
      v-else
      class="grid min-h-0 w-full flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)]"
    >
      <!-- Calendario mes -->
      <div
        class="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-border lg:border-b-0 lg:border-r"
      >
        <div
          class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4"
        >
          <h2 class="min-w-0 truncate text-sm font-black capitalize sm:text-base">
            {{ etiquetaMes }}
          </h2>
          <div class="flex shrink-0 gap-1">
            <Button
              size="icon"
              variant="outline"
              class="h-8 w-8"
              aria-label="Mes anterior"
              @click="
                mesVisible = new Date(
                  mesVisible.getFullYear(),
                  mesVisible.getMonth() - 1,
                  1,
                )
              "
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              class="h-8"
              @click="
                mesVisible = new Date();
                diaSeleccionado = claveDia(new Date());
              "
            >
              Hoy
            </Button>
            <Button
              size="icon"
              variant="outline"
              class="h-8 w-8"
              aria-label="Mes siguiente"
              @click="
                mesVisible = new Date(
                  mesVisible.getFullYear(),
                  mesVisible.getMonth() + 1,
                  1,
                )
              "
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          class="grid shrink-0 grid-cols-7 border-b border-border bg-muted/40 text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground"
        >
          <span
            v-for="dia in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']"
            :key="dia"
            class="border-r border-border py-1.5 last:border-r-0"
            >{{ dia }}</span
          >
        </div>

        <div class="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr">
          <button
            v-for="celda in celdas"
            :key="celda.clave"
            type="button"
            class="min-h-0 min-w-0 overflow-hidden border-b border-r border-border p-0.5 text-left transition last:border-r-0 sm:p-1"
            :class="[
              celda.fuera ? 'bg-muted/20 text-muted-foreground' : 'bg-card',
              diaSeleccionado === celda.clave
                ? 'bg-primary/8 ring-2 ring-inset ring-primary/40'
                : 'hover:bg-muted/40',
              claveDia(new Date()) === celda.clave ? 'font-black' : '',
            ]"
            @click="diaSeleccionado = celda.clave"
          >
            <span
              class="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] sm:h-6 sm:w-6 sm:text-xs"
              :class="
                claveDia(new Date()) === celda.clave
                  ? 'bg-primary text-primary-foreground'
                  : ''
              "
              >{{ celda.dia }}</span
            >
            <div class="mt-0.5 space-y-0.5">
              <span
                v-for="sesion in celda.sesiones.slice(0, 2)"
                :key="sesion.id"
                class="block truncate rounded-sm px-0.5 py-px text-[8px] font-semibold leading-tight sm:text-[9px]"
                :class="
                  sesion.estado === 'CANCELADA'
                    ? 'bg-muted text-muted-foreground line-through'
                    : sesion.estado === 'EN_VIVO' || sesion.estado === 'HOY'
                      ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                      : 'bg-sky-500/15 text-sky-800 dark:text-sky-300'
                "
                @click.stop="emit('detalle', sesion)"
              >
                {{ formatoHora(sesion.fechaHoraInicio) }}
                {{ sesion.titulo }}
              </span>
              <span
                v-if="celda.sesiones.length > 2"
                class="block text-[8px] text-muted-foreground sm:text-[9px]"
              >
                +{{ celda.sesiones.length - 2 }} más
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- Panel lateral: día + listado por curso -->
      <aside class="flex min-h-0 min-w-0 flex-col overflow-hidden bg-card lg:max-h-full">
        <div class="shrink-0 border-b border-border px-4 py-3">
          <p
            class="text-[10px] font-black uppercase tracking-wide text-muted-foreground"
          >
            Día seleccionado
          </p>
          <h3 class="mt-1 text-sm capitalize font-black">
            {{ formatoDiaSeleccionado() }}
          </h3>
          <div v-if="!delDia.length" class="mt-2 text-xs text-muted-foreground">
            Sin sesiones este día con los filtros actuales.
          </div>
          <div v-else class="mt-2 grid max-h-40 gap-2 overflow-y-auto">
            <button
              v-for="sesion in delDia"
              :key="sesion.id"
              type="button"
              class="rounded-md border border-border p-2.5 text-left hover:border-primary/40"
              @click="emit('detalle', sesion)"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="line-clamp-2 text-sm font-bold leading-snug">
                    {{ sesion.titulo }}
                  </p>
                  <p class="mt-0.5 truncate text-xs text-muted-foreground">
                    {{ formatoHora(sesion.fechaHoraInicio) }} ·
                    {{ sesion.cursoTitulo }}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  class="shrink-0 text-[10px]"
                  :class="claseEstado(sesion.estado)"
                >
                  {{ etiquetaEstado(sesion.estado) }}
                </Badge>
              </div>
            </button>
          </div>
        </div>

        <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3">
          <div class="flex shrink-0 items-start justify-between gap-2">
            <div class="min-w-0">
              <p
                class="text-[10px] font-black uppercase tracking-wide text-muted-foreground"
              >
                Sesiones del curso
              </p>
              <h3 class="mt-1 text-sm font-black leading-snug">
                {{ cursoSeleccionadoTitulo }}
              </h3>
            </div>
            <Badge variant="outline" class="shrink-0">{{ listadoCurso.length }}</Badge>
          </div>

          <div
            v-if="!listadoCurso.length"
            class="mt-3 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground"
          >
            No hay sesiones para este filtro. Cuando tengas clases en vivo
            programadas, aparecerán aquí.
          </div>

          <div class="mt-2 grid min-h-0 flex-1 gap-2 overflow-y-auto pb-2">
            <Card
              v-for="sesion in listadoCurso"
              :key="`lista-${sesion.id}`"
              class="cursor-pointer border-border hover:border-primary/40"
              @click="emit('detalle', sesion)"
            >
              <CardContent class="p-2.5">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <p class="line-clamp-2 text-sm font-bold leading-snug">
                      {{ sesion.titulo }}
                    </p>
                    <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 class="h-3.5 w-3.5 shrink-0" />
                      <span class="truncate">
                        {{ formatoFechaCorta(sesion.fechaHoraInicio) }} ·
                        {{ formatoHora(sesion.fechaHoraInicio) }}
                      </span>
                    </p>
                    <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <UsersRound class="h-3.5 w-3.5 shrink-0" />
                      <span class="truncate">
                        {{ sesion.invitados.length }} invitados ·
                        {{ sesion.docenteNombre }}
                      </span>
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    class="shrink-0 text-[10px]"
                    :class="claseEstado(sesion.estado)"
                  >
                    {{ etiquetaEstado(sesion.estado) }}
                  </Badge>
                </div>
                <div class="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    class="h-8 flex-1"
                    @click.stop="emit('detalle', sesion)"
                  >
                    <Link2 class="h-3.5 w-3.5" />
                    Detalle
                  </Button>
                  <Button
                    v-if="
                      sesion.estado !== 'CANCELADA' &&
                      sesion.estado !== 'FINALIZADA'
                    "
                    size="sm"
                    class="h-8 flex-1"
                    @click.stop="emit('unirse', sesion)"
                  >
                    <Video class="h-3.5 w-3.5" />
                    Meet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
