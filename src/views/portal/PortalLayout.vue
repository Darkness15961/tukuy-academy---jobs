<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";

import { aprendizajeService } from "@/api/services/aprendizaje.service";
import { organizacionService } from "@/api/services/organizacion.service";
import AppHeader from "@/components/shared/AppHeader.vue";
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
  cursoEstaMatriculado,
  cursoPuedeInscribirseGratis,
  cursoRequiereCompra,
  matricularCurso,
  matricularCursos,
} from "@/lib/acceso-curso";
import { cursosPerfilesEntidadesMock } from "@/modulos/comunidad/data/entidades-publicas.mock";
import { entidadesComunidadService } from "@/modulos/comunidad/services/entidades.service";
import { portalPathByView, resolvePortalView } from "@/lib/portal-routes";
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
const { courses, completedCourses, loading: coursesLoading } = useCursos();
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
const { favoritesCount, isFavorite, toggleFavorite, favoriteCourseIds } =
  useFavoritos();

const pricingFilter = ref<PricingFilter>("all");
const fuenteFilter = ref<FuenteCursoFilter>("all");
const accesoFilter = ref<AccesoCursoFilter>("all");
const openingCertificateId = ref<string | null>(null);
const mensajeAccesoCurso = ref("");

const activeView = computed(() => resolvePortalView(route.meta.view));

const isPageLoading = computed(
  () =>
    userLoading.value ||
    coursesLoading.value ||
    jobsLoading.value ||
    contentLoading.value,
);

const enrolledCourses = computed(() =>
  courses.value.filter(
    (course) =>
      course.status === "En curso" ||
      course.status === "Completado" ||
      course.progress > 0,
  ),
);

const catalogCourses = computed(() => {
  return filteredCourses.value.filter((course) => {
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
  const tukuy = courses.value.filter((c) => (c.origen ?? "tukuy") === "tukuy");
  const entidades = courses.value.filter(
    (c) => c.origen === "entidad" && (c.alcance ?? "PUBLICO") === "PUBLICO",
  );
  return [...tukuy.slice(0, 3), ...entidades.slice(0, 3)].slice(0, 6);
});

const contadoresCatalogo = computed(() => ({
  total: courses.value.length,
  tukuy: courses.value.filter((c) => (c.origen ?? "tukuy") === "tukuy").length,
  entidad: courses.value.filter((c) => c.origen === "entidad").length,
  publico: courses.value.filter((c) => (c.alcance ?? "PUBLICO") === "PUBLICO")
    .length,
  restringido: courses.value.filter((c) => c.alcance === "INTERNO").length,
}));

const topCourses = computed(() => {
  const enriched = courses.value.map((course) => ({
    ...course,
    _bestseller: course.bestseller ?? false,
  }));
  const bestsellers = enriched.filter((course) => course._bestseller);
  return (bestsellers.length >= 3 ? bestsellers : enriched).slice(0, 5);
});

const favoriteCourses = computed(() =>
  courses.value.filter((course) => favoriteCourseIds.value.includes(course.id)),
);

function navigate(view: ViewId) {
  router.push(portalPathByView[view]);
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
  if (isInCart(courseId)) {
    mensajeAccesoCurso.value =
      "Este curso ya está en tu carrito. Ábrelo desde el ícono para pagar.";
    return;
  }
  addToCart(courseId);
  mensajeAccesoCurso.value =
    "Agregado al carrito. Puedes seguir explorando o pagar desde el ícono.";
}

function irAlCarrito() {
  void router.push("/tukuy-academy/carrito");
}

function comprarAhora(courseId: string) {
  const course = courses.value.find((item) => item.id === courseId);
  if (course && cursoEstaMatriculado(course)) {
    void router.push(`/tukuy-academy/aprendizaje/${courseId}`);
    return;
  }
  if (!isInCart(courseId)) addToCart(courseId);
  void router.push("/tukuy-academy/carrito");
}

async function handleViewCertificate(course: Course) {
  if (!user.value) return;

  openingCertificateId.value = course.id;
  try {
    await viewCourseCertificate(course, user.value);
  } finally {
    openingCertificateId.value = null;
  }
}

async function handleDownloadCertificate(course: Course) {
  if (!user.value) return;

  openingCertificateId.value = course.id;
  try {
    await downloadCertificatePdf(buildCertificateData(course, user.value));
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

async function matricularTrasCompra(cursoIds: string[]) {
  await matricularCursos(cursoIds, courses.value);
  await sincronizarProgresosCursos();
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
    mensajeAccesoCurso.value =
      "Este curso requiere compra. Agrégalo al carrito y completa el pago para continuar.";
    handleAddToCart(course.id);
    return;
  }

  if (course.origen === "entidad" && course.alcance === "INTERNO") {
    const cursoEntidad = cursosPerfilesEntidadesMock.find(
      (item) => item.id === course.id,
    );
    if (cursoEntidad) {
      const acceso =
        await entidadesComunidadService.evaluarAccesoCurso(cursoEntidad);
      if (!acceso.disponible) {
        mensajeAccesoCurso.value = `${acceso.motivo} Puedes solicitar acceso desde el perfil de la entidad.`;
        void router.push(`/comunidad/entidades/${cursoEntidad.organizacionId}`);
        return;
      }
      if (acceso.origenAcceso === "APROBACION") {
        await entidadesComunidadService.matricularEnCurso(cursoEntidad);
        mensajeAccesoCurso.value =
          "Solicitud de matrícula enviada. La entidad debe aprobarla antes de habilitar el curso.";
        return;
      }
      await entidadesComunidadService.matricularEnCurso(cursoEntidad);
      await matricularCurso(course.id, courses.value);
      await router.push(`/tukuy-academy/aprendizaje/${course.id}`);
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
      mensajeAccesoCurso.value = evaluacion.motivo;
      return;
    }
    if (evaluacion.requiereAprobacion) {
      await organizacionService.solicitarMatriculaCurso({
        usuarioId: contexto.personaEntidadId,
        cursoId: course.id,
        curso: course.title,
        unidadOrigenId: evaluacion.unidadOrigenId,
      });
      mensajeAccesoCurso.value =
        "Solicitud enviada. La entidad debe aprobarla antes de habilitar el curso.";
      return;
    }
    await organizacionService.matricularUsuarioEnCurso({
      usuarioId: contexto.personaEntidadId,
      cursoId: course.id,
      curso: course.title,
      unidadOrigenId: evaluacion.unidadOrigenId,
      modalidad: "LIBRE",
    });
    await matricularCurso(course.id, courses.value);
    await router.push(`/tukuy-academy/aprendizaje/${course.id}`);
    return;
  }

  if (cursoPuedeInscribirseGratis(course)) {
    await matricularCurso(course.id, courses.value);
    await router.push(`/tukuy-academy/aprendizaje/${course.id}`);
    return;
  }

  mensajeAccesoCurso.value =
    "No tienes acceso a este curso todavía. Revisa el detalle o el carrito.";
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
  jobsLoading,
  contentLoading,
  openingCertificateId,
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
  toggleFavorite,
  handleViewCertificate,
  handleDownloadCertificate,
  openSimuladorCurso,
  matricularTrasCompra,
  sincronizarProgresosCursos,
  updateUserProfile,
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
    <RouterView />
    <SiteFooter
      v-if="!route.meta.hideHeaderFooter && !route.meta.hideFooter"
      variant="light"
    />
  </main>
</template>
