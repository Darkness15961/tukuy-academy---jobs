<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CircleDollarSign,
  ClipboardList,
  Network,
  Route,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-vue-next";
import Skeleton from "primevue/skeleton";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import {
  organizacionService,
  type AsignacionOrganizacion,
  type LicenciaOrganizacion,
  type PropuestaCursoOrganizacion,
  type RutaOrganizacion,
  type UsuarioOrganizacion,
} from "@/api/services/organizacion.service";
import PortadaPanel from "@/components/shared/PortadaPanel.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/composables/useAuth";
import { useContextoSesion } from "@/composables/useContextoSesion";
import type { CertificadoEmitidoDocente } from "@/portal-docente/types/docente.types";

type NodoResumen = {
  id: string;
  nombre: string;
  usuarios: number;
  progreso: number;
};

type AccionPendiente = {
  id: string;
  titulo: string;
  detalle: string;
  prioridad: "alta" | "media";
  ruta: string;
  cta: string;
  icono: LucideIcon;
};

type AccesoRapido = {
  etiqueta: string;
  detalle: string;
  ruta: string;
  icono: LucideIcon;
};

const router = useRouter();
const { currentUser } = useAuth();
const { contextoActivo } = useContextoSesion();

const cargando = ref(true);
const nodos = ref<NodoResumen[]>([]);
const asignaciones = ref<AsignacionOrganizacion[]>([]);
const usuarios = ref<UsuarioOrganizacion[]>([]);
const matriculas = ref<
  Awaited<ReturnType<typeof organizacionService.matriculas.listar>>
>([]);
const catalogo = ref<PropuestaCursoOrganizacion[]>([]);
const rutas = ref<RutaOrganizacion[]>([]);
const certificados = ref<CertificadoEmitidoDocente[]>([]);
const certificadosPendientes = ref<
  Awaited<
    ReturnType<typeof organizacionService.certificadosPendientes.listar>
  >
>([]);
const licencia = ref<LicenciaOrganizacion | null>(null);

async function cargarDatos() {
  cargando.value = true;
  try {
    const [
      nodosEntidad,
      vinculaciones,
      asignacionesEntidad,
      usuariosEntidad,
      matriculasEntidad,
      catalogoEntidad,
      rutasEntidad,
      certificadosEntidad,
      pendientesEntidad,
      licenciaEntidad,
    ] = await Promise.all([
      organizacionService.estructura.unidades.listar(),
      organizacionService.estructura.vinculaciones.listar(),
      organizacionService.asignaciones.listar(),
      organizacionService.usuarios.listar(),
      organizacionService.matriculas.listar(),
      organizacionService.catalogoCursos.listar(),
      organizacionService.rutas.listar(),
      organizacionService.certificados.listar(),
      organizacionService.certificadosPendientes.listar(),
      organizacionService.obtenerLicencia(),
    ]);

    asignaciones.value = asignacionesEntidad;
    usuarios.value = usuariosEntidad;
    matriculas.value = matriculasEntidad;
    catalogo.value = catalogoEntidad;
    rutas.value = rutasEntidad;
    certificados.value = certificadosEntidad;
    certificadosPendientes.value = pendientesEntidad;
    licencia.value = licenciaEntidad;

    nodos.value = nodosEntidad
      .filter((nodo) => nodo.estado === "ACTIVA" && !nodo.esSistema)
      .map((nodo) => {
        const idsPersonas = new Set(
          vinculaciones
            .filter(
              (item) => item.unidadId === nodo.id && item.estado === "ACTIVA",
            )
            .map((item) => item.usuarioId),
        );
        const miembros = usuariosEntidad.filter((usuario) =>
          idsPersonas.has(String(usuario.id)),
        );
        return {
          id: nodo.id,
          nombre: nodo.nombre,
          usuarios: miembros.length,
          progreso: miembros.length
            ? Math.round(
                miembros.reduce((total, usuario) => total + usuario.progreso, 0) /
                  miembros.length,
              )
            : 0,
        };
      })
      .sort((a, b) => a.progreso - b.progreso);
  } finally {
    cargando.value = false;
  }
}

function actualizarDatos() {
  void cargarDatos();
}

onMounted(() => {
  void cargarDatos();
  window.addEventListener("tukuy:organizacion-datos", actualizarDatos);
});
onBeforeUnmount(() =>
  window.removeEventListener("tukuy:organizacion-datos", actualizarDatos),
);

