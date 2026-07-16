<script setup lang="ts">
import {
  BookOpen,
  Building2,
  CircleUserRound,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  UsersRound,
} from "lucide-vue-next";
import Skeleton from "primevue/skeleton";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import {
  docenteService,
  type CursoDocente,
} from "@/api/services/docente.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useContextoSesion } from "@/composables/useContextoSesion";
import type { EstadoCursoDocente } from "@/portal-docente/types/docente.types";

const router = useRouter();
const { contextoActivo } = useContextoSesion();
const busqueda = ref("");
const filtro = ref<"TODOS" | EstadoCursoDocente>("TODOS");
const cargando = ref(true);
const cursos = ref<CursoDocente[]>([]);
const menuCursoId = ref<string>();
const cursoVistaPrevia = ref<CursoDocente>();
const aviso = ref("");

const opcionesFiltro: Array<{
  valor: "TODOS" | EstadoCursoDocente;
  etiqueta: string;
}> = [
  { valor: "TODOS", etiqueta: "Todos" },
  { valor: "PUBLICADO", etiqueta: "Publicado" },
  { valor: "APROBADO", etiqueta: "Aprobado" },
  { valor: "EN_REVISION", etiqueta: "Por revisar" },
  { valor: "BORRADOR", etiqueta: "En elaboración" },
];

onMounted(async () => {
  try {
    cursos.value = await docenteService.cursos.listar();
  } finally {
    cargando.value = false;
  }
});

const ambitoActivo = computed(() =>
  contextoActivo.value?.ambitoDocencia === "INDEPENDIENTE" ||
  !contextoActivo.value?.organizacionId
    ? "INDEPENDIENTE"
    : "ORGANIZACION",
);

const cursosDelContexto = computed(() =>
  cursos.value.filter((curso) => {
    if (ambitoActivo.value === "INDEPENDIENTE") {
      return curso.ambito === "INDEPENDIENTE";
    }

    return (
      curso.ambito === "ORGANIZACION" &&
      curso.organizacionId === contextoActivo.value?.organizacionId
    );
  }),
);

function crearCurso() {
  router.push({
    path: "/docente/cursos/nuevo",
    query: { ambito: ambitoActivo.value.toLowerCase() },
  });
}

function editarCurso(curso?: CursoDocente) {
  if (!curso) return;
  router.push(`/docente/cursos/${curso.id}/constructor`);
}

const cursosFiltrados = computed(() =>
  cursosDelContexto.value.filter(
    (curso) =>
      (filtro.value === "TODOS" || curso.estado === filtro.value) &&
      curso.titulo.toLowerCase().includes(busqueda.value.toLowerCase()),
  ),
);

function etiquetaEstado(estado: EstadoCursoDocente) {
  return (
    {
      BORRADOR: "En elaboración",
      EN_REVISION: "Por revisar",
      APROBADO: "Aprobado",
      PUBLICADO: "Publicado",
      ARCHIVADO: "Archivado",
    }[estado] ?? estado
  );
}

function claseEstado(estado: EstadoCursoDocente) {
  if (estado === "PUBLICADO") {
    return "border-transparent bg-emerald-600 text-white";
  }
  if (estado === "APROBADO") {
    return "border-transparent bg-sky-600 text-white";
  }
  if (estado === "EN_REVISION") {
    return "border-transparent bg-amber-500 text-slate-950";
  }
  if (estado === "ARCHIVADO") {
    return "border-transparent bg-slate-500 text-white";
  }
  return "border-transparent bg-primary text-primary-foreground";
}

async function duplicar(curso: CursoDocente) {
  const copia = await docenteService.duplicarCurso(curso.id);
  cursos.value.unshift(copia);
  menuCursoId.value = undefined;
  aviso.value = "Se creó una copia editable del curso.";
}

