<script setup lang="ts">
import { CheckCircle2, Plus, Search, Trash2 } from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { computed, onMounted, reactive, ref } from "vue";

import {
  calcularPrecioConDescuento,
  etiquetaDescuentoAplicaA,
  organizacionService,
  type AreaOrganizacion,
  type AsignacionOrganizacion,
  type PropuestaCursoOrganizacion,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import type {
  UnidadOrganizacional,
  VinculacionUnidad,
} from "@/portal-organizacion/types/estructura-organizacional.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const modal = ref(false);
const detalleVisible = ref(false);
const cargando = ref(true);
const guardando = ref(false);
const mensaje = ref("");
const lista = ref<AsignacionOrganizacion[]>([]);
const areas = ref<AreaOrganizacion[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const catalogo = ref<PropuestaCursoOrganizacion[]>([]);
const unidades = ref<UnidadOrganizacional[]>([]);
const vinculaciones = ref<VinculacionUnidad[]>([]);
const seleccionada = ref<AsignacionOrganizacion>();
const busqueda = ref("");
const filtroEstado = ref("TODOS");
const filtroAlcance = ref("TODOS");
const filtroObligatorio = ref("TODOS");
const nuevaAsignacion = reactive({
  curso: "",
  destino: "Toda la organización",
  vence: "",
  obligatorio: true,
});

const cursosDisponibles = computed(() =>
  catalogo.value
    .filter(
      (curso) => curso.estado === "APROBADO" || curso.estado === "PUBLICADO",
    )
    .map((curso) => curso.titulo),
);
const destinos = computed(() => [
  "Toda la organización",
  "Público externo",
  ...unidades.value.map((unidad) => `Unidad ${unidad.nombre}`),
  ...areas.value.map((area) => `Área ${area.nombre}`),
  ...usuarios.value.map((usuario) => `Persona ${usuario.nombre}`),
]);
const estados = [
  { label: "Todos los estados", value: "TODOS" },
  { label: "Activas", value: "ACTIVA" },
  { label: "Finalizadas", value: "FINALIZADA" },
  { label: "Canceladas", value: "CANCELADA" },
];
const alcances = [
  { label: "Todos los alcances", value: "TODOS" },
  { label: "Toda la organización", value: "ORGANIZACION" },
  { label: "Solo un área", value: "AREA" },
  { label: "Unidad organizacional", value: "UNIDAD" },
  { label: "Público externo", value: "EXTERNO" },
  { label: "Persona", value: "PERSONA" },
];
const obligatoriedades = [
  { label: "Obligatorio y opcional", value: "TODOS" },
  { label: "Obligatorio", value: "SI" },
  { label: "Opcional", value: "NO" },
];

const asignacionesFiltradas = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  return lista.value.filter((asignacion) => {
    const curso = cursoCatalogo(asignacion.curso);
    const coincideBusqueda =
      !termino ||
      [
        asignacion.curso,
        asignacion.destino,
        curso?.docente ?? "",
        curso?.categoria ?? "",
      ].some((valor) => valor.toLowerCase().includes(termino));
    const coincideEstado =
      filtroEstado.value === "TODOS" ||
      (asignacion.estado ?? "ACTIVA") === filtroEstado.value;
    const coincideAlcance =
      filtroAlcance.value === "TODOS" ||
      tipoAlcance(asignacion.destino) === filtroAlcance.value;
    const coincideObligatorio =
      filtroObligatorio.value === "TODOS" ||
      (filtroObligatorio.value === "SI"
        ? asignacion.obligatorio
        : !asignacion.obligatorio);
    return (
      coincideBusqueda &&
      coincideEstado &&
      coincideAlcance &&
      coincideObligatorio
    );
  });
});

const participantes = computed(() => {
  if (!seleccionada.value) return [];
  const destino = seleccionada.value.destino.replace(/^Área |^Unidad |^Persona /, "");
  const unidad = unidades.value.find((item) => item.nombre === destino);
  const idsUnidad = unidad ? idsUnidadYDescendientes(unidad.id) : new Set<string>();
  const usuariosUnidad = new Set(
    vinculaciones.value
      .filter((item) => item.estado === "ACTIVA" && idsUnidad.has(item.unidadId))
      .map((item) => item.usuarioId),
  );
  const filtrados = usuarios.value.filter((usuario) => {
    if (tipoAlcance(seleccionada.value?.destino ?? "") === "ORGANIZACION") {
      return true;
    }
    if (seleccionada.value?.destino.startsWith("Área ")) return usuario.area === destino;
    if (seleccionada.value?.destino.startsWith("Unidad ")) {
      return usuariosUnidad.has(String(usuario.id));
    }
    return usuario.nombre === destino;
  });
  const proporcion = porcentaje(seleccionada.value) / 100;
  return filtrados.map((usuario, indice) => ({
    ...usuario,
    completado: indice < Math.round(filtrados.length * proporcion),
  }));
});

