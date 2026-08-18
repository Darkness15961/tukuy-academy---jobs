<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import {
  portalBannersService,
  type BannerPortalAlumno,
} from "@/api/services/portal-banners.service";
import CarruselCursos from "@/components/shared/CarruselCursos.vue";
import PortadaCurso from "@/components/shared/PortadaCurso.vue";
import SelectorFiltro from "@/components/shared/SelectorFiltro.vue";
import TarjetaCursoTendencia from "@/components/shared/TarjetaCursoTendencia.vue";
import EsqueletoCursoTendencia from "@/components/shared/EsqueletoCursoTendencia.vue";
import PortalSection from "@/components/shared/PortalSection.vue";
import { Input } from "@/components/ui/input";
import { useContextoSesion } from "@/composables/useContextoSesion";
import { urlVisualizableMedia } from "@/lib/storage-academia";
import { usePortalContext } from "../composables/usePortalContext";
import type {
  AccesoCursoFilter,
  FuenteCursoFilter,
  PricingFilter,
} from "../composables/usePortalContext";

const portal = usePortalContext();
const router = useRouter();
const { contextoActivo } = useContextoSesion();
const banners = ref<BannerPortalAlumno[]>([]);

const opcionesFuente = computed(() => [
  {
    valor: "all" as FuenteCursoFilter,
    etiqueta: `Toda la fuente (${portal.contadoresCatalogo.value.total})`,
  },
  {
    valor: "tukuy" as FuenteCursoFilter,
    etiqueta: `Tukuy Academy (${portal.contadoresCatalogo.value.tukuy})`,
  },
  {
    valor: "entidad" as FuenteCursoFilter,
    etiqueta: `Entidades (${portal.contadoresCatalogo.value.entidad})`,
  },
]);

const opcionesAcceso = computed(() => [
  {
    valor: "all" as AccesoCursoFilter,
    etiqueta: "Todo el acceso",
  },
  {
    valor: "publico" as AccesoCursoFilter,
    etiqueta: `Públicos (${portal.contadoresCatalogo.value.publico})`,
  },
  {
    valor: "restringido" as AccesoCursoFilter,
    etiqueta: `Restringidos (${portal.contadoresCatalogo.value.restringido})`,
  },
]);

const opcionesPrecio = computed(() => [
  { valor: "all" as PricingFilter, etiqueta: "Cualquier precio" },
  { valor: "free" as PricingFilter, etiqueta: "Gratis" },
  { valor: "paid" as PricingFilter, etiqueta: "De pago" },
]);

const resumenFiltros = computed(() => {
  const partes: string[] = [];
  if (portal.fuenteFilter.value === "tukuy") partes.push("Tukuy Academy");
  if (portal.fuenteFilter.value === "entidad") partes.push("Entidades");
  if (portal.accesoFilter.value === "publico") partes.push("Públicos");
  if (portal.accesoFilter.value === "restringido") partes.push("Restringidos");
  if (portal.pricingFilter.value === "free") partes.push("Gratis");
  if (portal.pricingFilter.value === "paid") partes.push("De pago");
  return partes.length ? partes.join(" · ") : "Catálogo completo";
});

async function cargarBanners() {
  try {
    const orgId = contextoActivo.value?.organizacionId?.trim() || null;
    const lista = await portalBannersService.listarAlumno(orgId);
    banners.value = await Promise.all(
      lista.map(async (b) => {
        const raw = b.imagenUrl?.trim() || "";
        if (
          !raw ||
          raw.startsWith("http") ||
          raw.startsWith("data:") ||
          raw.startsWith("blob:")
        ) {
          return b;
        }
        const url = await urlVisualizableMedia(raw, "");
        return { ...b, imagenUrl: url || raw };
      }),
    );
  } catch {
    banners.value = [];
  }
}

function onCtaBanner(slide: BannerPortalAlumno) {
  if (slide.tipo === "CURSO" && slide.cursoRef?.trim()) {
    const curso = portal.courses.value.find((c) => c.id === slide.cursoRef);
    if (curso) {
      void portal.openSimuladorCurso(curso);
      return;
    }
    void router.push(`/tukuy-academy/cursos/${slide.cursoRef.trim()}`);
    return;
  }
  const url = slide.ctaUrl?.trim();
  if (!url) return;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  void router.push(url.startsWith("/") ? url : `/${url}`);
}

onMounted(() => {
  void cargarBanners();
});
</script>