async function archivar(curso: CursoDocente) {
  const archivado = await docenteService.archivarCurso(curso.id);
  const indice = cursos.value.findIndex((item) => item.id === archivado.id);
  if (indice >= 0) cursos.value[indice] = archivado;
  menuCursoId.value = undefined;
  aviso.value = "El curso fue archivado y conserva todo su contenido.";
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black">Mis cursos</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Crea, publica y mejora tus experiencias de aprendizaje.
        </p>
      </div>
      <Button class="bg-primary" @click="crearCurso">
        <Plus class="h-4 w-4" />
        Crear curso
      </Button>
    </div>

    <p
      v-if="aviso"
      class="border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
    >
      {{ aviso }}
    </p>

    <Card class="border-border bg-card">
      <CardContent class="flex flex-wrap gap-3 p-4">
        <div class="relative min-w-64 flex-1">
          <Search
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="busqueda"
            class="pl-10"
            placeholder="Buscar en mis cursos..."
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="opcion in opcionesFiltro"
            :key="opcion.valor"
            size="sm"
            :variant="filtro === opcion.valor ? 'default' : 'outline'"
            @click="filtro = opcion.valor"
          >
            {{ opcion.etiqueta }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <div v-if="cargando" class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Skeleton v-for="item in 6" :key="item" class="h-80 w-full" />
    </div>

    <div v-else class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Card
        v-for="curso in cursosFiltrados"
        :key="curso.id"
        class="group overflow-visible border-border bg-card"
      >
        <div class="relative h-44 overflow-hidden">
          <img
            :src="curso.imagen"
            :alt="curso.titulo"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div
            class="absolute inset-0 bg-linear-to-t from-slate-950/50 to-transparent"
          />
          <Badge
            class="absolute left-4 top-4 font-bold shadow-md"
            :class="claseEstado(curso.estado)"
            variant="outline"
          >
            {{ etiquetaEstado(curso.estado) }}
          </Badge>
          <Button
            class="absolute right-3 top-3 bg-card/90"
            size="icon"
            variant="ghost"
            aria-label="Acciones del curso"
            @click.stop="
              menuCursoId = menuCursoId === curso.id ? undefined : curso.id
            "
          >
            <MoreHorizontal class="h-4 w-4" />
          </Button>
          <div
            v-if="menuCursoId === curso.id"
            class="absolute right-3 top-14 z-20 grid min-w-48 border border-border bg-card p-1 text-sm shadow-xl"
          >
            <button
              class="px-3 py-2 text-left hover:bg-muted"
              @click="
                cursoVistaPrevia = curso;
                menuCursoId = undefined;
              "
            >
              Vista previa
            </button>
            <button
              class="px-3 py-2 text-left hover:bg-muted"
              @click="duplicar(curso)"
            >
              Duplicar curso
            </button>
            <button
              class="px-3 py-2 text-left text-red-600 hover:bg-red-500/10"
              @click="archivar(curso)"
            >
              Archivar curso
            </button>
          </div>
        </div>

        <CardContent class="p-5">
          <div
            class="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-primary"
          >
            <CircleUserRound
              v-if="curso.ambito === 'INDEPENDIENTE'"
              class="h-3.5 w-3.5"
            />
            <Building2 v-else class="h-3.5 w-3.5" />
            {{
              curso.ambito === "INDEPENDIENTE"
                ? "Curso propio · Venta individual"
                : curso.organizacionNombre
            }}
          </div>
          <h2 class="min-h-12 text-lg font-black">{{ curso.titulo }}</h2>
          <div
            class="mt-4 flex items-center justify-between text-xs text-muted-foreground"
          >
            <span class="flex items-center gap-1">
              <UsersRound class="h-4 w-4" />
              {{ curso.estudiantes }} estudiantes
            </span>
            <span
              v-if="curso.valoracion"
              class="flex items-center gap-1 text-[#B87A00] dark:text-accent"
            >
              <Star class="h-4 w-4 fill-current" />
              {{ curso.valoracion }}
            </span>
          </div>
          <div class="mt-5 flex gap-2">
            <Button
              class="flex-1"
              variant="outline"
              @click="editarCurso(curso)"
            >
              <BookOpen class="h-4 w-4" />
              Editar contenido
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <div
      v-if="cursoVistaPrevia"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"
      @click.self="cursoVistaPrevia = undefined"
    >
      <article class="w-full max-w-3xl border border-border bg-card shadow-2xl">
        <div class="relative aspect-video bg-slate-950">
          <img
            :src="cursoVistaPrevia.imagen"
            :alt="cursoVistaPrevia.titulo"
            class="h-full w-full object-cover opacity-65"
          />
          <div
            class="absolute inset-0 bg-linear-to-t from-slate-950 via-transparent to-transparent"
          />
          <div class="absolute inset-x-0 bottom-0 p-7 text-white">
            <Badge :class="claseEstado(cursoVistaPrevia.estado)">
              {{ etiquetaEstado(cursoVistaPrevia.estado) }}
            </Badge>
            <h2 class="mt-3 text-3xl font-black">
              {{ cursoVistaPrevia.titulo }}
            </h2>
            <p class="mt-2 text-sm text-slate-200">
              {{ cursoVistaPrevia.estudiantes }} estudiantes ·
              {{ cursoVistaPrevia.valoracion || "Sin valoraciones" }}
            </p>
          </div>
        </div>
        <div class="flex justify-end gap-2 p-4">
          <Button variant="outline" @click="cursoVistaPrevia = undefined">
            Cerrar
          </Button>
          <Button @click="editarCurso(cursoVistaPrevia)"
            >Editar contenido</Button
          >
        </div>
      </article>
    </div>
  </section>
</template>
