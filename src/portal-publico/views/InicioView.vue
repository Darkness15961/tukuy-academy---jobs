<script setup lang="ts">
import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  FileUser,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  UsersRound,
} from "lucide-vue-next";
import { useRouter } from "vue-router";
import SiteFooter from "@/components/shared/SiteFooter.vue";
import TarjetaCursoTendencia from "@/components/shared/TarjetaCursoTendencia.vue";
import { Button } from "@/components/ui/button";
import { useCursos } from "@/composables/useCursos";
import HeaderPublico from "../components/HeaderPublico.vue";
import HeroInstitucional from "../components/HeroInstitucional.vue";
import { bloquesAdn } from "../data/portada.mock";

const router = useRouter();
const { courses } = useCursos();

/**
 * Opción B: recorrido = módulos reales del producto.
 * Cada paso nombra dónde ocurre en la plataforma.
 */
const pasosEcosistema = [
  {
    modulo: "Tukuy Academy",
    titulo: "Aprende",
    detalle: "Catálogo, compra e inscripción. Continúa en Mi aprendizaje.",
    icono: BookOpen,
    destino: "#cursos",
  },
  {
    modulo: "Clases en vivo",
    titulo: "Practica",
    detalle: "Calendario de sesiones Meet vinculadas a tus cursos Mixto/Presencial.",
    icono: CalendarDays,
    destino: { name: "login", query: { continuar: "/tukuy-academy/calendario" } },
  },
  {
    modulo: "Certificados",
    titulo: "Certifica",
    detalle: "Emisión al completar y verificación pública del documento.",
    icono: Award,
    destino: {
      name: "login",
      query: { continuar: "/tukuy-academy/certificados" },
    },
  },
  {
    modulo: "CV inteligente",
    titulo: "Construye tu perfil",
    detalle: "Perfil laboral alimentado por cursos, avance y evidencias.",
    icono: FileUser,
    destino: {
      name: "login",
      query: { continuar: "/perfil-profesional" },
    },
  },
  {
    modulo: "Bolsa Tukuy",
    titulo: "Postula",
    detalle: "Vacantes alineadas a tu perfil. Comunidad refuerza la red.",
    icono: BriefcaseBusiness,
    destino: "#bolsa",
  },
] as const;

function irA(
  destino:
    | string
    | { name: string; query?: Record<string, string> },
) {
  if (typeof destino === "object") {
    void router.push(destino);
    return;
  }
  if (destino.startsWith("/")) {
    void router.push(destino);
    return;
  }
  const el = document.querySelector(destino);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}
