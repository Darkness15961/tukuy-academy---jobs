<script setup lang="ts">
import {
  ArrowLeft,
  BookOpen,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  Link2,
  MessageSquareWarning,
  Paperclip,
  PlayCircle,
  Video,
} from "lucide-vue-next";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  organizacionService,
  type PropuestaCursoOrganizacion,
} from "@/api/services/organizacion.service";
import { apiConfig } from "@/api/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TituloConAyuda from "@/components/shared/TituloConAyuda.vue";
import IconoAyuda from "@/components/shared/IconoAyuda.vue";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { obtenerRevisionCursoMock } from "@/portal-organizacion/data/revision-cursos.mock";
import type { RevisionAcademicaCurso } from "@/portal-organizacion/types/revision-curso.types";
import {
  etiquetasRequisitos,
  normalizarRequisitos,
} from "@/lib/requisitos-curso";
import { mapearSeccionesAModulosRevision } from "@/lib/mapear-revision-curso";
import { useToast } from "primevue/usetoast";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const cargando = ref(true);
const procesando = ref(false);
const propuesta = ref<PropuestaCursoOrganizacion>();
const revision = ref<RevisionAcademicaCurso>();
const error = ref("");
const modalObservar = ref(false);
const observacion = ref("");

const confirmaciones = reactive({
  contenido: false,
  materiales: false,
  docente: false,
  criterios: false,
});

const cursoId = computed(() => String(route.params.cursoId ?? ""));
const propuestaId = computed(() =>
  typeof route.query.propuesta === "string" ? route.query.propuesta : "",
);

const yaRevisado = computed(
  () => propuesta.value?.estado === "CONTENIDO_REVISADO",
);

const revisionConfirmada = computed(() =>
  Object.values(confirmaciones).every(Boolean),
);

function esUrlMaterial(url: string) {
  const valor = String(url ?? "").trim();
  return (
    /^https?:\/\//i.test(valor) ||
    valor.startsWith("blob:") ||
    valor.startsWith("data:")
  );
}

function actividadesDeModulo(modulo: RevisionAcademicaCurso["modulos"][number]) {
  if (modulo.actividadesDetalle?.length) return modulo.actividadesDetalle;
  return modulo.clases.map((titulo, i) => ({
    id: `${modulo.id}-clase-${i}`,
    titulo,
    tipo: "lectura" as const,
    tipoEtiqueta: "Clase",
  }));
}

async function cargarRevisionAcademica(
  propuestaActual: PropuestaCursoOrganizacion,
): Promise<RevisionAcademicaCurso> {
  if (!apiConfig.secundariaCursos) {
    return obtenerRevisionCursoMock(
      propuestaActual.id,
      propuestaActual.cursoDocenteId,
      propuestaActual.titulo,
    );
  }

  try {
    const { secundariaGatewayService } = await import(
      "@/api/services/secundaria-gateway.service"
    );
    const detalle = await secundariaGatewayService.obtenerBorrador(
      propuestaActual.cursoDocenteId,
    );
    const borrador = (detalle.borrador ?? {}) as Record<string, unknown>;
    const curso = (detalle.curso ?? {}) as Record<string, unknown>;
    const secciones = Array.isArray(borrador.secciones)
      ? (borrador.secciones as Array<Record<string, unknown>>)
      : [];
    const objetivos = Array.isArray(borrador.objetivos)
      ? borrador.objetivos.map(String)
      : String(borrador.descripcion ?? curso.resumen ?? "")
        ? [String(borrador.descripcion ?? curso.resumen)]
        : [];
    const requisitos = etiquetasRequisitos(
      normalizarRequisitos(borrador.requisitos),
    );

    return {
      cursoId: propuestaActual.cursoDocenteId,
      version: Number(curso.totalVersiones ?? 1),
      descripcion: String(
        borrador.descripcion ?? curso.resumen ?? propuestaActual.titulo,
      ),
      objetivos: objetivos.length
        ? objetivos
        : [`Revisar el contenido de ${propuestaActual.titulo}.`],
      requisitos: requisitos.length
        ? requisitos
        : ["Sin requisitos enlazados"],
      modulos: mapearSeccionesAModulosRevision(
        secciones,
        propuestaActual.cursoDocenteId,
      ),
      horasCertificables: Number(
        borrador.horas ??
          ((curso.versionActual as Record<string, unknown> | undefined)?.horas ??
            1),
      ),
      notaMinimaPropuesta: Number(borrador.notaMinima ?? 11),
      certificadoPropuesto: Boolean(borrador.certificado ?? true),
      enviadaEn: String(curso.actualizadoEn ?? new Date().toISOString()),
    };
  } catch {
    return obtenerRevisionCursoMock(
      propuestaActual.id,
      propuestaActual.cursoDocenteId,
      propuestaActual.titulo,
    );
  }
}

