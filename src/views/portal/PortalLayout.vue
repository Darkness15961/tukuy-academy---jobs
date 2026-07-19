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
import { portalPathByView, resolvePortalView } from "@/lib/portal-routes";
import type { Course, UserProfile, ViewId } from "@/types/academia";
import { providePortalContext } from "./composables/usePortalContext";

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

const pricingFilter = ref<"all" | "free" | "paid">("all");
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
  if (pricingFilter.value === "free") {
    return filteredCourses.value.filter((course) => course.pricing === "free");
  }
  if (pricingFilter.value === "paid") {
    return filteredCourses.value.filter((course) => course.pricing === "paid");
  }
  return filteredCourses.value;
});

const featuredCourses = computed(() => courses.value.slice(0, 6));

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

function handleAddToCart(courseId: string) {
  addToCart(courseId);
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

// Restaura progreso desde el repositorio de aprendizaje (localStorage / API).
watch(
  courses,
  async (newCourses) => {
    if (newCourses.length === 0) return;
    const conProgreso =
      await aprendizajeService.aplicarProgresosACursos(newCourses);
    conProgreso.forEach((actualizado) => {
      const curso = courses.value.find((c) => c.id === actualizado.id);
      if (!curso) return;
      curso.progress = actualizado.progress;
      curso.status = actualizado.status;
    });
  },
  { immediate: true },
);

async function openSimuladorCurso(course: Course) {
  mensajeAccesoCurso.value = "";
  const contexto = contextoActivo.value;
  const esEstudianteInstitucional =
    contexto?.portal === "estudiante" &&
    Boolean(contexto.organizacionId) &&
    !contexto.organizacionId?.startsWith("org-personal-");

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
    course.status = "En curso";
    course.progress = 0;
    await aprendizajeService.guardarProgreso(course.id, {
      progreso: 0,
      estado: "En curso",
    });
  }
  router.push(`/tukuy-academy/aprendizaje/${course.id}`);
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
  favoriteCourses,
  workExperiences,
  jobs,
  filteredJobs,
  forYouJobs,
  searchTerm,
  pricingFilter,
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
  isInCart,
  removeFromCart,
  clearCart,
  isFavorite,
  toggleFavorite,
  handleViewCertificate,
  handleDownloadCertificate,
  openSimuladorCurso,
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
        : 'bg-background min-h-[calc(100vh-4rem)] flex flex-col justify-between'
    "
  >
    <RouterView />
    <SiteFooter v-if="!route.meta.hideHeaderFooter" variant="light" />
  </main>
</template>
