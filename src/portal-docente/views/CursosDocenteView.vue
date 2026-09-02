<script setup lang="ts">
import {
  BookOpen,
  Building2,
  CircleUserRound,
  Clock3,
  Link2,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Star,
  UsersRound,
} from "lucide-vue-next";
import Skeleton from "primevue/skeleton";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  docenteService,
  type CursoDocente,
} from "@/api/services/docente.service";
import { apiConfig } from "@/api/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import ImagenPortadaCurso from "@/components/shared/ImagenPortadaCurso.vue";
import CompartirSesionRedes from "@/components/shared/CompartirSesionRedes.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useContextoSesion } from "@/composables/useContextoSesion";
import type { EstadoCursoDocente } from "@/portal-docente/types/docente.types";
import { toast } from "@/lib/toast";
import { urlCompartirCursoConOpenGraph, urlPublicaCurso } from "@/lib/compartir-sesion-en-vivo";
import {
  claseModalidadImparticion,
  etiquetaModalidadImparticion,
} from "@/lib/presentacion-curso";

const router = useRouter();
const route = useRoute();
const { contextoActivo, tienePermiso } = useContextoSesion();
const busqueda = ref("");
const filtro = ref<"TODOS" | EstadoCursoDocente>("TODOS");
const cargando = ref(true);
const cursos = ref<CursoDocente[]>([]);
const menuCursoId = ref<string>();
const cursoVistaPrevia = ref<CursoDocente>();
const cursoCompartir = ref<CursoDocente>();
const cursoPendienteEliminar = ref<CursoDocente>();
const cursoPendienteEliminarMaterial = ref<CursoDocente>();
const eliminandoCurso = ref(false);
const eliminandoMaterial = ref(false);
const aviso = ref("");
const esGestionOrganizacion = computed(() =>
  route.path.startsWith("/organizacion/"),
);
const puedeEliminarMaterial = computed(
  () =>
    esGestionOrganizacion.value &&
    (tienePermiso("cursos.administrar") || tienePermiso("cursos.aprobar")),
);
const tituloPagina = computed(() =>
  esGestionOrganizacion.value ? "Cursos institucionales" : "Mis cursos",
);
const descripcionPagina = computed(() =>
  esGestionOrganizacion.value
    ? "Crea y administra el material académico que la entidad carga por encargo de sus docentes."
    : "Crea, publica y mejora tus experiencias de aprendizaje.",
);

const opcionesFiltro: Array<{
  valor: "TODOS" | EstadoCursoDocente;
  etiqueta: string;
}> = [
  { valor: "TODOS", etiqueta: "Todos" },
  { valor: "PUBLICADO", etiqueta: "Publicado" },
  { valor: "APROBADO", etiqueta: "Aprobado" },
  { valor: "CONTENIDO_REVISADO", etiqueta: "Contenido OK" },
  { valor: "EN_REVISION", etiqueta: "Por revisar" },
  { valor: "OBSERVADO", etiqueta: "Observado" },
  { valor: "BORRADOR", etiqueta: "En elaboración" },
  { valor: "ARCHIVADO", etiqueta: "Archivado" },
];

const opcionesFiltroVisibles = computed(() =>
  esGestionOrganizacion.value
    ? opcionesFiltro
    : opcionesFiltro.filter((opcion) => opcion.valor !== "ARCHIVADO"),
);

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

const cursosDelContexto = computed(() => {
  const idsAlcance = contextoActivo.value?.alcance?.cursoIds;
  const usuarioId = contextoActivo.value?.usuarioId?.trim();
  return cursos.value.filter((curso) => {
    if (apiConfig.secundariaCursos) {
      if (
        !esGestionOrganizacion.value &&
        contextoActivo.value?.portal === "docente"
      ) {
        const esAutor =
          Boolean(usuarioId) && curso.docenteResponsableId === usuarioId;
        const asignado = Boolean(
          idsAlcance?.length && idsAlcance.includes(curso.id),
        );
        if (!esAutor && !asignado) return false;
      }
      if (ambitoActivo.value === "INDEPENDIENTE") {
        return (
          curso.ambito === "INDEPENDIENTE" ||
          curso.organizacionId === contextoActivo.value?.organizacionId
        );
      }
      return (
        !contextoActivo.value?.organizacionId ||
        curso.organizacionId === contextoActivo.value.organizacionId
      );
    }

    if (ambitoActivo.value === "INDEPENDIENTE") {
      return curso.ambito === "INDEPENDIENTE";
    }

    const deLaOrg =
      curso.ambito === "ORGANIZACION" &&
      curso.organizacionId === contextoActivo.value?.organizacionId;

    if (!deLaOrg) return false;

    if (
      contextoActivo.value?.portal === "docente" &&
      idsAlcance?.length
    ) {
      return idsAlcance.includes(curso.id);
    }

    return true;
  });
});