onMounted(async () => {
  try {
    const lista = await organizacionService.catalogoCursos.listar();
    propuesta.value =
      lista.find((item) => item.id === propuestaId.value) ??
      lista.find((item) => item.cursoDocenteId === cursoId.value);
    if (!propuesta.value) {
      error.value = "No se encontró la propuesta de curso a revisar.";
      return;
    }
    revision.value = await cargarRevisionAcademica(propuesta.value);
    if (propuesta.value.estado === "CONTENIDO_REVISADO") {
      confirmaciones.contenido = true;
      confirmaciones.materiales = true;
      confirmaciones.docente = true;
      confirmaciones.criterios = true;
    }
  } finally {
    cargando.value = false;
  }
});

async function confirmarRevision() {
  if (!propuesta.value || !revisionConfirmada.value) return;
  procesando.value = true;
  try {
    if (propuesta.value.estado !== "CONTENIDO_REVISADO") {
      propuesta.value =
        await organizacionService.catalogoCursos.marcarContenidoRevisado(
          propuesta.value.id,
        );
    }
    toast.add({
      severity: "success",
      summary: "Revisión confirmada",
      detail: "Contenido revisado. Ya puedes definir precio y acceso.",
      life: 4000,
    });
    void router.push({
      path: "/organizacion/cursos",
      query: {
        mensaje:
          "Contenido revisado. Ya puedes definir precio y acceso en la tarjeta.",
      },
    });
  } catch (causa) {
    const mensaje =
      causa instanceof Error ? causa.message : "No se pudo confirmar la revisión.";
    toast.add({
      severity: "error",
      summary: "No se pudo confirmar",
      detail: mensaje,
      life: 8000,
    });
  } finally {
    procesando.value = false;
  }
}

async function irAConfiguracionComercial() {
  if (!propuesta.value || !revisionConfirmada.value) return;
  procesando.value = true;
  try {
    if (propuesta.value.estado !== "CONTENIDO_REVISADO") {
      propuesta.value =
        await organizacionService.catalogoCursos.marcarContenidoRevisado(
          propuesta.value.id,
        );
    }
    void router.push({
      path: `/organizacion/cursos/${propuesta.value.cursoDocenteId}/aprobacion`,
      query: { propuesta: propuesta.value.id },
    });
  } finally {
    procesando.value = false;
  }
}