<template>
  <PortalSection wide>
    <PortadaCurso
      :slides="banners"
      :interval-ms="5000"
      @cta="onCtaBanner"
    />

    <CarruselCursos
      subtitle="Formación especializada"
      title="Cursos destacados"
    >
      <template v-if="portal.coursesLoading.value">
        <EsqueletoCursoTendencia v-for="i in 6" :key="i" />
      </template>
      <TarjetaCursoTendencia
        v-for="course in portal.featuredCourses.value"
        v-else
        :key="course.id"
        :course="course"
        :show-detail="false"
        :in-cart="portal.isInCart(course.id)"
        :is-favorite="portal.isFavorite(course.id)"
        @add-to-cart="portal.handleAddToCart(course.id)"
        @continue-course="portal.openSimuladorCurso(course)"
        @select="portal.verDetalleCurso(course)"
        @toggle-favorite="portal.toggleFavorite(course.id)"
      />
    </CarruselCursos>

    <div
      class="relative my-2 w-full py-6 sm:my-4 sm:py-8"
      aria-hidden="true"
    >
      <div class="h-px w-full bg-border" />
      <div
        class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 bg-background px-4"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-primary" />
        <span
          class="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground"
        >
          Catálogo
        </span>
        <span class="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
    </div>

    <section
      class="grid w-full gap-6 rounded-none border border-border bg-card/40 p-4 text-left sm:p-6 lg:p-8"
    >
      <div
        class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="max-w-3xl">
          <p
            class="text-sm font-black uppercase tracking-[.25em] text-primary"
          >
            Explorar
          </p>
          <h2 class="mt-3 text-3xl font-black text-foreground sm:text-4xl">
            Catálogo de cursos
          </h2>
        </div>
        <p class="shrink-0 text-sm font-semibold text-muted-foreground">
          {{ portal.contadoresCatalogo.value.total }}
          {{
            portal.contadoresCatalogo.value.total === 1 ? "curso" : "cursos"
          }}
        </p>
      </div>

      <div
        class="flex flex-col gap-3 border border-border bg-background p-3 sm:p-4 lg:flex-row lg:items-center"
      >
        <label class="relative min-w-0 flex-1">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="portal.searchTerm.value"
            class="h-11 rounded-none border-border bg-background pl-10"
            type="search"
            placeholder="Buscar curso, entidad o categoría..."
            aria-label="Buscar cursos"
          />
        </label>

        <div
          class="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[min(36rem,100%)] lg:shrink-0"
        >
          <SelectorFiltro
            v-model="portal.fuenteFilter.value"
            :opciones="opcionesFuente"
            ariaLabel="Filtrar por fuente"
          />
          <SelectorFiltro
            v-model="portal.accesoFilter.value"
            :opciones="opcionesAcceso"
            ariaLabel="Filtrar por acceso"
          />
          <SelectorFiltro
            v-model="portal.pricingFilter.value"
            :opciones="opcionesPrecio"
            ariaLabel="Filtrar por precio"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">
          <span class="font-bold text-foreground">{{
            portal.catalogCourses.value.length
          }}</span>
          resultado(s) · {{ resumenFiltros }}
        </p>
      </div>

      <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaCursoTendencia
          v-for="course in portal.catalogCourses.value"
          :key="`catalog-${course.id}`"
          fluid
          :course="course"
          :in-cart="portal.isInCart(course.id)"
          :is-favorite="portal.isFavorite(course.id)"
          @add-to-cart="portal.handleAddToCart(course.id)"
          @continue-course="portal.openSimuladorCurso(course)"
          @select="portal.verDetalleCurso(course)"
          @toggle-favorite="portal.toggleFavorite(course.id)"
        />
      </div>

      <div
        v-if="!portal.catalogCourses.value.length"
        class="border border-border bg-card py-12 text-center text-sm text-muted-foreground"
      >
        <template v-if="portal.coursesLoading.value">
          Cargando catálogo…
        </template>
        <template v-else-if="portal.coursesError.value">
          No se pudieron cargar los cursos. Inténtalo de nuevo.
        </template>
        <template
          v-else-if="
            portal.searchTerm.value ||
            portal.fuenteFilter.value !== 'all' ||
            portal.accesoFilter.value !== 'all' ||
            portal.pricingFilter.value !== 'all'
          "
        >
          No encontramos cursos con ese filtro. Prueba otra combinación.
        </template>
        <template v-else>
          <p>
            Aún no hay cursos publicados en el catálogo del alumno.
          </p>
          <p
            v-if="(portal.metaCatalogoAlumno.value?.ocultosPorEstado ?? 0) > 0"
            class="mt-2 text-xs"
          >
            Hay
            {{ portal.metaCatalogoAlumno.value?.ocultosPorEstado }}
            curso(s) en borrador o revisión. Dirección debe
            <strong>aprobar y publicar</strong>
            desde Portal Organización → Catálogo.
          </p>
          <p v-else class="mt-2 text-xs">
            Los cursos del docente aparecen aquí cuando la organización los
            publica (estado Publicado o Aprobado).
          </p>
        </template>
      </div>
    </section>
  </PortalSection>
</template>