function crearCurso() {
  router.push({
    path: esGestionOrganizacion.value
      ? "/organizacion/cursos/nuevo"
      : "/docente/cursos/nuevo",
    query: {
      ambito: ambitoActivo.value.toLowerCase(),
      ...(esGestionOrganizacion.value
        ? { borrador: `curso-institucional-${Date.now()}` }
        : {}),
    },
  });
}

function editarCurso(curso?: CursoDocente) {
  if (!curso) return;
  router.push(
    esGestionOrganizacion.value
      ? `/organizacion/cursos/${curso.id}/constructor`
      : `/docente/cursos/${curso.id}/constructor`,
  );
}

function abrirCompartirCurso(curso: CursoDocente) {
  cursoCompartir.value = curso;
  menuCursoId.value = undefined;
}

async function copiarEnlacePublicoCurso(curso: CursoDocente) {
  try {
    await navigator.clipboard.writeText(urlPublicaCurso(curso.id));
    toast.success("Enlace público copiado");
  } catch {
    toast.error("No se pudo copiar el enlace");
  }
}

const cursosFiltrados = computed(() =>
  cursosDelContexto.value.filter((curso) => {
    // Docente: "Todos" = activos; archivados solo con filtro explícito.
    if (
      !esGestionOrganizacion.value &&
      filtro.value === "TODOS" &&
      curso.estado === "ARCHIVADO"
    ) {
      return false;
    }
    return (
      (filtro.value === "TODOS" || curso.estado === filtro.value) &&
      curso.titulo.toLowerCase().includes(busqueda.value.toLowerCase())
    );
  }),
);

