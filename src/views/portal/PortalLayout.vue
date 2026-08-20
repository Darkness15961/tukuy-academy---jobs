<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { obtenerMetaCatalogoAlumno } from "@/api/services/cursos.service";
import { aprendizajeService } from "@/api/services/aprendizaje.service";
import { apiConfig } from "@/api/config";
import { organizacionService } from "@/api/services/organizacion.service";
import {
  invalidarCacheSecundaria,
  secundariaGatewayService,
} from "@/api/services/secundaria-gateway.service";
import AppHeader from "@/components/shared/AppHeader.vue";
import LazyRouteOutlet from "@/components/shared/LazyRouteOutlet.vue";
import PortalPageSkeleton from "@/components/shared/PortalPageSkeleton.vue";
import SiteFooter from "@/components/shared/SiteFooter.vue";
import { useAuth } from "@/composables/useAuth";
import { useCarrito } from "@/composables/useCarrito";
import { useContent } from "@/composables/useContent";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { useFiltroCursos, useCursos } from "@/composables/useCursos";
import { useFavoritos } from "@/composables/useFavoritos";
import { useFiltroEmpleos } from "@/composables/useFiltroEmpleos";
import { useEmpleos } from "@/composables/useEmpleos";
import { useUsuario } from "@/composables/useUsuario";
import {
  buildCertificateData,
  downloadCertificatePdf,
  viewCourseCertificate,
} from "@/lib/certificado-pdf";
import {
  abrirPdfCertificadoAlumno,
  reemplazarMetaCertificadosAlumno,
} from "@/lib/certificado-alumno-meta";
import {
  cursoEstaMatriculado,
  cursoPuedeInscribirseGratis,
  cursoRequiereCompra,
  matricularCurso,
  matricularCursos,
  mensajeErrorMatricula,
  pasarelaCursosHabilitada,
} from "@/lib/acceso-curso";
import { cursoVisibleEnCatalogoAlumno } from "@/lib/catalogo-alumno";
import { cursosPerfilesEntidadesMock } from "@/modulos/comunidad/data/entidades-publicas.mock";
import { entidadesComunidadService } from "@/modulos/comunidad/services/entidades.service";
import { portalPathByView, resolvePortalView } from "@/lib/portal-routes";
import { toast } from "@/lib/toast";
import type { Course, UserProfile, ViewId } from "@/types/academia";
import { providePortalContext } from "./composables/usePortalContext";
import type {
  AccesoCursoFilter,
  FuenteCursoFilter,
  PricingFilter,
} from "./composables/usePortalContext";

const route = useRoute();
const router = useRouter();
const { logout } = useAuth();
const { navItems, loading: contentLoading } = useContent();
const { contextoActivo } = useContextoSesion();
const {
  courses,
  completedCourses,
  loading: coursesLoading,
  error: coursesError,
  refetch: refetchCursos,
} = useCursos();
const { searchTerm, filteredCourses } = useFiltroCursos(() => courses.value);
const { jobs, loading: jobsLoading } = useEmpleos();
const {
  searchTerm: jobSearchTerm,
  scopeFilter,
  dateFilter,
  filteredJobs,
  forYouJobs,
} = useFiltroEmpleos(() => jobs.value);
const {
  user,
  workExperiences,
  loading: userLoading,
  updateProfile,
} = useUsuario();
const { cartCount, addToCart, removeFromCart, clearCart, isInCart } = useCarrito();
const { favoritesCount, isFavorite, toggleFavorite, favoriteCourseIds, sincronizarConCatalogo } =
  useFavoritos();

const pricingFilter = ref<PricingFilter>("all");
const fuenteFilter = ref<FuenteCursoFilter>("all");
const accesoFilter = ref<AccesoCursoFilter>("all");
const openingCertificateId = ref<string | null>(null);
const inscribiendoCursoId = ref<string | null>(null);
const mensajeAccesoCurso = ref("");

const activeView = computed(() => resolvePortalView(route.meta.view));

