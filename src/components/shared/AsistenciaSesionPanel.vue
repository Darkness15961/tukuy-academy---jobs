<script setup lang="ts">
import { ClipboardCheck } from "lucide-vue-next";
import { computed, ref, watch } from "vue";

import { apiConfig } from "@/api/config";
import { Button } from "@/components/ui/button";

type FilaAsistencia = {
  estudianteId: string;
  matriculaId?: string;
  nombre: string;
  iniciales: string;
  estado: string;
};

const props = defineProps<{
  sesionId?: string | null;
}>();

const emit = defineEmits<{
  actualizado: [presentes: number];
}>();

const activa = apiConfig.secundariaCursos;
const cargando = ref(false);
const guardando = ref(false);
const error = ref("");
const asistencias = ref<FilaAsistencia[]>([]);

const uuidValido = computed(
  () => !!props.sesionId && /^[0-9a-f-]{36}$/i.test(props.sesionId),
);

const presentes = computed(
  () => asistencias.value.filter((item) => item.estado === "PRESENTE").length,
);

watch(
  () => props.sesionId,
  async (sesionId) => {
    asistencias.value = [];
    error.value = "";
    if (!activa || !sesionId || !uuidValido.value) return;
    cargando.value = true;
    try {
      const { secundariaGatewayService } = await import(
        "@/api/services/secundaria-gateway.service"
      );
      const data = await secundariaGatewayService.listarAsistenciaSesion(sesionId);
      asistencias.value = (data.asistencias ?? []).map((item) => ({
        estudianteId: item.estudianteId,
        matriculaId: item.matriculaId,
        nombre: item.nombre,
        iniciales: item.iniciales,
        estado: item.estado === "SIN_MARCAR" ? "AUSENTE" : item.estado,
      }));
      emit("actualizado", data.presentes ?? presentes.value);
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "No se pudo cargar la asistencia.";
    } finally {
      cargando.value = false;
    }
  },
  { immediate: true },
);

function marcarTodos(estado: "PRESENTE" | "AUSENTE") {
  for (const fila of asistencias.value) fila.estado = estado;
}

async function guardar() {
  if (!props.sesionId || !activa || !asistencias.value.length) return;
  guardando.value = true;
  error.value = "";
  try {
    const { secundariaGatewayService } = await import(
      "@/api/services/secundaria-gateway.service"
    );
    const data = await secundariaGatewayService.marcarAsistenciaSesion(
      props.sesionId,
      asistencias.value.map((item) => ({
        estudianteId: item.estudianteId,
        matriculaId: item.matriculaId,
        estado: item.estado,
      })),
    );
    asistencias.value = (data.asistencias ?? []).map((item) => ({
      estudianteId: item.estudianteId,
      matriculaId: item.matriculaId,
      nombre: item.nombre,
      iniciales: item.iniciales ?? item.nombre.slice(0, 2).toUpperCase(),
      estado: item.estado,
    }));
    emit("actualizado", data.presentes ?? presentes.value);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo guardar la asistencia.";
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <div v-if="activa && uuidValido" class="mt-5">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 class="flex items-center gap-2 font-black">
        <ClipboardCheck class="h-4 w-4 text-primary" />
        Pasar lista
        <span class="text-xs font-normal text-muted-foreground">
          ({{ presentes }}/{{ asistencias.length }} presentes)
        </span>
      </h3>
      <div class="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          :disabled="!asistencias.length"
          @click="marcarTodos('PRESENTE')"
        >
          Todos presentes
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="!asistencias.length"
          @click="marcarTodos('AUSENTE')"
        >
          Todos ausentes
        </Button>
      </div>
    </div>

    <p v-if="cargando" class="text-sm text-muted-foreground">
      Cargando matriculados…
    </p>
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-else-if="!asistencias.length" class="text-sm text-muted-foreground">
      No hay alumnos matriculados en la edición de este curso.
    </p>
    <div v-else class="max-h-64 space-y-2 overflow-y-auto pr-1">
      <div
        v-for="fila in asistencias"
        :key="fila.estudianteId"
        class="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{{ fila.nombre }}</p>
          <p class="text-xs text-muted-foreground">{{ fila.iniciales }}</p>
        </div>
        <select
          v-model="fila.estado"
          class="h-9 rounded-md border border-border bg-card px-2 text-sm"
        >
          <option value="PRESENTE">Presente</option>
          <option value="TARDANZA">Tardanza</option>
          <option value="AUSENTE">Ausente</option>
        </select>
      </div>
    </div>

    <div v-if="asistencias.length" class="mt-3 flex justify-end">
      <Button :disabled="guardando" @click="guardar">
        {{ guardando ? "Guardando…" : "Guardar asistencia" }}
      </Button>
    </div>
  </div>
</template>
