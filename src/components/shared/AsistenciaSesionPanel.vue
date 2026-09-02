<script setup lang="ts">
import { ClipboardCheck, Plus, Lock } from "lucide-vue-next";
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

type PaseResumen = {
  id: string;
  numero: number;
  titulo?: string | null;
  estado: string;
  codigo?: string | null;
  presentes?: number;
};

type ResumenAlumno = {
  estudianteId: string;
  nombre: string;
  iniciales?: string;
  pasesPresente: number;
  pasesTotales: number;
  porcentajeAsistencia: number;
  estadoResumen: string;
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
const abriendo = ref(false);
const cerrando = ref(false);
const error = ref("");
const modoLegacy = ref(false);

const pases = ref<PaseResumen[]>([]);
const resumenAlumnos = ref<ResumenAlumno[]>([]);
const paseActivoId = ref<string | null>(null);
const asistencias = ref<FilaAsistencia[]>([]);
const estadoPaseActivo = ref("");
const codigoPaseActivo = ref("");

const uuidValido = computed(
  () => !!props.sesionId && /^[0-9a-f-]{36}$/i.test(props.sesionId),
);

const presentes = computed(
  () =>
    asistencias.value.filter(
      (item) => item.estado === "PRESENTE" || item.estado === "TARDANZA",
    ).length,
);

const presentesResumen = computed(
  () =>
    resumenAlumnos.value.filter((a) => a.estadoResumen === "PRESENTE").length,
);

async function gateway() {
  const { secundariaGatewayService } = await import(
    "@/api/services/secundaria-gateway.service"
  );
  return secundariaGatewayService;
}

async function cargarPasesYResumen() {
  if (!props.sesionId) return;
  const gw = await gateway();
  const data = await gw.listarPasesAsistencia(props.sesionId);
  pases.value = (data.pases ?? []).map((p) => ({
    id: p.id,
    numero: p.numero,
    titulo: p.titulo,
    estado: p.estado,
    codigo: p.codigo,
    presentes: p.presentes,
  }));
  resumenAlumnos.value = (data.resumenAlumnos ?? []).map((a) => {
    const total = a.pasesTotales ?? data.totalPases ?? 0;
    const presentes = a.pasesPresente ?? 0;
    const porcentaje =
      typeof a.porcentajeAsistencia === "number"
        ? a.porcentajeAsistencia
        : total > 0
          ? Math.round((100 * presentes) / total)
          : 0;
    return {
      estudianteId: a.estudianteId,
      nombre: a.nombre,
      iniciales: a.iniciales,
      pasesPresente: presentes,
      pasesTotales: total,
      porcentajeAsistencia: porcentaje,
      estadoResumen: porcentaje >= 50 ? "PRESENTE" : "AUSENTE",
    };
  });
  emit("actualizado", presentesResumen.value);
}

async function cargarAsistenciaPase(paseId: string) {
  const gw = await gateway();
  const data = await gw.listarAsistenciaPase(paseId);
  estadoPaseActivo.value = data.estado ?? "";
  codigoPaseActivo.value = data.codigo ?? "";
  asistencias.value = (data.asistencias ?? []).map((item) => ({
    estudianteId: item.estudianteId,
    matriculaId: item.matriculaId,
    nombre: item.nombre,
    iniciales: item.iniciales,
    estado: item.estado === "SIN_MARCAR" ? "AUSENTE" : item.estado,
  }));
}

async function cargarLegacy() {
  if (!props.sesionId) return;
  const gw = await gateway();
  const data = await gw.listarAsistenciaSesion(props.sesionId);
  asistencias.value = (data.asistencias ?? []).map((item) => ({
    estudianteId: item.estudianteId,
    matriculaId: item.matriculaId,
    nombre: item.nombre,
    iniciales: item.iniciales,
    estado: item.estado === "SIN_MARCAR" ? "AUSENTE" : item.estado,
  }));
  emit("actualizado", data.presentes ?? presentes.value);
}

async function cargarTodo() {
  asistencias.value = [];
  pases.value = [];
  resumenAlumnos.value = [];
  paseActivoId.value = null;
  error.value = "";
  modoLegacy.value = false;
  if (!activa || !props.sesionId || !uuidValido.value) return;

  cargando.value = true;
  try {
    await cargarPasesYResumen();
    const abierto = pases.value.find((p) => p.estado === "ABIERTO");
    const elegido = abierto ?? pases.value[pases.value.length - 1] ?? null;
    if (elegido) {
      paseActivoId.value = elegido.id;
      await cargarAsistenciaPase(elegido.id);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/20260831220000|pases_asistencia|Falta ejecutar/i.test(msg)) {
      modoLegacy.value = true;
      try {
        await cargarLegacy();
      } catch (legacyErr) {
        error.value =
          legacyErr instanceof Error
            ? legacyErr.message
            : "No se pudo cargar la asistencia.";
      }
    } else {
      error.value = msg || "No se pudo cargar la asistencia.";
    }
  } finally {
    cargando.value = false;
  }
}

watch(() => props.sesionId, cargarTodo, { immediate: true });

async function seleccionarPase(paseId: string) {
  if (paseActivoId.value === paseId) return;
  paseActivoId.value = paseId;
  error.value = "";
  cargando.value = true;
  try {
    await cargarAsistenciaPase(paseId);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo cargar el pase.";
  } finally {
    cargando.value = false;
  }
}

async function llamarLista() {
  if (!props.sesionId || !activa) return;
  abriendo.value = true;
  error.value = "";
  try {
    const gw = await gateway();
    const data = await gw.abrirPaseAsistencia(props.sesionId);
    await cargarPasesYResumen();
    if (data.pase?.id) {
      paseActivoId.value = data.pase.id;
      await cargarAsistenciaPase(data.pase.id);
    }
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo abrir la llamada de lista.";
  } finally {
    abriendo.value = false;
  }
}

async function cerrarPaseActivo() {
  if (!paseActivoId.value) return;
  cerrando.value = true;
  error.value = "";
  try {
    const gw = await gateway();
    await gw.cerrarPaseAsistencia(paseActivoId.value);
    await cargarPasesYResumen();
    await cargarAsistenciaPase(paseActivoId.value);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "No se pudo cerrar el pase.";
  } finally {
    cerrando.value = false;
  }
}

function marcarTodos(estado: "PRESENTE" | "AUSENTE") {
  for (const fila of asistencias.value) fila.estado = estado;
}

async function guardar() {
  if (!activa || !asistencias.value.length) return;
  guardando.value = true;
  error.value = "";
  try {
    const gw = await gateway();
    if (modoLegacy.value) {
      if (!props.sesionId) return;
      const data = await gw.marcarAsistenciaSesion(
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
      return;
    }

    if (!paseActivoId.value) return;
    const data = await gw.marcarAsistenciaPase(
      paseActivoId.value,
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
    await cargarPasesYResumen();
    emit("actualizado", presentesResumen.value || (data.presentes ?? presentes.value));
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
        {{ modoLegacy ? "Pasar lista" : "Llamar lista" }}
        <span class="text-xs font-normal text-muted-foreground">
          <template v-if="modoLegacy">
            ({{ presentes }}/{{ asistencias.length }} presentes)
          </template>
          <template v-else-if="pases.length">
            ({{ presentesResumen }}/{{ resumenAlumnos.length || asistencias.length }}
            con ≥50% · {{ pases.length }} pase{{ pases.length === 1 ? "" : "s" }})
          </template>
        </span>
      </h3>
      <div class="flex flex-wrap gap-2">
        <Button
          v-if="!modoLegacy"
          size="sm"
          class="bg-primary"
          :disabled="abriendo || cargando"
          @click="llamarLista"
        >
          <Plus class="h-4 w-4" />
          {{ abriendo ? "Abriendo…" : "Llamar lista" }}
        </Button>
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

    <p v-if="!modoLegacy" class="mb-3 text-xs text-muted-foreground">
      Puedes llamar lista varias veces (inicio, mitad, cierre…). El % de
      asistencia se calcula sobre los pases que hayas abierto.
    </p>

    <div v-if="!modoLegacy && pases.length" class="mb-3 flex flex-wrap gap-2">
      <button
        v-for="pase in pases"
        :key="pase.id"
        type="button"
        class="rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="
          pase.id === paseActivoId
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground hover:bg-muted'
        "
        @click="seleccionarPase(pase.id)"
      >
        #{{ pase.numero }}
        {{ pase.titulo || `Llamada ${pase.numero}` }}
        <span class="ml-1 font-normal opacity-70">
          · {{ pase.estado === "ABIERTO" ? "abierto" : "cerrado" }}
          <template v-if="pase.presentes != null"> · {{ pase.presentes }}</template>
        </span>
      </button>
    </div>

    <div
      v-if="!modoLegacy && paseActivoId && codigoPaseActivo"
      class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
    >
      <p>
        Código del pase:
        <span class="font-mono text-base font-black tracking-wider">{{
          codigoPaseActivo
        }}</span>
        <span
          class="ml-2 text-xs font-semibold"
          :class="
            estadoPaseActivo === 'ABIERTO' ? 'text-emerald-700' : 'text-muted-foreground'
          "
        >
          {{ estadoPaseActivo === "ABIERTO" ? "Abierto" : "Cerrado" }}
        </span>
      </p>
      <Button
        v-if="estadoPaseActivo === 'ABIERTO'"
        size="sm"
        variant="outline"
        :disabled="cerrando"
        @click="cerrarPaseActivo"
      >
        <Lock class="h-3.5 w-3.5" />
        {{ cerrando ? "Cerrando…" : "Cerrar pase" }}
      </Button>
    </div>

    <p v-if="cargando" class="text-sm text-muted-foreground">
      Cargando matriculados…
    </p>
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p
      v-else-if="!modoLegacy && !pases.length"
      class="text-sm text-muted-foreground"
    >
      Aún no hay llamadas de lista. Pulsa «Llamar lista» cuando quieras pasar
      asistencia (es opcional).
    </p>
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

    <div
      v-if="!modoLegacy && resumenAlumnos.length && pases.length"
      class="mt-4"
    >
      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Resumen por alumno (≥50% de pases)
      </p>
      <div class="max-h-40 space-y-1 overflow-y-auto text-sm">
        <div
          v-for="alumno in resumenAlumnos"
          :key="alumno.estudianteId"
          class="flex items-center justify-between gap-2 border-b border-border/60 py-1"
        >
          <span class="truncate">{{ alumno.nombre }}</span>
          <span class="shrink-0 text-xs text-muted-foreground">
            {{ alumno.pasesPresente }}/{{ alumno.pasesTotales }}
            ({{ Math.round(alumno.porcentajeAsistencia) }}%) ·
            {{ alumno.estadoResumen === "PRESENTE" ? "OK" : "Bajo" }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="asistencias.length" class="mt-3 flex justify-end">
      <Button :disabled="guardando" @click="guardar">
        {{ guardando ? "Guardando…" : "Guardar asistencia" }}
      </Button>
    </div>
  </div>
</template>