const nombreOrganizacion = computed(
  () =>
    contextoActivo.value?.organizacionNombre ??
    "COLEGIO DE INGENIEROS CUSCO",
);

const primerNombre = computed(
  () => currentUser.value?.name.trim().split(/\s+/)[0] || "Administrador",
);

const saludo = computed(() => {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
});

const fechaActual = computed(() => {
  const texto = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
});

function moneda(valor: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(valor);
}

function porcentajeAsignacion(completados: number, asignados: number) {
  if (!asignados) return 0;
  return Math.round((completados / asignados) * 100);
}

const activos = computed(() =>
  usuarios.value.filter((usuario) => usuario.estado === "ACTIVO"),
);

const enRiesgo = computed(() =>
  matriculas.value.filter((item) => item.estado === "EN_RIESGO"),
);

const cursosPublicados = computed(
  () =>
    catalogo.value.filter(
      (curso) =>
        curso.estado === "PUBLICADO" || curso.estado === "APROBADO",
    ).length,
);

const enRevision = computed(() =>
  catalogo.value.filter((curso) => curso.estado === "EN_REVISION"),
);

const listosParaAprobar = computed(() =>
  catalogo.value.filter((curso) => curso.estado === "CONTENIDO_REVISADO"),
);

const rutasPublicadas = computed(
  () =>
    rutas.value.filter((ruta) => (ruta.estado ?? "PUBLICADA") === "PUBLICADA")
      .length,
);

const matriculasTotales = computed(() =>
  asignaciones.value.reduce((total, item) => total + item.asignados, 0),
);

const completadosTotales = computed(() =>
  asignaciones.value.reduce((total, item) => total + item.completados, 0),
);

const finalizacion = computed(() =>
  matriculasTotales.value
    ? Math.round((completadosTotales.value / matriculasTotales.value) * 100)
    : 0,
);

const ingresosEstimados = computed(() =>
  asignaciones.value.reduce((total, asignacion) => {
    const curso = catalogo.value.find(
      (item) =>
        item.titulo.localeCompare(asignacion.curso, "es", {
          sensitivity: "base",
        }) === 0,
    );
    const precio =
      curso?.configuracionPublicacion?.precio.precioCompleto ??
      curso?.precio ??
      0;
    if (curso?.gratuito || curso?.configuracionPublicacion?.precio.modalidad === "GRATUITO") {
      return total;
    }
    return total + asignacion.completados * precio;
  }, 0),
);

const consumoUsuarios = computed(() =>
  licencia.value?.consumos.find((item) => item.id === "usuarios"),
);

const porcentajeLicencias = computed(() => {
  const consumo = consumoUsuarios.value;
  return consumo ? Math.round((consumo.utilizado / consumo.limite) * 100) : 0;
});

const licenciasDisponibles = computed(
  () =>
    (consumoUsuarios.value?.limite ?? 0) -
    (consumoUsuarios.value?.utilizado ?? 0),
);

const asignacionesCriticas = computed(() =>
  [...asignaciones.value]
    .map((item) => ({
      ...item,
      avance: porcentajeAsignacion(item.completados, item.asignados),
    }))
    .sort((a, b) => a.avance - b.avance)
    .slice(0, 5),
);

const nodosCriticos = computed(() => nodos.value.slice(0, 5));

