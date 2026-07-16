<script setup lang="ts">
import {
  BookOpenCheck,
  Check,
  Eye,
  MessageSquareWarning,
  Search,
  X,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Textarea from "primevue/textarea";
import { computed, onMounted, ref } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  administracionService,
  type CursoAdministrado,
} from "@/api/services/administracion.service";
import type { EstadoRevisionCurso } from "../data/administracion.mock";

type CursoRevision = CursoAdministrado;

const cargando = ref(true);
const cursos = ref<CursoRevision[]>([]);
const busqueda = ref("");
const estado = ref("TODOS");
const cursoSeleccionado = ref<CursoRevision | null>(null);
const accionPendiente = ref<"OBSERVADO" | "RECHAZADO" | null>(null);
const comentario = ref("");
const mensaje = ref("");

onMounted(async () => {
  try {
    cursos.value = await administracionService.cursos.listar();
  } finally {
    cargando.value = false;
  }
});

const filtrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase();
  return cursos.value.filter(
    (curso) =>
      (!termino ||
        [curso.titulo, curso.docente, curso.organizacion, curso.categoria].some(
          (valor) => valor.toLowerCase().includes(termino),
        )) &&
      (estado.value === "TODOS" || curso.estado === estado.value),
  );
});

const resumen = computed(() => ({
  revision: cursos.value.filter((curso) => curso.estado === "EN_REVISION")
    .length,
  observados: cursos.value.filter((curso) => curso.estado === "OBSERVADO")
    .length,
  aprobados: cursos.value.filter((curso) => curso.estado === "APROBADO").length,
}));

function textoEstado(valor: EstadoRevisionCurso) {
  return {
    EN_REVISION: "En revisión",
    OBSERVADO: "Observado",
    APROBADO: "Aprobado",
  }[valor];
}

function severidad(valor: EstadoRevisionCurso) {
  if (valor === "APROBADO") return "success";
  if (valor === "OBSERVADO") return "warn";
  return "info";
}

async function aprobar(curso: CursoRevision) {
  curso.estado = "APROBADO";
  await administracionService.cursos.actualizar(curso.id, {
    estado: "APROBADO",
  });
  mensaje.value = `${curso.titulo} fue aprobado y quedó disponible para publicación.`;
}

function solicitarDecision(
  curso: CursoRevision,
  accion: "OBSERVADO" | "RECHAZADO",
) {
  cursoSeleccionado.value = curso;
  accionPendiente.value = accion;
  comentario.value = "";
}

