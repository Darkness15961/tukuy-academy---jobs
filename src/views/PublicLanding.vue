<script setup lang="ts">
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  Link2,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-vue-next";
import { useRouter } from "vue-router";

import AppHeader from "@/components/shared/AppHeader.vue";
import CarouselSkeleton from "@/components/shared/CarouselSkeleton.vue";
import CarruselCursos from "@/components/shared/CarruselCursos.vue";
import TarjetaCursoTendencia from "@/components/shared/TarjetaCursoTendencia.vue";
import EsqueletoCursoTendencia from "@/components/shared/EsqueletoCursoTendencia.vue";
import SiteFooter from "@/components/shared/SiteFooter.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useContent } from "@/composables/useContent";
import { useFiltroCursos, useCursos } from "@/composables/useCursos";

const router = useRouter();
const { carouselSlides, heroImage, loading: contentLoading } = useContent();
const { courses, loading: coursesLoading } = useCursos();
const { searchTerm, filteredCourses } = useFiltroCursos(() => courses.value);

const benefits = [
  {
    title: "CV profesional con IA",
    description:
      "Genera un CV laboral con cursos, experiencia y evidencias de obra.",
    icon: FileText,
    label: "CV inteligente",
    class: "bg-blue-500/14 text-blue-200",
  },
  {
    title: "Conexión con Bolsa Tukuy",
    description:
      "Recibe oportunidades compatibles con tu perfil técnico y disponibilidad.",
    icon: BriefcaseBusiness,
    label: "Bolsa laboral",
    class: "bg-amber-500/14 text-amber-200",
  },
  {
    title: "Experiencia importada",
    description:
      "Integra cargos, obras y módulos usados en Tukuy Obra o SIADEG.",
    icon: Link2,
    label: "Tukuy Obra",
    class: "bg-teal-500/14 text-teal-200",
  },
  {
    title: "Certificados verificables",
    description: "Respalda tu avance con constancias listas para postular.",
    icon: ShieldCheck,
    label: "Certificación",
    class: "bg-emerald-500/14 text-emerald-200",
  },
  {
    title: "Rutas recomendadas",
    description:
      "Aprende según tu cargo, módulos de obra y objetivos laborales.",
    icon: Sparkles,
    label: "Aprendizaje",
    class: "bg-violet-500/14 text-violet-200",
  },
];

function goToLogin() {
  router.push("/login");
}

function scrollToSection(id: string) {
  const section = document.querySelector<HTMLElement>(id);
  if (!section) return;

  const headerOffset = 88;
  const start = window.scrollY;
  const target =
    section.getBoundingClientRect().top + window.scrollY - headerOffset;
  const distance = target - start;
  const duration = 950;
  const startTime = performance.now();

  function easeInOutCubic(progress: number) {
    return progress < 0.5
      ? 4 * progress ** 3
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, start + distance * easeInOutCubic(progress));

    if (progress < 1) {
      window.requestAnimationFrame(animate);
    }
  }

  window.requestAnimationFrame(animate);
}
</script>