onMounted(async () => {
  try {
    [lista.value, areas.value, usuarios.value, catalogo.value, unidades.value, vinculaciones.value] = await Promise.all([
      organizacionService.asignaciones.listar(),
      organizacionService.areas.listar(),
      organizacionService.usuarios.listar(),
      organizacionService.catalogoCursos.listar(),
      organizacionService.estructura.unidades.listar(),
      organizacionService.estructura.vinculaciones.listar(),
    ]);
    nuevaAsignacion.curso = cursosDisponibles.value[0] ?? "";
  } finally {
    cargando.value = false;
  }
});

function cantidadDestino(destino: string) {
  if (tipoAlcance(destino) === "ORGANIZACION") return usuarios.value.length;
  if (destino.startsWith("Área ")) {
    return usuarios.value.filter((usuario) => usuario.area === destino.slice(5)).length;
  }
  if (destino.startsWith("Unidad ")) {
    const unidad = unidades.value.find((item) => item.nombre === destino.slice(7));
    if (!unidad) return 0;
    const ids = idsUnidadYDescendientes(unidad.id);
    return new Set(
      vinculaciones.value
        .filter((item) => item.estado === "ACTIVA" && ids.has(item.unidadId))
        .map((item) => item.usuarioId),
    ).size;
  }
  if (destino.startsWith("Persona ")) {
    return usuarios.value.some((usuario) => usuario.nombre === destino.slice(8))
      ? 1
      : 0;
  }
  return 0;
}

function tipoAlcance(destino: string) {
  if (destino.startsWith("Unidad ")) return "UNIDAD";
  if (destino.startsWith("Área ")) return "AREA";
  if (destino.startsWith("Persona ")) return "PERSONA";
  if (destino === "Público externo") return "EXTERNO";
  return "ORGANIZACION";
}

function etiquetaAlcance(destino: string) {
  return {
    ORGANIZACION: "Toda la organización",
    AREA: "Solo un área",
    UNIDAD: "Unidad organizacional",
    EXTERNO: "Público externo",
    PERSONA: "Persona",
  }[tipoAlcance(destino)];
}

function idsUnidadYDescendientes(unidadId: string) {
  const ids = new Set([unidadId]);
  let cambio = true;
  while (cambio) {
    cambio = false;
    unidades.value.forEach((unidad) => {
      if (unidad.unidadPadreId && ids.has(unidad.unidadPadreId) && !ids.has(unidad.id)) {
        ids.add(unidad.id);
        cambio = true;
      }
    });
  }
  return ids;
}

function usuariosDestino(destino: string) {
  if (destino === "Toda la organización") return usuarios.value;
  if (destino.startsWith("Área ")) {
    return usuarios.value.filter((usuario) => usuario.area === destino.slice(5));
  }
  if (destino.startsWith("Unidad ")) {
    const unidad = unidades.value.find((item) => item.nombre === destino.slice(7));
    if (!unidad) return [];
    const ids = idsUnidadYDescendientes(unidad.id);
    const usuariosIds = new Set(
      vinculaciones.value
        .filter((item) => item.estado === "ACTIVA" && ids.has(item.unidadId))
        .map((item) => item.usuarioId),
    );
    return usuarios.value.filter((usuario) => usuariosIds.has(String(usuario.id)));
  }
  if (destino.startsWith("Persona ")) {
    return usuarios.value.filter((usuario) => usuario.nombre === destino.slice(8));
  }
  return [];
}

function cursoCatalogo(titulo: string) {
  return catalogo.value.find((curso) => curso.titulo === titulo);
}

function textoPrecio(asignacion: AsignacionOrganizacion) {
  const curso = cursoCatalogo(asignacion.curso);
  if (!curso) return "Sin precio";
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
  return `S/ ${conDto.toFixed(2)} · ${etiquetaDescuentoAplicaA(aplicaA, curso.descuentoArea)}`;
}

function severidadEstado(estado?: AsignacionOrganizacion["estado"]) {
  if (estado === "CANCELADA") return "danger";
  if (estado === "FINALIZADA") return "info";
  return "success";
}

