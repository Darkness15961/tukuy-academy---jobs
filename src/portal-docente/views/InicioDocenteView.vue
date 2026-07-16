<script setup lang="ts">
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Star,
  TrendingUp,
  UsersRound,
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import PortadaPanel from "@/components/shared/PortadaPanel.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Skeleton from "primevue/skeleton";
import {
  docenteService,
  type ActividadDocente,
  type CursoDocente,
  type EvaluacionDocente,
  type SesionDocente,
} from "@/api/services/docente.service";
import { useAuth } from "@/composables/useAuth";
import { useContextoSesion } from "@/composables/useContextoSesion";

const router = useRouter();
const { currentUser, restaurarUsuario } = useAuth();
const { contextoActivo } = useContextoSesion();
const cargando = ref(true);
const cursos = ref<CursoDocente[]>([]);
const evaluaciones = ref<EvaluacionDocente[]>([]);
const sesiones = ref<SesionDocente[]>([]);
const actividades = ref<ActividadDocente[]>([]);

onMounted(async () => {
  try {
    const [panel] = await Promise.all([
      docenteService.obtenerPanel(),
      restaurarUsuario(),
    ]);
    cursos.value = panel.cursos;
    evaluaciones.value = panel.evaluaciones;
    sesiones.value = panel.sesiones;
    actividades.value = panel.actividades;
  } finally {
    cargando.value = false;
  }
});

const fechaActual = computed(() => {
  const texto = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
});

const primerNombre = computed(
  () => currentUser.value?.name.trim().split(/\s+/)[0] || "Docente",
);

const saludo = computed(() => {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
});
const ambitoActivo = computed(() =>
  contextoActivo.value?.ambitoDocencia === "INDEPENDIENTE" ||
  !contextoActivo.value?.organizacionId
    ? "INDEPENDIENTE"
    : "ORGANIZACION",
);
const cursosContexto = computed(() =>
  cursos.value.filter((curso) =>
    ambitoActivo.value === "INDEPENDIENTE"
      ? curso.ambito === "INDEPENDIENTE"
      : curso.ambito === "ORGANIZACION" &&
        curso.organizacionId === contextoActivo.value?.organizacionId,
  ),
);
const nombreContexto = computed(() =>
  ambitoActivo.value === "INDEPENDIENTE"
    ? "tu espacio de docencia independiente"
    : contextoActivo.value?.organizacionNombre,
);
const imagenesPortadaDocente = computed(() =>
  ambitoActivo.value === "INDEPENDIENTE"
    ? [
        "/img/portal-docente-independiente.png",
        "/img/portal-docente.png",
        "/img/portada-planes-empresariales.png",
      ]
    : [
        "/img/portal-docente.png",
        "/img/portada-planes-empresariales.png",
        "/img/portal-organizacion.png",
      ],
);
const descripcionPortadaDocente = computed(
  () =>
    `Estás trabajando en ${nombreContexto.value}. Los cursos, estudiantes y resultados se muestran únicamente para este ámbito.`,
);

