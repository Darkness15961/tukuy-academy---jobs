<script setup lang="ts">
import {
  Award,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Search,
  Send,
} from "lucide-vue-next";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiConfig } from "@/api/config";
import { docenteService } from "@/api/services/docente.service";
import { secundariaGatewayService } from "@/api/services/secundaria-gateway.service";
import { toast } from "@/lib/toast";
import type {
  CertificadoEmitidoSecundaria,
  CursoSecundaria,
  EstudianteMatriculaSecundaria,
} from "@/lib/contrato-secundaria";

const router = useRouter();
const cargandoCursos = ref(true);
const cargandoAlumnos = ref(false);
const emitiendoId = ref("");
const error = ref("");
const mensaje = ref("");
const busqueda = ref("");

const cursos = ref<CursoSecundaria[]>([]);
const cursoId = ref<string | null>(null);
const alumnos = ref<EstudianteMatriculaSecundaria[]>([]);
const emitidos = ref<CertificadoEmitidoSecundaria[]>([]);

const opcionesCursos = computed(() =>
  cursos.value
    .map((curso) => ({
      label: `${curso.titulo}${curso.codigo ? ` · ${curso.codigo}` : ""}`,
      value: curso.id,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es")),
);

const emitidosPorMatricula = computed(() => {
  const mapa = new Map<string, CertificadoEmitidoSecundaria>();
  for (const item of emitidos.value) {
    if (item.matriculaId) mapa.set(item.matriculaId, item);
  }
  return mapa;
});

const alumnosFiltrados = computed(() => {
  const term = busqueda.value.trim().toLowerCase();
  const lista = alumnos.value;
  if (!term) return lista;
  return lista.filter((alumno) =>
    [alumno.nombre, alumno.curso, alumno.alumnoId, alumno.id]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
});

async function cargarCursos() {
  cargandoCursos.value = true;
  error.value = "";
  try {
    if (!apiConfig.secundariaCursos) {
      throw new Error(
        "Activa VITE_SECUNDARIA_CURSOS=true para operar certificados reales.",
      );
    }
    const [listado, certs] = await Promise.all([
      secundariaGatewayService.listarCursos(),
      secundariaGatewayService.listarCertificadosEmitidos().catch(() => ({
        ok: true as const,
        total: 0,
        emitidos: [] as CertificadoEmitidoSecundaria[],
      })),
    ]);
    cursos.value = listado.cursos ?? [];
    emitidos.value = certs.emitidos ?? [];
    if (!cursoId.value && cursos.value[0]) {
      cursoId.value = cursos.value[0].id;
    }
  } catch (causa) {
    error.value =
      causa instanceof Error ? causa.message : "No se pudieron cargar cursos.";
    cursos.value = [];
  } finally {
    cargandoCursos.value = false;
  }
}

async function cargarAlumnosDelCurso(id: string | null) {
  if (!id) {
    alumnos.value = [];
    return;
  }
  cargandoAlumnos.value = true;
  error.value = "";
    try {
    const listado = await secundariaGatewayService.listarEstudiantes(id);
    alumnos.value = listado.estudiantes ?? [];
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudieron cargar las matrículas del curso.";
    alumnos.value = [];
  } finally {
    cargandoAlumnos.value = false;
  }
}

async function emitir(matriculaId: string, nombre: string) {
  if (!matriculaId || emitiendoId.value) return;
  emitiendoId.value = matriculaId;
  error.value = "";
    try {
    // Usa flujo docente (genera PDF con plantilla default de la entidad).
    const emitido = await docenteService.emitirCertificado(matriculaId);
    const codigo = emitido.codigoVerificacion ?? emitido.id;
    toast.success(`Certificado emitido para ${nombre} · código ${codigo}.`);
    const certs = await secundariaGatewayService.listarCertificadosEmitidos();
    emitidos.value = certs.emitidos ?? [];
  } catch (causa) {
    error.value =
      causa instanceof Error
        ? causa.message
        : "No se pudo emitir el certificado.";
  } finally {
    emitiendoId.value = "";
  }
}

async function emitirTodosVisibles() {
  const pendientes = alumnosFiltrados.value.filter(
    (alumno) => !emitidosPorMatricula.value.has(alumno.id),
  );
  if (!pendientes.length) {
    toast.success("Todos los alumnos visibles ya tienen certificado.");
    return;
  }
  for (const alumno of pendientes) {
    await emitir(alumno.id, alumno.nombre);
    if (error.value) break;
  }
}

watch(cursoId, (id) => {
  void cargarAlumnosDelCurso(id);
});

onMounted(async () => {
  await cargarCursos();
  if (cursoId.value) await cargarAlumnosDelCurso(cursoId.value);
});
</script>

<template>
  <section class="mx-auto grid max-w-400 gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <TituloConAyuda
        clase-eyebrow="text-primary"
        eyebrow="Operación Academy"
        titulo="Emitir certificados"
        ayuda="El superadmin puede emitir el certificado de cualquier matrícula de cualquier curso existente en la secundaria. No exige 100% de progreso: basta con que el alumno esté matriculado."
      />
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          :disabled="cargandoCursos"
          @click="cargarCursos"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="cargandoCursos ? 'animate-spin' : ''"
          />
          Actualizar cursos
        </Button>
        <Button
          variant="outline"
          size="sm"
          @click="router.push('/certificados/verificar/demo')"
        >
          Verificador público
        </Button>
      </div>
    </div>

    <div
      v-if="error"
      class="border-l-4 border-l-red-500 bg-red-500/10 p-4 text-sm font-semibold text-red-800 dark:text-red-200"
    >
      {{ error }}
    </div>
    <div
      v-if="mensaje"
      class="border-l-4 border-l-emerald-500 bg-emerald-500/10 p-4 text-sm font-semibold"
    >
      {{ mensaje }}
    </div>

    <Card class="border-border bg-card">
      <CardContent class="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <label class="grid gap-2">
          <span class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Curso (secundaria)
          </span>
          <Select
            v-model="cursoId"
            class="w-full"
            :options="opcionesCursos"
            option-label="label"
            option-value="value"
            placeholder="Selecciona un curso"
            :loading="cargandoCursos"
            filter
            show-clear
          />
        </label>
        <Button
          size="sm"
          :disabled="
            !alumnosFiltrados.length || Boolean(emitiendoId) || cargandoAlumnos
          "
          @click="emitirTodosVisibles"
        >
          <Send class="h-4 w-4" />
          Emitir pendientes visibles
        </Button>
      </CardContent>
    </Card>

    <Card class="overflow-hidden border-border bg-card">
      <CardContent class="p-0">
        <div
          class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"
        >
          <div class="flex items-center gap-3">
            <Award class="h-5 w-5 text-primary" />
            <div>
              <h2 class="font-black">Matrículas del curso</h2>
              <p class="text-xs text-muted-foreground">
                {{ alumnosFiltrados.length }} alumno(s)
                · {{ emitidos.length }} certificado(s) en el índice secundario
              </p>
            </div>
          </div>
          <span class="relative w-full max-w-xs">
            <Search
              class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <InputText
              v-model="busqueda"
              class="w-full pl-9"
              placeholder="Buscar alumno…"
            />
          </span>
        </div>

        <div v-if="cargandoCursos || cargandoAlumnos" class="space-y-2 p-4">
          <Skeleton v-for="item in 5" :key="item" class="h-12 w-full" />
        </div>

        <div
          v-else-if="!cursoId"
          class="p-10 text-center text-sm text-muted-foreground"
        >
          Selecciona un curso para ver matrículas.
        </div>

        <div
          v-else-if="!alumnosFiltrados.length"
          class="p-10 text-center text-sm text-muted-foreground"
        >
          No hay alumnos matriculados en este curso.
        </div>

        <DataTable
          v-else
          class="tabla-administracion"
          :value="alumnosFiltrados"
          size="small"
          data-key="id"
          scrollable
          table-style="min-width: 48rem"
        >
          <Column field="nombre" header="Alumno" style="min-width: 14rem">
            <template #body="{ data }">
              <strong>{{ data.nombre }}</strong>
              <p class="font-mono text-[11px] text-muted-foreground">
                {{ data.alumnoId }}
              </p>
            </template>
          </Column>
          <Column field="progreso" header="Progreso" style="min-width: 7rem">
            <template #body="{ data }">
              {{ Number(data.progreso ?? 0).toFixed(0) }}%
            </template>
          </Column>
          <Column field="estado" header="Matrícula" style="min-width: 8rem">
            <template #body="{ data }">
              <Tag severity="info" :value="String(data.estado || '—')" />
            </template>
          </Column>
          <Column header="Certificado" style="min-width: 12rem">
            <template #body="{ data }">
              <template v-if="emitidosPorMatricula.get(data.id)">
                <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 class="h-4 w-4" />
                  <span class="font-mono text-xs">
                    {{
                      emitidosPorMatricula.get(data.id)?.codigoVerificacion ??
                      "Emitido"
                    }}
                  </span>
                </div>
              </template>
              <Tag v-else severity="warn" value="Sin emitir" />
            </template>
          </Column>
          <Column header="" style="min-width: 9rem">
            <template #body="{ data }">
              <Button
                size="sm"
                variant="outline"
                :disabled="
                  Boolean(emitiendoId) ||
                  Boolean(emitidosPorMatricula.get(data.id))
                "
                @click="emitir(data.id, data.nombre)"
              >
                <LoaderCircle
                  v-if="emitiendoId === data.id"
                  class="h-4 w-4 animate-spin"
                />
                <Send v-else class="h-4 w-4" />
                {{
                  emitidosPorMatricula.get(data.id) ? "Emitido" : "Emitir"
                }}
              </Button>
            </template>
          </Column>
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