async function confirmarDecision() {
  if (
    !cursoSeleccionado.value ||
    !accionPendiente.value ||
    comentario.value.trim().length < 10
  )
    return;
  cursoSeleccionado.value.estado = "OBSERVADO";
  await administracionService.cursos.actualizar(cursoSeleccionado.value.id, {
    estado: "OBSERVADO",
  });
  mensaje.value = `${cursoSeleccionado.value.titulo} fue devuelto al docente con observaciones.`;
  cursoSeleccionado.value = null;
  accionPendiente.value = null;
}
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div>
      <p class="text-xs font-black uppercase tracking-[.2em] text-violet-700">
        Control editorial
      </p>
      <h1 class="mt-2 text-3xl font-black">Cursos y revisión</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Revisa estructura, calidad académica, presentación, precio y certificado
        antes de publicar.
      </p>
    </div>

    <div
      v-if="mensaje"
      class="border-l-4 border-l-teal-600 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
    >
      {{ mensaje }}
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <Skeleton
        v-if="cargando"
        v-for="item in 3"
        :key="item"
        class="h-24 w-full"
      />
      <Card
        v-else
        v-for="item in [
          {
            etiqueta: 'En revisión',
            valor: resumen.revision,
            fondo: 'bg-primary/10',
            texto: 'text-blue-700',
          },
          {
            etiqueta: 'Con observaciones',
            valor: resumen.observados,
            fondo: 'bg-amber-50',
            texto: 'text-amber-700',
          },
          {
            etiqueta: 'Aprobados',
            valor: resumen.aprobados,
            fondo: 'bg-teal-50',
            texto: 'text-teal-700',
          },
        ]"
        :key="item.etiqueta"
        class="border-border bg-card"
        ><CardContent class="flex items-center gap-4 p-5"
          ><div
            class="grid h-11 w-11 place-items-center"
            :class="[item.fondo, item.texto]"
          >
            <BookOpenCheck class="h-5 w-5" />
          </div>
          <div>
            <strong class="text-2xl font-black">{{ item.valor }}</strong>
            <p class="text-xs text-muted-foreground">{{ item.etiqueta }}</p>
          </div></CardContent
        ></Card
      >
    </div>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div
          class="grid gap-3 border-b border-border p-5 md:grid-cols-[1fr_16rem]"
        >
          <label>
            <span class="filtro-label">Buscar cursos</span>
            <span class="relative block">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <InputText
                v-model="busqueda"
                class="filtro-control w-full pl-10"
                placeholder="Curso, docente, organización o categoría"
              />
            </span>
          </label>
          <label>
            <span class="filtro-label">Estado de revisión</span>
            <Select
              v-model="estado"
              :options="[
                { label: 'Todos los estados', value: 'TODOS' },
                { label: 'En revisión', value: 'EN_REVISION' },
                { label: 'Observado', value: 'OBSERVADO' },
                { label: 'Aprobado', value: 'APROBADO' },
              ]"
              option-label="label"
              option-value="value"
              class="filtro-control w-full"
            />
          </label>
        </div>
        <div v-if="cargando" class="space-y-2 p-5">
          <Skeleton v-for="item in 5" :key="item" class="h-14 w-full" />
        </div>
        <DataTable
          v-else
          class="tabla-administracion"
          :value="filtrados"
          data-key="id"
          size="small"
          scrollable
          resizable-columns
          column-resize-mode="fit"
          removable-sort
          :paginator="filtrados.length > 5"
          :rows="5"
          :rows-per-page-options="[5, 10, 20]"
          paginator-template="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          current-page-report-template="{first}–{last} de {totalRecords} cursos"
          :always-show-paginator="false"
          table-style="min-width: 86rem"
        >
          <Column
            field="titulo"
            header="Curso"
            sortable
            style="min-width: 19rem"
            ><template #body="{ data }"
              ><div>
                <strong>{{ data.titulo }}</strong>
                <p class="text-xs text-muted-foreground">
                  {{ data.categoria }} · {{ data.lecciones }} lecciones ·
                  {{ data.duracion }}
                </p>
              </div></template
            ></Column
          >
          <Column
            field="docente"
            header="Docente"
            sortable
            style="min-width: 12rem"
          />
          <Column
            field="organizacion"
            header="Contexto"
            sortable
            style="min-width: 14rem"
          />
          <Column
            field="enviado"
            header="Enviado"
            sortable
            style="min-width: 9rem"
          />
          <Column
            field="estado"
            header="Estado"
            sortable
            style="min-width: 9rem"
            ><template #body="{ data }"
              ><Tag
                :severity="severidad(data.estado)"
                :value="textoEstado(data.estado)" /></template
          ></Column>
          <Column header="Decisión editorial" style="min-width: 23rem"
            ><template #body="{ data }"
              ><div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  @click="mensaje = `Abriendo vista previa de ${data.titulo}.`"
                  ><Eye class="h-4 w-4" /> Revisar</Button
                ><Button
                  size="sm"
                  class="bg-teal-700 hover:bg-teal-800"
                  :disabled="data.estado === 'APROBADO'"
                  @click="aprobar(data)"
                  ><Check class="h-4 w-4" /> Aprobar</Button
                ><Button
                  size="sm"
                  variant="outline"
                  :disabled="data.estado === 'APROBADO'"
                  @click="solicitarDecision(data, 'OBSERVADO')"
                  ><MessageSquareWarning class="h-4 w-4" /> Observar</Button
                ><Button
                  size="icon"
                  variant="outline"
                  class="text-red-600"
                  :disabled="data.estado === 'APROBADO'"
                  @click="solicitarDecision(data, 'RECHAZADO')"
                  ><X class="h-4 w-4"
                /></Button></div></template
          ></Column>
        </DataTable>
      </CardContent>
    </Card>

    <Dialog
      :visible="Boolean(cursoSeleccionado)"
      modal
      :header="
        accionPendiente === 'RECHAZADO'
          ? 'Rechazar curso'
          : 'Enviar observaciones'
      "
      :style="{ width: 'min(92vw, 42rem)' }"
      @update:visible="!$event && (cursoSeleccionado = null)"
    >
      <p class="text-sm leading-6 text-muted-foreground">
        Explica con precisión qué debe corregir el docente en
        <strong>{{ cursoSeleccionado?.titulo }}</strong
        >. El comentario formará parte del historial de revisión.
      </p>
      <label class="mt-5 block"
        ><span
          class="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground"
          >Comentario editorial</span
        ><Textarea
          v-model="comentario"
          rows="6"
          class="w-full"
          placeholder="Detalla las observaciones sobre contenidos, presentación, precio o certificado..."
      /></label>
      <p
        class="mt-2 text-xs"
        :class="
          comentario.trim().length < 10 ? 'text-amber-700' : 'text-teal-700'
        "
      >
        Mínimo 10 caracteres · {{ comentario.trim().length }} ingresados
      </p>
      <template #footer
        ><Button variant="outline" @click="cursoSeleccionado = null"
          >Cancelar</Button
        ><Button
          class="bg-violet-800 hover:bg-violet-900"
          :disabled="comentario.trim().length < 10"
          @click="confirmarDecision"
          >Enviar al docente</Button
        ></template
      >
    </Dialog>
  </section>
</template>