const indicadores = computed(() => [
  {
    etiqueta: "Cursos publicados",
    valor: cursosContexto.value.filter((curso) => curso.estado === "PUBLICADO")
      .length,
    detalle: `${cursosContexto.value.length} cursos en este ámbito`,
    icono: BookOpen,
    cardClass: "border-primary/25 border-t-4 border-t-primary",
    iconoClass: "bg-primary/10 text-primary",
  },
  {
    etiqueta: "Estudiantes activos",
    valor: cursosContexto.value.reduce(
      (total, curso) => total + curso.estudiantes,
      0,
    ),
    detalle:
      ambitoActivo.value === "INDEPENDIENTE"
        ? "Matrículas individuales"
        : "Matrículas institucionales",
    icono: UsersRound,
    cardClass: "border-border border-t-4 border-t-accent",
    iconoClass: "bg-accent/15 text-accent-foreground dark:text-accent",
  },
  {
    etiqueta: "Tasa de finalización",
    valor: `${cursosContexto.value.length ? Math.round(cursosContexto.value.reduce((total, curso) => total + curso.progreso, 0) / cursosContexto.value.length) : 0}%`,
    detalle: "+4.2% vs. anterior",
    icono: TrendingUp,
    cardClass: "border-emerald-500/30 border-t-4 border-t-emerald-500",
    iconoClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  {
    etiqueta: "Por revisar",
    valor: evaluaciones.value.length,
    detalle: `${evaluaciones.value.filter((item) => item.prioridad === "ALTA").length} con prioridad alta`,
    icono: CheckCircle2,
    cardClass: "border-accent/40 border-t-4 border-t-accent",
    iconoClass: "bg-accent/20 text-[#B87A00] dark:text-accent",
  },
]);

function fechaActividad(fecha: string) {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return fecha;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(valor);
}
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <PortadaPanel
      :imagenes="imagenesPortadaDocente"
      :etiqueta="fechaActual"
      :titulo="`${saludo}, ${primerNombre}`"
      :descripcion="descripcionPortadaDocente"
      texto-accion="Crear nuevo curso"
      etiqueta-accesible="Resumen del contexto docente"
      @accion="router.push('/docente/cursos/nuevo')"
    />

    <div v-if="cargando" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="indicador in indicadores"
        :key="indicador.etiqueta"
        class="overflow-hidden bg-card shadow-sm"
        :class="indicador.cardClass"
      >
        <CardContent class="flex items-center gap-4 p-5">
          <div
            class="grid h-12 w-12 place-items-center"
            :class="indicador.iconoClass"
          >
            <component :is="indicador.icono" class="h-6 w-6" />
          </div>
          <div>
            <p class="text-xs font-semibold text-muted-foreground">
              {{ indicador.etiqueta }}
            </p>
            <strong class="mt-1 block text-2xl text-foreground">{{
              indicador.valor
            }}</strong>
            <span class="text-[11px] text-muted-foreground">{{
              indicador.detalle
            }}</span>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.55fr)]">
      <Card class="border-border bg-card shadow-sm">
        <CardContent class="p-0">
          <div
            class="flex items-center justify-between border-b border-border p-5"
          >
            <div>
              <h2 class="text-lg font-black text-foreground">
                Rendimiento de mis cursos
              </h2>
              <p class="mt-1 text-xs text-muted-foreground">
                Resumen de cursos con actividad reciente
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="text-primary"
              @click="router.push('/docente/cursos')"
            >
              Ver todos <ArrowRight class="h-4 w-4" />
            </Button>
          </div>
          <div class="divide-y divide-border">
            <article
              v-for="curso in cursosContexto.slice(0, 3)"
              :key="curso.id"
              class="grid gap-4 p-5 sm:grid-cols-[64px_minmax(0,1fr)_100px] sm:items-center"
            >
              <img
                :src="curso.imagen"
                :alt="curso.titulo"
                class="h-16 w-16 rounded-none object-cover"
              />
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate font-bold text-foreground">
                    {{ curso.titulo }}
                  </h3>
                  <Badge
                    variant="outline"
                    class="text-[10px]"
                    :class="
                      curso.estado === 'PUBLICADO'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : curso.estado === 'APROBADO'
                          ? 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                          : curso.estado === 'BORRADOR'
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-accent/40 bg-accent/15 text-[#B87A00] dark:text-accent'
                    "
                  >
                    {{
                      (
                        {
                          BORRADOR: "En elaboración",
                          EN_REVISION: "Por revisar",
                          APROBADO: "Aprobado",
                          PUBLICADO: "Publicado",
                          ARCHIVADO: "Archivado",
                        } as Record<string, string>
                      )[curso.estado] ?? curso.estado
                    }}
                  </Badge>
                </div>
                <div class="mt-3 flex items-center gap-3">
                  <Progress
                    :model-value="curso.progreso"
                    class="h-1.5 flex-1"
                  />
                  <span class="text-xs font-bold text-foreground"
                    >{{ curso.progreso }}%</span
                  >
                </div>
              </div>
              <div class="text-left sm:text-right">
                <strong class="block text-foreground">{{
                  curso.estudiantes
                }}</strong>
                <span class="text-xs text-muted-foreground">estudiantes</span>
                <span
                  v-if="curso.valoracion"
                  class="mt-1 flex items-center gap-1 text-xs text-accent sm:justify-end"
                >
                  <Star class="h-3 w-3 fill-current" />{{ curso.valoracion }}
                </span>
              </div>
            </article>
          </div>
        </CardContent>
      </Card>

      <Card
        class="overflow-hidden border-border border-t-4 border-t-accent bg-card shadow-sm"
      >
        <CardContent class="p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-black text-foreground">Próxima sesión</h2>
            <Badge
              class="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
              variant="outline"
            >
              {{ sesiones[0]?.estado ?? "Sin fecha" }}
            </Badge>
          </div>
          <div class="mt-5 bg-muted p-4">
            <div class="flex items-center gap-3">
              <div
                class="grid h-11 w-11 place-items-center bg-accent/20 text-[#B87A00] dark:text-accent"
              >
                <GraduationCap class="h-5 w-5" />
              </div>
              <div>
                <p class="font-bold text-foreground">
                  {{ sesiones[0]?.titulo ?? "Sin sesiones programadas" }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ sesiones[0]?.curso }}
                </p>
              </div>
            </div>
            <div
              class="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Clock3 class="h-4 w-4 text-accent" />
              {{ sesiones[0]?.hora ?? "--:--" }} ·
              {{ sesiones[0]?.duracion ?? "Sin duración" }}
            </div>
            <Button
              class="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              @click="router.push('/docente/sesiones')"
            >
              Preparar sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <Card
        class="overflow-hidden border-border border-t-4 border-t-accent bg-card shadow-sm"
      >
        <CardContent class="p-5">
          <div class="flex justify-between">
            <div>
              <h2 class="text-lg font-black text-foreground">
                Evaluaciones pendientes
              </h2>
              <p class="text-xs text-muted-foreground">
                Entregas que necesitan tu atención
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="text-primary"
              @click="router.push('/docente/evaluaciones')"
            >
              Revisar
            </Button>
          </div>
          <div class="mt-4 space-y-3">
            <div
              v-for="item in evaluaciones"
              :key="item.id"
              class="flex items-center gap-3 border border-border bg-muted/40 p-3"
            >
              <div
                class="grid h-9 w-9 place-items-center bg-accent/20 text-[#B87A00] dark:text-accent"
              >
                <CheckCircle2 class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-foreground">
                  {{ item.actividad }}
                </p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ item.estudiante }} · {{ item.curso }}
                </p>
              </div>
              <span class="text-[10px] text-muted-foreground">{{
                item.entrega
              }}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="border-border bg-card shadow-sm">
        <CardContent class="p-5">
          <h2 class="text-lg font-black text-foreground">Actividad reciente</h2>
          <p class="text-xs text-muted-foreground">
            Lo más importante de tus cursos
          </p>
          <div class="mt-5 space-y-5">
            <div
              v-for="actividad in actividades"
              :key="actividad.id"
              class="relative flex gap-3 pl-1"
            >
              <span
                class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/15"
              />
              <div class="flex-1">
                <p class="text-sm font-bold text-foreground">
                  {{ actividad.titulo }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ actividad.detalle }}
                </p>
              </div>
              <span class="text-[10px] text-muted-foreground">{{
                fechaActividad(actividad.fecha)
              }}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