/** Solo el perfil bloquea el shell; cursos/empleos/contenido cargan en segundo plano. */
const isPageLoading = computed(() => userLoading.value && !user.value);

onMounted(() => {
  if (apiConfig.secundariaCursos) {
    secundariaGatewayService.prefetchAlumno();
    void secundariaGatewayService
      .listarMisCertificados()
      .then((data) => {
        reemplazarMetaCertificadosAlumno(
          (data.emitidos ?? []).map((item) => ({
            cursoId: item.cursoId,
            meta: {
              codigo: item.codigoVerificacion || item.id,
              fecha: item.fecha
                ? new Date(item.fecha).toLocaleDateString("es-PE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—",
              horas: Number(item.horasCertificadas ?? 0),
              certificadoId: item.id,
              claveAlmacenamiento: item.claveAlmacenamiento ?? null,
              organizacionEmisora: item.organizacionEmisora,
            },
          })),
        );
      })
      .catch(() => {
        /* silencioso: fallback a PDF local */
      });
  }
});

const enrolledCourses = computed(() =>
  courses.value.filter(
    (course) =>
      course.status === "En curso" ||
      course.status === "Completado" ||
      course.progress > 0,
  ),
);

const cursosCatalogoBase = computed(() =>
  filteredCourses.value.filter(cursoVisibleEnCatalogoAlumno),
);

const catalogCourses = computed(() => {
  return cursosCatalogoBase.value.filter((course) => {
    const coincidePrecio =
      pricingFilter.value === "all" ||
      course.pricing === pricingFilter.value;
    const coincideFuente =
      fuenteFilter.value === "all" ||
      (course.origen ?? "tukuy") === fuenteFilter.value;
    const alcance = course.alcance ?? "PUBLICO";
    const coincideAcceso =
      accesoFilter.value === "all" ||
      (accesoFilter.value === "publico" && alcance === "PUBLICO") ||
      (accesoFilter.value === "restringido" && alcance === "INTERNO");
    return coincidePrecio && coincideFuente && coincideAcceso;
  });
});

const featuredCourses = computed(() => {
  const publicados = courses.value.filter(cursoVisibleEnCatalogoAlumno);
  const tukuy = publicados.filter((c) => (c.origen ?? "tukuy") === "tukuy");
  const entidades = publicados.filter(
    (c) => c.origen === "entidad" && (c.alcance ?? "PUBLICO") === "PUBLICO",
  );
  return [...tukuy.slice(0, 3), ...entidades.slice(0, 3)].slice(0, 6);
});

const contadoresCatalogo = computed(() => {
  const publicados = courses.value.filter(cursoVisibleEnCatalogoAlumno);
  return {
    total: publicados.length,
    tukuy: publicados.filter((c) => (c.origen ?? "tukuy") === "tukuy").length,
    entidad: publicados.filter((c) => c.origen === "entidad").length,
    publico: publicados.filter((c) => (c.alcance ?? "PUBLICO") === "PUBLICO")
      .length,
    restringido: publicados.filter((c) => c.alcance === "INTERNO").length,
  };
});

const topCourses = computed(() => {
  const publicados = courses.value.filter(cursoVisibleEnCatalogoAlumno);
  const enriched = publicados.map((course) => ({
    ...course,
    _bestseller: course.bestseller ?? false,
  }));
  const bestsellers = enriched.filter((course) => course._bestseller);
  return (bestsellers.length >= 3 ? bestsellers : enriched).slice(0, 5);
});

const favoriteCourses = computed(() =>
  courses.value.filter((course) => favoriteCourseIds.value.includes(course.id)),
);

const metaCatalogoAlumno = computed(() => obtenerMetaCatalogoAlumno());

watch(
  courses,
  (lista) => {
    // No podar favoritos si el catálogo viene vacío (carga fallida / sin publicados).
    if (!lista.length) return;
    sincronizarConCatalogo(lista.map((c) => c.id));
  },
  { immediate: true },
);

watch(
  () => contextoActivo.value?.organizacionId,
  async (siguiente, anterior) => {
    if (!siguiente || siguiente === anterior) return;
    if (apiConfig.secundariaCursos) {
      invalidarCacheSecundaria();
    }
    await refetchCursos({ forzar: true });
  },
);

function navigate(view: ViewId) {
  router.push(portalPathByView[view]);
}

function avisarAcceso(
  mensaje: string,
  tipo: "success" | "error" | "info" | "warning" = "info",
) {
  toast[tipo](mensaje);
}

function verDetalleCurso(course: Course) {
  mensajeAccesoCurso.value = "";
  void router.push(`/tukuy-academy/cursos/${course.id}`);
}

function handleAddToCart(courseId: string) {
  mensajeAccesoCurso.value = "";
  const course = courses.value.find((item) => item.id === courseId);
  if (course && cursoEstaMatriculado(course)) {
    void router.push(`/tukuy-academy/aprendizaje/${courseId}`);
    return;
  }
  if (!pasarelaCursosHabilitada) {
    if (course) void openSimuladorCurso(course);
    return;
  }
  if (isInCart(courseId)) {
    avisarAcceso(
      "Este curso ya está en tu carrito. Ábrelo desde el ícono para pagar.",
      "info",
    );
    return;
  }
  addToCart(courseId);
  avisarAcceso(
    "Agregado al carrito. Puedes seguir explorando o pagar desde el ícono.",
    "success",
  );
}

function handleToggleFavorite(courseId: string) {
  const yaEraFavorito = isFavorite(courseId);
  toggleFavorite(courseId);
  toast.success(
    yaEraFavorito ? "Quitado de favoritos." : "Agregado a favoritos.",
  );
}

function irAlCarrito() {
  if (!pasarelaCursosHabilitada) return;
  void router.push("/tukuy-academy/carrito");
}

function comprarAhora(courseId: string) {
  const course = courses.value.find((item) => item.id === courseId);
  if (course && cursoEstaMatriculado(course)) {
    void router.push(`/tukuy-academy/aprendizaje/${courseId}`);
    return;
  }
  if (!pasarelaCursosHabilitada) {
    if (course) void openSimuladorCurso(course);
    return;
  }
  if (!isInCart(courseId)) addToCart(courseId);
  void router.push("/tukuy-academy/carrito");
}

async function handleViewCertificate(course: Course) {
  if (!user.value) return;

  openingCertificateId.value = course.id;
  try {
    await abrirPdfCertificadoAlumno({
      cursoId: course.id,
      fallback: () => viewCourseCertificate(course, user.value!),
    });
  } catch (causa) {
    toast.error(
      causa instanceof Error
        ? causa.message
        : "No se pudo abrir el certificado.",
    );
  } finally {
    openingCertificateId.value = null;
  }
}

async function handleDownloadCertificate(course: Course) {
  if (!user.value) return;

  openingCertificateId.value = course.id;
  try {
    await abrirPdfCertificadoAlumno({
      cursoId: course.id,
      descargar: true,
      fallback: () =>
        downloadCertificatePdf(buildCertificateData(course, user.value!)),
    });
    toast.success("Certificado descargado.");
  } catch (causa) {
    toast.error(
      causa instanceof Error
        ? causa.message
        : "No se pudo descargar el certificado.",
    );
  } finally {
    openingCertificateId.value = null;
  }
}

async function sincronizarProgresosCursos() {
  if (courses.value.length === 0) return;
  const conProgreso = await aprendizajeService.aplicarProgresosACursos(
    courses.value,
  );
  conProgreso.forEach((actualizado) => {
    const curso = courses.value.find((c) => c.id === actualizado.id);
    if (!curso) return;
    curso.progress = actualizado.progress;
    curso.status = actualizado.status;
  });
}

// Restaura progreso desde el repositorio de aprendizaje (localStorage / API).
watch(courses, () => void sincronizarProgresosCursos(), { immediate: true });
watch(
  () => route.fullPath,
  () => void sincronizarProgresosCursos(),
);

async function refrescarCursosTrasMatricula() {
  invalidarCacheSecundaria();
  await refetchCursos({ silencioso: true, forzar: true });
  await sincronizarProgresosCursos();
}

async function irAlCursoTrasInscripcion(course: Course) {
  await matricularCurso(course.id, courses.value, { actualizarLista: false });
  await router.push(`/tukuy-academy/aprendizaje/${course.id}`);
  void refrescarCursosTrasMatricula();
}

function estaInscribiendoCurso(courseId: string) {
  return inscribiendoCursoId.value === courseId;
}

async function matricularTrasCompra(cursoIds: string[]) {
  await matricularCursos(cursoIds, courses.value);
  await refrescarCursosTrasMatricula();
}

async function openSimuladorCurso(course: Course) {
  mensajeAccesoCurso.value = "";
  const contexto = contextoActivo.value;
  const esEstudianteInstitucional =
    contexto?.portal === "estudiante" &&
    Boolean(contexto.organizacionId) &&
    !contexto.organizacionId?.startsWith("org-personal-");

  if (cursoEstaMatriculado(course)) {
    await router.push(`/tukuy-academy/aprendizaje/${course.id}`);
    return;
  }

  if (cursoRequiereCompra(course)) {
    if (!isInCart(course.id)) addToCart(course.id);
    avisarAcceso(
      "Este curso requiere compra. Agrégalo al carrito y completa el pago para continuar.",
      "warning",
    );
    return;
  }

  if (inscribiendoCursoId.value) return;

  inscribiendoCursoId.value = course.id;
  try {
    if (course.origen === "entidad" && course.alcance === "INTERNO") {
      const cursoEntidad = cursosPerfilesEntidadesMock.find(
        (item) => item.id === course.id,
      );
      if (cursoEntidad) {
        const acceso =
          await entidadesComunidadService.evaluarAccesoCurso(cursoEntidad);
        if (!acceso.disponible) {
          avisarAcceso(
            `${acceso.motivo} Puedes solicitar acceso desde el perfil de la entidad.`,
            "warning",
          );
          void router.push(`/comunidad/entidades/${cursoEntidad.organizacionId}`);
          return;
        }
        if (acceso.origenAcceso === "APROBACION") {
          await entidadesComunidadService.matricularEnCurso(cursoEntidad);
          avisarAcceso(
            "Solicitud de matrícula enviada. La entidad debe aprobarla antes de habilitar el curso.",
            "success",
          );
          return;
        }
        await entidadesComunidadService.matricularEnCurso(cursoEntidad);
        await irAlCursoTrasInscripcion(course);
        return;
      }
    }

    if (
      course.status === "Disponible" &&
      esEstudianteInstitucional &&
      contexto?.personaEntidadId
    ) {
      const evaluacion = await organizacionService.estructura.evaluarAccesoCurso(
        contexto.personaEntidadId,
        course.id,
      );
      if (!evaluacion.disponible) {
        avisarAcceso(evaluacion.motivo, "warning");
        return;
      }
      if (evaluacion.requiereAprobacion) {
        await organizacionService.solicitarMatriculaCurso({
          usuarioId: contexto.personaEntidadId,
          cursoId: course.id,
          curso: course.title,
          unidadOrigenId: evaluacion.unidadOrigenId,
        });
        avisarAcceso(
          "Solicitud enviada. La entidad debe aprobarla antes de habilitar el curso.",
          "success",
        );
        return;
      }
      await organizacionService.matricularUsuarioEnCurso({
        usuarioId: contexto.personaEntidadId,
        cursoId: course.id,
        curso: course.title,
        unidadOrigenId: evaluacion.unidadOrigenId,
        modalidad: "LIBRE",
      });
      await irAlCursoTrasInscripcion(course);
      return;
    }

    if (cursoPuedeInscribirseGratis(course)) {
      await irAlCursoTrasInscripcion(course);
      return;
    }
  } catch (causa) {
    avisarAcceso(mensajeErrorMatricula(causa), "error");
    return;
  } finally {
    if (inscribiendoCursoId.value === course.id) {
      inscribiendoCursoId.value = null;
    }
  }

  avisarAcceso(
    "No tienes acceso a este curso todavía. Revisa el detalle o el carrito.",
    "warning",
  );
  verDetalleCurso(course);
}

async function updateUserProfile(updates: Partial<UserProfile>) {
  await updateProfile(updates);
}

async function updateCourseProgress(
  courseId: string,
  progress: number,
  status: Course["status"],
) {
  const course = courses.value.find((c) => c.id === courseId);
  if (course) {
    course.progress = progress;
    course.status = status;
  }
  await aprendizajeService.guardarProgreso(courseId, {
    progreso: progress,
    estado: status,
  });
}

// Compute dynamic user profile with real-time certificate count
const computedUser = computed(() => {
  if (!user.value) return null;
  return {
    ...user.value,
    certificates: completedCourses.value.length,
  };
});

const portalContext = {
  activeView,
  navItems,
  user: computedUser,
  courses,
  completedCourses,
  enrolledCourses,
  featuredCourses,
  topCourses,
  catalogCourses,
  contadoresCatalogo,
  favoriteCourses,
  workExperiences,
  jobs,
  filteredJobs,
  forYouJobs,
  searchTerm,
  pricingFilter,
  fuenteFilter,
  accesoFilter,
  jobSearchTerm,
  scopeFilter,
  dateFilter,
  coursesLoading,
  coursesError,
  metaCatalogoAlumno,
  jobsLoading,
  contentLoading,
  openingCertificateId,
  inscribiendoCursoId,
  mensajeAccesoCurso,
  cartCount,
  favoritesCount,
  navigate,
  logout,
  handleAddToCart,
  comprarAhora,
  irAlCarrito,
  verDetalleCurso,
  isInCart,
  removeFromCart,
  clearCart,
  isFavorite,
  toggleFavorite: handleToggleFavorite,
  handleViewCertificate,
  handleDownloadCertificate,
  openSimuladorCurso,
  matricularTrasCompra,
  sincronizarProgresosCursos,
  updateUserProfile,
  estaInscribiendoCurso,
};

providePortalContext(portalContext);
</script>

<template>
  <AppHeader
    v-if="user && !route.meta.hideHeaderFooter"
    mode="portal"
    :user="user"
    :nav-items="navItems"
    :active-view="activeView"
    :enrolled-courses="enrolledCourses"
    :favorite-courses="favoriteCourses"
    :cart-count="cartCount"
    :favorites-count="favoritesCount"
    :content-loading="contentLoading"
    @navigate="navigate"
    @logout="logout"
  />

  <PortalPageSkeleton v-if="isPageLoading" />

  <main
    v-else-if="user"
    :class="
      route.meta.hideHeaderFooter
        ? ''
        : route.meta.hideFooter
          ? 'bg-background h-[calc(100dvh-4rem)] overflow-hidden'
          : 'bg-background min-h-[calc(100vh-4rem)] flex flex-col justify-between'
    "
  >
    <LazyRouteOutlet />
    <SiteFooter
      v-if="!route.meta.hideHeaderFooter && !route.meta.hideFooter"
      variant="light"
    />
  </main>

  <div
    v-else
    class="grid min-h-[70vh] place-items-center bg-background px-6 text-center text-foreground"
  >
    <div class="grid max-w-md gap-3">
      <h1 class="text-xl font-black">No se pudo cargar tu perfil</h1>
      <p class="text-sm text-muted-foreground">
        Recarga la página o vuelve a iniciar sesión. Si el problema continúa,
        revisa que la sesión de Supabase esté activa.
      </p>
      <button
        type="button"
        class="mx-auto mt-2 border border-border bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        @click="router.push('/login')"
      >
        Ir al login
      </button>
    </div>
  </div>
</template>
