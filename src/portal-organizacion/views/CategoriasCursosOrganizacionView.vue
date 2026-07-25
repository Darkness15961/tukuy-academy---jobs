<script setup lang="ts">
import { BookOpen, Plus, Search, Tags, Trash2 } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Select from "primevue/select";
import Tag from "primevue/tag";
import ToggleSwitch from "primevue/toggleswitch";
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import IconoAyuda from "@/components/shared/IconoAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useContextoSesion } from "@/composables/useContextoSesion";
import type { CategoriaCursoEntidad } from "@/modulos/comunidad/types/entidad-publica.types";
import {
  categoriasCursosService,
  type CursoClasificadoEntidad,
} from "@/portal-organizacion/services/categorias-cursos.service";

type Pestana = "CATEGORIAS" | "CURSOS";

const router = useRouter();
const { tienePermiso } = useContextoSesion();

const puedeGestionar = computed(
  () =>
    tienePermiso("categorias.gestionar") ||
    tienePermiso("cursos.aprobar") ||
    tienePermiso("cursos.editar"),
);

const pestana = ref<Pestana>("CATEGORIAS");
const categorias = ref<CategoriaCursoEntidad[]>([]);
const cursos = ref<CursoClasificadoEntidad[]>([]);
const conteoPorCategoria = ref<Record<string, number>>({});
const cargando = ref(true);
const guardando = ref(false);
const error = ref("");
const mensaje = ref("");
const buscarCurso = ref("");
const filtroCategoriaId = ref("todas");

const formulario = reactive({
  nombre: "",
  descripcion: "",
  color: "#0B3A78",
  visibleEnCatalogo: true,
  seleccionableComoInteres: true,
});

const opcionesFiltroCategoria = computed(() => [
  { etiqueta: "Todas las categorías", valor: "todas" },
  ...categorias.value.map((item) => ({
    etiqueta: `${item.nombre} (${conteoPorCategoria.value[item.id] ?? 0})`,
    valor: item.id,
  })),
]);

const cursosFiltrados = computed(() => {
  const termino = buscarCurso.value.trim().toLowerCase();
  return cursos.value.filter((curso) => {
    const coincideCategoria =
      filtroCategoriaId.value === "todas" ||
      curso.categoriaIds.includes(filtroCategoriaId.value);
    const coincideBusqueda =
      !termino ||
      [curso.titulo, curso.docente, ...curso.categoriaNombres].some((valor) =>
        valor.toLowerCase().includes(termino),
      );
    return coincideCategoria && coincideBusqueda;
  });
});

async function cargar() {
  cargando.value = true;
  error.value = "";
  try {
    const [listaCategorias, listaCursos, conteos] = await Promise.all([
      categoriasCursosService.listar(),
      categoriasCursosService.listarCursosClasificados(),
      categoriasCursosService.contarCursosPorCategoria(),
    ]);
    categorias.value = listaCategorias;
    cursos.value = listaCursos;
    conteoPorCategoria.value = conteos;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo cargar la clasificación.";
  } finally {
    cargando.value = false;
  }
}

onMounted(() => {
  void cargar();
});

async function crear() {
  error.value = "";
  mensaje.value = "";
  if (!puedeGestionar.value) {
    error.value = "No tienes permiso para crear categorías.";
    return;
  }
  if (!formulario.nombre.trim()) {
    error.value = "Escribe un nombre para la categoría.";
    return;
  }
  guardando.value = true;
  try {
    const creada = await categoriasCursosService.crear({ ...formulario });
    await cargar();
    mensaje.value = `Categoría “${creada.nombre}” creada.`;
    formulario.nombre = "";
    formulario.descripcion = "";
    formulario.color = "#0B3A78";
    formulario.visibleEnCatalogo = true;
    formulario.seleccionableComoInteres = true;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo crear la categoría.";
  } finally {
    guardando.value = false;
  }
}

async function cambiarEstado(categoria: CategoriaCursoEntidad) {
  if (!puedeGestionar.value) return;
  const estado = categoria.estado === "ACTIVA" ? "INACTIVA" : "ACTIVA";
  await categoriasCursosService.actualizar(categoria.id, { estado });
  await cargar();
  mensaje.value =
    estado === "ACTIVA"
      ? `“${categoria.nombre}” activada.`
      : `“${categoria.nombre}” desactivada.`;
}

async function eliminar(categoria: CategoriaCursoEntidad) {
  if (!puedeGestionar.value) return;
  if (!window.confirm(`¿Eliminar la categoría “${categoria.nombre}”?`)) return;
  error.value = "";
  try {
    await categoriasCursosService.eliminar(categoria.id);
    await cargar();
    mensaje.value = `Se eliminó “${categoria.nombre}”.`;
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo eliminar.";
  }
}