const accionesPendientes = computed((): AccionPendiente[] => {
  const acciones: AccionPendiente[] = [];

  if (listosParaAprobar.value.length) {
    acciones.push({
      id: "aprobar",
      titulo: `${listosParaAprobar.value.length} curso(s) listos para aprobación comercial`,
      detalle: "Contenido revisado: falta precio, acceso y publicación.",
      prioridad: "alta",
      ruta: "/organizacion/cursos",
      cta: "Revisar catálogo",
      icono: CircleDollarSign,
    });
  }

  if (enRevision.value.length) {
    acciones.push({
      id: "revision",
      titulo: `${enRevision.value.length} curso(s) en revisión académica`,
      detalle: "Pendientes de validar contenido antes del wizard comercial.",
      prioridad: "alta",
      ruta: "/organizacion/cursos",
      cta: "Ir a revisión",
      icono: BookOpen,
    });
  }

  if (certificadosPendientes.value.length) {
    acciones.push({
      id: "certificados",
      titulo: `${certificadosPendientes.value.length} certificado(s) por emitir`,
      detalle: "Alumnos que ya cumplieron requisitos de certificación.",
      prioridad: "alta",
      ruta: "/organizacion/certificados",
      cta: "Emitir",
      icono: Award,
    });
  }

  if (enRiesgo.value.length) {
    acciones.push({
      id: "riesgo",
      titulo: `${enRiesgo.value.length} matrícula(s) en riesgo`,
      detalle: "Bajo avance o inactividad: conviene reasignar o dar seguimiento.",
      prioridad: "media",
      ruta: "/organizacion/alumnos",
      cta: "Ver alumnos",
      icono: AlertTriangle,
    });
  }

  if (porcentajeLicencias.value >= 85) {
    acciones.push({
      id: "licencia",
      titulo: `Licencias al ${porcentajeLicencias.value}%`,
      detalle: `Quedan ${licenciasDisponibles.value} cupos en el plan corporativo.`,
      prioridad: "media",
      ruta: "/organizacion/licencia",
      cta: "Ver plan",
      icono: ShieldCheck,
    });
  }

  return acciones.slice(0, 4);
});

const indicadores = computed(() => [
  {
    etiqueta: "Ingresos formación",
    valor: moneda(ingresosEstimados.value),
    detalle: "Estimado por cursos completados",
    icono: CircleDollarSign,
    acento: "accent" as const,
    ruta: "/organizacion/reportes",
  },
  {
    etiqueta: "Alumnos activos",
    valor: activos.value.length.toLocaleString("es-PE"),
    detalle: `${enRiesgo.value.length} matrículas en riesgo · ${matriculasTotales.value} en asignaciones`,
    icono: UsersRound,
    acento: "primary" as const,
    ruta: "/organizacion/alumnos",
  },
  {
    etiqueta: "Oferta publicada",
    valor: cursosPublicados.value,
    detalle: `${rutasPublicadas.value} rutas · ${asignaciones.value.length} asignaciones`,
    icono: BookOpen,
    acento: "primary" as const,
    ruta: "/organizacion/cursos",
  },
  {
    etiqueta: "Finalización",
    valor: `${finalizacion.value}%`,
    detalle: `${certificados.value.length} certificados emitidos`,
    icono: Award,
    acento: "accent" as const,
    ruta: "/organizacion/certificados",
  },
]);

const accesosRapidos = computed((): AccesoRapido[] => [
  {
    etiqueta: "Personas",
    detalle: "Usuarios, alumnos y estructura",
    ruta: "/organizacion/usuarios",
    icono: UsersRound,
  },
  {
    etiqueta: "Catálogo",
    detalle: "Revisión y aprobación de cursos",
    ruta: "/organizacion/cursos",
    icono: BookOpen,
  },
  {
    etiqueta: "Asignaciones",
    detalle: "Matricular y dar seguimiento",
    ruta: "/organizacion/asignaciones",
    icono: ClipboardList,
  },
  {
    etiqueta: "Rutas",
    detalle: "Programas de aprendizaje",
    ruta: "/organizacion/rutas",
    icono: Route,
  },
  {
    etiqueta: "Reportes",
    detalle: "Ingresos, top cursos y avance",
    ruta: "/organizacion/reportes",
    icono: BarChart3,
  },
  {
    etiqueta: "Estructura",
    detalle: "Nodos y organigrama",
    ruta: "/organizacion/equipos",
    icono: Network,
  },
]);

const diapositivasPortada = computed(() => [
  {
    imagen: "/img/portal-organizacion.png",
    rotulo: "Capacitación corporativa para toda tu estructura organizacional",
  },
  {
    imagen: "/img/portada-planes-empresariales.png",
    rotulo: "Planes, licencias y formación alineados a tu entidad",
  },
  {
    imagen: "/img/portal-administracion.png",
    rotulo: "Gobierno académico: aprueba cursos, rutas y certificados",
  },
  {
    imagen: "/img/tukuyAcademia.png",
    rotulo: "Tukuy Academy: aprendizaje con impacto medible",
  },
  {
    imagen: "/img/portal-estudiante.png",
    rotulo: "Alumnado activo, progreso por nodo e ingresos de formación",
  },
]);
</script>

