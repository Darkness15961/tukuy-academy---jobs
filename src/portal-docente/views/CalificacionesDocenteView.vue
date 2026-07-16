<script setup lang="ts">
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardCheck,
  Download,
  FileClock,
  GraduationCap,
  Search,
  UsersRound,
} from "lucide-vue-next";
import Select from "primevue/select";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import {
  academicoService,
  type ResumenCursoCalificaciones,
} from "@/api/services/academico.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Skeleton from "primevue/skeleton";

const router = useRouter();
const cargando = ref(true);
const busqueda = ref("");
const estado = ref("TODOS");
const cursos = ref<ResumenCursoCalificaciones[]>([]);

const opcionesEstado = [
  { label: "Todos los cursos", value: "TODOS" },
  { label: "Con entregas pendientes", value: "PENDIENTES" },
  { label: "Sin entregas pendientes", value: "AL_DIA" },
];

onMounted(async () => {
  try {
    cursos.value = await academicoService.listarResumenCursos();
  } finally {
    cargando.value = false;
  }
});

const cursosVisibles = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  return cursos.value.filter((curso) => {
    const coincideBusqueda =
      !termino ||
      curso.titulo.toLowerCase().includes(termino) ||
      curso.contexto.toLowerCase().includes(termino);
    const coincideEstado =
      estado.value === "TODOS" ||
      (estado.value === "PENDIENTES" && curso.entregasPendientes > 0) ||
      (estado.value === "AL_DIA" && curso.entregasPendientes === 0);
    return coincideBusqueda && coincideEstado;
  });
});

const totales = computed(() => ({
  cursos: cursos.value.length,
  estudiantes: cursos.value.reduce(
    (total, curso) => total + curso.estudiantes,
    0,
  ),
  pendientes: cursos.value.reduce(
    (total, curso) => total + curso.entregasPendientes,
    0,
  ),
}));

function abrirCurso(cursoId: string) {
  router.push(`/docente/calificaciones/${cursoId}`);
}