function severidadEstado(estado: string) {
  if (estado === "PUBLICADO" || estado === "APROBADO") return "success";
  if (estado === "CONTENIDO_REVISADO") return "success";
  if (estado === "EN_REVISION") return "warn";
  if (estado === "OBSERVADO") return "danger";
  return "info";
}

function formatoEstado(estado: string) {
  return estado.replaceAll("_", " ");
}

function verEnCursos() {
  void router.push("/organizacion/cursos");
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <header>
      <TituloConAyuda
        eyebrow="Configuración académica"
        titulo="Categorías de cursos"
        ayuda="Categorías de la entidad para clasificar y recomendar cursos. No conceden acceso."
      />
    </header>

    <div class="flex flex-wrap gap-2">
      <Button
        size="sm"
        :variant="pestana === 'CATEGORIAS' ? 'default' : 'outline'"
        @click="pestana = 'CATEGORIAS'"
      >
        <Tags class="h-4 w-4" />
        Categorías
      </Button>
      <Button
        size="sm"
        :variant="pestana === 'CURSOS' ? 'default' : 'outline'"
        @click="pestana = 'CURSOS'"
      >
        <BookOpen class="h-4 w-4" />
        Cursos clasificados
        <span class="rounded-sm bg-white/20 px-1.5 text-[10px] font-black">
          {{ cursos.length }}
        </span>
      </Button>
    </div>

    <p
      v-if="mensaje"
      class="border-l-4 border-l-emerald-600 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
    >
      {{ mensaje }}
    </p>
    <p
      v-if="error"
      class="border-l-4 border-red-600 bg-red-500/10 px-4 py-3 text-sm text-red-700"
    >
      {{ error }}
    </p>

    <template v-if="pestana === 'CATEGORIAS'">
      <Card v-if="puedeGestionar" class="border-border border-t-4 border-t-accent">
        <CardContent class="grid gap-4 p-5">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-black">Nueva categoría</h2>
            <IconoAyuda
              texto="Se usará al clasificar cursos en la aprobación comercial."
            />
          </div>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.3fr_6rem_auto_auto_auto] xl:items-end">
            <label class="grid gap-2">
              <span class="filtro-label">Nombre</span>
              <input
                v-model="formulario.nombre"
                class="h-10 w-full border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                placeholder="Ej. Seguridad en obra"
                @keyup.enter="crear"
              />
            </label>
            <label class="grid gap-2">
              <span class="filtro-label">Descripción</span>
              <input
                v-model="formulario.descripcion"
                class="h-10 w-full border border-input bg-card px-3 text-sm outline-none focus:border-primary"
                placeholder="Qué contenidos agrupa"
              />
            </label>
            <label class="grid gap-2">
              <span class="filtro-label">Color</span>
              <input
                v-model="formulario.color"
                type="color"
                class="h-10 w-full border border-border bg-card p-1"
              />
            </label>
            <label class="flex h-10 items-center gap-2 text-xs font-bold">
              <ToggleSwitch v-model="formulario.visibleEnCatalogo" />
              Visible
            </label>
            <label class="flex h-10 items-center gap-2 text-xs font-bold">
              <ToggleSwitch v-model="formulario.seleccionableComoInteres" />
              Interés
            </label>
            <Button type="button" :disabled="guardando" @click="crear">
              <Plus class="h-4 w-4" />
              {{ guardando ? "Creando..." : "Crear" }}
            </Button>
          </div>
        </CardContent>
      </Card>
      <p
        v-else
        class="border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
      >
        Solo consulta. Necesitas permiso para gestionar categorías.
      </p>

      <div
        v-if="cargando"
        class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <Skeleton v-for="i in 6" :key="i" class="h-48 w-full" />
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card
          v-for="categoria in categorias"
          :key="categoria.id"
          class="border-border"
          :class="categoria.estado === 'INACTIVA' ? 'opacity-60' : ''"
        >
          <CardContent class="p-5">
            <div class="flex items-start justify-between gap-3">
              <span
                class="grid h-11 w-11 place-items-center text-white"
                :style="{ backgroundColor: categoria.color }"
              >
                <Tags class="h-5 w-5" />
              </span>
              <div v-if="puedeGestionar" class="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  @click="cambiarEstado(categoria)"
                >
                  {{ categoria.estado === "ACTIVA" ? "Desactivar" : "Activar" }}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Eliminar categoría"
                  @click="eliminar(categoria)"
                >
                  <Trash2 class="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
            <h2 class="mt-4 text-lg font-black">{{ categoria.nombre }}</h2>
            <p class="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">
              {{ categoria.descripcion || "Sin descripción" }}
            </p>
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <span
                class="bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-primary"
              >
                {{ conteoPorCategoria[categoria.id] ?? 0 }}
                {{
                  (conteoPorCategoria[categoria.id] ?? 0) === 1
                    ? "curso"
                    : "cursos"
                }}
              </span>
              <span class="text-[10px] font-black uppercase text-muted-foreground">
                {{
                  categoria.visibleEnCatalogo
                    ? "Visible en catálogo"
                    : "Oculta"
                }}
              </span>
              <span class="text-[10px] font-black uppercase text-muted-foreground">
                ·
              </span>
              <span class="text-[10px] font-black uppercase text-muted-foreground">
                {{
                  categoria.seleccionableComoInteres
                    ? "Interés seleccionable"
                    : "Uso interno"
                }}
              </span>
            </div>
            <Button
              class="mt-4 w-full"
              size="sm"
              variant="outline"
              @click="
                filtroCategoriaId = categoria.id;
                pestana = 'CURSOS';
              "
            >
              Ver cursos
            </Button>
          </CardContent>
        </Card>
      </div>
    </template>

    <template v-else>
      <Card class="border-border border-t-4 border-t-primary">
        <CardContent class="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr]">
          <label class="grid gap-2">
            <span class="filtro-label">Buscar curso</span>
            <span class="relative block">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                v-model="buscarCurso"
                class="h-10 w-full border border-input bg-card py-2 pl-10 pr-3 text-sm outline-none focus:border-primary"
                placeholder="Título, docente o categoría"
              />
            </span>
          </label>
          <label class="grid gap-2">
            <span class="filtro-label">Filtrar por categoría</span>
            <Select
              v-model="filtroCategoriaId"
              class="filtro-control w-full"
              :options="opcionesFiltroCategoria"
              option-label="etiqueta"
              option-value="valor"
              panel-class="tukuy-filtro-panel"
              fluid
            />
          </label>
        </CardContent>
      </Card>

      <section class="overflow-hidden border border-border bg-card">
        <div class="border-b border-border px-5 py-4">
          <h2 class="text-sm font-black">Cursos de la entidad</h2>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Mostrando {{ cursosFiltrados.length }} de {{ cursos.length }}
          </p>
        </div>

        <div v-if="cargando" class="grid gap-3 p-4">
          <Skeleton v-for="i in 5" :key="i" class="h-16 w-full" />
        </div>

        <DataTable
          v-else
          class="tabla-estudiantes"
          :value="cursosFiltrados"
          data-key="id"
          size="small"
          scrollable
          removable-sort
          :paginator="cursosFiltrados.length > 8"
          :rows="8"
          table-style="min-width: 68rem"
        >
          <template #empty>
            <div class="px-4 py-12 text-center text-sm text-muted-foreground">
              Sin cursos para este filtro.
            </div>
          </template>

          <Column header="Curso" field="titulo" sortable style="min-width: 22rem">
            <template #body="{ data }">
              <div class="flex items-center gap-3 py-1">
                <img
                  :src="data.imagen"
                  :alt="data.titulo"
                  class="h-14 w-20 shrink-0 object-cover"
                />
                <div class="min-w-0">
                  <strong class="block truncate text-sm">{{ data.titulo }}</strong>
                  <p class="truncate text-xs text-muted-foreground">
                    {{ data.docente }} · {{ data.duracion }}
                  </p>
                </div>
              </div>
            </template>
          </Column>

          <Column header="Categorías" style="min-width: 14rem">
            <template #body="{ data }">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="nombre in data.categoriaNombres"
                  :key="nombre"
                  class="bg-muted px-2 py-0.5 text-[10px] font-black uppercase"
                >
                  {{ nombre }}
                </span>
              </div>
            </template>
          </Column>

          <Column header="Alcance" style="min-width: 8rem">
            <template #body="{ data }">
              <span class="text-xs font-bold text-muted-foreground">
                {{
                  data.alcance === "INTERNO"
                    ? "Interno"
                    : data.alcance === "PUBLICO"
                      ? "Público"
                      : "—"
                }}
              </span>
            </template>
          </Column>

          <Column field="estado" header="Estado" sortable style="min-width: 9rem">
            <template #body="{ data }">
              <Tag
                :severity="severidadEstado(data.estado)"
                :value="formatoEstado(data.estado)"
              />
            </template>
          </Column>

          <Column header="" style="min-width: 8rem">
            <template #body>
              <Button size="sm" variant="outline" @click="verEnCursos">
                Ver en Cursos
              </Button>
            </template>
          </Column>
        </DataTable>
      </section>
    </template>
  </section>
</template>