<template>
  <section class="mx-auto grid max-w-375 gap-6">
    <PortadaPanel
      :diapositivas="diapositivasPortada"
      :etiqueta="nombreOrganizacion"
      :titulo="`${saludo}, ${primerNombre}`"
      :descripcion="`Hoy es ${fechaActual.toLowerCase()}. Supervisa ingresos, alumnado, aprobación de cursos y cumplimiento desde un solo panel.`"
      texto-accion="Nueva asignación"
      texto-accion-secundaria="Reportes"
      :icono-accion-secundaria="BarChart3"
      etiqueta-accesible="Bienvenida del portal de organización"
      @accion="router.push('/organizacion/asignaciones')"
      @accion-secundaria="router.push('/organizacion/reportes')"
    />

    <div v-if="cargando" class="grid gap-5">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton v-for="item in 4" :key="item" class="h-28 w-full" />
      </div>
      <Skeleton class="h-40 w-full" />
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton v-for="item in 6" :key="`a-${item}`" class="h-24 w-full" />
      </div>
    </div>

    <template v-else>
      <!-- 1. Cola de atención -->
      <Card
        v-if="accionesPendientes.length"
        class="border-border border-t-4 border-t-accent bg-card"
      >
        <CardContent class="p-5 sm:p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p
                class="text-[11px] font-bold uppercase tracking-wide text-[#B87A00]"
              >
                Requiere atención
              </p>
              <h2 class="text-lg font-black">Prioridades de hoy</h2>
            </div>
            <Badge
              variant="outline"
              class="border-accent/40 bg-accent/10 text-[#B87A00]"
            >
              {{ accionesPendientes.length }} pendientes
            </Badge>
          </div>
          <div class="grid gap-3 lg:grid-cols-2">
            <button
              v-for="accion in accionesPendientes"
              :key="accion.id"
              type="button"
              class="flex items-start gap-3 border border-border border-l-4 p-4 text-left transition hover:bg-muted/40"
              :class="
                accion.prioridad === 'alta'
                  ? 'border-l-accent'
                  : 'border-l-primary'
              "
              @click="router.push(accion.ruta)"
            >
              <div
                class="grid h-10 w-10 shrink-0 place-items-center"
                :class="
                  accion.prioridad === 'alta'
                    ? 'bg-accent/20 text-[#B87A00]'
                    : 'bg-primary/10 text-primary'
                "
              >
                <component :is="accion.icono" class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-black">{{ accion.titulo }}</p>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                  {{ accion.detalle }}
                </p>
                <span
                  class="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary"
                >
                  {{ accion.cta }}
                  <ArrowRight class="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <p
        v-else
        class="border border-border border-l-4 border-l-emerald-600 bg-emerald-500/5 px-4 py-3 text-sm text-muted-foreground"
      >
        No hay pendientes críticos. Puedes revisar reportes o crear una nueva
        asignación.
      </p>

      <!-- 2. KPIs alineados a reportes -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          v-for="indicador in indicadores"
          :key="indicador.etiqueta"
          type="button"
          class="text-left"
          @click="router.push(indicador.ruta)"
        >
          <Card
            class="h-full overflow-hidden border-border bg-card transition hover:bg-muted/30"
            :class="
              indicador.acento === 'accent'
                ? 'border-t-4 border-t-accent'
                : 'border-t-4 border-t-primary'
            "
          >
            <CardContent class="flex items-center gap-4 p-5">
              <div
                class="grid h-11 w-11 place-items-center"
                :class="
                  indicador.acento === 'accent'
                    ? 'bg-accent/20 text-[#B87A00]'
                    : 'bg-primary/10 text-primary'
                "
              >
                <component :is="indicador.icono" class="h-5 w-5" />
              </div>
              <div class="min-w-0">
                <strong class="block text-2xl font-black tracking-tight">{{
                  indicador.valor
                }}</strong>
                <p class="text-xs font-bold">{{ indicador.etiqueta }}</p>
                <p class="truncate text-[11px] text-muted-foreground">
                  {{ indicador.detalle }}
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      <!-- 3. Accesos rápidos -->
      <div>
        <h2 class="mb-3 text-sm font-black uppercase tracking-wide text-muted-foreground">
          Accesos rápidos
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="acceso in accesosRapidos"
            :key="acceso.ruta"
            type="button"
            class="flex items-center gap-3 border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-muted/30"
            @click="router.push(acceso.ruta)"
          >
            <div
              class="grid h-10 w-10 shrink-0 place-items-center bg-primary/10 text-primary"
            >
              <component :is="acceso.icono" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-black">{{ acceso.etiqueta }}</p>
              <p class="text-xs text-muted-foreground">{{ acceso.detalle }}</p>
            </div>
            <ArrowRight class="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </div>

      <!-- 4. Cumplimiento operativo -->
      <div class="grid gap-5 xl:grid-cols-2">
        <Card class="border-border bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-black">Asignaciones con menor avance</h2>
                <p class="text-xs text-muted-foreground">
                  Prioriza seguimiento donde hay más rezago
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                @click="router.push('/organizacion/asignaciones')"
              >
                Ver todas
              </Button>
            </div>
            <div class="divide-y divide-border border border-border">
              <article
                v-for="asignacion in asignacionesCriticas"
                :key="asignacion.id"
                class="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem]"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="truncate text-sm font-bold">
                      {{ asignacion.curso }}
                    </h3>
                    <Badge
                      v-if="asignacion.obligatorio"
                      variant="outline"
                      class="border-red-200 bg-red-50 text-[10px] text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
                    >
                      Obligatorio
                    </Badge>
                  </div>
                  <p class="mt-0.5 truncate text-xs text-muted-foreground">
                    {{ asignacion.destino }} · vence {{ asignacion.vence }}
                  </p>
                </div>
                <div class="sm:text-right">
                  <div class="flex items-center gap-2 sm:justify-end">
                    <Progress
                      :model-value="asignacion.avance"
                      class="h-2 flex-1 sm:max-w-16"
                    />
                    <strong class="text-sm text-primary"
                      >{{ asignacion.avance }}%</strong
                    >
                  </div>
                  <p class="mt-1 text-[11px] text-muted-foreground">
                    {{ asignacion.completados }}/{{ asignacion.asignados }}
                  </p>
                </div>
              </article>
              <p
                v-if="!asignacionesCriticas.length"
                class="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                Aún no hay asignaciones registradas.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card class="border-border bg-card">
          <CardContent class="p-5 sm:p-6">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-black">Nodos con menor progreso</h2>
                <p class="text-xs text-muted-foreground">
                  Avance medio por unidad de la estructura
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                @click="router.push('/organizacion/equipos')"
              >
                Estructura
              </Button>
            </div>
            <div class="divide-y divide-border border border-border">
              <article
                v-for="(nodo, indice) in nodosCriticos"
                :key="nodo.id"
                class="flex items-center gap-3 px-4 py-3"
              >
                <span
                  class="grid h-8 w-8 shrink-0 place-items-center text-xs font-black"
                  :class="
                    indice === 0
                      ? 'bg-accent/20 text-[#B87A00]'
                      : 'bg-muted text-muted-foreground'
                  "
                >
                  {{ String(indice + 1).padStart(2, "0") }}
                </span>
                <div class="min-w-0 flex-1">
                  <h3 class="truncate text-sm font-bold">{{ nodo.nombre }}</h3>
                  <p class="text-xs text-muted-foreground">
                    {{ nodo.usuarios }} personas
                  </p>
                  <div class="mt-2 flex items-center gap-2">
                    <div class="h-1.5 flex-1 overflow-hidden bg-muted">
                      <div
                        class="h-full bg-primary transition-all"
                        :style="{ width: `${nodo.progreso}%` }"
                      />
                    </div>
                    <strong class="min-w-10 text-right text-sm text-primary">
                      {{ nodo.progreso }}%
                    </strong>
                  </div>
                </div>
              </article>
              <p
                v-if="!nodosCriticos.length"
                class="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                No hay nodos activos en la estructura.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 5. Plan (secundario) -->
      <Card class="border-border bg-card">
        <CardContent
          class="flex flex-wrap items-center justify-between gap-4 p-5"
        >
          <div class="flex items-center gap-4">
            <div
              class="grid h-12 w-12 place-items-center bg-primary/10 text-primary"
            >
              <ShieldCheck class="h-6 w-6" />
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Plan corporativo
              </p>
              <p class="text-sm font-black">
                {{ consumoUsuarios?.utilizado ?? 0 }}/{{
                  consumoUsuarios?.limite ?? 0
                }}
                licencias · {{ porcentajeLicencias }}% en uso ·
                {{ licenciasDisponibles }} disponibles
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            @click="router.push('/organizacion/licencia')"
          >
            Gestionar licencia
          </Button>
        </CardContent>
      </Card>
    </template>
  </section>
</template>