async function crear() {
  if (!nuevaAsignacion.curso) return;
  guardando.value = true;
  try {
    const asignacion = await organizacionService.asignaciones.crear({
      id: `asig-${Date.now()}`,
      curso: nuevaAsignacion.curso,
      destino: nuevaAsignacion.destino,
      asignados: cantidadDestino(nuevaAsignacion.destino),
      completados: 0,
      vence: nuevaAsignacion.vence
        ? new Intl.DateTimeFormat("es-PE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${nuevaAsignacion.vence}T00:00:00Z`))
        : "Sin fecha límite",
      obligatorio: nuevaAsignacion.obligatorio,
      estado: "ACTIVA",
      creadaEn: new Date().toISOString(),
    });
    lista.value.unshift(asignacion);
    const curso = cursoCatalogo(nuevaAsignacion.curso);
    const unidad = nuevaAsignacion.destino.startsWith("Unidad ")
      ? unidades.value.find((item) => item.nombre === nuevaAsignacion.destino.slice(7))
      : undefined;
    if (curso) {
      await Promise.all(
        usuariosDestino(nuevaAsignacion.destino).map((usuario) =>
          organizacionService.matricularUsuarioEnCurso({
            usuarioId: String(usuario.id),
            cursoId: curso.cursoDocenteId,
            curso: curso.titulo,
            unidadOrigenId: unidad?.id,
            modalidad: "ASIGNADA",
          }),
        ),
      );
    }
    modal.value = false;
    mensaje.value = "El curso fue asignado correctamente.";
  } finally {
    guardando.value = false;
  }
}

function porcentaje(asignacion: AsignacionOrganizacion) {
  if (!asignacion.asignados) return 0;
  return Math.round((asignacion.completados / asignacion.asignados) * 100);
}

function verProgreso(asignacion: AsignacionOrganizacion) {
  seleccionada.value = asignacion;
  detalleVisible.value = true;
}

async function cancelar(asignacion: AsignacionOrganizacion) {
  const actualizada = await organizacionService.asignaciones.actualizar(
    asignacion.id,
    { estado: "CANCELADA" },
  );
  const indice = lista.value.findIndex((item) => item.id === asignacion.id);
  if (indice >= 0) lista.value[indice] = actualizada;
  detalleVisible.value = false;
  mensaje.value = "La asignación fue cancelada.";
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <div class="flex flex-wrap justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black">Asignaciones</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Asigna cursos a personas, áreas o toda la organización.
        </p>
      </div>
      <Button @click="modal = true"><Plus class="h-4 w-4" />Nueva asignación</Button>
    </div>

    <p
      v-if="mensaje"
      class="border-l-4 border-l-emerald-600 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
    >
      {{ mensaje }}
    </p>

    <Card class="border-border bg-card">
      <CardContent class="grid gap-3 p-4 lg:grid-cols-[minmax(260px,1fr)_190px_210px_200px]">
        <label class="grid gap-1.5">
          <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Buscar
          </span>
          <span class="relative block">
            <Search
              class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="busqueda"
              class="pl-10"
              placeholder="Curso, docente, categoría o destino..."
            />
          </span>
        </label>
        <label class="grid gap-1.5">
          <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Estado
          </span>
          <Select
            v-model="filtroEstado"
            :options="estados"
            option-label="label"
            option-value="value"
            fluid
          />
        </label>
        <label class="grid gap-1.5">
          <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Alcance
          </span>
          <Select
            v-model="filtroAlcance"
            :options="alcances"
            option-label="label"
            option-value="value"
            fluid
          />
        </label>
        <label class="grid gap-1.5">
          <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Modalidad
          </span>
          <Select
            v-model="filtroObligatorio"
            :options="obligatoriedades"
            option-label="label"
            option-value="value"
            fluid
          />
        </label>
      </CardContent>
    </Card>

    <div v-if="cargando" class="grid gap-4">
      <Skeleton v-for="item in 3" :key="item" class="h-28 w-full" />
    </div>
    <Card v-else class="overflow-hidden border-border bg-card">
      <DataTable
        :value="asignacionesFiltradas"
        data-key="id"
        :paginator="asignacionesFiltradas.length > 8"
        :rows="8"
        :rows-per-page-options="[8, 15, 30]"
        striped-rows
        scrollable
        class="tabla-administracion"
        table-style="min-width: 78rem"
      >
        <template #empty>
          <div class="py-10 text-center text-sm text-muted-foreground">
            No hay asignaciones que coincidan con la búsqueda y los filtros.
          </div>
        </template>
        <Column field="curso" header="Curso" sortable frozen>
          <template #body="{ data }">
            <div class="max-w-72">
              <p class="font-black text-foreground">{{ data.curso }}</p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ cursoCatalogo(data.curso)?.docente ?? "Docente no registrado" }}
              </p>
            </div>
          </template>
        </Column>
        <Column header="Precio" sortable>
          <template #body="{ data }">
            <span class="font-semibold">{{ textoPrecio(data) }}</span>
          </template>
        </Column>
        <Column field="destino" header="Destino" sortable>
          <template #body="{ data }">
            <div>
              <Tag severity="secondary" :value="etiquetaAlcance(data.destino)" />
              <p class="mt-1 text-xs text-muted-foreground">{{ data.destino }}</p>
            </div>
          </template>
        </Column>
        <Column field="asignados" header="Personas" sortable>
          <template #body="{ data }">
            {{ data.asignados }} asignadas
          </template>
        </Column>
        <Column header="Finalización" sortable>
          <template #body="{ data }">
            <div class="min-w-32">
              <div class="mb-1 flex justify-between text-xs">
                <span>{{ data.completados }}/{{ data.asignados }}</span>
                <b>{{ porcentaje(data) }}%</b>
              </div>
              <Progress :model-value="porcentaje(data)" class="h-2" />
            </div>
          </template>
        </Column>
        <Column field="vence" header="Fecha límite" sortable />
        <Column field="obligatorio" header="Modalidad" sortable>
          <template #body="{ data }">
            <Tag
              :severity="data.obligatorio ? 'warn' : 'secondary'"
              :value="data.obligatorio ? 'OBLIGATORIO' : 'OPCIONAL'"
            />
          </template>
        </Column>
        <Column field="estado" header="Estado" sortable>
          <template #body="{ data }">
            <Tag
              :severity="severidadEstado(data.estado)"
              :value="data.estado ?? 'ACTIVA'"
            />
          </template>
        </Column>
        <Column header="Acción" frozen align-frozen="right">
          <template #body="{ data }">
            <Button
              size="sm"
              variant="outline"
              :disabled="data.estado === 'CANCELADA'"
              @click="verProgreso(data)"
            >
              Ver detalle
            </Button>
          </template>
        </Column>
      </DataTable>
    </Card>

    <Dialog
      v-model:visible="modal"
      modal
      header="Nueva asignación"
      :style="{ width: 'min(34rem, calc(100vw - 2rem))' }"
    >
      <div class="grid gap-4">
        <label class="grid gap-2 text-sm font-bold">
          Curso
          <Select v-model="nuevaAsignacion.curso" :options="cursosDisponibles" fluid />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Destinatarios
          <Select v-model="nuevaAsignacion.destino" :options="destinos" fluid />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Fecha límite
          <input
            v-model="nuevaAsignacion.vence"
            type="date"
            class="h-11 border border-border bg-background px-3 font-normal"
          />
        </label>
        <label class="flex gap-2 text-sm">
          <input v-model="nuevaAsignacion.obligatorio" type="checkbox" />
          Curso obligatorio
        </label>
      </div>
      <template #footer>
        <Button variant="outline" @click="modal = false">Cancelar</Button>
        <Button :disabled="guardando || !nuevaAsignacion.curso" @click="crear">
          <CheckCircle2 class="h-4 w-4" />
          {{ guardando ? "Asignando…" : "Asignar curso" }}
        </Button>
      </template>
    </Dialog>

    <Dialog
      v-model:visible="detalleVisible"
      modal
      :header="seleccionada?.curso"
      :style="{ width: 'min(58rem, calc(100vw - 2rem))' }"
    >
      <p class="mb-4 text-sm text-muted-foreground">
        {{ seleccionada?.destino }} · muestra de participantes vinculados
      </p>
      <DataTable
        :value="participantes"
        data-key="id"
        :paginator="participantes.length > 5"
        :rows="5"
        class="tabla-administracion"
      >
        <Column field="nombre" header="Participante" sortable />
        <Column field="area" header="Área" sortable />
        <Column field="progreso" header="Progreso" sortable>
          <template #body="{ data }">{{ data.progreso }}%</template>
        </Column>
        <Column field="completado" header="Estado">
          <template #body="{ data }">
            <Tag
              :severity="data.completado ? 'success' : 'warn'"
              :value="data.completado ? 'COMPLETADO' : 'PENDIENTE'"
            />
          </template>
        </Column>
      </DataTable>
      <template #footer>
        <Button
          v-if="seleccionada"
          variant="outline"
          class="mr-auto text-red-600"
          @click="cancelar(seleccionada)"
        >
          <Trash2 class="h-4 w-4" />Cancelar asignación
        </Button>
        <Button @click="detalleVisible = false">Cerrar</Button>
      </template>
    </Dialog>
  </section>
</template>