<template>
  <AppHeader mode="public" @scroll-to="scrollToSection" />

  <main class="bg-slate-950 text-white">
    <section
      class="relative overflow-hidden min-h-[calc(100vh-5.5rem)] flex items-center"
    >
      <img
        :src="heroImage"
        alt="Formación laboral para personas de obra"
        class="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div
        class="absolute inset-0 bg-linear-to-br from-slate-950 via-slate-950/82 to-blue-950/70"
      />

      <div
        class="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center w-full"
      >
        <div class="grid gap-7">
          <Badge
            class="w-fit border-white/20 bg-white/10 text-white"
            variant="outline"
            >Academy & Jobs</Badge
          >

          <div class="grid gap-4">
            <h1
              class="max-w-4xl text-4xl font-black tracking-normal sm:text-6xl"
            >
              Aprende a gestionar obras con Tukuy Obra y potencia tu perfil
            </h1>
          </div>

          <div class="flex flex-wrap gap-3">
            <Button size="lg" @click="goToLogin">
              Acceder al portal <ChevronRight class="h-4 w-4" />
            </Button>
            <Button
              class="border-white/20 bg-white/10 text-white hover:bg-white/15"
              variant="outline"
              size="lg"
              @click="scrollToSection('#cursos')"
            >
              Ver cursos destacados
            </Button>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <Card class="border-white/10 bg-white/8 text-white backdrop-blur">
              <CardContent class="p-4">
                <strong class="block text-2xl">9</strong>
                <span class="text-sm text-white/65">Cursos de obra</span>
              </CardContent>
            </Card>
            <Card class="border-white/10 bg-white/8 text-white backdrop-blur">
              <CardContent class="p-4">
                <strong class="block text-2xl">91%</strong>
                <span class="text-sm text-white/65">Matching laboral</span>
              </CardContent>
            </Card>
            <Card class="border-white/10 bg-white/8 text-white backdrop-blur">
              <CardContent class="p-4">
                <strong class="block text-2xl">3</strong>
                <span class="text-sm text-white/65">Certificados</span>
              </CardContent>
            </Card>
          </div>
        </div>

        <div class="grid gap-4">
          <CarouselSkeleton v-if="contentLoading" variant="dark" />
          <template v-else>
            <div
              class="relative overflow-hidden rounded-lg border border-white/15 bg-white/10 shadow-2xl backdrop-blur"
            >
              <div
                class="flex animate-[academy-slide_30s_ease-in-out_infinite]"
              >
                <article
                  v-for="slide in carouselSlides"
                  :key="slide.title"
                  class="relative min-h-[520px] min-w-full overflow-hidden"
                >
                  <img
                    :src="slide.image"
                    :alt="slide.title"
                    class="absolute inset-0 h-full w-full object-cover"
                  />
                  <div
                    class="absolute inset-0 bg-linear-to-t from-slate-950/92 via-slate-950/28 to-transparent"
                  />
                  <div class="absolute inset-x-0 bottom-0 grid gap-3 p-6">
                    <Badge
                      class="w-fit border-white/20 bg-white/90 text-slate-950"
                      variant="outline"
                      >{{ slide.label }}</Badge
                    >
                    <h2 class="text-3xl font-black tracking-normal">
                      {{ slide.title }}
                    </h2>
                    <p class="max-w-md text-sm leading-6 text-white/75">
                      {{ slide.description }}
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </template>
        </div>
      </div>
    </section>

    <section id="cursos" class="mx-auto max-w-7xl px-5 py-14">
      <CarruselCursos
        dark
        subtitle="Cursos destacados"
        title="Cursos en tendencia"
      >
        <template v-if="coursesLoading">
          <EsqueletoCursoTendencia v-for="i in 6" :key="i" variant="dark" />
        </template>
        <TarjetaCursoTendencia
          v-for="course in filteredCourses"
          v-else
          :key="course.id"
          :course="course"
          variant="dark"
          :show-actions="false"
          :show-detail="false"
          @select="router.push(`/cursos/${course.id}`)"
        />
      </CarruselCursos>

      <div class="mt-6 flex justify-end">
        <Button
          class="border-white/20 bg-white/10 text-white hover:bg-white/15"
          variant="outline"
          @click="goToLogin"
        >
          Ingresar y ver todo el catálogo
        </Button>
      </div>
    </section>

    <section id="perfiles" class="mx-auto grid max-w-7xl gap-5 px-5 pb-14">
      <div class="grid gap-3 md:grid-cols-[1fr_0.75fr] md:items-end">
        <div>
          <p class="text-xs font-bold uppercase text-teal-300">
            Cursos por perfil
          </p>
          <h2 class="mt-2 max-w-3xl text-3xl font-black tracking-normal">
            Rutas modernas para operar y crecer
          </h2>
        </div>
        <p class="text-sm leading-6 text-white/68">
          Cada ruta combina uso del sistema, evidencia de experiencia y
          competencias para postular a mejores cargos.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <Card
          class="group cursor-pointer overflow-hidden border-white/10 bg-white/8 text-white backdrop-blur"
          role="button"
          tabindex="0"
          @click="goToLogin"
          @keydown.enter="goToLogin"
          @keydown.space.prevent="goToLogin"
        >
          <div class="relative aspect-[16/9] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80"
              alt="Capacitación en almacén y logística de obra"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/15 to-transparent"
            />
            <Badge
              class="absolute left-4 top-4 w-fit border-white/20 bg-white/90 text-slate-950"
              variant="outline"
              >Operativo</Badge
            >
          </div>
          <CardHeader>
            <CardTitle class="text-xl"
              >Almacén, pedidos y requerimientos</CardTitle
            >
            <CardDescription class="text-white/65"
              >Para auxiliares, responsables de materiales y asistentes
              logísticos.</CardDescription
            >
          </CardHeader>
          <CardContent class="flex flex-wrap gap-2">
            <Badge variant="outline" class="border-white/20 text-blue-500"
              >Inventario</Badge
            >
            <Badge variant="outline" class="border-white/20 text-blue-500"
              >Compras</Badge
            >
            <Badge variant="outline" class="border-white/20 text-blue-500"
              >Trazabilidad</Badge
            >
          </CardContent>
        </Card>

        <Card
          class="group cursor-pointer overflow-hidden border-white/10 bg-white/8 text-white backdrop-blur"
          role="button"
          tabindex="0"
          @click="goToLogin"
          @keydown.enter="goToLogin"
          @keydown.space.prevent="goToLogin"
        >
          <div class="relative aspect-[16/9] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80"
              alt="Curso técnico de avance y valorizaciones de obra"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/15 to-transparent"
            />
            <Badge
              class="absolute left-4 top-4 w-fit border-white/20 bg-white/90 text-slate-950"
              variant="outline"
              >Técnico</Badge
            >
          </div>
          <CardHeader>
            <CardTitle class="text-xl"
              >Avance, valorizaciones y reportes</CardTitle
            >
            <CardDescription class="text-white/65"
              >Para residentes, asistentes técnicos y control de
              obra.</CardDescription
            >
          </CardHeader>
          <CardContent class="flex flex-wrap gap-2">
            <Badge variant="outline" class="border-white/20 text-blue-500"
              >Curva S</Badge
            >
            <Badge variant="outline" class="border-white/20 text-blue-500"
              >KPI</Badge
            >
            <Badge variant="outline" class="border-white/20 text-blue-500"
              >PDF / Excel</Badge
            >
          </CardContent>
        </Card>

        <Card
          class="group cursor-pointer overflow-hidden border-white/10 bg-white/8 text-white backdrop-blur"
          role="button"
          tabindex="0"
          @click="goToLogin"
          @keydown.enter="goToLogin"
          @keydown.space.prevent="goToLogin"
        >
          <div class="relative aspect-[16/9] overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80"
              alt="Curso de análisis, BIM e inteligencia artificial para obras"
              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/15 to-transparent"
            />
            <Badge
              class="absolute left-4 top-4 w-fit border-white/20 bg-white/90 text-slate-950"
              variant="outline"
              >Inteligente</Badge
            >
          </div>
          <CardHeader>
            <CardTitle class="text-xl">IA, BIM y análisis de obra</CardTitle>
            <CardDescription class="text-white/65"
              >Para equipos que necesitan interpretar datos y tomar mejores
              decisiones.</CardDescription
            >
          </CardHeader>
          <CardContent class="flex flex-wrap gap-2">
            <Badge variant="outline" class="border-white/20 text-blue-500"
              >Tukuy IA</Badge
            >
            <Badge variant="outline" class="border-white/20 text-blue-500"
              >BIM</Badge
            >
            <Badge variant="outline" class="border-white/20 text-blue-500"
              >Comparativas</Badge
            >
          </CardContent>
        </Card>
      </div>
    </section>

    <section
      id="modulos"
      class="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-3"
    >
      <Card class="border-white/10 bg-white/8 text-white backdrop-blur">
        <CardHeader>
          <BookOpen class="h-5 w-5 text-blue-300" />
          <CardTitle>Gestión de obras</CardTitle>
          <CardDescription class="text-white/65"
            >Cursos para avance físico-financiero, cuaderno digital,
            valorizaciones y reportes técnicos.</CardDescription
          >
        </CardHeader>
      </Card>
      <Card class="border-white/10 bg-white/8 text-white backdrop-blur">
        <CardHeader>
          <Award class="h-5 w-5 text-teal-300" />
          <CardTitle>Dominio del sistema</CardTitle>
          <CardDescription class="text-white/65"
            >Capacitación práctica para usar Tukuy Obra, Tukuy Almacén,
            asistencia y paneles de control.</CardDescription
          >
        </CardHeader>
      </Card>
      <Card class="border-white/10 bg-white/8 text-white backdrop-blur">
        <CardHeader>
          <BriefcaseBusiness class="h-5 w-5 text-amber-300" />
          <CardTitle>Empleabilidad conectada</CardTitle>
          <CardDescription class="text-white/65"
            >Tu experiencia usando el sistema alimenta tu CV inteligente y
            mejora el matching laboral.</CardDescription
          >
        </CardHeader>
      </Card>
    </section>

    <section id="beneficios" class="mx-auto grid max-w-7xl gap-5 px-5 pb-14">
      <div class="grid gap-3 md:grid-cols-[0.9fr_1fr] md:items-end">
        <div>
          <p class="text-xs font-bold uppercase text-teal-300">Beneficios</p>
          <h2 class="mt-2 max-w-3xl text-3xl font-black tracking-normal">
            Todo lo necesario para aprender y postular mejor
          </h2>
        </div>
        <p class="text-sm leading-6 text-white/68">
          Academy conecta capacitación, CV, certificados y oportunidades
          laborales en una sola ruta.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card
          v-for="benefit in benefits"
          :key="benefit.title"
          class="group cursor-pointer border-white/10 bg-white/8 text-white backdrop-blur transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
          role="button"
          tabindex="0"
          @click="goToLogin"
          @keydown.enter="goToLogin"
          @keydown.space.prevent="goToLogin"
        >
          <CardContent class="grid min-h-[190px] content-between gap-5 p-5">
            <div class="grid gap-4">
              <div
                :class="[
                  'flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-white/10',
                  benefit.class,
                ]"
              >
                <component :is="benefit.icon" class="h-5 w-5" />
              </div>
              <div class="grid gap-2">
                <Badge
                  class="w-fit border-white/20 bg-white/90 text-slate-950"
                  variant="outline"
                >
                  {{ benefit.label }}
                </Badge>
                <h3 class="text-lg font-bold leading-tight">
                  {{ benefit.title }}
                </h3>
                <p class="text-sm leading-6 text-white/65">
                  {{ benefit.description }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section id="contacto" class="mx-auto grid max-w-7xl gap-5 px-5 pb-14">
      <Card
        class="overflow-hidden border-white/10 bg-white/8 text-white backdrop-blur"
      >
        <CardContent
          class="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr] lg:items-center"
        >
          <div class="grid gap-3">
            <p class="text-xs font-bold uppercase text-teal-300">Contacto</p>
            <h2 class="text-3xl font-black tracking-normal">
              Conversemos sobre capacitación para tu equipo de obra
            </h2>
          </div>

          <div class="grid gap-3 text-sm">
            <Card class="border-white/10 bg-white/8 shadow-none">
              <CardContent class="flex items-center gap-3 p-3">
                <MapPin class="h-4 w-4 text-teal-300" />
                <span class="text-white/68">Cusco, Perú</span>
              </CardContent>
            </Card>
            <Card class="border-white/10 bg-white/8 shadow-none">
              <CardContent class="flex items-center gap-3 p-3">
                <Phone class="h-4 w-4 text-teal-300" />
                <span class="text-white/68">+51 930 804 475</span>
              </CardContent>
            </Card>
            <Card class="border-white/10 bg-white/8 shadow-none">
              <CardContent class="flex items-center gap-3 p-3">
                <Mail class="h-4 w-4 text-teal-300" />
                <span class="text-white/68">academy@tukuyobra.com</span>
              </CardContent>
            </Card>
            <Button
              class="mt-2 bg-white text-slate-950 hover:bg-white/90"
              @click="goToLogin"
              >Solicitar demo de capacitación</Button
            >
          </div>
        </CardContent>
      </Card>
    </section>

    <SiteFooter variant="dark" links-to-login />
  </main>
</template>
