<script setup lang="ts">
import { ArrowLeft } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  organizacionService,
  type PropuestaCursoOrganizacion,
} from "@/api/services/organizacion.service";
import { apiConfig } from "@/api/config";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import { Skeleton } from "@/components/ui/skeleton";
import { mapearPublicacionAAprobacion } from "@/lib/mapear-publicacion-curso";
import { cargarRevisionAcademicaDesdeSecundaria } from "@/lib/mapear-revision-curso";
import AprobacionCursoWizard from "@/portal-organizacion/components/AprobacionCursoWizard.vue";
import type { RevisionAcademicaCurso } from "@/portal-organizacion/types/revision-curso.types";
import type { ConfiguracionPublicacionCurso } from "@/types/comercializacion-curso.types";
import { toast } from "@/lib/toast";

const route = useRoute();
const router = useRouter();

const cargando = ref(true);
const procesando = ref(false);
const error = ref("");
const propuesta = ref<PropuestaCursoOrganizacion>();
const revision = ref<RevisionAcademicaCurso>();
const nodos = ref<Array<{ label: string; value: string; usuarios: number }>>([]);

const cursoId = computed(() => String(route.params.cursoId ?? ""));
const propuestaId = computed(() =>
  typeof route.query.propuesta === "string" ? route.query.propuesta : "",
);

onMounted(async () => {
  try {
    const [lista, estructuras, niveles, unidades, vinculaciones] =
      await Promise.all([
        organizacionService.catalogoCursos.listar(),
        organizacionService.estructura.estructuras.listar(),
        organizacionService.estructura.niveles.listar(),
        organizacionService.estructura.unidades.listar(),
        organizacionService.estructura.vinculaciones.listar(),
      ]);
    propuesta.value =
      lista.find((item) => item.id === propuestaId.value) ??
      lista.find((item) => item.cursoDocenteId === cursoId.value);
    if (!propuesta.value) {
      error.value = "No se encontró el curso para configuración comercial.";
      return;
    }
    if (
      propuesta.value.estado === "EN_REVISION" ||
      propuesta.value.estado === "OBSERVADO"
    ) {
      error.value =
        "Primero debes confirmar la revisión de contenido antes de definir precio y acceso.";
      return;
    }

    if (!apiConfig.secundariaCursos) {
      error.value =
        "Activa VITE_SECUNDARIA_CURSOS=true para aprobar cursos con datos reales.";
      return;
    }
    revision.value = await cargarRevisionAcademicaDesdeSecundaria(
      propuesta.value.cursoDocenteId,
      propuesta.value.titulo,
      propuesta.value.enviado,
    );
    nodos.value = unidades
      .filter((nodo) => nodo.estado === "ACTIVA")
      .map((nodo) => ({
        label: [
          estructuras.find((item) => item.id === nodo.estructuraId)?.nombre,
          niveles.find((item) => item.id === nodo.nivelId)?.nombre,
          nodo.nombre,
        ]
          .filter(Boolean)
          .join(" · "),
        value: nodo.id,
        usuarios: new Set(
          vinculaciones
            .filter(
              (item) => item.unidadId === nodo.id && item.estado === "ACTIVA",
            )
            .map((item) => item.usuarioId),
        ).size,
      }));
  } finally {
    cargando.value = false;
  }
});

function volverARevision() {
  if (!propuesta.value) {
    void router.push("/organizacion/cursos");
    return;
  }
  void router.push({
    path: `/organizacion/cursos/${propuesta.value.cursoDocenteId}/revision`,
    query: { propuesta: propuesta.value.id },
  });
}

async function confirmar(
  config: ConfiguracionPublicacionCurso,
  publicar: boolean,
) {
  if (!propuesta.value) return;
  procesando.value = true;
  error.value = "";
  try {
    const payload = mapearPublicacionAAprobacion(config, { publicar });
    const actualizado = await organizacionService.catalogoCursos.aprobar(
      propuesta.value.id,
      payload,
    );
    propuesta.value = actualizado;

    const destinoLabel =
      config.alcance === "PUBLICO"
        ? "Todo el público"
        : config.nodoIds.length
          ? `${config.nodoIds.length} nodos internos`
          : "Organización";
    const asignados =
      config.alcance === "INTERNO"
        ? nodos.value
            .filter((nodo) => config.nodoIds.includes(nodo.value))
            .reduce((suma, nodo) => suma + nodo.usuarios, 0)
        : 0;

    try {
      await organizacionService.asignaciones.crear({
        id: `asig-${Date.now()}`,
        cursoId: propuesta.value.cursoDocenteId,
        curso: propuesta.value.titulo,
        destino: destinoLabel,
        asignados,
        completados: 0,
        vence: config.fechaLimite
          ? new Intl.DateTimeFormat("es-PE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(`${config.fechaLimite}T00:00:00Z`))
          : "Sin fecha límite",
        obligatorio: config.obligatorio,
        estado: "ACTIVA",
        creadaEn: new Date().toISOString().slice(0, 10),
        destinoUnidadId: config.nodoIds[0],
        incluirDescendientes: config.incluirDescendientes,
      });
    } catch {
      // La aprobación ya quedó guardada; la asignación es secundaria en la demo.
    }

    const nDescuentos = config.descuentos.filter((r) => r.activa !== false).length;
    toast.success(
      publicar ? "Curso aprobado y publicado" : "Curso aprobado sin publicar",
      {
        description: `${nDescuentos} descuento(s) · destino: ${destinoLabel}.`,
      },
    );
    void router.push("/organizacion/cursos");
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "No se pudo completar la aprobación.";
    error.value = mensaje;
    toast.error("No se pudo aprobar el curso", { description: mensaje });
  } finally {
    procesando.value = false;
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <header>
      <Button
        variant="ghost"
        size="sm"
        class="-ml-2 mb-2"
        @click="volverARevision"
      >
        <ArrowLeft class="h-4 w-4" />
        Volver a revisión de contenido
      </Button>
      <TituloConAyuda
        eyebrow="Paso 2 · Configuración comercial"
        ayuda="Define clasificación, público, precios, certificado y descuentos. El contenido académico ya fue revisado."
      >
        {{ propuesta?.titulo ?? "Precios, acceso y publicación" }}
      </TituloConAyuda>
    </header>

    <div
      v-if="error"
      class="border-l-4 border-red-600 bg-red-500/10 p-3 text-sm text-red-700"
    >
      <p>{{ error }}</p>
      <Button
        v-if="propuesta && (propuesta.estado === 'EN_REVISION' || propuesta.estado === 'OBSERVADO')"
        class="mt-3"
        size="sm"
        @click="volverARevision"
      >
        Ir a revisión de contenido
      </Button>
    </div>

    <div v-if="cargando" class="grid gap-4">
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-96 w-full" />
    </div>

    <AprobacionCursoWizard
      v-else-if="propuesta && revision"
      :curso="propuesta"
      :revision="revision"
      :nodos="nodos"
      :procesando="procesando"
      @cancelar="router.push('/organizacion/cursos')"
      @confirmar="(config) => confirmar(config, true)"
      @aprobar-sin-publicar="(config) => confirmar(config, false)"
      @rechazar-precio="volverARevision"
    />
  </section>
</template>