async function confirmarObservacion() {
  if (!propuesta.value || !observacion.value.trim()) return;
  procesando.value = true;
  try {
    await organizacionService.catalogoCursos.observar(
      propuesta.value.id,
      observacion.value.trim(),
    );
    void router.push({
      path: "/organizacion/cursos",
      query: { mensaje: "Observaciones enviadas al docente." },
    });
  } finally {
    procesando.value = false;
    modalObservar.value = false;
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Button
          variant="ghost"
          size="sm"
          class="-ml-2 mb-2"
          @click="router.push('/organizacion/cursos')"
        >
          <ArrowLeft class="h-4 w-4" />
          Volver a cursos
        </Button>
        <TituloConAyuda
          eyebrow="Paso 1 · Revisión académica"
          ayuda="Revisa la instantánea del docente. Aquí solo se valida contenido; precio y acceso se configuran después."
        >
          {{ propuesta?.titulo ?? "Revisar contenido" }}
        </TituloConAyuda>
      </div>
      <Badge
        v-if="propuesta"
        :class="
          yaRevisado
            ? 'border-transparent bg-emerald-700 text-white'
            : 'border-transparent bg-amber-500 text-slate-950'
        "
      >
        {{ yaRevisado ? "Contenido revisado" : "Pendiente de revisión" }}
      </Badge>
    </header>

    <div v-if="cargando" class="grid gap-4">
      <Skeleton class="h-40 w-full" />
      <Skeleton class="h-64 w-full" />
    </div>

    <Card v-else-if="error" class="border-destructive/40 bg-destructive/5">
      <CardContent class="p-5 text-sm text-destructive">{{ error }}</CardContent>
    </Card>

    <template v-else-if="propuesta && revision">
      <div
        v-if="yaRevisado"
        class="flex items-center gap-3 border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300"
      >
        <CheckCircle2 class="h-5 w-5 shrink-0" />
        Esta propuesta ya pasó la revisión de contenido. Puedes definir precio y
        acceso desde el catálogo o continuar aquí.
      </div>

      <article class="grid gap-5 border border-border bg-card p-5 md:grid-cols-[220px_1fr]">
        <img
          :src="propuesta.imagen"
          :alt="propuesta.titulo"
          class="h-40 w-full object-cover md:h-full"
        />
        <div class="grid gap-3">
          <div>
            <h2 class="text-2xl font-black md:text-3xl">{{ propuesta.titulo }}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Docente: {{ propuesta.docente }} · Versión {{ revision.version }} ·
              Enviado
              {{ new Date(revision.enviadaEn).toLocaleString("es-PE") }}
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="border border-border bg-muted/20 p-3 text-sm">
              <span class="text-muted-foreground">Descripción</span>
              <p class="mt-1 font-medium">{{ revision.descripcion }}</p>
            </div>
            <div class="border border-border bg-muted/20 p-3 text-sm">
              <span class="text-muted-foreground">Objetivos</span>
              <ul class="mt-1 list-disc space-y-1 pl-4 font-medium">
                <li v-for="objetivo in revision.objetivos" :key="objetivo">
                  {{ objetivo }}
                </li>
              </ul>
            </div>
            <div class="border border-border bg-muted/20 p-3 text-sm">
              <span class="text-muted-foreground">Requisitos</span>
              <ul class="mt-1 list-disc space-y-1 pl-4 font-medium">
                <li v-for="requisito in revision.requisitos" :key="requisito">
                  {{ requisito }}
                </li>
              </ul>
            </div>
            <div class="grid gap-2 border border-border bg-muted/20 p-3 text-sm sm:grid-cols-2">
              <div>
                <span class="text-muted-foreground">Categoría propuesta</span><br />
                <strong>{{ propuesta.categoria }}</strong>
              </div>
              <div>
                <span class="text-muted-foreground">Duración</span><br />
                <strong>{{ propuesta.duracion }}</strong>
              </div>
              <div>
                <span class="text-muted-foreground">Lecciones</span><br />
                <strong>{{ propuesta.lecciones }}</strong>
              </div>
              <div>
                <span class="text-muted-foreground">Horas certificables</span><br />
                <strong>{{ revision.horasCertificables }}</strong>
              </div>
              <div>
                <span class="text-muted-foreground">Nota mínima propuesta</span><br />
                <strong>{{ revision.notaMinimaPropuesta }}</strong>
              </div>
              <div>
                <span class="text-muted-foreground">Certificado</span><br />
                <strong>
                  {{
                    revision.certificadoPropuesto
                      ? "Propuesto por el docente"
                      : "No incluye"
                  }}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </article>

      <div class="grid gap-4">
        <div class="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 class="text-lg font-black">Temario y materiales</h3>
            <p class="text-sm text-muted-foreground">
              Inventario por módulo: actividades, enlaces y archivos subidos
              (vista de revisión, no del alumno).
            </p>
          </div>
          <Badge class="bg-muted text-muted-foreground">
            {{ revision.modulos.length }} módulo(s)
          </Badge>
        </div>

        <article
          v-for="(modulo, indice) in revision.modulos"
          :key="modulo.id"
          class="border border-border bg-card p-5"
        >
          <header class="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <p class="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Módulo {{ indice + 1 }}
              </p>
              <h3 class="mt-1 text-lg font-black">{{ modulo.titulo }}</h3>
              <p
                v-if="modulo.descripcion"
                class="mt-1 text-sm text-muted-foreground"
              >
                {{ modulo.descripcion }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2 text-xs">
              <Badge class="bg-sky-500/10 text-sky-800 dark:text-sky-300">
                {{ (modulo.actividadesDetalle ?? []).length || modulo.clases.length }}
                actividad(es)
              </Badge>
              <Badge class="bg-violet-500/10 text-violet-800 dark:text-violet-300">
                {{ modulo.recursos.length }} material(es)
              </Badge>
            </div>
          </header>

          <section class="mt-4 grid gap-2">
            <p class="text-xs font-black uppercase tracking-wide text-muted-foreground">
              Actividades del módulo
            </p>
            <div
              v-if="!actividadesDeModulo(modulo).length"
              class="border border-dashed border-border px-3 py-4 text-sm text-muted-foreground"
            >
              Este módulo aún no tiene actividades cargadas.
            </div>
            <div
              v-for="actividad in actividadesDeModulo(modulo)"
              :key="actividad.id"
              class="grid gap-2 border border-border bg-muted/15 px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div class="flex min-w-0 items-start gap-3">
                <span
                  class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center border border-border bg-card"
                >
                  <Video
                    v-if="actividad.tipo === 'video'"
                    class="h-4 w-4 text-rose-600"
                  />
                  <HelpCircle
                    v-else-if="actividad.tipo === 'quiz'"
                    class="h-4 w-4 text-amber-600"
                  />
                  <ClipboardCheck
                    v-else-if="actividad.tipo === 'assignment'"
                    class="h-4 w-4 text-emerald-600"
                  />
                  <BookOpen v-else class="h-4 w-4 text-sky-600" />
                </span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold">{{ actividad.titulo }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ actividad.tipoEtiqueta }}
                    <template v-if="actividad.totalPreguntas != null">
                      · {{ actividad.totalPreguntas }} pregunta(s)
                    </template>
                  </p>
                </div>
              </div>
              <a
                v-if="actividad.urlYoutube"
                :href="actividad.urlYoutube"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <Link2 class="h-3.5 w-3.5" />
                Abrir YouTube
                <ExternalLink class="h-3 w-3" />
              </a>
            </div>
          </section>

          <section class="mt-5 grid gap-2">
            <p class="text-xs font-black uppercase tracking-wide text-muted-foreground">
              Materiales subidos
            </p>
            <div
              v-if="!modulo.recursos.length"
              class="border border-dashed border-border px-3 py-4 text-sm text-muted-foreground"
            >
              Sin archivos adjuntos en este módulo.
            </div>
            <a
              v-for="recurso in modulo.recursos"
              :key="recurso.id"
              :href="esUrlMaterial(recurso.urlDemo) ? recurso.urlDemo : '#'"
              :target="esUrlMaterial(recurso.urlDemo) ? '_blank' : undefined"
              :rel="esUrlMaterial(recurso.urlDemo) ? 'noopener noreferrer' : undefined"
              class="flex items-center gap-2 border border-border bg-muted/20 px-3 py-2 text-sm font-bold hover:bg-muted/40"
              :class="!esUrlMaterial(recurso.urlDemo) ? 'pointer-events-none opacity-70' : ''"
              @click="!esUrlMaterial(recurso.urlDemo) && $event.preventDefault()"
            >
              <PlayCircle v-if="recurso.tipo === 'VIDEO'" class="h-4 w-4 shrink-0" />
              <Link2
                v-else-if="recurso.tipo === 'ENLACE'"
                class="h-4 w-4 shrink-0"
              />
              <Paperclip
                v-else-if="recurso.tipo === 'PLANTILLA'"
                class="h-4 w-4 shrink-0"
              />
              <FileText v-else class="h-4 w-4 shrink-0" />
              <span class="min-w-0 flex-1 truncate">{{ recurso.nombre }}</span>
              <span
                v-if="recurso.tamanio"
                class="shrink-0 font-normal text-muted-foreground"
              >
                {{ recurso.tamanio }}
              </span>
              <Download
                v-if="esUrlMaterial(recurso.urlDemo)"
                class="h-3.5 w-3.5 shrink-0"
              />
            </a>
          </section>
        </article>
      </div>

      <aside
        class="grid gap-4 border border-border border-t-4 border-t-accent bg-card p-5 lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-black">Confirmación de revisión académica</h3>
            <IconoAyuda
              texto="Marca lo revisado. Luego el curso queda a la espera de definir precio y acceso."
            />
          </div>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <label
              v-for="(etiqueta, clave) in {
                contenido: 'Contenido y objetivos revisados',
                materiales: 'Materiales y archivos revisados',
                docente: 'Datos del docente revisados',
                criterios: 'Criterios de aprobación revisados',
              }"
              :key="clave"
              class="flex items-center gap-3 border border-border bg-muted/20 px-3 py-3 text-sm font-bold"
              :class="yaRevisado ? 'opacity-70' : ''"
            >
              <input
                v-model="confirmaciones[clave as keyof typeof confirmaciones]"
                type="checkbox"
                class="h-4 w-4 accent-[var(--color-primary)]"
                :disabled="yaRevisado"
              />
              {{ etiqueta }}
            </label>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            v-if="!yaRevisado"
            variant="outline"
            @click="modalObservar = true"
          >
            <MessageSquareWarning class="h-4 w-4" />
            Observar contenido
          </Button>
          <Button
            variant="outline"
            :disabled="procesando || !revisionConfirmada"
            @click="confirmarRevision"
          >
            <CheckCircle2 class="h-4 w-4" />
            {{
              yaRevisado
                ? "Volver al listado"
                : "Confirmar revisión"
            }}
          </Button>
          <Button
            :disabled="procesando || !revisionConfirmada"
            @click="irAConfiguracionComercial"
          >
            <BookOpenCheck class="h-4 w-4" />
            Definir precio y acceso
          </Button>
        </div>
      </aside>
    </template>

    <Dialog
      v-model:visible="modalObservar"
      modal
      header="Observar contenido"
      :style="{ width: '32rem' }"
    >
      <label class="grid gap-2 text-sm font-bold">
        Observaciones para el docente
        <Textarea v-model="observacion" rows="5" auto-resize class="w-full" />
      </label>
      <template #footer>
        <Button variant="outline" @click="modalObservar = false">Cancelar</Button>
        <Button
          :disabled="procesando || !observacion.trim()"
          @click="confirmarObservacion"
        >
          Enviar observaciones
        </Button>
      </template>
    </Dialog>
  </section>
</template>