const audiencias = [
  {
    titulo: "ESTUDIANTES",
    texto:
      "Aprende, practica, certifica y postula desde un solo ecosistema.",
    imagen:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85",
    icono: GraduationCap,
    ruta: "/login",
  },
  {
    titulo: "DOCENTES",
    texto:
      "Convierte tu experiencia en cursos, acompañamiento y conocimiento compartido.",
    imagen:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=85",
    icono: BookOpen,
    ruta: "/login",
  },
  {
    titulo: "EMPRESAS",
    texto:
      "Capacita equipos, asigna rutas y mide resultados desde un solo lugar.",
    imagen:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=85",
    icono: Building2,
    ruta: "/planes",
  },
];
</script>
<template>
  <div class="bg-white text-[#07152B]">
    <HeaderPublico @ir-a="irA" /><HeroInstitucional @ir-a="irA" />

    <section id="adn" class="scroll-mt-24 bg-white py-20">
      <div class="mx-auto max-w-360 px-5 lg:px-8">
        <div class="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p
              class="text-sm font-black uppercase tracking-[.25em] text-[#0B3A78]"
            >
              Lo que nos define
            </p>
            <h2 class="mt-3 text-4xl font-black sm:text-6xl">NUESTRO ADN</h2>
          </div>
          <p class="max-w-xl text-base leading-7 text-[#52657A]">
            Formación que conecta tecnología, experiencia real y crecimiento
            profesional.
          </p>
        </div>
        <div class="grid min-h-[720px] lg:grid-cols-2">
          <article
            class="group relative min-h-[480px] overflow-hidden lg:min-h-full"
          >
            <img
              :src="bloquesAdn[0]?.imagen"
              :alt="bloquesAdn[0]?.titulo ?? 'Formación aplicada en Tukuy Academy'"
              class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
            />
            <div
              class="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent"
            />
            <div class="absolute bottom-0 p-7 text-white sm:p-10">
              <span class="mb-4 block h-1 w-10 bg-[#F5B400]" />
              <h3 class="text-3xl font-black sm:text-5xl">
                {{ bloquesAdn[0]?.titulo }}
              </h3>
              <p class="mt-4 max-w-lg text-white/75">
                {{ bloquesAdn[0]?.descripcion }}
              </p>
            </div>
          </article>
          <div class="grid">
            <article
              v-for="b in bloquesAdn.slice(1)"
              :key="b.titulo"
              class="group relative min-h-[360px] overflow-hidden"
            >
              <img
                :src="b.imagen"
                :alt="b.titulo"
                class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
              />
              <div
                class="absolute inset-0 bg-linear-to-t from-black/85 via-black/15 to-transparent"
              />
              <div class="absolute bottom-0 p-7 text-white sm:p-9">
                <span class="mb-3 block h-1 w-10 bg-[#F5B400]" />
                <h3 class="text-3xl font-black">{{ b.titulo }}</h3>
                <p class="mt-3 max-w-lg text-white/75">{{ b.descripcion }}</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="audiencias" class="scroll-mt-24 bg-[#F5F8FC] py-20">
      <div class="mx-auto max-w-360 px-5 lg:px-8">
        <p class="text-sm font-black uppercase tracking-[.25em] text-[#0B3A78]">
          Una plataforma, diferentes caminos
        </p>
        <h2 class="mt-3 max-w-4xl text-4xl font-black sm:text-5xl">
          CRECIMIENTO PARA PERSONAS Y ORGANIZACIONES
        </h2>
        <div class="mt-10 grid lg:grid-cols-3">
          <article
            v-for="a in audiencias"
            :key="a.titulo"
            class="group relative min-h-[520px] overflow-hidden"
          >
            <img
              :src="a.imagen"
              :alt="a.titulo"
              class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div
              class="absolute inset-0 bg-linear-to-t from-black/90 via-black/15 to-transparent"
            />
            <div class="absolute inset-x-0 bottom-0 p-7 text-white">
              <component :is="a.icono" class="h-7 w-7 text-[#F5B400]" />
              <h3 class="mt-4 text-3xl font-black">{{ a.titulo }}</h3>
              <p class="mt-3 min-h-12 text-white/75">{{ a.texto }}</p>
              <Button
                class="mt-5 rounded-none border-white bg-transparent text-white hover:bg-white hover:text-[#07152B]"
                variant="outline"
                @click="router.push(a.ruta)"
                >Conocer más<ArrowRight class="h-4 w-4"
              /></Button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="cursos" class="scroll-mt-24 bg-white py-20">
      <div class="mx-auto max-w-360 px-5 lg:px-8">
        <div class="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p
              class="text-sm font-black uppercase tracking-[.25em] text-[#0B3A78]"
            >
              Formación especializada
            </p>
            <h2 class="mt-3 max-w-4xl text-4xl font-black sm:text-5xl">
              CURSOS PARA LOS RETOS REALES DE OBRA
            </h2>
          </div>
          <Button
            class="rounded-none"
            variant="outline"
            @click="router.push('/login')"
            >Ver catálogo completo<ArrowRight class="h-4 w-4"
          /></Button>
        </div>
        <div class="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <TarjetaCursoTendencia
            v-for="c in courses.slice(0, 4)"
            :key="c.id"
            :course="c"
            fluid
            :show-actions="false"
            :show-detail="false"
            @select="router.push(`/cursos/${c.id}`)"
          />
        </div>
      </div>
    </section>

    <section id="ecosistema" class="scroll-mt-24 bg-[#07152B] py-16 text-white sm:py-20">
      <div class="mx-auto max-w-360 px-5 lg:px-8">
        <p class="text-sm font-black uppercase tracking-[.25em] text-[#F5B400]">
          Ecosistema Tukuy
        </p>
        <h2 class="mt-3 max-w-4xl text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">
          APRENDER ES SOLO EL COMIENZO
        </h2>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
          Cada etapa del recorrido es un módulo real de la plataforma: Academy,
          clases en vivo, certificados, CV inteligente y Bolsa Tukuy.
        </p>

        <div
          class="mt-10 border border-white/15 md:grid md:grid-cols-5"
          role="list"
          aria-label="Módulos del ecosistema Tukuy"
        >
          <button
            v-for="(paso, indice) in pasosEcosistema"
            :key="paso.modulo"
            type="button"
            role="listitem"
            class="group relative flex w-full flex-col border-b border-white/15 p-6 text-left transition duration-300 last:border-b-0 hover:bg-white/[0.04] md:border-b-0 md:border-r md:last:border-r-0 md:p-7"
            @click="irA(paso.destino)"
          >
            <div class="flex items-start justify-between gap-2">
              <span
                class="text-xs font-bold tracking-wide text-[#5B8FD4]"
                aria-hidden="true"
              >
                {{ String(indice + 1).padStart(2, "0") }}
              </span>
              <span
                class="max-w-[9.5rem] text-right text-[10px] font-bold uppercase tracking-wide text-[#F5B400]/90"
              >
                {{ paso.modulo }}
              </span>
            </div>

            <component
              :is="paso.icono"
              class="mt-7 h-7 w-7 text-[#F5B400] transition duration-300 group-hover:scale-110"
              aria-hidden="true"
            />

            <h3 class="mt-4 text-lg font-black leading-snug sm:text-xl">
              {{ paso.titulo }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-white/55">
              {{ paso.detalle }}
            </p>

            <span
              class="mt-4 inline-flex items-center gap-1 text-xs font-bold text-white/40 transition group-hover:text-[#F5B400]"
            >
              Ver módulo
              <ArrowRight class="h-3.5 w-3.5" />
            </span>

            <span
              v-if="indice < pasosEcosistema.length - 1"
              class="pointer-events-none absolute -bottom-3 left-1/2 z-10 grid h-6 w-6 -translate-x-1/2 place-items-center bg-[#07152B] text-white md:bottom-auto md:-right-3 md:left-auto md:top-1/2 md:translate-x-0 md:-translate-y-1/2"
              aria-hidden="true"
            >
              <ArrowRight class="h-4 w-4 rotate-90 md:rotate-0" />
            </span>
          </button>
        </div>
      </div>
    </section>

    <section id="bolsa" class="scroll-mt-24 grid bg-white lg:grid-cols-2">
      <div class="relative min-h-[620px]">
        <img
          src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1400&q=88"
          alt="Profesional del sector construcción trabajando en campo"
          class="absolute inset-0 h-full w-full object-cover"
        />
        <div
          class="absolute inset-0 bg-linear-to-t from-black/50 to-transparent"
        />
      </div>
      <div
        class="flex items-center bg-[#0B3A78] p-8 text-white sm:p-14 lg:p-16"
      >
        <div>
          <p
            class="text-sm font-black uppercase tracking-[.25em] text-[#F5B400]"
          >
            Bolsa Tukuy
          </p>
          <h2 class="mt-4 text-4xl font-black sm:text-6xl">
            <span class="bg-[#F5B400] px-2 text-[#07152B]">CONECTA</span
            ><br />tu talento con oportunidades reales
          </h2>
          <p class="mt-6 max-w-xl text-lg leading-8 text-blue-100">
            Tu aprendizaje, certificados, experiencia y habilidades alimentan un
            perfil profesional preparado para encontrar oportunidades
            compatibles.
          </p>
          <div class="mt-8 grid gap-3 sm:grid-cols-2">
            <span
              v-for="x in [
                'CV inteligente conectado',
                'Compatibilidad con vacantes',
                'Certificados verificables',
                'Seguimiento de postulaciones',
              ]"
              :key="x"
              class="flex items-center gap-2 border border-white/20 p-3"
              ><Check class="h-4 w-4 text-[#F5B400]" />{{ x }}</span
            >
          </div>
          <Button
            class="mt-8 rounded-none bg-white text-[#0B3A78]"
            @click="
              router.push({
                name: 'login',
                query: { continuar: '/bolsa-tukuy' },
              })
            "
            >Conocer Bolsa Tukuy<ArrowRight
          /></Button>
        </div>
      </div>
    </section>

    <section id="comunidad" class="scroll-mt-24 bg-[#F5F8FC] py-20">
      <div
        class="mx-auto grid max-w-360 gap-10 px-5 lg:grid-cols-[.8fr_1.2fr] lg:px-8"
      >
        <div class="self-center">
          <p
            class="text-sm font-black uppercase tracking-[.25em] text-[#0B3A78]"
          >
            Comunidad Tukuy
          </p>
          <h2 class="mt-4 text-4xl font-black sm:text-6xl">
            <span class="bg-[#0B3A78] px-2 text-white">COMPARTE</span
            ><br />experiencia que transforma el sector
          </h2>
          <p class="mt-6 text-lg leading-8 text-[#52657A]">
            Estudiantes, docentes, especialistas y organizaciones conectados
            alrededor del conocimiento y los desafíos reales de la construcción.
          </p>
          <Button
            class="mt-7 rounded-none"
            @click="
              router.push({
                name: 'login',
                query: { continuar: '/comunidad' },
              })
            "
            >Ingresar a la comunidad<ArrowRight
          /></Button>
        </div>
        <div class="grid min-h-[650px] sm:grid-cols-2">
          <div class="relative min-h-[420px] sm:row-span-2 sm:min-h-0">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=85"
              alt="Comunidad de estudiantes compartiendo conocimientos"
              class="absolute inset-0 h-full w-full object-cover"
            />
            <div
              class="absolute inset-0 bg-linear-to-t from-black/80 to-transparent"
            />
            <h3
              class="absolute bottom-7 left-7 max-w-xs text-3xl font-black text-white"
            >
              Comunidad que comparte experiencia
            </h3>
          </div>
          <div
            v-for="b in [
              {
                t: 'Aprende con especialistas',
                img: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=85',
              },
              {
                t: 'Conecta con el sector',
                img: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=85',
              },
            ]"
            :key="b.t"
            class="relative min-h-[320px]"
          >
            <img
              :src="b.img"
              :alt="b.t"
              class="absolute inset-0 h-full w-full object-cover"
            />
            <div
              class="absolute inset-0 bg-linear-to-t from-black/80 to-transparent"
            />
            <h3 class="absolute bottom-6 left-6 text-2xl font-black text-white">
              {{ b.t }}
            </h3>
          </div>
        </div>
      </div>
    </section>

    <section id="empresas" class="scroll-mt-24 grid bg-white lg:grid-cols-2">
      <div class="flex items-center p-8 sm:p-14 lg:p-16">
        <div>
          <p
            class="text-sm font-black uppercase tracking-[.25em] text-[#0B3A78]"
          >
            Para organizaciones
          </p>
          <h2 class="mt-4 text-4xl font-black sm:text-6xl">
            CAPACITA CON DATOS
          </h2>
          <p class="mt-6 max-w-xl text-lg leading-8 text-[#52657A]">
            Gestiona usuarios, equipos, cursos, rutas, progreso, certificados,
            reportes y licencias desde un único portal empresarial.
          </p>
          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <div
              v-for="x in [
                { t: 'Usuarios y equipos', i: UsersRound },
                { t: 'Rutas y asignaciones', i: BookOpen },
                { t: 'Reportes empresariales', i: ShieldCheck },
                { t: 'Licencias y consumo', i: Building2 },
              ]"
              :key="x.t"
              class="border-l-4 border-[#F5B400] p-4"
            >
              <component :is="x.i" class="h-5 w-5 text-[#0B3A78]" /><b
                class="mt-2 block"
                >{{ x.t }}</b
              >
            </div>
          </div>
          <Button class="mt-8 rounded-none" @click="router.push('/planes')"
            >Ver planes empresariales<ArrowRight
          /></Button>
        </div>
      </div>
      <div class="relative min-h-[620px]">
        <img
          src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=88"
          alt="Equipo empresarial coordinando su plan de capacitación"
          class="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </section>

    <section class="bg-[#F5B400] py-16">
      <div
        class="mx-auto flex max-w-360 flex-wrap items-center justify-between gap-6 px-5 lg:px-8"
      >
        <div>
          <p class="text-sm font-black uppercase tracking-[.25em]">
            Formación · Certificación · Empleabilidad · Comunidad
          </p>
          <h2 class="mt-3 text-4xl font-black sm:text-5xl">
            TU PRÓXIMO PASO EMPIEZA AQUÍ
          </h2>
        </div>
        <Button
          class="h-14 rounded-none bg-[#07152B] px-8 text-white"
          @click="router.push('/login')"
          >Acceder a Tukuy Academy<ArrowRight
        /></Button>
      </div>
    </section>
    <SiteFooter variant="dark" links-to-login />
  </div>
</template>