function exportarResumen() {
  const filas = [
    [
      "Curso",
      "Módulos",
      "Actividades",
      "Estudiantes",
      "Pendientes",
      "Calificadas",
      "Promedio",
      "Aprobados",
    ],
    ...cursosVisibles.value.map((curso) => [
      curso.titulo,
      curso.modulos,
      curso.actividades,
      curso.estudiantes,
      curso.entregasPendientes,
      curso.entregasCalificadas,
      curso.promedio,
      curso.aprobados,
    ]),
  ];
  const csv = filas
    .map((fila) =>
      fila.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  enlace.download = "resumen-libro-calificaciones.csv";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[.2em] text-primary">
          Gestión académica por curso
        </p>
        <h1 class="mt-2 text-3xl font-black">Libro de calificaciones</h1>
        <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
          Selecciona un curso para revisar sus módulos, entregas PDF, notas y
          estudiantes habilitados para certificación.
        </p>
      </div>
      <Button
        variant="outline"
        :disabled="!cursosVisibles.length"
        @click="exportarResumen"
      >
        <Download class="h-4 w-4" /> Exportar resumen
      </Button>
    </div>

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-3">
      <Skeleton v-for="item in 3" :key="item" class="h-28 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-3">
      <Card
        class="overflow-hidden border-border border-t-4 border-t-primary bg-card"
      >
        <CardContent class="flex items-center gap-4 p-5">
          <span
            class="grid h-11 w-11 place-items-center bg-primary/10 text-primary"
          >
            <BookOpenCheck class="h-5 w-5" />
          </span>
          <div>
            <strong class="text-2xl">{{ totales.cursos }}</strong>
            <p class="text-xs text-muted-foreground">Cursos impartidos</p>
          </div>
        </CardContent>
      </Card>
      <Card
        class="overflow-hidden border-border border-t-4 border-t-accent bg-card"
      >
        <CardContent class="flex items-center gap-4 p-5">
          <span
            class="grid h-11 w-11 place-items-center bg-accent/20 text-[#B87A00] dark:text-accent"
          >
            <UsersRound class="h-5 w-5" />
          </span>
          <div>
            <strong class="text-2xl">{{ totales.estudiantes }}</strong>
            <p class="text-xs text-muted-foreground">
              Participaciones académicas
            </p>
          </div>
        </CardContent>
      </Card>
      <Card
        class="overflow-hidden border-border border-t-4 border-t-red-500 bg-card"
      >
        <CardContent class="flex items-center gap-4 p-5">
          <span
            class="grid h-11 w-11 place-items-center bg-red-500/10 text-red-600"
          >
            <FileClock class="h-5 w-5" />
          </span>
          <div>
            <strong class="text-2xl">{{ totales.pendientes }}</strong>
            <p class="text-xs text-muted-foreground">Entregas por revisar</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <div
      class="grid gap-3 border border-border bg-card p-4 md:grid-cols-[1fr_18rem]"
    >
      <label>
        <span class="filtro-label">Buscar cursos</span>
        <span class="relative block">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="busqueda"
            class="pl-10"
            placeholder="Curso o contexto"
          />
        </span>
      </label>
      <label>
        <span class="filtro-label">Estado del curso</span>
        <Select
          v-model="estado"
          :options="opcionesEstado"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </label>
    </div>

    <div v-if="cargando" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Skeleton v-for="item in 6" :key="item" class="h-96 w-full" />
    </div>
    <div
      v-else-if="cursosVisibles.length"
      class="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
    >
      <button
        v-for="curso in cursosVisibles"
        :key="curso.cursoId"
        type="button"
        class="group overflow-hidden border border-border bg-card text-left shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
        @click="abrirCurso(curso.cursoId)"
      >
        <div class="relative h-48 overflow-hidden bg-slate-900">
          <img
            :src="curso.imagen"
            :alt="curso.titulo"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div
            class="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/20 to-transparent"
          />
          <div class="absolute inset-x-0 bottom-0 p-5 text-white">
            <p
              class="text-[10px] font-black uppercase tracking-[.16em] text-accent"
            >
              {{ curso.contexto }}
            </p>
            <h2 class="mt-2 text-xl font-black leading-tight">
              {{ curso.titulo }}
            </h2>
          </div>
        </div>
        <div class="p-5">
          <div
            class="grid grid-cols-3 gap-3 border-b border-border pb-4 text-center"
          >
            <div>
              <strong class="block text-lg">{{ curso.modulos }}</strong
              ><span class="text-[10px] uppercase text-muted-foreground"
                >Módulos</span
              >
            </div>
            <div>
              <strong class="block text-lg">{{ curso.actividades }}</strong
              ><span class="text-[10px] uppercase text-muted-foreground"
                >Actividades</span
              >
            </div>
            <div>
              <strong class="block text-lg">{{ curso.estudiantes }}</strong
              ><span class="text-[10px] uppercase text-muted-foreground"
                >Estudiantes</span
              >
            </div>
          </div>
          <div class="mt-4 grid gap-2 text-sm">
            <p class="flex items-center justify-between">
              <span class="text-muted-foreground">Por revisar</span
              ><strong
                :class="
                  curso.entregasPendientes ? 'text-red-600' : 'text-emerald-600'
                "
                >{{ curso.entregasPendientes }}</strong
              >
            </p>
            <p class="flex items-center justify-between">
              <span class="text-muted-foreground">Promedio del curso</span
              ><strong
                >{{ curso.promedio || "—"
                }}<span v-if="curso.promedio"> / 20</span></strong
              >
            </p>
            <p class="flex items-center justify-between">
              <span class="text-muted-foreground">Aprobados</span
              ><strong>{{ curso.aprobados }}</strong>
            </p>
          </div>
          <div
            class="mt-5 flex items-center justify-between bg-primary px-4 py-3 text-sm font-black text-white"
          >
            <span class="flex items-center gap-2"
              ><ClipboardCheck class="h-4 w-4" />Abrir libro del curso</span
            >
            <ArrowRight class="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </button>
    </div>
    <Card v-else class="border-border bg-card">
      <CardContent class="grid place-items-center p-12 text-center">
        <GraduationCap class="h-12 w-12 text-primary" />
        <h2 class="mt-4 text-xl font-black">No encontramos cursos</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          Ajusta la búsqueda o el filtro de entregas.
        </p>
      </CardContent>
    </Card>
  </section>
</template>