function etiquetaEstado(estado: EstadoCursoDocente) {
  return (
    {
      BORRADOR: "En elaboración",
      EN_REVISION: "Por revisar",
      CONTENIDO_REVISADO: "Contenido OK",
      OBSERVADO: "Observado",
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
  if (estado === "CONTENIDO_REVISADO") {
    return "border-transparent bg-teal-600 text-white";
  }
  if (estado === "OBSERVADO") {
    return "border-transparent bg-orange-500 text-white";
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
  try {
    const copia = await docenteService.duplicarCurso(curso.id);
    cursos.value.unshift(copia);
    menuCursoId.value = undefined;
    aviso.value = "Se creó una copia editable del curso.";
    toast.success("Curso duplicado en borrador.");
  } catch (causa) {
    toast.error(
      causa instanceof Error
        ? causa.message
        : "No se pudo duplicar el curso.",
    );
  }
}

async function archivar(curso: CursoDocente) {
  cursoPendienteEliminar.value = curso;
  menuCursoId.value = undefined;
}

function solicitarEliminarMaterial(curso: CursoDocente) {
  cursoPendienteEliminarMaterial.value = curso;
  menuCursoId.value = undefined;
}

async function confirmarEliminarCurso() {
  const curso = cursoPendienteEliminar.value;
  if (!curso || eliminandoCurso.value) return;
  eliminandoCurso.value = true;
  try {
    if (esGestionOrganizacion.value) {
      const archivado = await docenteService.archivarCurso(curso.id);
      const indice = cursos.value.findIndex((item) => item.id === archivado.id);
      if (indice >= 0) cursos.value[indice] = archivado;
      aviso.value =
        "El curso quedó archivado. Quienes ya están inscritos conservan acceso.";
      toast.success("Curso archivado.");
    } else {
      await docenteService.eliminarCurso(curso.id);
      cursos.value = cursos.value.filter((item) => item.id !== curso.id);
      aviso.value =
        "El curso fue eliminado de tu lista. Los alumnos ya inscritos conservan acceso.";
      toast.success("Curso eliminado.");
    }
    cursoPendienteEliminar.value = undefined;
  } catch (causa) {
    toast.error(
      causa instanceof Error
        ? causa.message
        : esGestionOrganizacion.value
          ? "No se pudo archivar el curso."
          : "No se pudo eliminar el curso.",
    );
  } finally {
    eliminandoCurso.value = false;
  }
}

async function confirmarEliminarMaterial() {
  const curso = cursoPendienteEliminarMaterial.value;
  if (!curso || eliminandoMaterial.value) return;
  eliminandoMaterial.value = true;
  try {
    await docenteService.eliminarCursoPermanente(curso.id);
    cursos.value = cursos.value.filter((item) => item.id !== curso.id);
    aviso.value =
      "Material eliminado. Sesiones, calendario y matrículas fueron desvinculados.";
    toast.success("Material del curso eliminado.");
    cursoPendienteEliminarMaterial.value = undefined;
  } catch (causa) {
    toast.error(
      causa instanceof Error
        ? causa.message
        : "No se pudo eliminar el material del curso.",
    );
  } finally {
    eliminandoMaterial.value = false;
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <TituloConAyuda
          :titulo="tituloPagina"
          :ayuda="descripcionPagina"
          clase-titulo="text-2xl font-black"
        />
      </div>
      <div
        v-if="!esGestionOrganizacion || tienePermiso('cursos.crear')"
        class="flex flex-wrap gap-2"
      >
        <Button
          variant="outline"
          @click="
            router.push(
              esGestionOrganizacion
                ? '/organizacion/sesiones'
                : '/docente/calendario',
            )
          "
        >
          Crear sesión en vivo
        </Button>
        <Button class="bg-primary" @click="crearCurso">
          <Plus class="h-4 w-4" />
          {{ esGestionOrganizacion ? "Crear curso institucional" : "Crear curso" }}
        </Button>
      </div>
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
            v-for="opcion in opcionesFiltroVisibles"
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
        class="group cursor-pointer overflow-visible border-border bg-card"
        @click="
          cursoVistaPrevia = curso;
          menuCursoId = undefined;
        "
      >
        <div class="relative aspect-video w-full overflow-hidden">
          <ImagenPortadaCurso
            :src="curso.imagen"
            :alt="curso.titulo"
            :object-position="curso.imagenPosicion"
            hover-escala
            contenedor-class="aspect-video h-full w-full"
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
              @click.stop="
                cursoVistaPrevia = curso;
                menuCursoId = undefined;
              "
            >
              Vista previa
            </button>
            <button
              class="px-3 py-2 text-left hover:bg-muted"
              @click.stop="abrirCompartirCurso(curso)"
            >
              Compartir curso
            </button>
            <button
              class="px-3 py-2 text-left hover:bg-muted"
              @click="duplicar(curso)"
            >
              Duplicar curso
            </button>
            <button
              v-if="curso.estado !== 'ARCHIVADO'"
              class="px-3 py-2 text-left text-red-600 hover:bg-red-500/10"
              @click="archivar(curso)"
            >
              {{
                esGestionOrganizacion ? "Archivar curso" : "Eliminar curso"
              }}
            </button>
            <button
              v-if="puedeEliminarMaterial"
              class="px-3 py-2 text-left text-red-700 hover:bg-red-500/10"
              @click="solicitarEliminarMaterial(curso)"
            >
              Eliminar material
            </button>
          </div>
        </div>

        <CardContent class="p-5">
          <div
            class="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wide text-primary"
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
            <Badge
              variant="outline"
              class="text-[9px]"
              :class="
                claseModalidadImparticion(curso.modalidadImparticion ?? 'VIRTUAL')
              "
            >
              {{
                etiquetaModalidadImparticion(
                  curso.modalidadImparticion ?? "VIRTUAL",
                )
              }}
            </Badge>
          </div>
          <h2 class="min-h-12 text-lg font-black">{{ curso.titulo }}</h2>
          <p
            v-if="curso.estado === 'OBSERVADO' && curso.observacion"
            class="mt-3 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-800 dark:text-orange-200"
          >
            <span class="font-bold">Observación: </span>{{ curso.observacion }}
          </p>
          <div
            class="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
          >
            <span class="flex items-center gap-1">
              <UsersRound class="h-4 w-4" />
              {{ curso.estudiantes }} estudiantes
            </span>
            <span
              v-if="curso.duracion && curso.duracion !== '—'"
              class="flex items-center gap-1 font-semibold text-foreground"
            >
              <Clock3 class="h-4 w-4 text-primary" />
              {{ curso.duracion }}
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
              @click.stop="editarCurso(curso)"
            >
              <BookOpen class="h-4 w-4" />
              Editar contenido
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Compartir curso"
              title="Compartir curso"
              @click.stop="abrirCompartirCurso(curso)"
            >
              <Share2 class="h-4 w-4" />
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
          <ImagenPortadaCurso
            :src="cursoVistaPrevia.imagen"
            :alt="cursoVistaPrevia.titulo"
            :object-position="cursoVistaPrevia.imagenPosicion"
            :opacidad="0.65"
            contenedor-class="aspect-video h-full w-full bg-slate-950"
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
            <p
              v-if="
                cursoVistaPrevia.estado === 'OBSERVADO' &&
                cursoVistaPrevia.observacion
              "
              class="mt-3 rounded-md border border-orange-400/40 bg-orange-500/20 px-3 py-2 text-sm text-orange-50"
            >
              <span class="font-bold">Observación: </span
              >{{ cursoVistaPrevia.observacion }}
            </p>
            <p class="mt-2 text-sm text-slate-200">
              {{ cursoVistaPrevia.estudiantes }} estudiantes
              <template
                v-if="cursoVistaPrevia.duracion && cursoVistaPrevia.duracion !== '—'"
              >
                · {{ cursoVistaPrevia.duracion }}
              </template>
              · {{ cursoVistaPrevia.valoracion || "Sin valoraciones" }}
            </p>
          </div>
        </div>
        <div class="space-y-4 p-4">
          <div class="rounded-lg border border-border bg-muted/30 p-3">
            <p class="text-sm font-semibold text-foreground">
              Comparte en redes
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              Enlace público de la ficha del curso (WhatsApp, Facebook, X,
              Instagram).
            </p>
            <CompartirSesionRedes
              etiqueta="Compartir curso"
              :titulo="cursoVistaPrevia.titulo"
              :url="urlCompartirCursoConOpenGraph(cursoVistaPrevia.id)"
              etiqueta-enlace="Ver curso e inscribirte"
            />
          </div>
          <div class="flex justify-end gap-2">
          <Button variant="outline" @click="cursoVistaPrevia = undefined">
            Cerrar
          </Button>
          <Button @click="editarCurso(cursoVistaPrevia)"
            >Editar contenido</Button
          >
          </div>
        </div>
      </article>
    </div>

    <div
      v-if="cursoCompartir"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"
      @click.self="cursoCompartir = undefined"
    >
      <article class="w-full max-w-md border border-border bg-card p-6 shadow-2xl">
        <div class="flex items-start gap-3">
          <div
            class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
          >
            <Share2 class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-lg font-black text-foreground">Compartir curso</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ cursoCompartir.titulo }}
            </p>
          </div>
        </div>
        <p class="mt-4 text-sm text-muted-foreground">
          Copia un mensaje listo para pegar en WhatsApp, Facebook, X o Instagram.
          Quien abra el enlace verá la ficha pública del curso.
        </p>
        <CompartirSesionRedes
          class="mt-4"
          etiqueta="Redes"
          :titulo="cursoCompartir.titulo"
          :url="urlCompartirCursoConOpenGraph(cursoCompartir.id)"
          etiqueta-enlace="Ver curso e inscribirte"
        />
        <Button
          variant="outline"
          class="mt-4 w-full"
          @click="copiarEnlacePublicoCurso(cursoCompartir)"
        >
          <Link2 class="h-4 w-4" />
          Copiar enlace público
        </Button>
        <div class="mt-5 flex justify-end">
          <Button variant="outline" @click="cursoCompartir = undefined">
            Cerrar
          </Button>
        </div>
      </article>
    </div>

    <div
      v-if="cursoPendienteEliminar"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"
      @click.self="cursoPendienteEliminar = undefined"
    >
      <article class="w-full max-w-lg border border-border bg-card p-6 shadow-2xl">
        <h2 class="text-lg font-black">
          {{
            esGestionOrganizacion
              ? "¿Archivar este curso?"
              : "¿Eliminar este curso?"
          }}
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          <strong class="text-foreground">{{ cursoPendienteEliminar.titulo }}</strong>
          {{
            esGestionOrganizacion
              ? "dejará de mostrarse a nuevos alumnos. Quienes ya están inscritos conservan acceso."
              : "dejará de aparecer en tu lista y no se mostrará a nuevos alumnos. Quienes ya están inscritos conservan acceso."
          }}
          <template v-if="esGestionOrganizacion">
            Para borrar sesiones, calendario y matrículas usa
            «Eliminar material».
          </template>
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            :disabled="eliminandoCurso"
            @click="cursoPendienteEliminar = undefined"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            :disabled="eliminandoCurso"
            @click="confirmarEliminarCurso"
          >
            {{
              eliminandoCurso
                ? "Procesando…"
                : esGestionOrganizacion
                  ? "Sí, archivar"
                  : "Sí, eliminar"
            }}
          </Button>
        </div>
      </article>
    </div>

    <div
      v-if="cursoPendienteEliminarMaterial"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"
      @click.self="cursoPendienteEliminarMaterial = undefined"
    >
      <article class="w-full max-w-lg border border-border bg-card p-6 shadow-2xl">
        <h2 class="text-lg font-black">¿Eliminar el material del curso?</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          <strong class="text-foreground">{{
            cursoPendienteEliminarMaterial.titulo
          }}</strong>
          se retirará del catálogo, se cancelarán las sesiones en Google
          Calendar, se borrarán las sesiones en vivo y se desvincularán las
          matrículas. Esta acción no se puede deshacer.
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            :disabled="eliminandoMaterial"
            @click="cursoPendienteEliminarMaterial = undefined"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            :disabled="eliminandoMaterial"
            @click="confirmarEliminarMaterial"
          >
            {{ eliminandoMaterial ? "Eliminando…" : "Sí, eliminar material" }}
          </Button>
        </div>
      </article>
    </div>
  </section>
</template>
